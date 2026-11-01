"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { runActionForUser, profileText } from "@/lib/ai/server";
import { INTERVIEW_PROMPTS, renderDossier, validateAnswer, type Answers } from "@/lib/find/interview";
import { lockCheck, type Scorecard } from "@/lib/find/ideaRules";

// Idea Lab server actions (6.1). Every AI call goes through runActionForUser, so plan, allowance, fair use,
// credits and the linter apply. Rows are written with RLS on as the member.

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; code: string; message: string; detail?: unknown };

const EDITABLE = ["title_working", "throughline", "belief_challenged", "antagonist", "evidence_notes", "audience_action", "why_this_speaker"] as const;
type EditableField = typeof EDITABLE[number];

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}

async function dossierFor(sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string, talkId: string) {
  const { data } = await sb.from("idea_dossiers").select("*").eq("talk_id", talkId).eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (data) return data;
  const { data: created, error } = await sb.from("idea_dossiers").insert({ user_id: userId, talk_id: talkId, answers: {} }).select("*").single();
  if (error) throw new Error(error.message);
  return created;
}

// F1.1.1: one answer at a time, autosaved. Short answers are saved as drafts but reported back as incomplete.
export async function saveInterviewAnswer(talkId: string, key: string, text: string): Promise<ActionResult<{ complete: boolean }>> {
  const { user, sb } = await me();
  if (!INTERVIEW_PROMPTS.some((p) => p.key === key)) return { ok: false, code: "BAD_KEY", message: "Unknown prompt." };
  const d = await dossierFor(sb, user.id, talkId);
  const answers = { ...((d.answers as Answers) ?? {}), [key]: text.slice(0, 4000) };
  const { error } = await sb.from("idea_dossiers").update({ answers }).eq("id", d.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save. Your text is still in the box; try again." };
  const problem = validateAnswer(key, text);
  return { ok: true, data: { complete: problem === null } };
}

export async function savePastedMaterial(talkId: string, text: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const d = await dossierFor(sb, user.id, talkId);
  const { error } = await sb.from("idea_dossiers").update({ pasted_material: text.slice(0, 20000) }).eq("id", d.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save. Try again." };
  return { ok: true };
}

interface GeneratedIdea { title_working: string; throughline: string; belief_challenged: string; antagonist: string; evidence_base: string; audience_action: string; why_this_speaker: string; talk_type: string; risk_notes: string }

// F1.1.2 + F1.1.3: one batch of five ideas, each scored. The batch is one idea_batch allowance; each
// scorecard counts toward the scorecards fair-use cap (Appendix C, 1 Nov 2026). A scorecard that fails
// leaves the idea unscored and the member can rescore it.
export async function generateIdeas(talkId: string, steer?: string): Promise<ActionResult<{ batchId: string; count: number; flags: number }>> {
  const { user, sb } = await me();
  const [{ data: profile }, d] = await Promise.all([
    sb.from("profiles").select("display_name, expertise_line, city, country_code, segment").eq("user_id", user.id).maybeSingle(),
    dossierFor(sb, user.id, talkId),
  ]);
  const dossier = renderDossier((d.answers as Answers) ?? {}, d.pasted_material);
  const gen = await runActionForUser<{ ideas: GeneratedIdea[] }>("idea_generator", {
    talkId, dossierId: d.id, idempotencyKey: randomUUID(),
    vars: { profile: profileText(profile), dossier, steer: steer?.trim() || "none", segment: profile?.segment ?? "other" },
  });
  if (!gen.ok) return gen;
  const batchId = randomUUID();
  const rows = gen.result.output.ideas.slice(0, 5).map((i) => ({
    user_id: user.id, talk_id: talkId, dossier_id: d.id, batch_id: batchId, status: "candidate", source: "llm",
    title_working: i.title_working, throughline: clampWords(i.throughline, 15), belief_challenged: i.belief_challenged, antagonist: i.antagonist,
    evidence_notes: i.evidence_base, audience_action: i.audience_action, why_this_speaker: i.why_this_speaker, talk_type: i.talk_type, risk_notes: i.risk_notes,
  }));
  const { data: inserted, error } = await sb.from("ideas").insert(rows).select("id");
  if (error || !inserted) return { ok: false, code: "SAVE_FAILED", message: "The ideas were generated but could not be saved. Try again; you were charged once." };
  await sb.rpc("log_activity", { p_kind: "idea_batch", p_talk: talkId });
  await Promise.all(inserted.map((r) => scoreIdeaInternal(r.id).catch(() => null)));
  revalidatePath("/find/idea-lab"); revalidatePath("/today"); revalidatePath("/onboarding");
  return { ok: true, data: { batchId, count: inserted.length, flags: gen.result.flags.length } };
}

function clampWords(s: string, n: number) {
  const words = (s ?? "").trim().split(/\s+/);
  return words.length <= n ? (s ?? "").trim() : words.slice(0, n).join(" ");
}

function ideaJson(i: Record<string, unknown>) {
  const pick = ["title_working", "throughline", "belief_challenged", "antagonist", "evidence_notes", "audience_action", "why_this_speaker", "talk_type"];
  return JSON.stringify(Object.fromEntries(pick.map((k) => [k, i[k] ?? ""])));
}

async function scoreIdeaInternal(ideaId: string): Promise<ActionResult<Scorecard>> {
  const { user, sb } = await me();
  const { data: idea } = await sb.from("ideas").select("*").eq("id", ideaId).eq("user_id", user.id).maybeSingle();
  if (!idea) return { ok: false, code: "NOT_FOUND", message: "That idea is not here." };
  const r = await runActionForUser<Scorecard>("idea_scorecard", { talkId: idea.talk_id, idempotencyKey: randomUUID(), vars: { idea_json: ideaJson(idea) } });
  if (!r.ok) return r;
  const score = { ...r.result.output, flags: r.result.flags, scored_at: new Date().toISOString() };
  await sb.from("ideas").update({ score }).eq("id", ideaId);
  await sb.rpc("log_activity", { p_kind: "idea_scored", p_talk: idea.talk_id });
  return { ok: true, data: r.result.output };
}

export async function rescoreIdea(ideaId: string) {
  const r = await scoreIdeaInternal(ideaId);
  revalidatePath(`/find/idea-lab/${ideaId}`); revalidatePath("/find/idea-lab");
  return r;
}

// F1.1.8 Idea Expansion
export async function expandIdea(ideaId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const { data: idea } = await sb.from("ideas").select("*").eq("id", ideaId).eq("user_id", user.id).maybeSingle();
  if (!idea) return { ok: false, code: "NOT_FOUND", message: "That idea is not here." };
  const [{ data: profile }, { data: d }] = await Promise.all([
    sb.from("profiles").select("display_name, expertise_line, city, country_code, segment").eq("user_id", user.id).maybeSingle(),
    idea.dossier_id ? sb.from("idea_dossiers").select("answers, pasted_material").eq("id", idea.dossier_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const r = await runActionForUser<{ thesis: string; why_it_matters: string; key_points: string[]; story_candidates: unknown[]; evidence_to_find: string[]; contrast: unknown }>("idea_expansion", {
    talkId: idea.talk_id, idempotencyKey: randomUUID(),
    vars: { idea_json: ideaJson(idea), dossier: d ? renderDossier((d.answers as Answers) ?? {}, d.pasted_material) : "none provided", profile: profileText(profile) },
  });
  if (!r.ok) return r;
  const o = r.result.output;
  const { error } = await sb.from("idea_expansions").insert({ user_id: user.id, idea_id: ideaId, thesis: o.thesis, why_it_matters: o.why_it_matters, key_points: o.key_points, story_candidates: o.story_candidates, evidence_to_find: o.evidence_to_find, contrast: o.contrast, source: "llm" });
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Generated but not saved. Try again." };
  revalidatePath(`/find/idea-lab/${ideaId}`);
  return { ok: true };
}

// F1.1.5 Throughline Builder: returns options; the member picks or edits. Nothing is written until they do.
export async function refineThroughline(ideaId: string, steer: string): Promise<ActionResult<{ recommended: string; alternatives: string[] }>> {
  const { user, sb } = await me();
  const { data: idea } = await sb.from("ideas").select("*").eq("id", ideaId).eq("user_id", user.id).maybeSingle();
  if (!idea) return { ok: false, code: "NOT_FOUND", message: "That idea is not here." };
  const r = await runActionForUser<{ recommended: string; alternatives: string[] }>("throughline_refine", {
    talkId: idea.talk_id, idempotencyKey: randomUUID(), vars: { throughline: idea.throughline ?? "", idea_json: ideaJson(idea), steer: steer?.trim() || "none" },
  });
  if (!r.ok) return r;
  return { ok: true, data: { recommended: clampWords(r.result.output.recommended, 15), alternatives: r.result.output.alternatives.map((a) => clampWords(a, 15)) } };
}

// Your words: any field can be edited; the edit is the member's and is labelled so.
export async function updateIdeaField(ideaId: string, field: EditableField, value: string): Promise<ActionResult> {
  const { user, sb } = await me();
  if (!EDITABLE.includes(field)) return { ok: false, code: "BAD_FIELD", message: "That field cannot be edited." };
  const v = field === "throughline" ? clampWords(value, 15) : value.slice(0, 2000);
  const { error } = await sb.from("ideas").update({ [field]: v, source: "user" }).eq("id", ideaId).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save that edit." };
  revalidatePath(`/find/idea-lab/${ideaId}`);
  return { ok: true };
}

// F1.1.9 Idea Lock. The database function is the authority; lockCheck gives the same answer early.
export async function lockIdea(ideaId: string, overrideReason?: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const { data: idea } = await sb.from("ideas").select("score, talk_id").eq("id", ideaId).eq("user_id", user.id).maybeSingle();
  if (!idea) return { ok: false, code: "NOT_FOUND", message: "That idea is not here." };
  const early = lockCheck(idea.score as Scorecard | null, overrideReason);
  if (!early.ok) return { ok: false, code: early.code, message: early.message, detail: "criteria" in early ? early.criteria : undefined };
  const { error } = await sb.rpc("lock_idea", { p_idea: ideaId, p_override_reason: overrideReason?.trim() || null });
  if (error) {
    const code = error.message.split(":")[0].trim();
    const messages: Record<string, string> = {
      TRIAL_LIMIT: "Your trial covers one locked idea. Become a member to lock more.",
      ANOTHER_IDEA_LOCKED: "Another idea is locked on this talk. Unlock it first.",
      IDEA_GATE_FAILED: "This cannot be locked yet: fix Idea, not topic and Arguable first.",
    };
    return { ok: false, code, message: messages[code] ?? "Could not lock the idea. Try again." };
  }
  revalidatePath("/find/idea-lab"); revalidatePath(`/find/idea-lab/${ideaId}`); revalidatePath("/today"); revalidatePath("/journey");
  return { ok: true };
}

export async function unlockIdea(talkId: string, reason: string): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("unlock_idea", { p_talk: talkId, p_reason: reason });
  if (error) return { ok: false, code: error.message.split(":")[0].trim(), message: error.message.startsWith("REASON_REQUIRED") ? "Say in a few words why, so your record stays honest." : "Could not unlock. Try again." };
  revalidatePath("/find/idea-lab"); revalidatePath("/today"); revalidatePath("/journey");
  return { ok: true };
}

export async function archiveIdea(ideaId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const { error } = await sb.from("ideas").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", ideaId).eq("user_id", user.id).neq("status", "locked");
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not archive." };
  revalidatePath("/find/idea-lab");
  return { ok: true };
}

// S1.4 "Pick this" during onboarding: marks the preferred candidate without locking (talks.idea_id stays null).
export async function pickIdea(ideaId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const { data: idea } = await sb.from("ideas").select("talk_id, title_working").eq("id", ideaId).eq("user_id", user.id).maybeSingle();
  if (!idea) return { ok: false, code: "NOT_FOUND", message: "That idea is not here." };
  const { error } = await sb.from("talks").update({ title: idea.title_working }).eq("id", idea.talk_id).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save your pick." };
  return { ok: true };
}
