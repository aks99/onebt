// Idea Lock gate (F1.1.9, 13.3) and the fresh-idea overlap check (F1.5.3) as pure TypeScript, for instant UI
// feedback. The database functions idea_lock_check and topic_overlap are the authority; these mirror them.

export interface CriterionScore { criterion: number; level: 1 | 2 | 3 | 4; reason: string }
export interface Scorecard { scores: CriterionScore[]; gate_passed: boolean; fixes: string[]; similar_talks_to_check?: string[] }

export const RUBRIC: { n: number; name: string; standard: string }[] = [
  { n: 1, name: "Idea, not topic", standard: "An idea is more than a story or a list of facts; it draws a larger conclusion from evidence or observations." },
  { n: 2, name: "Throughline", standard: "Capture the throughline in no more than 15 words." },
  { n: 3, name: "Novelty", standard: "The TED world should not have heard it before, and it should not copy an existing TED or TEDx talk." },
  { n: 4, name: "Arguable", standard: "Defended by an argument, is not self-evident, and may have an antagonist." },
  { n: 5, name: "Evidence", standard: "Claims survive expert scrutiny; empirical over anecdotal." },
  { n: 6, name: "Who benefits", standard: "Who does this idea benefit? The audience, not the speaker or business." },
  { n: 7, name: "Changes perception or action", standard: "The audience would think, live or act differently; a winnable first step exists." },
  { n: 8, name: "Local origin, global relevance", standard: "Rooted in the speaker's work and community yet relatable worldwide; valuable in 5 to 10 years." },
  { n: 9, name: "Speaker fit", standard: "The speaker has done the work; peer credibility; not a repeat or circuit speaker." },
];

export type LockVerdict =
  | { ok: true }
  | { ok: false; code: "IDEA_NOT_SCORED"; message: string }
  | { ok: false; code: "IDEA_GATE_FAILED"; message: string; criteria: number[] }
  | { ok: false; code: "IDEA_NEEDS_WORK"; message: string; criteria: number[]; overridable: true };

export function lockCheck(score: Scorecard | null | undefined, overrideReason?: string): LockVerdict {
  if (!score || !Array.isArray(score.scores) || score.scores.length === 0) return { ok: false, code: "IDEA_NOT_SCORED", message: "Score this idea before locking it." };
  const level = (n: number) => score.scores.find((s) => s.criterion === n)?.level ?? 1;
  const hard = [1, 4].filter((n) => level(n) < 2);
  if (hard.length) return { ok: false, code: "IDEA_GATE_FAILED", criteria: hard, message: `This reads as a ${hard.includes(1) ? "topic" : "statement nobody would argue with"} rather than an idea. Fix ${hard.map((n) => RUBRIC[n - 1].name).join(" and ")} first; this one cannot be locked yet.` };
  const soft = [1, 4, 5].filter((n) => level(n) < 3);
  if (soft.length && (overrideReason ?? "").trim().length < 20) return { ok: false, code: "IDEA_NEEDS_WORK", criteria: soft, overridable: true, message: `Fix ${soft.length === 1 ? "this criterion" : `these ${soft.length} criteria`} (${soft.map((n) => RUBRIC[n - 1].name).join(", ")}), then lock. Or write why you want to lock it anyway.` };
  return { ok: true };
}

export function totalScore(score: Scorecard | null | undefined) {
  if (!score?.scores?.length) return null;
  return { total: score.scores.reduce((n, s) => n + s.level, 0), max: 36 };
}

const STOP = new Set(["that","this","with","from","when","what","your","they","them","have","will","about","into","than","then","there","their","which","would","could","should","where","while","being","these","those","because","through","every","other","after","before","between","under","over","talk","talks","speak","speaking","how","why","not"]);

export function contentWords(text: string) {
  return Array.from(new Set((text ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w))));
}

function trigrams(s: string) {
  const t = `  ${s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3));
  return out;
}

// Mirrors public.topic_overlap: Jaccard on content words (weighted) or trigram similarity, whichever is larger.
export function topicOverlap(topic: string, ideaText: string) {
  const a = contentWords(topic), b = contentWords(ideaText);
  if (!a.length || !b.length) return { score: 0, shared: [] as string[] };
  const shared = a.filter((w) => b.includes(w));
  const jaccard = shared.length / Math.max(a.length + b.length - shared.length, 1);
  const ta = trigrams(topic), tb = trigrams(ideaText);
  let inter = 0; ta.forEach((g) => { if (tb.has(g)) inter++; });
  const trgm = inter / Math.max(ta.size + tb.size - inter, 1);
  return { score: Math.max(jaccard * 1.6, trgm, (jaccard + trgm) / 2), shared };
}

export const OVERLAP_THRESHOLD = 0.3;

// Fresh-idea rule in framing text (6.5 rule 4 and its acceptance check): "this talk", "this idea" or "this topic"
// must never be tied to a prior stage. The sentence "this idea ... I have not yet shared from any stage" is the
// allowed shape; "I have delivered this talk many times" is the forbidden one. Checked sentence by sentence.
const PHRASE = /\b(this talk|this idea|this topic|the same talk|the same idea)\b/i;
const DELIVERED = /\b(have given|gave|delivered|presented|spoke on|spoken on|shared|performed|keynoted|many times|several times|before)\b/i;
const FRESH = /\b(not yet|never|have not|haven't|first time|for the first|would be the first|be the first)\b/i;
export function framingViolations(text: string) {
  const sentences = (text ?? "").split(/(?<=[.!?])\s+/);
  return sentences.filter((s) => PHRASE.test(s) && DELIVERED.test(s) && !FRESH.test(s)).map((s) => s.trim());
}
