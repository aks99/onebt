// WRITE pillar rules (Section 7, 13.8) as pure TypeScript: the Idea Brief prompts and the 500-character
// minimum, the word budget, the five structure templates, the script document model, readability and
// jargon, TED's quirk list, the 11-criterion rubric and the Script Lock gate. The database enforces the
// two-step gates (brief minimum, final outline before script); these mirror them for instant feedback.

// --- Idea Brief (F2.0) -----------------------------------------------------------
export const BRIEF_PROMPTS = [
  { key: "idea", label: "The idea, in your own words", help: "Not the topic. The claim you would defend." },
  { key: "belief", label: "The belief it challenges, and who disagrees", help: "Name the common view and the people who hold it." },
  { key: "story", label: "The story only you can tell", help: "One specific moment: where, who, what you saw, what changed." },
  { key: "evidence", label: "The evidence you have or will find", help: "Studies, numbers, cases, your own data. Mark what still needs a source." },
  { key: "action", label: "What you want the audience to do or see differently", help: "One winnable step." },
  { key: "why_me", label: "Why you are the person to say it", help: "Original work and lived experience, not titles." },
  { key: "not_claiming", label: "What you are not claiming and not selling (optional)", help: "The limits of the idea. The linter and the fact-checker read this." },
] as const;
export type BriefKey = typeof BRIEF_PROMPTS[number]["key"];
export const BRIEF_MIN = 500;
export const BRIEF_RECOMMENDED = [1500, 3000];
export function briefChars(answers: Record<string, string>) { return Object.values(answers ?? {}).reduce((n, v) => n + (v ?? "").length, 0); }
export function briefSavable(answers: Record<string, string>) { return briefChars(answers) >= BRIEF_MIN; }
export function renderBrief(answers: Record<string, string>) {
  return BRIEF_PROMPTS.filter((p) => (answers[p.key] ?? "").trim()).map((p) => `${p.label}\n${answers[p.key].trim()}`).join("\n\n");
}

// --- Word budget (F2.1, F2.17) ------------------------------------------------------
export const WPM_DEFAULT = 150, WPM_BAND: [number, number] = [130, 160], BUFFER = 0.08;
export function wordBudget(slotMinutes: number, wpm = WPM_DEFAULT) {
  const low = Math.round(slotMinutes * WPM_BAND[0]), high = Math.round(slotMinutes * WPM_BAND[1]);
  const target = Math.round(slotMinutes * wpm * (1 - BUFFER));
  return { low, high, target, bufferSeconds: Math.round(slotMinutes * 60 * BUFFER) };
}
export function estimateSeconds(words: number, wpm = WPM_DEFAULT) { return Math.round((words / wpm) * 60); }
export function formatClock(seconds: number) { const m = Math.floor(seconds / 60), s = seconds % 60; return `${m}:${String(s).padStart(2, "0")}`; }
export function wordsIn(text: string) { return (text ?? "").trim() ? (text.trim().match(/[A-Za-z0-9'’]+/g) ?? []).length : 0; }

// --- Structure templates (F2.2) with time splits and sources ---------------------------------------
export type SectionKind = "hook" | "care" | "idea" | "evidence" | "implication" | "cta" | "close";
export interface TemplateSection { kind: SectionKind; title: string; share: number; endingPoint?: boolean }
export const TEMPLATES: Record<string, { name: string; source: string; sections: TemplateSection[] }> = {
  ted_four_beat: { name: "TED four-beat", source: "TED organizer guidance: make them care, state the idea, build it with evidence or implementation, show the effect on the audience.", sections: [
    { kind: "hook", title: "Make them care", share: 0.12 }, { kind: "idea", title: "The idea", share: 0.15 }, { kind: "evidence", title: "Evidence and how it works", share: 0.45 }, { kind: "implication", title: "What changes", share: 0.18, endingPoint: true }, { kind: "close", title: "Close", share: 0.10 }] },
  duarte_sparkline: { name: "Duarte sparkline", source: "Nancy Duarte, Resonate: alternate what is and what could be, call to adventure, new bliss.", sections: [
    { kind: "hook", title: "What is", share: 0.12 }, { kind: "idea", title: "What could be", share: 0.15 }, { kind: "evidence", title: "What is, again, with evidence", share: 0.25 }, { kind: "implication", title: "What could be, closer", share: 0.23, endingPoint: true }, { kind: "cta", title: "Call to adventure", share: 0.12 }, { kind: "close", title: "New bliss", share: 0.13 }] },
  anderson_journey: { name: "Anderson journey", source: "Chris Anderson (2016 book on public speaking): start with the problem the audience feels, take them on a journey, arrive at the idea as the answer.", sections: [
    { kind: "hook", title: "The problem, felt", share: 0.15 }, { kind: "care", title: "Why it matters now", share: 0.15 }, { kind: "evidence", title: "The journey", share: 0.40 }, { kind: "idea", title: "The idea as the answer", share: 0.18, endingPoint: true }, { kind: "close", title: "Close", share: 0.12 }] },
  gallo_message_map: { name: "Gallo message map", source: "Carmine Gallo, Talk Like TED: one headline, three supporting messages, each with a story or data.", sections: [
    { kind: "hook", title: "Headline", share: 0.12 }, { kind: "evidence", title: "Message one", share: 0.25 }, { kind: "evidence", title: "Message two", share: 0.25 }, { kind: "evidence", title: "Message three", share: 0.23, endingPoint: true }, { kind: "close", title: "Close", share: 0.15 }] },
  story_spine: { name: "Story spine", source: "Kenn Adams's story spine as used by Pixar: a specific moment, what changed, and the idea it taught.", sections: [
    { kind: "hook", title: "A specific moment", share: 0.20 }, { kind: "care", title: "Until one day", share: 0.15 }, { kind: "evidence", title: "Because of that", share: 0.35 }, { kind: "idea", title: "Until finally: the idea", share: 0.18, endingPoint: true }, { kind: "close", title: "Ever since", share: 0.12 }] },
};
export function defaultSections(template: string, slotMinutes: number, wpm = WPM_DEFAULT) {
  const t = TEMPLATES[template] ?? TEMPLATES.ted_four_beat;
  const total = slotMinutes * 60 * (1 - BUFFER);
  return t.sections.map((s, i) => ({ id: `s${i + 1}`, kind: s.kind, title: s.title, target_seconds: Math.round(total * s.share), target_words: Math.round((total * s.share / 60) * wpm), ending_point: !!s.endingPoint }));
}

// --- Documents ---------------------------------------------------------------------
export interface TalkingPoint { id: string; kind: "claim" | "example" | "number" | "story" | "to_find"; text: string; source: "brief" | "idea_card" | "expansion" | "to_find"; consent: "named_with_permission" | "pseudonymized" | "composite" | "not_a_story" }
export interface OutlineSection { id: string; kind: SectionKind; purpose: string; talking_points: TalkingPoint[]; story_slot: boolean; target_seconds: number; target_words: number; ending_point: boolean; claims_needing_sources?: string[] }
export interface OutlineDoc { sections: OutlineSection[] }
export interface ScriptSection { id: string; kind: SectionKind; title: string; text: string; target_seconds: number; ending_point: boolean; covered_point_ids: string[]; uncovered: { id: string; why: string }[] }
export interface ScriptDoc { sections: ScriptSection[] }

export function scriptWords(doc: ScriptDoc) { return doc.sections.reduce((n, s) => n + wordsIn(s.text), 0); }
export function scriptText(doc: ScriptDoc) { return doc.sections.map((s) => s.text.trim()).filter(Boolean).join("\n\n"); }

// Every outline talking point is either covered in the script or listed as uncovered (7.7).
export function coverage(outline: OutlineDoc, script: ScriptDoc) {
  const all = outline.sections.flatMap((s) => s.talking_points.map((p) => p.id));
  const covered = new Set(script.sections.flatMap((s) => s.covered_point_ids ?? []));
  const uncoveredListed = new Set(script.sections.flatMap((s) => (s.uncovered ?? []).map((u) => u.id)));
  const missing = all.filter((id) => !covered.has(id) && !uncoveredListed.has(id));
  return { total: all.length, covered: all.filter((id) => covered.has(id)).length, uncovered: all.filter((id) => uncoveredListed.has(id)), missing, complete: missing.length === 0 };
}

// Story consent (F2.15): a story talking point needs a consent chip; a composite told as one person is flagged by the linter.
export function storyConsentProblems(outline: OutlineDoc) {
  return outline.sections.flatMap((s) => s.talking_points.filter((p) => p.kind === "story" && (!p.consent || p.consent === "not_a_story")).map((p) => ({ sectionId: s.id, pointId: p.id, text: p.text })));
}

// --- Readability and jargon (F2.9) ---------------------------------------------------------
export function syllables(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, ""); if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}
export function readability(text: string) {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) ?? []).length);
  const words = text.match(/[A-Za-z0-9'’]+/g) ?? [];
  const w = Math.max(1, words.length);
  const syl = words.reduce((n, x) => n + syllables(x), 0);
  const grade = 0.39 * (w / sentences) + 11.8 * (syl / w) - 15.59;
  return { gradeLevel: Math.round(Math.max(0, grade) * 10) / 10, avgSentenceLength: Math.round((w / sentences) * 10) / 10, words: words.length, sentences };
}
const PLAIN: Record<string, string> = { utilize: "use", leverage: "use", facilitate: "help", paradigm: "model", synergy: "working together", stakeholder: "the people involved", optimize: "improve", methodology: "method", implement: "put in place", robust: "strong", scalable: "can grow", holistic: "whole", framework: "way of thinking", ecosystem: "world", actionable: "useful", bandwidth: "time", iterate: "try again", incentivize: "encourage", operationalize: "make real", deliverable: "result", mindset: "way of thinking", disrupt: "change", empower: "let", ideation: "coming up with ideas", onboarding: "welcoming", granular: "detailed", pivot: "change course", alignment: "agreement", learnings: "lessons", impactful: "strong" };
export function jargon(text: string) {
  const words = (text.toLowerCase().match(/[a-z’']+/g) ?? []);
  const seen = new Map<string, { word: string; plain: string | null; count: number }>();
  for (const w of words) {
    const plain = PLAIN[w] ?? null;
    const long = w.length >= 12 && syllables(w) >= 5 && !/^(understanding|responsibility|international|relationships|conversations|organizations|communication|opportunities)$/.test(w);
    if (plain || long) { const e = seen.get(w) ?? { word: w, plain, count: 0 }; e.count++; seen.set(w, e); }
  }
  return Array.from(seen.values()).sort((a, b) => b.count - a.count);
}

// --- Quirk detector (F2.7): TED's own list, as regexes with a quoted fix ---------------------------------
export const QUIRKS: { key: string; name: string; re: RegExp; fix: string }[] = [
  { key: "meta", name: "Talking about the talk", re: /\b(today (I'?m going to|I will|I'd like to) (talk|speak|share)|in this talk|in my talk|I want to talk to you about|let me (begin|start) by)\b/i, fix: "Start where the talk takes off. Cut the announcement." },
  { key: "apology", name: "Apologizing", re: /\b(sorry|I apologi[sz]e|forgive me|bear with me)\b/i, fix: "No apology. Say the thing." },
  { key: "greeting", name: "Greeting or thanks as the opening", re: /^(\s*(hi|hello|good (morning|afternoon|evening)|thank you|thanks|it'?s (an honou?r|great) to be here)\b)/i, fix: "Open on the surprise, the moment or the question." },
  { key: "summary", name: "Summary ending", re: /\b(in conclusion|to sum(marize| up)|in summary|so,? to recap|let me recap|as I (said|mentioned) (earlier|before))\b/i, fix: "End on the picture of the world with the idea adopted and one action. Never a summary." },
  { key: "pitch", name: "Pitch or book-cover close", re: /\b(my book|available on|visit my website|sign up|buy|my (course|program|programme)|work with me|book me)\b/i, fix: "Remove the pitch. Give the audience the idea's benefit instead." },
  { key: "overstatement", name: "Overstatement", re: /\b(always|never|everyone|no one|proves|guarantees?|the only way|revolutionary|game.?changing)\b/i, fix: "Narrow the claim to what the evidence supports." },
  { key: "rhetorical", name: "Rhetorical questions in a row", re: /\?[^?]{0,80}\?[^?]{0,80}\?/, fix: "Turn two of the three questions into statements." },
  { key: "pun", name: "TED pun", re: /\bTED-?(ucat|ify|x-?cellent|talk-?ing)|TEDsters?\b/i, fix: "Cut it." },
  { key: "utopia", name: "Utopianism or dystopianism", re: /\b(will (change|save|destroy) the world|the end of (humanity|civili[sz]ation)|utopia|dystopia)\b/i, fix: "Describe the specific, near change instead." },
  { key: "quote_read", name: "Reading a quote", re: /\b(as [A-Z][a-z]+ (once )?(said|wrote|put it)|to quote)\b/, fix: "Say it in your words, then credit the source in a clause." },
];
export function quirks(text: string) {
  return QUIRKS.flatMap((q) => { const m = text.match(q.re); return m ? [{ key: q.key, name: q.name, quote: m[0].slice(0, 80), fix: q.fix }] : []; });
}

// --- Script rubric (13.8) and the Script Lock gate (7.4) ---------------------------------------------
export const SCRIPT_RUBRIC = [
  { n: 1, name: "Invisible structure", standard: "Care, idea, evidence or implementation, effect on the audience; no announcing." },
  { n: 2, name: "Opening", standard: "Starts where the talk takes off: a surprising fact, a specific moment or a what-if; no greeting, thanks, warm-up or meta-talk." },
  { n: 3, name: "Brevity, one idea", standard: "Fits the slot with buffer; one major point, at most 3 subtopics." },
  { n: 4, name: "Builds from the familiar", standard: "Layers from what the audience knows; jargon passes the non-specialist test." },
  { n: 5, name: "Evidence", standard: "Empirical over anecdotal; citations out of the flow; controversy acknowledged." },
  { n: 6, name: "Story and emotion", standard: "Specific stories with sensory texture, used sparingly, serving the idea; honest emotion." },
  { n: 7, name: "Contrast and tension", standard: "Alternates what is and what could be." },
  { n: 8, name: "Language", standard: "Conversational, present tense, strong verbs, sounds like speech." },
  { n: 9, name: "Ending", standard: "Shows how life changes if the idea is adopted; one winnable action; a new-bliss close; two planned ending points. A summary, pitch or book cover is Level 1." },
  { n: 10, name: "Word budget", standard: "130 to 160 words a minute with buffer; above 175 is Level 1." },
  { n: 11, name: "Compliance", standard: "No promotion; no inflammatory politics or religion; claims fact-checkable; no claim of having delivered the idea before." },
] as const;
export const LOCK_CRITERIA = [1, 3, 9, 11];
export interface ScriptRubric { scores: { criterion: number; level: 1 | 2 | 3 | 4; reason: string }[]; lock_gate_passed: boolean; quirks: { quirk: string; quote: string; fix: string }[]; strongest_line: string; weakest_line: string; next_step: string }
export function lockCheck(r: ScriptRubric | null | undefined, overrideReason?: string): { ok: boolean; failing: number[]; reason: string; overridable: boolean } {
  if (!r?.scores?.length) return { ok: false, failing: LOCK_CRITERIA, reason: "Score the script before locking it.", overridable: false };
  const level = (n: number) => r.scores.find((s) => s.criterion === n)?.level ?? 1;
  const failing = LOCK_CRITERIA.filter((n) => level(n) < 3);
  if (!failing.length) return { ok: true, failing, reason: "Passes the lock gate.", overridable: false };
  if ((overrideReason ?? "").trim().length >= 20) return { ok: true, failing, reason: "Locked with a written reason.", overridable: true };
  return { ok: false, failing, reason: `Below Level 3 on ${failing.map((n) => SCRIPT_RUBRIC[n - 1].name).join(", ")}. Fix these or write why you are locking anyway.`, overridable: true };
}

// Pace line (F2.17): "at your pace this draft runs 11:40" with the assumption labelled until measured.
export function paceLine(words: number, slotMinutes: number, wpm: number, measured: boolean) {
  const secs = estimateSeconds(words, wpm);
  const slot = slotMinutes * 60;
  const over = secs > slot;
  return { seconds: secs, text: `At ${measured ? "your measured pace" : `an assumed ${wpm} words a minute`} this draft runs ${formatClock(secs)}${over ? `, ${formatClock(secs - slot)} over the ${slotMinutes}-minute slot` : `, ${formatClock(slot - secs)} under the slot`}.`, over };
}

// Cut-to-time percent needed to land on the target with buffer (F2.5).
export function cutPercent(words: number, slotMinutes: number, wpm: number) {
  const target = wordBudget(slotMinutes, wpm).target;
  if (words <= target) return 0;
  return Math.min(60, Math.round(((words - target) / words) * 100));
}

// --- Exports (F2.11): plain text for prompter apps and the annotated fact-check text --------------------------
export function prompterText(doc: ScriptDoc) {
  return doc.sections.map((s) => `${s.title.toUpperCase()}\n\n${s.text.trim()}${s.ending_point ? "\n\n[ENDING POINT: you can stop here]" : ""}`).join("\n\n\n");
}
export interface ClaimRow { text: string; section_id: string | null; claim_type: string | null; risk: string | null; status: string; source_url: string | null; note: string | null; r5_flag: boolean; overclaim_flag: boolean }
export const CLAIM_STATUS_LABEL: Record<string, string> = { needs_source: "needs a source", source_added: "source added", verified_by_member: "verified by me", firsthand_account: "firsthand account, labelled", narrowed: "narrowed to the evidence" };
export function factcheckText(doc: ScriptDoc, claims: ClaimRow[], title: string) {
  const lines = [`${title}: fact-check sheet`, `${claims.length} checkable claims. Fact-checking takes 2 to 12 hours; start early. "Cure" and "heal" must become "reduce the risk of".`, ""];
  for (const s of doc.sections) {
    const mine = claims.filter((c) => c.section_id === s.id);
    lines.push(`${s.title.toUpperCase()} (${mine.length} claim${mine.length === 1 ? "" : "s"})`);
    for (const c of mine) lines.push(`- ${c.text} [${CLAIM_STATUS_LABEL[c.status] ?? c.status}${c.risk ? `, ${c.risk} risk` : ""}${c.r5_flag ? ", R5 health wording" : ""}${c.overclaim_flag ? ", overclaim word" : ""}]${c.source_url ? ` ${c.source_url}` : ""}${c.note ? ` (${c.note})` : ""}`);
    lines.push("");
  }
  const orphans = claims.filter((c) => !doc.sections.some((s) => s.id === c.section_id));
  if (orphans.length) { lines.push("OTHER"); for (const c of orphans) lines.push(`- ${c.text} [${CLAIM_STATUS_LABEL[c.status] ?? c.status}]`); }
  return lines.join("\n");
}
// Numbers in a script that a fact-check sheet must list (7.7 acceptance: "lists every number in a seeded script").
export function numbersIn(text: string) { return Array.from(new Set((text.match(/\b\d[\d,.]*%?\b/g) ?? []).map((n) => n.replace(/[.,]$/, "")))); }
