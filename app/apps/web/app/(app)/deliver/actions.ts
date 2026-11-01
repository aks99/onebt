"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { runActionForUser } from "@/lib/ai/server";
import { splitBeats, verifyBeats } from "@/lib/deliver/rules";
import type { ScriptDoc } from "@/lib/write/rules";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// DELIVER actions (Section 8, F3.1 to F3.7). Text only. The beat map is built from the locked version and verified
// word for word in the browser and again in the database; drills write hits and misses; the timer saves a duration.
// Nothing here receives audio, video or a file.

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}
function bump() { for (const p of ["/deliver/memorize", "/deliver/timer", "/today", "/journey"]) revalidatePath(p); }
const codeOf = (msg: string) => msg.split(":")[0].trim();

export interface BeatInput { order: number; section_id: string; text: string; first_words: string; purpose: string; target_seconds: number }

// F3.1: Haiku splits the locked script (2 credits); the split is verified against the script and, if the model's
// beats fail the word-for-word check, the deterministic splitter is used instead and the member is told.
export async function buildBeatMap(talkId: string): Promise<ActionResult<{ count: number; usedFallback: boolean }>> {
  const { user, sb } = await me();
  const { data: script } = await sb.from("scripts").select("id, locked_version_id, target_wpm, slot_minutes").eq("talk_id", talkId).eq("user_id", user.id).limit(1).maybeSingle();
  if (!script?.locked_version_id) return { ok: false, code: "SCRIPT_NOT_LOCKED", message: "Lock your script first; the beat map is built from the locked version." };
  const { data: v } = await sb.from("script_versions").select("doc").eq("id", script.locked_version_id).maybeSingle();
  if (!v) return { ok: false, code: "NOT_FOUND", message: "Locked version not found." };
  const doc = v.doc as ScriptDoc;
  const r = await runActionForUser<{ beats: BeatInput[] }>("beat_map", { talkId, scriptId: script.id, idempotencyKey: randomUUID(), vars: { script_json: JSON.stringify(doc.sections.map((s) => ({ id: s.id, kind: s.kind, title: s.title, text: s.text, target_seconds: s.target_seconds }))), target_wpm: String(script.target_wpm ?? 150) } });
  if (!r.ok) return r;
  let beats: BeatInput[] = r.result.output?.beats ?? [];
  let usedFallback = false;
  const check = verifyBeats(doc, beats);
  if (!check.ok || beats.length < 1) { beats = splitBeats(doc, script.target_wpm ?? 150).map((b) => ({ ...b, section_id: b.section_id ?? "", purpose: b.purpose ?? "idea" })); usedFallback = true; }
  const { data: count, error } = await sb.rpc("build_beat_map", { p_version: script.locked_version_id, p_beats: beats });
  if (error) { const code = codeOf(error.message); return { ok: false, code, message: code === "BEATS_MISMATCH" ? "The beats did not match your script word for word. Try again." : code === "SCRIPT_NOT_LOCKED" ? "Lock your script first." : "Could not save the beat map." }; }
  bump();
  return { ok: true, data: { count: Number(count ?? beats.length), usedFallback } };
}

export async function updateBeat(beatId: string, patch: { first_words?: string; stage_note?: string | null }): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("update_beat", { p_beat: beatId, p_first_words: patch.first_words ?? null, p_stage_note: patch.stage_note === undefined ? null : (patch.stage_note ?? "") });
  if (error) { const code = codeOf(error.message); return { ok: false, code, message: code === "CUE_REQUIRED" ? "The cue needs at least one word." : "Could not save." }; }
  bump();
  return { ok: true };
}

// F3.2 to F3.5: every drill ends each beat with a hit or a miss; the schedule moves in the database.
export async function drillResult(beatId: string, result: "hit" | "miss"): Promise<ActionResult<{ state: string; next_review_at: string; interval_days: number }>> {
  const { sb } = await me();
  const { data, error } = await sb.rpc("record_drill_result", { p_beat: beatId, p_result: result });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not record that. The drill continues." };
  bump();
  const row = (Array.isArray(data) ? data[0] : data) as { state: string; next_review_at: string; interval_days: number };
  return { ok: true, data: row };
}

// A finished drill of any length counts as one practice block toward the week.
export async function logDrillBlock(talkId: string): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("log_activity", { p_kind: "drill_block", p_talk: talkId });
  if (error) return { ok: false, code: codeOf(error.message), message: "Could not log the drill." };
  bump();
  return { ok: true };
}

// F3.7: the timer's duration, the beat reached and the locked version go to timed_runs; measured pace follows.
export async function saveRun(talkId: string, durationS: number, beatReached: number | null): Promise<ActionResult<{ id: string; measured_wpm: number | null; under_slot: boolean }>> {
  const { sb } = await me();
  const d = Math.round(Number(durationS));
  if (!Number.isFinite(d) || d <= 0) return { ok: false, code: "RUN_NEEDS_DURATION", message: "A run is saved with its duration. Start the timer first." };
  const { data, error } = await sb.rpc("save_timed_run", { p_talk: talkId, p_duration_s: d, p_beat_reached: beatReached, p_mode: "timer" });
  if (error) { const code = codeOf(error.message); return { ok: false, code, message: code === "RUN_NEEDS_DURATION" ? "A run is saved with its duration." : "Could not save the run." }; }
  const run = (Array.isArray(data) ? data[0] : data) as { id: string };
  const { data: talk } = await sb.from("talks").select("measured_wpm, slot_minutes").eq("id", talkId).maybeSingle();
  bump();
  return { ok: true, data: { id: run?.id, measured_wpm: talk?.measured_wpm ?? null, under_slot: d <= (talk?.slot_minutes ?? 10) * 60 } };
}

export async function setTargetWpm(talkId: string, wpm: number): Promise<ActionResult> {
  const { user, sb } = await me();
  const w = Math.round(Number(wpm));
  if (!Number.isFinite(w) || w < 110 || w > 190) return { ok: false, code: "BAD_WPM", message: "Pick a pace between 110 and 190 words a minute." };
  const { error } = await sb.from("talks").update({ target_wpm: w }).eq("id", talkId).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save." };
  bump();
  return { ok: true };
}
