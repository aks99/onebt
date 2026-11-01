import { formatClock, wordsIn, type ScriptDoc } from "@/lib/write/rules";

// DELIVER core (Section 8, F3.1 to F3.7). Text only: the app never hears or sees a rehearsal. These rules split a
// locked script into beats, verify a beat map word for word, build the four drills, mirror the spaced schedule and
// place the checkpoints and ending points on the practice timer's track. Everything here runs in the browser.

export interface Beat { id: string; order: number; section_id: string | null; text: string; first_words: string; purpose: string | null; target_seconds: number; stage_note: string | null }
export type BeatState = "new" | "learning" | "known" | "cold";
export interface BeatProgress { beat_id: string; state: BeatState; next_review_at: string; interval_days: number; hits: number; misses: number }
export interface BeatRow extends Beat { state: BeatState; next_review_at: string; interval_days: number; hits: number; misses: number; due: boolean }

export const BEAT_RANGE: [number, number] = [12, 20];
export const STATES: { key: BeatState; label: string; dots: number }[] = [
  { key: "new", label: "new", dots: 1 }, { key: "learning", label: "learning", dots: 2 }, { key: "known", label: "known", dots: 3 }, { key: "cold", label: "cold", dots: 4 },
];
export const INTERVALS = [1, 3, 7, 14];

export function normalizeWs(t: string) { return (t ?? "").trim().replace(/\s+/g, " "); }
export function firstWords(text: string, n = 3) { return normalizeWs(text).split(" ").slice(0, n).join(" "); }

// Purpose word for a beat from its section kind (the model names it; this is the fallback and the sample's rule).
const PURPOSE: Record<string, string> = { hook: "care", care: "care", idea: "idea", evidence: "evidence", implication: "implication", cta: "action", close: "close" };

// Deterministic split: sections, then paragraphs, then sentences grouped to land inside 12 to 20 beats.
// Used for the free plan's sample script, as the fallback when the model's beats fail verification, and to
// verify that any beat map reproduces the script exactly.
export function splitBeats(doc: ScriptDoc, wpm = 150): Omit<Beat, "id" | "stage_note">[] {
  const units: { section_id: string; kind: string; text: string }[] = [];
  for (const s of doc.sections) {
    const paras = s.text.split(/\n\s*\n/).map((p) => normalizeWs(p)).filter(Boolean);
    for (const p of paras) {
      const sentences = p.match(/[^.!?]+[.!?]+["”’)]?|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [p];
      units.push(...sentences.map((text) => ({ section_id: s.id, kind: s.kind, text })));
    }
  }
  const totalWords = units.reduce((n, u) => n + wordsIn(u.text), 0);
  const target = Math.min(BEAT_RANGE[1], Math.max(BEAT_RANGE[0], Math.round(totalWords / 90)));
  const perBeat = Math.max(1, totalWords / target);
  const beats: Omit<Beat, "id" | "stage_note">[] = [];
  let cur: { section_id: string; kind: string; parts: string[]; words: number } | null = null;
  const flush = () => { if (cur && cur.parts.length) { const text = cur.parts.join(" "); beats.push({ order: beats.length + 1, section_id: cur.section_id, text, first_words: firstWords(text), purpose: PURPOSE[cur.kind] ?? "idea", target_seconds: Math.max(1, Math.round((wordsIn(text) / wpm) * 60)) }); } cur = null; };
  for (const u of units) {
    const w = wordsIn(u.text);
    if (!cur || cur.section_id !== u.section_id || (cur.words + w > perBeat * 1.15 && cur.words >= perBeat * 0.6)) { flush(); cur = { section_id: u.section_id, kind: u.kind, parts: [], words: 0 }; }
    cur.parts.push(u.text); cur.words += w;
  }
  flush();
  // Too few beats: split the longest ones at a sentence boundary until the floor is reached (when there are sentences to split).
  let guard = 40;
  while (beats.length < BEAT_RANGE[0] && guard-- > 0) {
    const i = beats.map((b, k) => [wordsIn(b.text), k] as const).sort((a, b) => b[0] - a[0])[0]?.[1];
    if (i === undefined) break;
    const sentences = beats[i].text.match(/[^.!?]+[.!?]+["”’)]?|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [];
    if (sentences.length < 2) break;
    const half = Math.ceil(sentences.length / 2);
    const a = sentences.slice(0, half).join(" "), b = sentences.slice(half).join(" ");
    const mk = (text: string) => ({ ...beats[i], text, first_words: firstWords(text), target_seconds: Math.max(1, Math.round((wordsIn(text) / wpm) * 60)) });
    beats.splice(i, 1, mk(a), mk(b));
  }
  // Too many: merge the shortest neighbour pairs inside one section.
  guard = 40;
  while (beats.length > BEAT_RANGE[1] && guard-- > 0) {
    let best = -1, bestWords = Infinity;
    for (let k = 0; k < beats.length - 1; k++) { if (beats[k].section_id !== beats[k + 1].section_id) continue; const w = wordsIn(beats[k].text) + wordsIn(beats[k + 1].text); if (w < bestWords) { bestWords = w; best = k; } }
    if (best < 0) break;
    const text = `${beats[best].text} ${beats[best + 1].text}`;
    beats.splice(best, 2, { ...beats[best], text, first_words: firstWords(text), target_seconds: beats[best].target_seconds + beats[best + 1].target_seconds });
  }
  return beats.map((b, k) => ({ ...b, order: k + 1 }));
}

// A beat map is valid only if the beats reproduce the script word for word, in order, and each cue is its beat's opening.
export function verifyBeats(doc: ScriptDoc, beats: { order: number; text: string; first_words: string }[]): { ok: boolean; reason?: string } {
  if (!beats.length) return { ok: false, reason: "no beats" };
  const script = normalizeWs(doc.sections.map((s) => s.text).join(" "));
  const joined = normalizeWs([...beats].sort((a, b) => a.order - b.order).map((b) => b.text).join(" "));
  if (script !== joined) return { ok: false, reason: "the beats do not reproduce the script word for word" };
  const badCue = beats.find((b) => b.first_words && !normalizeWs(b.text).toLowerCase().startsWith(normalizeWs(b.first_words).toLowerCase()));
  if (badCue) return { ok: false, reason: `beat ${badCue.order}'s cue is not its opening words` };
  return { ok: true };
}

// --- Spaced schedule (F3.6), mirrored from record_drill_result in the database ----------------------
export function nextReview(p: { interval_days: number }, result: "hit" | "miss", today = new Date()): { interval_days: number; state: BeatState; next_review_at: string } {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (result === "miss") { d.setUTCDate(d.getUTCDate() + 1); return { interval_days: 1, state: "learning", next_review_at: d.toISOString().slice(0, 10) }; }
  const next = p.interval_days === 1 ? 3 : p.interval_days === 3 ? 7 : 14;
  d.setUTCDate(d.getUTCDate() + next);
  return { interval_days: next, state: next >= 14 ? "cold" : next >= 7 ? "known" : "learning", next_review_at: d.toISOString().slice(0, 10) };
}
export function coverage(rows: { state: BeatState }[]) { const total = rows.length; const mastered = rows.filter((r) => r.state === "known" || r.state === "cold").length; return { total, mastered, percent: total ? Math.round((mastered / total) * 100) : 0 }; }
export function dueToday(rows: BeatRow[]) { return rows.filter((r) => r.due); }
export function nextDueDate(rows: BeatRow[]): string | null { const future = rows.filter((r) => !r.due).map((r) => r.next_review_at).sort(); return future[0] ?? null; }

// Drill queue: due beats first in script order, then new, then the rest (a drill may run on every beat).
export type DrillKind = "read_cover_recite" | "cue_cards" | "blank_fill" | "chaining";
export const DRILLS: { key: DrillKind; name: string; how: string; source: string }[] = [
  { key: "read_cover_recite", name: "Read, cover, recite", how: "Read the beat, hide it, say it aloud to yourself, then mark it.", source: "Retrieval beats re-reading (Roediger and Karpicke 2006, A118)" },
  { key: "cue_cards", name: "Cue cards", how: "Only the first three words show. Fill the rest from memory, then reveal.", source: "Organizer-approved backup card practice (A25)" },
  { key: "blank_fill", name: "Blank-fill", how: "10, then 30, then 60 percent of the words are removed. Type or say the missing words.", source: "Cloze retrieval (A118)" },
  { key: "chaining", name: "Bottom-up chaining", how: "Learn the last beat first, then add the one before it each round, so the ending is the part you know best.", source: "Speakers' reported technique (A112)" },
];
export function drillQueue(rows: BeatRow[], onlyDue: boolean) {
  const ordered = [...rows].sort((a, b) => a.order - b.order);
  if (onlyDue) { const due = ordered.filter((r) => r.due); return due.length ? due : ordered; }
  const rank = (r: BeatRow) => (r.due ? 0 : r.state === "new" ? 1 : 2);
  return ordered.sort((a, b) => rank(a) - rank(b) || a.order - b.order);
}

// Blank-fill (F3.4): remove a deterministic share of the words. Short words and the first two words stay so the
// beat is still recognizable; the removed words are the answers for typed scoring.
export const BLANK_LEVELS = [10, 30, 60] as const;
export function blankFill(text: string, percent: number, seed = 1): { tokens: { word: string; blank: boolean }[]; answers: string[] } {
  const words = normalizeWs(text).split(" ");
  const candidates = words.map((w, i) => ({ w, i })).filter(({ w, i }) => i >= 2 && w.replace(/[^A-Za-z0-9'’]/g, "").length >= 3);
  const want = Math.max(1, Math.round((words.length * percent) / 100));
  let x = seed * 2654435761 % 4294967296;
  const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  const shuffled = [...candidates].sort(() => rnd() - 0.5).slice(0, Math.min(want, candidates.length));
  const blanks = new Set(shuffled.map((c) => c.i));
  const tokens = words.map((word, i) => ({ word, blank: blanks.has(i) }));
  return { tokens, answers: tokens.filter((t) => t.blank).map((t) => t.word) };
}
const plain = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
export function scoreTyped(answers: string[], typed: string): { correct: number; total: number; hit: boolean } {
  const typedWords = normalizeWs(typed).split(" ").map(plain).filter(Boolean);
  const pool = new Map<string, number>();
  for (const t of typedWords) pool.set(t, (pool.get(t) ?? 0) + 1);
  let correct = 0;
  for (const a of answers.map(plain)) { const n = pool.get(a) ?? 0; if (n > 0) { correct++; pool.set(a, n - 1); } }
  return { correct, total: answers.length, hit: answers.length > 0 && correct / answers.length >= 0.8 };
}

// Bottom-up chaining (F3.5): round 1 is the last beat; each round adds the previous beat.
export function chainingRounds(rows: { order: number }[]): number[][] {
  const orders = [...rows].map((r) => r.order).sort((a, b) => a - b);
  return orders.map((_, i) => orders.slice(orders.length - 1 - i));
}

// --- Practice timer (F3.7, 11.7) -----------------------------------------------------------------
export interface Checkpoint { at: number; label: string; beat: Beat | null; kind: "checkpoint" | "ending" | "slot" }
export function cumulative(beats: Beat[]) { let t = 0; return beats.map((b) => { const start = t; t += b.target_seconds; return { beat: b, start, end: t }; }); }
export function beatAt(beats: Beat[], elapsed: number): Beat | null {
  const cum = cumulative(beats); const hit = cum.find((c) => elapsed >= c.start && elapsed < c.end); return hit?.beat ?? (elapsed >= (cum.at(-1)?.end ?? 0) ? cum.at(-1)?.beat ?? null : null);
}
// Ending points come from the script sections flagged ending_point: the marker sits where that section's last beat ends.
export function checkpoints(beats: Beat[], doc: ScriptDoc | null, slotMinutes: number): Checkpoint[] {
  const slot = slotMinutes * 60; const cum = cumulative(beats); const out: Checkpoint[] = [];
  for (let t = 360; t < slot; t += 360) out.push({ at: t, label: formatClock(t), beat: beatAt(beats, t), kind: "checkpoint" });
  for (const s of doc?.sections ?? []) if (s.ending_point) { const last = [...cum].reverse().find((c) => c.beat.section_id === s.id); if (last) out.push({ at: last.end, label: "end", beat: last.beat, kind: "ending" }); }
  out.push({ at: slot, label: formatClock(slot), beat: null, kind: "slot" });
  return out.sort((a, b) => a.at - b.at);
}
export function runVerdict(durationS: number, slotMinutes: number) {
  const slot = slotMinutes * 60; const diff = durationS - slot;
  if (diff <= 0) return { under: true, text: `${formatClock(durationS)}, ${formatClock(-diff)} inside the ${slotMinutes}-minute slot` };
  return { under: false, text: `${formatClock(durationS)}, ${formatClock(diff)} over the ${slotMinutes}-minute slot` };
}
export function measuredWpm(runs: { word_count: number | null; duration_s: number }[]) {
  const usable = runs.filter((r) => r.word_count && r.duration_s > 0);
  if (usable.length < 3) return null;
  return Math.round((usable.reduce((n, r) => n + (r.word_count ?? 0), 0) / usable.reduce((n, r) => n + r.duration_s, 0)) * 60);
}

// Printables (11.7): beat map and cue cards share one plain-text form; the pages add a print stylesheet.
export function cueCardsText(beats: Beat[]) { return beats.map((b) => `${b.order}. ${b.first_words}${b.stage_note ? `  [${b.stage_note}]` : ""}`).join("\n"); }
export function beatMapText(beats: Beat[]) { return beats.map((b) => `${b.order}. "${b.first_words}"  ${b.purpose ?? ""}  ${formatClock(b.target_seconds)}${b.stage_note ? `  note: ${b.stage_note}` : ""}\n   ${b.text}`).join("\n\n"); }
