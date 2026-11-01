"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { runActionForUser, profileText } from "@/lib/ai/server";
import { STANDARD_PLAN, complianceFlags, datePlan, insertLink, isOfficialUrl, nextMondayOrTuesday, type CopyKit, type PlanItem, type PublicationState, type UploadPack } from "@/lib/amplify/rules";
import type { ScriptDoc } from "@/lib/write/rules";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// AMPLIFY actions (Section 9.2, F4.1 to F4.4, F4.11). Compliance is checked on every text before it is saved;
// blocking flags refuse the save. The official link is the only media reference; the app never touches video.

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}
function bump() { for (const p of ["/amplify/launch", "/today", "/journey"]) revalidatePath(p); }
const codeOf = (msg: string) => msg.split(":")[0].trim();

// Shared context for the four prompts: the locked idea, a short summary of the locked script, the profile, the event.
async function context(userId: string, talkId: string) {
  const sb = await supabaseServer();
  const [{ data: talk }, { data: idea }, { data: profile }, { data: script }] = await Promise.all([
    sb.from("talks").select("id, event_id, event_name_manual, event_date, published_url, events(name)").eq("id", talkId).eq("user_id", userId).maybeSingle(),
    sb.from("ideas").select("title_working, throughline, belief_challenged, antagonist, evidence_notes, audience_action, why_this_speaker").eq("talk_id", talkId).eq("status", "locked").maybeSingle(),
    sb.from("profiles").select("display_name, expertise_line, city, country_code, segment").eq("user_id", userId).maybeSingle(),
    sb.from("scripts").select("locked_version_id").eq("talk_id", talkId).limit(1).maybeSingle(),
  ]);
  let summary = "no locked script";
  if (script?.locked_version_id) {
    const { data: v } = await sb.from("script_versions").select("doc").eq("id", script.locked_version_id).maybeSingle();
    const doc = v?.doc as ScriptDoc | undefined;
    if (doc) summary = doc.sections.map((s) => `${s.title}: ${s.text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")}`).join("\n").slice(0, 2500);
  }
  const eventName = ((talk as any)?.events?.name as string | undefined) ?? (talk as any)?.event_name_manual ?? "the TEDx event";
  const year = talk?.event_date ? new Date(talk.event_date).getUTCFullYear() : new Date().getUTCFullYear();
  return { ideaJson: idea ? JSON.stringify(idea) : "none", profile: profileText(profile), displayName: profile?.display_name ?? "", eventName, year, url: talk?.published_url ?? null, summary };
}

// F4.1 Publication tracker
export async function setPublication(talkId: string, input: { state: PublicationState; url?: string | null; organizerTimeline?: string | null; windowStart?: string | null; windowEnd?: string | null; eventName?: string | null }): Promise<ActionResult<{ published: boolean }>> {
  const { sb } = await me();
  if (input.state === "published" && !isOfficialUrl(input.url)) return { ok: false, code: "OFFICIAL_LINK_REQUIRED", message: "Paste the official YouTube or TED link. The launch plan is dated from it." };
  const { error } = await sb.rpc("set_publication", { p_talk: talkId, p_state: input.state, p_url: input.url?.trim() || null, p_organizer_timeline: input.organizerTimeline?.trim() || null, p_window_start: input.windowStart || null, p_window_end: input.windowEnd || null, p_event_name: input.eventName?.trim() || null });
  if (error) { const code = codeOf(error.message); return { ok: false, code, message: code === "OFFICIAL_LINK_REQUIRED" ? "Paste the official YouTube or TED link." : code === "BAD_WINDOW" ? "The window ends before it starts." : "Could not save." }; }
  // When the link arrives, every copy block gets it and the plan is dated from the next Monday or Tuesday.
  if (input.state === "published" && input.url) {
    const { data: lp } = await sb.from("launch_plans").select("plan, copy_kit").eq("talk_id", talkId).maybeSingle();
    const plan = ((lp?.plan as PlanItem[] | null) ?? []);
    if (plan.length && plan.some((i) => /^launch day/i.test(i.when))) await sb.rpc("save_launch_plan", { p_talk: talkId, p_items: datePlan(plan, nextMondayOrTuesday(new Date())) });
    const kit = (lp?.copy_kit as CopyKit | null) ?? {};
    if (Object.keys(kit).length) await sb.rpc("save_launch_text", { p_talk: talkId, p_kind: "copy_kit", p_value: insertLink(kit, input.url.trim()) });
  }
  bump();
  return { ok: true, data: { published: input.state === "published" } };
}

// F4.2 Upload asset pack (5 credits, Sonnet, linted)
export async function generateUploadPack(talkId: string): Promise<ActionResult<UploadPack>> {
  const { user, sb } = await me();
  const c = await context(user.id, talkId);
  if (c.ideaJson === "none") return { ok: false, code: "IDEA_NOT_LOCKED", message: "Lock your idea first; the pack is written from it." };
  const r = await runActionForUser<UploadPack>("upload_pack", { talkId, idempotencyKey: randomUUID(), vars: { event_name: c.eventName, idea_json: c.ideaJson, summary: c.summary, profile: c.profile } });
  if (!r.ok) return r;
  await sb.rpc("save_launch_text", { p_talk: talkId, p_kind: "upload_pack", p_value: r.result.output });
  bump();
  return { ok: true, data: r.result.output };
}
export async function saveUploadPack(talkId: string, pack: UploadPack): Promise<ActionResult> {
  const { sb } = await me();
  const flags = complianceFlags([...(pack.titles ?? []), pack.description ?? "", pack.bio ?? ""].join("\n")).filter((f) => f.blocking);
  if (flags.length) return { ok: false, code: "COMPLIANCE", message: `${flags[0].rule}: "${flags[0].quote}". ${flags[0].fix}` };
  const { error } = await sb.rpc("save_launch_text", { p_talk: talkId, p_kind: "upload_pack", p_value: pack });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not save." };
  bump();
  return { ok: true };
}

// F4.3 Launch plan: the standard plan costs nothing; the personalized one is 5 credits.
export async function useStandardPlan(talkId: string): Promise<ActionResult<PlanItem[]>> {
  const { user, sb } = await me();
  const { data: talk } = await sb.from("talks").select("publication, published_at").eq("id", talkId).eq("user_id", user.id).maybeSingle();
  const items = talk?.publication === "published" ? datePlan(STANDARD_PLAN, nextMondayOrTuesday(new Date())) : STANDARD_PLAN.map((i) => ({ ...i }));
  const { error } = await sb.rpc("save_launch_plan", { p_talk: talkId, p_items: items.map((i) => ({ ...i, done: false })) });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not save the plan." };
  bump();
  return { ok: true, data: items };
}
export async function generatePlan(talkId: string): Promise<ActionResult<PlanItem[]>> {
  const { user, sb } = await me();
  const c = await context(user.id, talkId);
  const { data: lp } = await sb.from("launch_plans").select("expected_upload_window").eq("talk_id", talkId).maybeSingle();
  const window = lp?.expected_upload_window as string | null;
  const expected = c.url ? nextMondayOrTuesday(new Date()) : window ? (window.match(/\d{4}-\d{2}-\d{2}/g)?.[1] ?? "unknown") : "unknown";
  const r = await runActionForUser<{ items: PlanItem[] }>("launch_plan", { talkId, idempotencyKey: randomUUID(), vars: { expected_date: expected, idea_json: c.ideaJson, profile: c.profile } });
  if (!r.ok) return r;
  let items: PlanItem[] = (r.result.output.items ?? []).map((i) => ({ ...i, done: false }));
  if (c.url) items = datePlan(items, nextMondayOrTuesday(new Date()));
  const { error } = await sb.rpc("save_launch_plan", { p_talk: talkId, p_items: items });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not save the plan." };
  bump();
  return { ok: true, data: items };
}
export async function savePlan(talkId: string, items: PlanItem[]): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("save_launch_plan", { p_talk: talkId, p_items: items.map((i) => ({ when: String(i.when).slice(0, 40), text: String(i.text).slice(0, 500), phase: i.phase, done: !!i.done })) });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not save the plan." };
  bump();
  return { ok: true };
}
export async function setItemDone(talkId: string, index: number, done: boolean): Promise<ActionResult<{ done: number }>> {
  const { sb } = await me();
  const { data, error } = await sb.rpc("set_launch_item_done", { p_talk: talkId, p_index: index, p_done: done });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not update the item." };
  bump();
  return { ok: true, data: { done: Number(data ?? 0) } };
}
export async function datePlanFromLaunch(talkId: string, launchIso: string): Promise<ActionResult> {
  const { sb } = await me();
  const { data: lp } = await sb.from("launch_plans").select("plan").eq("talk_id", talkId).maybeSingle();
  const plan = (lp?.plan as PlanItem[] | null) ?? [];
  if (!plan.length) return { ok: false, code: "NO_PLAN", message: "Make a plan first." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(launchIso)) return { ok: false, code: "BAD_DATE", message: "Pick a launch date." };
  const { error } = await sb.rpc("save_launch_plan", { p_talk: talkId, p_items: datePlan(plan, launchIso) });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not date the plan." };
  bump();
  return { ok: true };
}

// F4.4 Launch copy kit (15 credits, Sonnet, linted)
export async function generateCopyKit(talkId: string): Promise<ActionResult<CopyKit>> {
  const { user, sb } = await me();
  const c = await context(user.id, talkId);
  if (c.ideaJson === "none") return { ok: false, code: "IDEA_NOT_LOCKED", message: "Lock your idea first; the kit is written from it." };
  const r = await runActionForUser<CopyKit>("launch_copy", { talkId, idempotencyKey: randomUUID(), vars: { event_name: c.eventName, idea_json: c.ideaJson, summary: c.summary, youtube_url: c.url ?? "[link]", profile: c.profile } });
  if (!r.ok) return r;
  const { data: lp } = await sb.from("launch_plans").select("copy_kit").eq("talk_id", talkId).maybeSingle();
  const prev = (lp?.copy_kit as CopyKit | null) ?? {};
  let kit: CopyKit = { ...r.result.output, bio_updates: prev.bio_updates };
  if (c.url) kit = insertLink(kit, c.url);
  await sb.rpc("save_launch_text", { p_talk: talkId, p_kind: "copy_kit", p_value: kit });
  bump();
  return { ok: true, data: kit };
}
export async function saveCopyKit(talkId: string, kit: CopyKit): Promise<ActionResult> {
  const { sb } = await me();
  const all = Object.values(kit).flatMap((v) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v) : [])).join("\n");
  const flags = complianceFlags(all).filter((f) => f.blocking);
  if (flags.length) return { ok: false, code: "COMPLIANCE", message: `${flags[0].rule}: "${flags[0].quote}". ${flags[0].fix}` };
  const { error } = await sb.rpc("save_launch_text", { p_talk: talkId, p_kind: "copy_kit", p_value: kit });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not save." };
  bump();
  return { ok: true };
}

// F4.11 Bio and profile updater (3 credits; the free plan has one use through its allowance)
export async function updateBio(talkId: string, current: { linkedin_about: string; website_bio: string; signature_line: string }): Promise<ActionResult<{ linkedin_about: string; website_bio: string; signature_line: string }>> {
  const { user, sb } = await me();
  const c = await context(user.id, talkId);
  const texts = Object.fromEntries(Object.entries(current).map(([k, v]) => [k, String(v ?? "").slice(0, 3000)]));
  const r = await runActionForUser<{ linkedin_about: string; website_bio: string; signature_line: string }>("bio_updater", { talkId, idempotencyKey: randomUUID(), vars: { event_name: c.eventName, year: String(c.year), current_texts: JSON.stringify(texts), idea_json: c.ideaJson, profile: c.profile } });
  if (!r.ok) return r;
  const { data: lp } = await sb.from("launch_plans").select("copy_kit").eq("talk_id", talkId).maybeSingle();
  const kit = ((lp?.copy_kit as CopyKit | null) ?? {});
  await sb.rpc("save_launch_text", { p_talk: talkId, p_kind: "copy_kit", p_value: { ...kit, bio_updates: r.result.output } });
  bump();
  return { ok: true, data: r.result.output };
}

