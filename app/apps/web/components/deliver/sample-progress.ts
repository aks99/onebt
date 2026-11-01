import { nextReview, splitBeats, type BeatRow, type BeatState } from "@/lib/deliver/rules";
import { SAMPLE_SCRIPT } from "@/lib/deliver/sample";

// The free plan's drills run on the sample script. Progress is a per-browser convenience kept in localStorage,
// wrapped in try/catch because storage can be empty or throw; nothing here reaches the server.

export const SAMPLE_BEATS = splitBeats(SAMPLE_SCRIPT, 150).map((b) => ({ ...b, id: `sample-${b.order}`, stage_note: null }));
const KEY = "obt.sample.progress.v1";
type Stored = Record<string, { state: BeatState; next_review_at: string; interval_days: number; hits: number; misses: number }>;

function read(): Stored { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Stored; } catch { return {}; } }
function write(s: Stored) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable; the drill still runs */ } }
const today = () => new Date().toISOString().slice(0, 10);

export function loadSampleProgress(beats: typeof SAMPLE_BEATS): BeatRow[] {
  const s = read();
  return beats.map((b) => { const p = s[b.id]; const next = p?.next_review_at ?? today(); return { ...b, state: p?.state ?? "new", next_review_at: next, interval_days: p?.interval_days ?? 1, hits: p?.hits ?? 0, misses: p?.misses ?? 0, due: next <= today() }; });
}
export function recordSampleResult(beatId: string, result: "hit" | "miss") {
  const s = read(); const cur = s[beatId] ?? { state: "new" as BeatState, next_review_at: today(), interval_days: 1, hits: 0, misses: 0 };
  const n = nextReview({ interval_days: cur.interval_days }, result);
  s[beatId] = { ...cur, ...n, hits: cur.hits + (result === "hit" ? 1 : 0), misses: cur.misses + (result === "miss" ? 1 : 0) };
  write(s);
  return n;
}
