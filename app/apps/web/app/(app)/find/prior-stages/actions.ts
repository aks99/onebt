"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { runActionForUser, profileText } from "@/lib/ai/server";
import { framingViolations } from "@/lib/find/ideaRules";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";
import { validateStage, type StageInput } from "@/lib/find/priorStages";

// Prior Stages (6.5). Five described facts per entry, an optional result line and an optional public link.
// No upload control exists anywhere in this module. Framing and the summary obey R10 and are checked again here.

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}

export async function saveStage(input: StageInput, id?: string): Promise<ActionResult<{ id: string }>> {
  const errors = validateStage(input);
  if (Object.keys(errors).length) return { ok: false, code: "INVALID", message: Object.values(errors)[0], detail: errors };
  const { user, sb } = await me();
  const row = { user_id: user.id, month: input.month, year: input.year, city: input.city?.trim() || null, country_code: input.countryCode || null, organization: input.organization.trim(),
    audience_size: input.audienceSize, topic: input.topic.trim(), result_line: input.resultLine?.trim() || null, link: input.link?.trim() || null };
  const q = id ? sb.from("prior_stages").update(row).eq("id", id).eq("user_id", user.id).select("id").single() : sb.from("prior_stages").insert(row).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, code: "SAVE_FAILED", message: "Could not save this stage. Try again." };
  if (!id) await sb.rpc("log_activity", { p_kind: "prior_stage_logged" });
  revalidatePath("/find/prior-stages");
  return { ok: true, data: { id: data.id } };
}

export async function deleteStage(id: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const { error } = await sb.from("prior_stages").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, code: "DELETE_FAILED", message: "Could not remove it. Try again." };
  revalidatePath("/find/prior-stages");
  return { ok: true };
}

// F1.5.3 fresh-idea check against the talk's locked idea; the database function is the authority.
export async function checkOverlap(stageId: string, talkId: string): Promise<ActionResult<{ score: number; isOverlap: boolean; sharedWords: string[] } | null>> {
  const { sb } = await me();
  const { data, error } = await sb.rpc("prior_stage_overlap", { p_stage: stageId, p_talk: talkId });
  if (error) return { ok: false, code: "CHECK_FAILED", message: "Could not run the check." };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, data: row ? { score: Number(row.score), isOverlap: !!row.is_overlap, sharedWords: row.shared_words ?? [] } : null };
}

function stagesText(rows: any[]) {
  return rows.map((r) => `- id ${r.id}: ${r.month ? `${r.month}/` : ""}${r.year ?? "year not given"}, ${r.city ?? "city not given"}, ${r.organization}, audience ${r.audience_size ?? "not given"}, topic: ${r.topic}${r.result_line ? `, result: ${r.result_line}` : ""}`).join("\n");
}
function ideaJson(i: Record<string, unknown>) {
  const pick = ["title_working", "throughline", "belief_challenged", "antagonist", "evidence_notes", "audience_action", "why_this_speaker"];
  return JSON.stringify(Object.fromEntries(pick.map((k) => [k, i[k] ?? ""])));
}

// F1.5.2 Strong-candidate framing. Output is checked sentence by sentence for the fresh-idea rule; a violation
// is reported and the text is not shown as approved.
export async function generateFraming(talkId: string): Promise<ActionResult<{ experience: string; firstTime: string; overlap: { entry_id: string; why: string }[]; violations: string[]; flags: number }>> {
  const { user, sb } = await me();
  const [{ data: stages }, { data: idea }] = await Promise.all([
    sb.from("prior_stages").select("*").eq("user_id", user.id).order("year", { ascending: false }),
    sb.from("ideas").select("*").eq("talk_id", talkId).eq("status", "locked").maybeSingle(),
  ]);
  if (!idea) return { ok: false, code: "IDEA_NOT_LOCKED", message: "Lock your idea first; the framing keeps it fresh against your other talks." };
  if (!stages?.length) return { ok: false, code: "NO_STAGES", message: "Add at least one stage first. If you have none, your idea carries the application." };
  const r = await runActionForUser<{ experience_sentences: string; first_time_sentence: string; overlap_warning: { entry_id: string; why: string }[] }>("prior_stages_framing", {
    talkId, idempotencyKey: randomUUID(), vars: { prior_stages: stagesText(stages), idea_json: ideaJson(idea) },
  });
  if (!r.ok) return r;
  const o = r.result.output;
  const violations = framingViolations(`${o.experience_sentences} ${o.first_time_sentence}`);
  return { ok: true, data: { experience: o.experience_sentences, firstTime: o.first_time_sentence, overlap: o.overlap_warning ?? [], violations, flags: r.result.flags.length } };
}

// F1.5.5 Experience summary for forms (about 60 words).
export async function generateExperienceSummary(talkId: string): Promise<ActionResult<{ paragraph: string; wordCount: number; violations: string[] }>> {
  const { user, sb } = await me();
  const [{ data: stages }, { data: idea }, { data: profile }] = await Promise.all([
    sb.from("prior_stages").select("*").eq("user_id", user.id).order("year", { ascending: false }),
    sb.from("ideas").select("*").eq("talk_id", talkId).eq("status", "locked").maybeSingle(),
    sb.from("profiles").select("display_name, expertise_line, city, country_code").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!idea) return { ok: false, code: "IDEA_NOT_LOCKED", message: "Lock your idea first." };
  const r = await runActionForUser<{ paragraph: string; word_count: number; used_entries: string[] }>("experience_summary", {
    talkId, idempotencyKey: randomUUID(), vars: { prior_stages: stages?.length ? stagesText(stages) : "none", profile: profileText(profile), idea_json: ideaJson(idea) },
  });
  if (!r.ok) return r;
  return { ok: true, data: { paragraph: r.result.output.paragraph, wordCount: r.result.output.word_count, violations: framingViolations(r.result.output.paragraph) } };
}
