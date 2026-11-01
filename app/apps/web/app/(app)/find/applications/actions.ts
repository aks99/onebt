"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { runActionForUser, profileText } from "@/lib/ai/server";
import { PRODUCT_NAME } from "@/lib/product";
import { authorship, canMove, feedbackRequestDraft, followUpDraft, readinessPassed, researchComplete, type PipelineStatus, type Readiness } from "@/lib/pipeline/rules";
import { fieldsForEvent, prefill, type PitchFields } from "@/lib/pipeline/formMapper";
import { renderDossier, type Answers } from "@/lib/find/interview";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// Application Pipeline actions (6.3). The product never submits anything and never contacts an organizer:
// there is no network call to any organizer domain anywhere in this file.

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}
function bump(id?: string) { revalidatePath("/find/applications"); if (id) revalidatePath(`/find/applications/${id}`); revalidatePath("/today"); revalidatePath("/journey"); }

async function loadApp(sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string, id: string) {
  const { data } = await sb.from("applications").select("*, events(*)").eq("id", id).eq("user_id", userId).maybeSingle();
  return data as any | null;
}

export async function saveResearch(appId: string, answers: Record<string, string>): Promise<ActionResult<{ complete: boolean }>> {
  const { user, sb } = await me();
  const clean = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, String(v ?? "").slice(0, 2000)]));
  const { error } = await sb.from("applications").update({ research_answers: clean }).eq("id", appId).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save your research notes." };
  bump(appId);
  return { ok: true, data: { complete: researchComplete(clean) } };
}

// Pre-fill the organizer's fields from the live Pitch Pack (F1.3.2). Only fills fields that are still empty.
export async function prefillFromPack(appId: string): Promise<ActionResult<{ filled: number }>> {
  const { user, sb } = await me();
  const app = await loadApp(sb, user.id, appId);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  const { data: pack } = await sb.from("pitch_packs").select("fields").eq("talk_id", app.talk_id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!pack) return { ok: false, code: "NO_PACK", message: "Build your Pitch Pack first (about 8 minutes)." };
  const fields = fieldsForEvent(app.events?.form_fields);
  const pre = prefill(fields, pack.fields as PitchFields);
  const answers = { ...(app.answers as Record<string, string>) }, sources = { ...(app.answer_sources as Record<string, string>) }, originals = { ...(app.ai_originals as Record<string, string>) };
  let filled = 0;
  for (const f of fields) { if (!(answers[f.key] ?? "").trim() && pre.answers[f.key]) { answers[f.key] = pre.answers[f.key]; sources[f.key] = "llm"; originals[f.key] = pre.answers[f.key]; filled++; } }
  const a = authorship(answers, sources, originals);
  const status: PipelineStatus = app.status === "planned" || app.status === "researching" ? (filled > 0 ? "drafting" : app.status) : app.status;
  const { error } = await sb.from("applications").update({ answers, answer_sources: sources, ai_originals: originals, authorship: a, status }).eq("id", appId);
  if (error) return { ok: false, code: "SAVE_FAILED", message: /DRAFT_LIMIT/.test(error.message) ? "Finish or park one of your 5 drafts first." : "Could not save." };
  bump(appId);
  return { ok: true, data: { filled } };
}

// The member edits an answer: their words. Authorship is recomputed on every save.
export async function saveAnswer(appId: string, key: string, text: string): Promise<ActionResult<{ yourWords: number }>> {
  const { user, sb } = await me();
  const app = await loadApp(sb, user.id, appId);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  const answers = { ...(app.answers as Record<string, string>), [key]: text.slice(0, 20000) };
  const sources = { ...(app.answer_sources as Record<string, string>) };
  const originals = (app.ai_originals as Record<string, string>) ?? {};
  if (!originals[key]) sources[key] = "user";                     // typed from scratch
  else sources[key] = text.trim() === originals[key].trim() ? "llm" : "ai_assisted";
  const a = authorship(answers, Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v === "ai_assisted" ? "llm" : v])), originals);
  const status: PipelineStatus = app.status === "planned" || app.status === "researching" ? "drafting" : app.status === "ready" ? "drafting" : app.status;   // an edit after Ready re-opens the draft
  const { error } = await sb.from("applications").update({ answers, answer_sources: sources, authorship: a, status, readiness_passed: status === "drafting" && app.status === "ready" ? false : app.readiness_passed }).eq("id", appId);
  if (error) return { ok: false, code: "SAVE_FAILED", message: /DRAFT_LIMIT/.test(error.message) ? "Finish or park one of your 5 drafts first." : "Could not save." };
  bump(appId);
  return { ok: true, data: { yourWords: a.your_words_pct } };
}

// F1.3.3 per-event personalization: gates (research complete, organizer AI policy, allowance) are applied in
// runAiAction from database facts. The result is a diff the member accepts field by field.
export async function personalize(appId: string): Promise<ActionResult<{ variantId: string; fields: { key: string; text: string }[]; what_changed: string[]; cautions: string[] }>> {
  const { user, sb } = await me();
  const app = await loadApp(sb, user.id, appId);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  const [{ data: pack }, { data: profile }] = await Promise.all([
    sb.from("pitch_packs").select("id, fields").eq("talk_id", app.talk_id).order("version", { ascending: false }).limit(1).maybeSingle(),
    sb.from("profiles").select("display_name, expertise_line, city, region, country_code, hometown, alma_mater, places_lived").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!pack) return { ok: false, code: "NO_PACK", message: "Build your Pitch Pack first." };
  const ev = app.events ?? {};
  const fields = fieldsForEvent(ev.form_fields);
  const eventJson = JSON.stringify({ name: ev.name, city: ev.city, region: ev.region, country: ev.country_code, theme: ev.theme, theme_history: ev.theme_history, talk_length_target: ev.talk_length_target, local_connection_required: ev.local_connection_required, criteria_in_their_words: ev.criteria_snippet, event_date: ev.event_date });
  const profileLines = [profileText(profile), profile?.hometown ? `Hometown: ${profile.hometown}` : "", profile?.alma_mater ? `Alma mater: ${profile.alma_mater}` : "", profile?.places_lived?.length ? `Places lived: ${profile.places_lived.join(", ")}` : ""].filter(Boolean).join("\n");
  const r = await runActionForUser<{ fields: { key: string; text: string }[]; what_changed: string[]; cautions: string[]; theme_phrases_used: string[] }>("personalization", {
    talkId: app.talk_id, applicationId: appId, idempotencyKey: randomUUID(),
    vars: { pitch_pack: JSON.stringify(pack.fields), event_json: eventJson, form_fields: JSON.stringify(fields.map((f) => ({ key: f.key, label: f.label, limit: f.limit, limit_type: f.limit_type }))), profile: profileLines },
  });
  if (!r.ok) return r;
  const o = r.result.output;
  const { data: v, error } = await sb.from("pitch_variants").insert({ user_id: user.id, pitch_pack_id: pack.id, event_id: app.event_id, fields: Object.fromEntries(o.fields.map((f) => [f.key, f.text])), what_changed: o.what_changed, cautions: o.cautions, theme_phrases_used: o.theme_phrases_used }).select("id").single();
  if (error || !v) return { ok: false, code: "SAVE_FAILED", message: "Personalized but not saved. Try again." };
  await sb.from("applications").update({ pitch_variant_id: v.id }).eq("id", appId);
  bump(appId);
  return { ok: true, data: { variantId: v.id, fields: o.fields, what_changed: o.what_changed, cautions: o.cautions } };
}

// Accept one personalized field: it replaces the answer as an AI draft (source llm, original updated).
export async function acceptVariantField(appId: string, key: string, text: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const app = await loadApp(sb, user.id, appId);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  const answers = { ...(app.answers as Record<string, string>), [key]: text };
  const sources = { ...(app.answer_sources as Record<string, string>), [key]: "llm" };
  const originals = { ...(app.ai_originals as Record<string, string>), [key]: text };
  const a = authorship(answers, sources, originals);
  const { error } = await sb.from("applications").update({ answers, answer_sources: sources, ai_originals: originals, authorship: a, status: ["planned", "researching"].includes(app.status) ? "drafting" : app.status }).eq("id", appId);
  if (error) return { ok: false, code: "SAVE_FAILED", message: /DRAFT_LIMIT/.test(error.message) ? "Finish or park one of your 5 drafts first." : "Could not save." };
  bump(appId);
  return { ok: true };
}

// F1.3.4 Readiness Review (Haiku scores; rewrites are offered, never applied silently).
export async function checkReadiness(appId: string): Promise<ActionResult<Readiness & { passed: boolean; reason: string }>> {
  const { user, sb } = await me();
  const app = await loadApp(sb, user.id, appId);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  const [{ data: profile }, { data: dossier }] = await Promise.all([
    sb.from("profiles").select("display_name, expertise_line, city, country_code").eq("user_id", user.id).maybeSingle(),
    sb.from("idea_dossiers").select("answers, pasted_material").eq("talk_id", app.talk_id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const ev = app.events ?? {};
  const fields = fieldsForEvent(ev.form_fields);
  const r = await runActionForUser<Readiness>("readiness_review", {
    talkId: app.talk_id, applicationId: appId, idempotencyKey: randomUUID(),
    vars: { event_name: ev.name ?? app.event_name_manual ?? "the event", event_theme: ev.theme ?? "not announced", form_fields: fields.map((f) => `${f.key} (${f.label}${f.limit ? `, ${f.limit} ${f.limit_type}` : ""})`).join("; "),
      talk_length: ev.talk_length_target ?? "not stated", local_required: ev.local_connection_required == null ? "unknown" : String(ev.local_connection_required),
      answers_json: JSON.stringify(app.answers ?? {}), profile: profileText(profile), dossier: dossier ? renderDossier((dossier.answers as Answers) ?? {}, dossier.pasted_material).slice(0, 6000) : "none" },
  });
  if (!r.ok) return r;
  const out = r.result.output;
  const verdict = readinessPassed(out);
  await sb.from("applications").update({ readiness: out, readiness_passed: verdict.ok, readiness_checked_at: new Date().toISOString() }).eq("id", appId);
  bump(appId);
  return { ok: true, data: { ...out, passed: verdict.ok, reason: verdict.reason } };
}

export async function moveStatus(appId: string, to: PipelineStatus, extra?: { appliedAt?: string; confirmed?: boolean }): Promise<ActionResult<{ confirm?: string }>> {
  const { user, sb } = await me();
  const app = await loadApp(sb, user.id, appId);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  const { count } = await sb.from("applications").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["drafting", "ready"]).neq("id", appId);
  const verdict = canMove(app.status, to, { activeDrafts: count ?? 0, readinessPassed: !!app.readiness_passed, isThisActive: ["drafting", "ready"].includes(app.status) });
  if (!verdict.ok) return { ok: false, code: "MOVE_REFUSED", message: verdict.reason ?? "That move is not allowed." };
  if (verdict.confirm && !extra?.confirmed) return { ok: true, data: { confirm: verdict.confirm } };
  const patch: Record<string, unknown> = { status: to };
  if (to === "applied") { patch.applied_at = extra?.appliedAt ?? new Date().toISOString().slice(0, 10); if (!app.follow_up_at) patch.follow_up_at = addDays(patch.applied_at as string, 14); }
  const { error } = await sb.from("applications").update(patch).eq("id", appId);
  if (error) return { ok: false, code: "MOVE_FAILED", message: /DRAFT_LIMIT/.test(error.message) ? "Finish or park one of your 5 drafts first." : /NOT_READY/.test(error.message) ? "Ready needs a passed Readiness Review." : "Could not move it." };
  bump(appId);
  return { ok: true, data: {} };
}
function addDays(iso: string, n: number) { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

export async function updateDates(appId: string, patch: { appliedAt?: string | null; followUpAt?: string | null; decisionDate?: string | null; noEnquiries?: boolean; eventDate?: string | null; notes?: string }): Promise<ActionResult> {
  const { user, sb } = await me();
  const row: Record<string, unknown> = {};
  if (patch.appliedAt !== undefined) row.applied_at = patch.appliedAt || null;
  if (patch.followUpAt !== undefined) row.follow_up_at = patch.followUpAt || null;
  if (patch.decisionDate !== undefined) row.decision_date = patch.decisionDate || null;
  if (patch.noEnquiries !== undefined) row.no_enquiries = patch.noEnquiries;
  if (patch.eventDate !== undefined) row.event_date = patch.eventDate || null;
  if (patch.notes !== undefined) row.notes = patch.notes.slice(0, 5000);
  const { error } = await sb.from("applications").update(row).eq("id", appId).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save." };
  bump(appId);
  return { ok: true };
}

// F1.3.7: the draft is a template (a status enquiry, never a second pitch); the database decides if it is allowed.
export async function draftFollowUp(appId: string): Promise<ActionResult<{ subject: string; body: string }>> {
  const { user, sb } = await me();
  const [{ data: allowed }, app, { data: profile }] = await Promise.all([sb.rpc("follow_up_allowed", { p_app: appId }), loadApp(sb, user.id, appId), sb.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle()]);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  if (allowed !== "OK") return { ok: false, code: String(allowed), message: ({ NOT_APPLIED: "Follow-ups start once the application is sent.", ALREADY_SENT: "One follow-up per application. You have sent it.", ORGANIZER_SAYS_NO: "This organizer asked applicants not to enquire.", BEFORE_DECISION_DATE: "The organizer gave a decision date. Wait for it.", NO_PUBLIC_FORM: "Follow-ups are only for applications made through a public form.", TOO_EARLY: "Give them two weeks." } as Record<string, string>)[String(allowed)] ?? "Not now." };
  const draft = followUpDraft({ memberName: profile?.display_name ?? user.email ?? "", eventName: app.events?.name ?? app.event_name_manual ?? "the event", appliedAt: app.applied_at, oneSentence: (app.answers as Record<string, string>)?.one_sentence ?? null });
  await sb.from("applications").update({ follow_up_draft: `${draft.subject}\n\n${draft.body}` }).eq("id", appId);
  return { ok: true, data: draft };
}

export async function markFollowUpSent(appId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const { error } = await sb.from("applications").update({ follow_up_sent_at: new Date().toISOString(), status: "applied" }).eq("id", appId).eq("user_id", user.id).in("status", ["applied", "follow_up_due"]);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not record it." };
  bump(appId);
  return { ok: true };
}

// F1.3.9 outcome logging. Acceptance captures the event date; a decline offers the feedback request draft.
export async function logOutcome(appId: string, outcome: "accepted" | "declined" | "withdrawn", date: string, reason: string, eventDate?: string | null, reapply?: boolean): Promise<ActionResult<{ feedbackDraft?: { subject: string; body: string } }>> {
  const { user, sb } = await me();
  const app = await loadApp(sb, user.id, appId);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  const patch: Record<string, unknown> = { status: outcome, outcome, outcome_at: date || new Date().toISOString().slice(0, 10), outcome_reason: reason?.slice(0, 1000) || null };
  if (outcome === "accepted" && eventDate) patch.event_date = eventDate;
  if (outcome === "declined") { patch.rejection_reason = reason?.slice(0, 1000) || null; if (reapply) { const d = app.events?.application_deadline ?? app.applied_at; patch.reapply_at = d ? addDays(d, 365 - 30) : null; } }
  const { error } = await sb.from("applications").update(patch).eq("id", appId);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not log the outcome." };
  bump(appId);
  if (outcome === "declined") {
    const { data: profile } = await sb.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
    return { ok: true, data: { feedbackDraft: feedbackRequestDraft({ memberName: profile?.display_name ?? "", eventName: app.events?.name ?? app.event_name_manual ?? "the event" }) } };
  }
  return { ok: true, data: {} };
}

export async function markFeedbackRequested(appId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  await sb.from("applications").update({ feedback_requested_at: new Date().toISOString() }).eq("id", appId).eq("user_id", user.id);
  return { ok: true };
}

export async function authorshipNoteFor(appId: string): Promise<ActionResult<{ note: string }>> {
  const { user, sb } = await me();
  const app = await loadApp(sb, user.id, appId);
  if (!app) return { ok: false, code: "NOT_FOUND", message: "That application is not here." };
  const a = app.authorship?.your_words_pct != null ? app.authorship : authorship(app.answers ?? {}, app.answer_sources ?? {}, app.ai_originals ?? {});
  const { authorshipNote } = await import("@/lib/pipeline/rules");
  return { ok: true, data: { note: authorshipNote(a, PRODUCT_NAME) } };
}

export async function archiveApplication(appId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const { error } = await sb.from("applications").update({ status: "withdrawn", outcome: "withdrawn" }).eq("id", appId).eq("user_id", user.id).in("status", ["planned", "researching", "drafting", "ready"]);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not park it." };
  bump(appId);
  return { ok: true };
}
