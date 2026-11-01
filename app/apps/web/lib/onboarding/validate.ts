// Onboarding (5.4, S1.1 to S1.5). Three profile questions only; everything else is asked when needed.

export type OnboardingPath = "apply" | "invited" | "published";

export interface ThreeQuestions {
  expertise: string;              // one line, 120 characters at most
  city: string;
  countryCode: string;            // ISO 3166-1 alpha-2
  targetMonth: string | null;     // "YYYY-MM" or null for "not sure"
  // invited path only
  eventName?: string;
  eventDate?: string;             // YYYY-MM-DD
  slotMinutes?: number;
  // published path only
  publishedUrl?: string;
}

export function validateThreeQuestions(path: OnboardingPath, q: ThreeQuestions): Record<string, string> {
  const errors: Record<string, string> = {};
  const expertise = (q.expertise ?? "").trim();
  if (expertise.length < 8) errors.expertise = "One line about what you know deeply. Eight characters at least.";
  if (expertise.length > 120) errors.expertise = "Keep it to one line (120 characters).";
  if ((q.city ?? "").trim().length < 2) errors.city = "Which city are you based in?";
  if (!/^[A-Z]{2}$/.test(q.countryCode ?? "")) errors.countryCode = "Pick a country.";
  if (q.targetMonth !== null && q.targetMonth !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(q.targetMonth)) errors.targetMonth = "Pick a month, or choose not sure.";
  if (path === "invited") {
    if ((q.eventName ?? "").trim().length < 3) errors.eventName = "Which event invited you?";
    if (!q.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(q.eventDate)) errors.eventDate = "When is the event?";
    if (!q.slotMinutes || q.slotMinutes < 3 || q.slotMinutes > 18) errors.slotMinutes = "Slot length between 3 and 18 minutes.";
  }
  if (path === "published") {
    if (!q.publishedUrl || !/^https?:\/\/\S+$/i.test(q.publishedUrl)) errors.publishedUrl = "Paste the public link to your published talk.";
  }
  return errors;
}

// Already applied somewhere? (S1.4, F1.3.9 v1.5). One record per application the member has already sent.
export interface ExistingApplication {
  eventName: string;
  appliedAt: string;               // YYYY-MM-DD, defaults to today, editable
  followUpAt?: string | null;
  outcome: "waiting" | "interview" | "accepted" | "declined";
  eventDate?: string | null;
  eventId?: string | null;         // when matched to the catalogue
}

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function validateExistingApplication(a: ExistingApplication, now = new Date()): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!a.eventId && (a.eventName ?? "").trim().length < 3) errors.eventName = "Which event did you apply to?";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.appliedAt ?? "")) errors.appliedAt = "When did you apply?";
  else if (a.appliedAt > todayIso(now)) errors.appliedAt = "The applied date cannot be in the future.";
  if (a.followUpAt && !/^\d{4}-\d{2}-\d{2}$/.test(a.followUpAt)) errors.followUpAt = "Pick a follow-up date or leave it empty.";
  if (a.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(a.eventDate)) errors.eventDate = "Pick the event date or leave it empty.";
  return errors;
}

// Maps the quick form's outcome to the pipeline status the board uses.
export function statusForOutcome(o: ExistingApplication["outcome"]): "applied" | "interview" | "accepted" | "declined" {
  return o === "waiting" ? "applied" : o;
}
