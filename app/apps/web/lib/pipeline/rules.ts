// Application Pipeline rules (6.3, 13.4) as pure TypeScript: the application rubric, the Ready gate, status
// transitions, the follow-up restraint rules, the follow-up and feedback templates, the authorship meter and
// the CSV export. The database enforces the hard limits; these mirror them for instant UI feedback.

export type PipelineStatus = "planned" | "researching" | "drafting" | "ready" | "applied" | "follow_up_due" | "interview" | "accepted" | "declined" | "withdrawn" | "reapply";
export const STATUS_ORDER: PipelineStatus[] = ["planned", "researching", "drafting", "ready", "applied", "follow_up_due", "interview", "accepted", "declined", "withdrawn", "reapply"];
export const ACTIVE_DRAFT_STATUSES: PipelineStatus[] = ["drafting", "ready"];
export const SENT_STATUSES: PipelineStatus[] = ["applied", "follow_up_due", "interview", "accepted", "declined", "reapply"];

export const APPLICATION_RUBRIC = [
  { n: 1, name: "Idea statement", standard: "Clear, specific, single idea in 100 to 250 words; leads with the surprising claim, then evidence, then why now, then local and global relevance." },
  { n: 2, name: "One-sentence distillation", standard: "15 words or fewer, repeatable to a friend." },
  { n: 3, name: "Why now, why this audience", standard: "Uses the event's theme language; explains community impact." },
  { n: 4, name: "Why you", standard: "Domain authority, original work on the idea, peer credibility." },
  { n: 5, name: "Pitch video", standard: "Within the requested length; idea, why it matters, why you; standing, well lit, as if on stage." },
  { n: 6, name: "Bio", standard: "About 250 words or the form's limit, relevant to the idea, answers why trust this person." },
  { n: 7, name: "Coachability and commitment", standard: "Explicitly willing to be coached, 3 to 5 hours a week, rehearsal dates held." },
  { n: 8, name: "Compliance", standard: "No selling, no pay-to-play, no sponsor or organizer conflict, no prior TEDx on the same idea, no courses, coaches or products, no claim of having delivered this idea before." },
] as const;
export const GATE_CRITERIA = [1, 4, 8];

export interface ReadinessScore { criterion: number; level: 1 | 2 | 3 | 4; reason: string }
export interface Readiness { scores: ReadinessScore[]; gate_passed: boolean; linter: { flags: { rule: string; quote: string; why: string; fix: string }[]; blocking: boolean }; rewrites: { field: string; text: string }[]; organizer_eyes: string }

// The Ready gate (13.4): Level 3 or higher on criteria 1, 4 and 8, and no blocking linter flag.
export function readinessPassed(r: Readiness | null | undefined): { ok: boolean; failing: number[]; reason: string } {
  if (!r || !r.scores?.length) return { ok: false, failing: GATE_CRITERIA, reason: "Run the Readiness Review first." };
  const level = (n: number) => r.scores.find((s) => s.criterion === n)?.level ?? 1;
  const failing = GATE_CRITERIA.filter((n) => level(n) < 3);
  if (r.linter?.blocking) return { ok: false, failing, reason: "A compliance flag blocks this: fix the quoted line." };
  if (failing.length) return { ok: false, failing, reason: `Not ready yet: ${failing.map((n) => APPLICATION_RUBRIC[n - 1].name).join(", ")} below Level 3.` };
  return { ok: true, failing: [], reason: "Passes the gate." };
}

export interface TransitionContext { activeDrafts: number; readinessPassed: boolean; isThisActive: boolean }
// Which moves the board allows (6.3 quality gates; S3.6). "Mark applied anyway" is a confirmed move that does
// not count toward the 100 (the database sets counts_toward_100 from readiness_passed).
export function canMove(from: PipelineStatus, to: PipelineStatus, ctx: TransitionContext): { ok: boolean; reason?: string; confirm?: string } {
  if (from === to) return { ok: false, reason: "Already there." };
  if (ACTIVE_DRAFT_STATUSES.includes(to) && !ctx.isThisActive && ctx.activeDrafts >= 5) return { ok: false, reason: "Finish or park one of your 5 drafts first." };
  if (to === "ready" && !ctx.readinessPassed) return { ok: false, reason: "Ready needs the Readiness Review to pass on idea statement, why you and compliance." };
  if (to === "applied" && !ctx.readinessPassed) return { ok: true, confirm: "Mark as applied anyway? It will not count toward your 100 ready applications." };
  if (to === "applied") return { ok: true, confirm: "Did you submit it on the organizer's form?" };
  if (["accepted", "declined", "withdrawn"].includes(to) && !SENT_STATUSES.includes(from) && from !== "ready" && from !== "drafting") return { ok: false, reason: "Log an outcome once the application has been sent." };
  return { ok: true };
}

export interface FollowUpInput { status: PipelineStatus; appliedAt: string | null; followUpSentAt: string | null; decisionDate: string | null; noEnquiries: boolean; hasPublicForm: boolean; today?: string }
export type FollowUpVerdict = "OK" | "NOT_APPLIED" | "ALREADY_SENT" | "ORGANIZER_SAYS_NO" | "BEFORE_DECISION_DATE" | "NO_PUBLIC_FORM" | "TOO_EARLY";
// Mirrors public.follow_up_allowed (F1.3.7 v1.4).
export function followUpAllowed(a: FollowUpInput): FollowUpVerdict {
  const today = a.today ?? new Date().toISOString().slice(0, 10);
  if (a.status !== "applied" && a.status !== "follow_up_due") return "NOT_APPLIED";
  if (a.followUpSentAt) return "ALREADY_SENT";
  if (a.noEnquiries) return "ORGANIZER_SAYS_NO";
  if (a.decisionDate && a.decisionDate >= today) return "BEFORE_DECISION_DATE";
  if (!a.hasPublicForm) return "NO_PUBLIC_FORM";
  if (a.appliedAt && daysBetween(a.appliedAt, today) < 14) return "TOO_EARLY";
  return "OK";
}
export const FOLLOW_UP_REASONS: Record<FollowUpVerdict, string> = {
  OK: "A short status enquiry is fine now.", NOT_APPLIED: "Follow-ups start once the application is sent.", ALREADY_SENT: "One follow-up per application. You have sent it.",
  ORGANIZER_SAYS_NO: "This organizer asked applicants not to enquire. We respect that.", BEFORE_DECISION_DATE: "The organizer gave a decision date. Wait for it.",
  NO_PUBLIC_FORM: "Follow-ups are only for applications made through a public form.", TOO_EARLY: "Give them two weeks. The follow-up date is set for you.",
};
function daysBetween(a: string, b: string) { return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000); }

// The follow-up is a status enquiry, never a second pitch (F1.3.7). A template, so the restraint is certain.
export function followUpDraft(p: { memberName: string; eventName: string; appliedAt: string | null; oneSentence: string | null }) {
  const when = p.appliedAt ? ` on ${new Date(p.appliedAt + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}` : "";
  return {
    subject: `${p.eventName} speaker application: a short check-in`,
    body: `Hello ${p.eventName} team,\n\nI applied to speak at ${p.eventName}${when}${p.oneSentence ? ` with the idea "${p.oneSentence}"` : ""}. I know you are reading many applications, so this is only a brief note to confirm it arrived and to say I am still very glad to be considered.\n\nIf there is anything you need from me, I am happy to send it.\n\nThank you for the work you put into the event.\n\n${p.memberName}`,
  };
}

// Feedback request after a decline (F1.3.9). Organizer opinions differ; the member chooses whether to send it.
export function feedbackRequestDraft(p: { memberName: string; eventName: string }) {
  return {
    subject: `${p.eventName}: thank you, and one question`,
    body: `Hello ${p.eventName} team,\n\nThank you for letting me know, and for the care you put into choosing this year's speakers.\n\nIf you have a minute at some point, I would value one line on what would have made my application stronger. No pressure at all if that is not something you do.\n\nI will follow the event and hope to apply again next year.\n\n${p.memberName}`,
  };
}

// Authorship meter (F1.3.15): share of characters the member typed versus AI text inserted and kept.
// Per field: a field the member wrote is all theirs; an AI field is split by the words still present from the
// AI original (kept) versus the rest (typed). Word-level, order-free, so a reworded sentence counts as typed.
export interface Authorship { typed_chars: number; ai_kept_chars: number; by_field: Record<string, { typed: number; kept: number }>; your_words_pct: number }
export function authorship(answers: Record<string, string>, sources: Record<string, string>, aiOriginals: Record<string, string>): Authorship {
  const by_field: Authorship["by_field"] = {}; let typed = 0, kept = 0;
  for (const [key, text] of Object.entries(answers)) {
    const t = (text ?? "").trim(); if (!t) continue;
    const src = sources[key] ?? "user"; const original = aiOriginals[key];
    if (src === "user" || !original) { by_field[key] = { typed: t.length, kept: 0 }; typed += t.length; continue; }
    const bag = new Map<string, number>();
    for (const w of original.toLowerCase().split(/\s+/).filter(Boolean)) bag.set(w, (bag.get(w) ?? 0) + 1);
    let k = 0;
    for (const w of t.split(/\s+/).filter(Boolean)) { const lw = w.toLowerCase(); const n = bag.get(lw) ?? 0; if (n > 0) { bag.set(lw, n - 1); k += w.length + 1; } }
    k = Math.min(k, t.length);
    by_field[key] = { typed: t.length - k, kept: k }; typed += t.length - k; kept += k;
  }
  const total = typed + kept;
  return { typed_chars: typed, ai_kept_chars: kept, by_field, your_words_pct: total === 0 ? 100 : Math.round((typed / total) * 100) };
}

export function authorshipNote(a: Authorship, productName: string) {
  return `Authorship note. ${a.your_words_pct}% of the characters in this application were typed by the applicant; ${100 - a.your_words_pct}% were drafted with an AI writing assistant (${productName}) from the applicant's own notes and then kept after review. Every factual claim comes from the applicant.`;
}

// Pipeline CSV (F1.3.12).
export interface PipelineRow { event: string; city: string; status: string; applied_at: string; follow_up_at: string; follow_up_sent: string; outcome: string; outcome_at: string; event_date: string; deadline: string; readiness: string; counts_toward_100: string; notes: string }
export function pipelineCsv(rows: PipelineRow[]) {
  const cols: (keyof PipelineRow)[] = ["event", "city", "status", "applied_at", "follow_up_at", "follow_up_sent", "outcome", "outcome_at", "event_date", "deadline", "readiness", "counts_toward_100", "notes"];
  const esc = (v: string) => /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(String(r[c] ?? ""))).join(","))].join("\r\n") + "\r\n";
}

// Research step questions (6.3 quality gate).
export const RESEARCH_QUESTIONS = [
  { key: "theme_in_own_words", label: "The event's theme, in your own words", help: "Read their page. What are they asking for this year?" },
  { key: "past_talk_watched", label: "One past talk from this event you watched", help: "Speaker or title, and one thing you noticed about what they chose." },
  { key: "why_this_audience", label: "Why this audience, in this city", help: "Who will be in the room and why your idea matters to them." },
] as const;
export const RESEARCH_MIN = 20;
export function researchComplete(a: Record<string, string> | null | undefined) {
  return !!a && RESEARCH_QUESTIONS.every((q) => (a[q.key] ?? "").trim().length >= RESEARCH_MIN);
}
