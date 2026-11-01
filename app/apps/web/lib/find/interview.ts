// Idea Interview (F1.1.1, S3.2): eight typed prompts. TED's five discovery prompts plus three about lived
// experience and original work. Each answer has a minimum length so the dossier has substance.
// The same minimums are enforced server-side in saveInterviewAnswer.

export interface InterviewPrompt { key: string; question: string; help: string; minChars: number }

export const INTERVIEW_PROMPTS: InterviewPrompt[] = [
  { key: "controversy", question: "What is the live controversy in your field right now?", help: "Name the disagreement, not the subject. Who is on each side?", minChars: 120 },
  { key: "misconception", question: "What do most people get wrong about your work, and what is actually true?", help: "The misconception in their words, then your correction in yours.", minChars: 120 },
  { key: "why_matters", question: "Why does this matter, and to whom, in the next five years?", help: "Name the people affected and what changes for them.", minChars: 120 },
  { key: "disagrees", question: "Who disagrees with you, and what is the strongest version of their case?", help: "If nobody disagrees it may be a topic, not an idea.", minChars: 120 },
  { key: "how_done", question: "How did you carry out this work? What did you actually do, measure or build?", help: "Specific places, numbers, years and people. No titles.", minChars: 150 },
  { key: "lived_moment", question: "Describe one specific moment when this idea became real for you.", help: "Where you were, who was there, what you saw or heard, what changed.", minChars: 150 },
  { key: "original_work", question: "What have you made, studied or tested that nobody else has in quite this way?", help: "Original work earns the stage. A book, a dataset, a practice, a method you tested.", minChars: 120 },
  { key: "first_step", question: "If the audience believed you, what is the first small thing they would do differently tomorrow?", help: "One winnable step, not a life change.", minChars: 60 },
];

export const PASTE_MINIMUM = 300;    // S1.3: a pasted bio, book summary or LinkedIn About
export const DOSSIER_MINIMUM = 300;  // the generator gate (dossier_min_300)

export type Answers = Record<string, string>;

export function answerOk(key: string, text: string) {
  const p = INTERVIEW_PROMPTS.find((x) => x.key === key);
  if (!p) return false;
  return (text ?? "").trim().length >= p.minChars;
}

export function interviewProgress(answers: Answers) {
  const answered = INTERVIEW_PROMPTS.filter((p) => answerOk(p.key, answers[p.key] ?? "")).length;
  return { answered, total: INTERVIEW_PROMPTS.length, complete: answered === INTERVIEW_PROMPTS.length };
}

export function dossierChars(answers: Answers, pasted: string | null | undefined) {
  return Object.values(answers ?? {}).reduce((n, v) => n + (v ?? "").length, 0) + (pasted ?? "").length;
}

// The text the generator reads: the interview as labelled paragraphs, then any pasted material.
export function renderDossier(answers: Answers, pasted: string | null | undefined) {
  const parts = INTERVIEW_PROMPTS.filter((p) => (answers[p.key] ?? "").trim()).map((p) => `${p.question}\n${answers[p.key].trim()}`);
  if ((pasted ?? "").trim()) parts.push(`Pasted material\n${(pasted as string).trim()}`);
  return parts.join("\n\n");
}

export function validateAnswer(key: string, text: string): string | null {
  const p = INTERVIEW_PROMPTS.find((x) => x.key === key);
  if (!p) return "Unknown prompt.";
  const n = (text ?? "").trim().length;
  if (n < p.minChars) return `A little more, please: ${n} of ${p.minChars} characters. Specifics make better ideas.`;
  if (n > 4000) return "That is plenty. Keep it under 4,000 characters.";
  return null;
}
