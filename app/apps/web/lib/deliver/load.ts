import { supabaseServer } from "@/lib/supabase/server";
import { currentTalk, type Talk } from "@/lib/talks";
import { SAMPLE_SCRIPT, SAMPLE_SLOT_MINUTES, SAMPLE_TITLE } from "@/lib/deliver/sample";
import { SAMPLE_BEATS } from "@/components/deliver/sample-progress";
import type { Beat, BeatRow } from "@/lib/deliver/rules";
import type { ScriptDoc } from "@/lib/write/rules";

// One loader for the DELIVER screens: the talk, the locked version, the beat map with progress, member access.
// The free plan (and anyone who asks with ?sample=1) gets the sample script; its progress lives in the browser.

export interface DeliverContext {
  talk: Talk; sample: boolean; scriptLocked: boolean; lockedVersion: number | null; title: string; slotMinutes: number;
  doc: ScriptDoc | null; rows: BeatRow[]; beats: Beat[]; wordCount: number; hasMemberAccess: boolean;
}

export async function loadDeliver(userId: string, wantSample: boolean): Promise<DeliverContext | null> {
  const talk = await currentTalk(userId);
  if (!talk) return null;
  const sb = await supabaseServer();
  const [{ data: script }, { data: access }] = await Promise.all([
    sb.from("scripts").select("id, locked_version_id").eq("talk_id", talk.id).eq("user_id", userId).limit(1).maybeSingle(),
    sb.rpc("has_member_access", { p_user: userId }),
  ]);
  const hasMemberAccess = !!access;
  const scriptLocked = !!script?.locked_version_id;
  const sample = wantSample || !hasMemberAccess;
  if (sample) {
    return { talk, sample: true, scriptLocked, lockedVersion: null, title: SAMPLE_TITLE, slotMinutes: SAMPLE_SLOT_MINUTES, doc: SAMPLE_SCRIPT, rows: SAMPLE_BEATS.map((b) => ({ ...b, state: "new" as const, next_review_at: new Date().toISOString().slice(0, 10), interval_days: 1, hits: 0, misses: 0, due: true })), beats: SAMPLE_BEATS, wordCount: SAMPLE_SCRIPT.sections.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0), hasMemberAccess };
  }
  let doc: ScriptDoc | null = null; let lockedVersion: number | null = null; let wordCount = 0;
  if (scriptLocked) {
    const { data: v } = await sb.from("script_versions").select("doc, version, word_count").eq("id", script!.locked_version_id!).maybeSingle();
    doc = (v?.doc as ScriptDoc) ?? null; lockedVersion = v?.version ?? null; wordCount = v?.word_count ?? 0;
  }
  const { data: rows } = await sb.rpc("beat_map", { p_talk: talk.id });
  const beatRows = ((rows ?? []) as BeatRow[]);
  return { talk, sample: false, scriptLocked, lockedVersion, title: talk.title ?? "Your talk", slotMinutes: talk.slot_minutes, doc, rows: beatRows, beats: beatRows, wordCount, hasMemberAccess };
}
