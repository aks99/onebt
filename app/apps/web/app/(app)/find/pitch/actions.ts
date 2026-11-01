"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { runActionForUser, profileText } from "@/lib/ai/server";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// Pitch Studio actions (6.4, 13.5). The pack is generated only from the locked idea, its expansion, the
// profile, the Prior Stages log and a writing sample. Edits are the member's words; regenerating makes a
// new version; any field can go back to the AI text. The pitch video is filmed on the member's own device;
// the kit here is a script, a checklist and a typed self-review. Nothing is uploaded.

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}
function bump() { revalidatePath("/find/pitch"); revalidatePath("/today"); }

export interface PackFields { titles?: string[]; one_sentence?: string; idea_statement?: string; why_now?: string; why_you?: string; accomplishment?: string; bio_150?: string; bio_250?: string; youtube_bio?: string; pitch_video_script_90s?: string; links?: string; experience_summary?: string; needs_source?: string[] }

export async function generatePack(steer?: string): Promise<ActionResult<{ version: number; flags: number }>> {
  const { user, sb } = await me();
  const talk = await currentTalk(user.id);
  if (!talk) return { ok: false, code: "NO_TALK", message: "Finish onboarding first." };
  const [{ data: idea }, { data: profile }, { data: stages }, { data: sample }, { data: prev }] = await Promise.all([
    sb.from("ideas").select("*").eq("talk_id", talk.id).eq("status", "locked").maybeSingle(),
    sb.from("profiles").select("display_name, expertise_line, city, country_code, segment").eq("user_id", user.id).maybeSingle(),
    sb.from("prior_stages").select("*").eq("user_id", user.id).order("year", { ascending: false }),
    sb.from("writing_samples").select("text").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("pitch_packs").select("fields").eq("talk_id", talk.id).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!idea) return { ok: false, code: "IDEA_NOT_LOCKED", message: "Lock your idea first. The Pitch Pack is written from it." };
  const { data: expansion } = await sb.from("idea_expansions").select("*").eq("idea_id", idea.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const stagesText = (stages ?? []).length ? (stages ?? []).map((r: any) => `${r.month ? `${r.month}/` : ""}${r.year ?? ""}, ${r.city ?? ""}, ${r.organization}, audience ${r.audience_size ?? "unknown"}, topic: ${r.topic}${r.result_line ? `, result: ${r.result_line}` : ""}`).join("\n") : "none";
  const ideaJson = JSON.stringify({ title_working: idea.title_working, throughline: idea.throughline, belief_challenged: idea.belief_challenged, antagonist: idea.antagonist, evidence_notes: idea.evidence_notes, audience_action: idea.audience_action, why_this_speaker: idea.why_this_speaker, talk_type: idea.talk_type });
  const r = await runActionForUser<PackFields>("pitch_pack", {
    talkId: talk.id, idempotencyKey: randomUUID(),
    vars: { idea_json: ideaJson, expansion_json: expansion ? JSON.stringify({ thesis: expansion.thesis, why_it_matters: expansion.why_it_matters, key_points: expansion.key_points, story_candidates: expansion.story_candidates, contrast: expansion.contrast }) : "none", profile: profileText(profile) + (steer ? `\nSteer from the speaker: ${steer.slice(0, 300)}` : ""), prior_stages: stagesText, voice_sample: sample?.text?.slice(0, 3000) ?? "none provided" },
  });
  if (!r.ok) return r;
  const fields: PackFields = { ...r.result.output };
  // Member-owned fields carry over from the previous version (their words stay theirs).
  const prevFields = (prev?.fields as PackFields | undefined) ?? {};
  if (prevFields.links) fields.links = prevFields.links;
  const { data: v } = await sb.rpc("next_pitch_pack_version", { p_talk: talk.id });
  const version = Number(v ?? 1);
  const sources = Object.fromEntries(Object.keys(fields).map((k) => [k, k === "links" ? "user" : "llm"]));
  const { error } = await sb.from("pitch_packs").insert({ user_id: user.id, talk_id: talk.id, version, fields, ai_fields: r.result.output, field_sources: sources, stale: false });
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Generated but not saved. Try again; you were charged once." };
  bump();
  return { ok: true, data: { version, flags: r.result.flags.length } };
}

export async function updatePackField(packId: string, key: keyof PackFields, value: string | string[]): Promise<ActionResult> {
  const { user, sb } = await me();
  const { data: pack } = await sb.from("pitch_packs").select("fields, field_sources").eq("id", packId).eq("user_id", user.id).maybeSingle();
  if (!pack) return { ok: false, code: "NOT_FOUND", message: "That pack is not here." };
  const fields = { ...(pack.fields as PackFields), [key]: key === "titles" ? (Array.isArray(value) ? value.slice(0, 5) : String(value).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 5)) : String(value).slice(0, 20000) };
  const sources = { ...(pack.field_sources as Record<string, string>), [key]: "user" };
  const { error } = await sb.from("pitch_packs").update({ fields, field_sources: sources }).eq("id", packId);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save." };
  bump();
  return { ok: true };
}

export async function resetPackField(packId: string, key: keyof PackFields): Promise<ActionResult> {
  const { user, sb } = await me();
  const { data: pack } = await sb.from("pitch_packs").select("fields, ai_fields, field_sources").eq("id", packId).eq("user_id", user.id).maybeSingle();
  if (!pack) return { ok: false, code: "NOT_FOUND", message: "That pack is not here." };
  const ai = (pack.ai_fields as PackFields)[key];
  if (ai === undefined) return { ok: false, code: "NO_AI_VERSION", message: "There is no AI version of this field." };
  const { error } = await sb.from("pitch_packs").update({ fields: { ...(pack.fields as PackFields), [key]: ai }, field_sources: { ...(pack.field_sources as Record<string, string>), [key]: "llm" } }).eq("id", packId);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not reset." };
  bump();
  return { ok: true };
}

// F1.4.2 text-only kit: the chosen length, the shot checklist ticks and the typed self-review after filming.
export async function savePitchKit(packId: string, kit: { lengthSeconds: 60 | 90 | 120 | 180; checklist: Record<string, boolean>; selfReview: Record<string, string>; linkPasted?: string }): Promise<ActionResult> {
  const { user, sb } = await me();
  if (kit.linkPasted && !/^https?:\/\/\S+$/i.test(kit.linkPasted)) return { ok: false, code: "INVALID", message: "Paste a link (an unlisted YouTube or Vimeo URL), not a file." };
  const { error } = await sb.from("pitch_packs").update({ pitch_kit: { length_seconds: kit.lengthSeconds, checklist: kit.checklist, self_review: Object.fromEntries(Object.entries(kit.selfReview).map(([k, v]) => [k, String(v).slice(0, 1000)])), link: kit.linkPasted ?? null, saved_at: new Date().toISOString() } }).eq("id", packId).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save." };
  bump();
  return { ok: true };
}

export async function saveWritingSample(text: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const t = text.trim();
  if (t.length < 200) return { ok: false, code: "TOO_SHORT", message: "A writing sample needs at least 200 characters so the pack can sound like you." };
  const { error } = await sb.from("writing_samples").insert({ user_id: user.id, text: t.slice(0, 20000), source: "pasted" });
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save the sample." };
  bump();
  return { ok: true };
}
