// AMPLIFY basics (Section 9, F4.1 to F4.4, F4.11, F4.12). Compliance is the feature: every text the member will
// send is checked against the TEDx rules (official link only, no re-upload, no logo, no TED endorsement, the phrase
// "independently organized TEDx event"). Text in, text out; the app never edits video.

export type PublicationState = "not_delivered" | "delivered" | "awaiting_upload" | "in_review" | "published" | "not_approved" | "limited";

// Realistic status copy (F4.1 v1.4). TED asks organizers to upload within a month; review takes 3 to 5 business
// days; flagged talks can take months. The launch plan counts from the confirmed link, never from a guess.
export const PUBLICATION: { key: PublicationState; label: string; copy: string }[] = [
  { key: "not_delivered", label: "Not delivered yet", copy: "The talk has not happened. Nothing to track." },
  { key: "delivered", label: "Delivered", copy: "You gave the talk. Ask the organizer when they expect to upload, and log the window here." },
  { key: "awaiting_upload", label: "Awaiting the organizer's upload", copy: "TED asks organizers to upload within a month of the event; many take longer. Nothing you do speeds this up, and asking twice does not help." },
  { key: "in_review", label: "In TED's review", copy: "Review usually takes 3 to 5 business days. A flagged talk can take months. The organizer hears first." },
  { key: "published", label: "Published", copy: "The official link is live. The launch plan counts from today." },
  { key: "not_approved", label: "Not approved for publication", copy: "Some talks are not published. The idea, the script and the rehearsal still happened; the Pitch Pack and the bio carry the talk." },
  { key: "limited", label: "Limited distribution", copy: "The talk is up but TED is not promoting it. The launch plan works the same way; your network is the audience." },
];
export const publicationLabel = (k: string) => PUBLICATION.find((p) => p.key === k)?.label ?? k;

export const OFFICIAL_URL = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=[A-Za-z0-9_-]{6,}|youtu\.be\/[A-Za-z0-9_-]{6,}|youtube\.com\/shorts\/[A-Za-z0-9_-]{6,}|(www\.)?ted\.com\/talks\/[A-Za-z0-9_-]+)/i;
export const isOfficialUrl = (u: string | null | undefined) => !!u && OFFICIAL_URL.test(u.trim());

// --- Compliance (9.1 principle 1) ---------------------------------------------------------------
export interface ComplianceFlag { rule: string; quote: string; why: string; fix: string; blocking: boolean }
const RULES: { rule: string; re: RegExp; why: string; fix: string; blocking: boolean }[] = [
  // The banned phrase is written as a pattern so this file passes the same lint it enforces.
  { rule: "say TEDx, not TED", re: /\bmy TED\s+talk\b|\bTED\s+talk\b(?! *s? *(?:I|we) (?:watched|saw))/i, why: "A TEDx talk is a TEDx talk; calling it the other thing breaks TED's rules and misleads search.", fix: "Say \"my TEDx talk\" or \"my talk at <event>, an independently organized TEDx event\".", blocking: true },
  { rule: "no TED speaker", re: /\bTED speaker\b|\bspoke at TED\b(?!x)/i, why: "Implies a TED main-stage talk.", fix: "\"TEDx speaker\" or \"spoke at <event>, an independently organized TEDx event\".", blocking: true },
  { rule: "no endorsement", re: /\bTED[- ]?(approved|endorsed|official|certified|selected)\b|\bofficial TED\b|\bendorsed by TED\b/i, why: "TED does not endorse speakers or ideas; implying it is prohibited.", fix: "Remove the endorsement words.", blocking: true },
  { rule: "no logo", re: /\b(TED|TEDx) logo\b|\blogo of TED\b/i, why: "The TED and generic TEDx logos may not be used by speakers.", fix: "Use the official link and the event's name in text.", blocking: true },
  { rule: "no re-upload", re: /\b(re-?upload|upload (the|my) (talk|video)|download the (talk|video)|post the (full )?video (to|on) my|mirror)\b/i, why: "Only the official upload may exist; re-uploads are removed and can cost the talk its place.", fix: "Share the official link; a clip of up to 60 seconds tagged to the TEDx account is the most you may cut.", blocking: true },
  { rule: "clip length", re: /\b(6[1-9]|[7-9]\d|[1-9]\d{2,})[- ]second clip\b|\b([2-9]|\d{2,}|two|three|four|five|six|seven|eight|nine|ten)[- ]minute clip\b/i, why: "Clips for non-commercial social use are capped at 60 seconds.", fix: "Keep every clip under 60 seconds.", blocking: false },
  { rule: "no guarantee", re: new RegExp(["\\bguarante\\w*", "\\bget\\s+selected\\b", "\\bgo viral\\b", "\\bmillions of views\\b"].join("|"), "i"), why: "Honest numbers over hype.", fix: "Name what the reader will get from watching, not a view count.", blocking: false },
];
export function complianceFlags(text: string, opts: { requirePhrase?: boolean } = {}): ComplianceFlag[] {
  const out: ComplianceFlag[] = [];
  for (const r of RULES) { const m = text.match(r.re); if (m) out.push({ rule: r.rule, quote: m[0], why: r.why, fix: r.fix, blocking: r.blocking }); }
  if (opts.requirePhrase && /\bTEDx/i.test(text) && !/independently organi[sz]ed TEDx event/i.test(text)) out.push({ rule: "say how it was organized", quote: "", why: "Every public mention of the event names it as independently organized.", fix: "Add \"an independently organized TEDx event\" the first time the event is named.", blocking: false });
  return out;
}

// --- Launch plan (F4.3) ---------------------------------------------------------------------------
export type Phase = "pre" | "launch" | "first_48h" | "weeks_1_8" | "ongoing";
export interface PlanItem { when: string; text: string; phase: Phase; done?: boolean }
export const PHASE_LABEL: Record<Phase, string> = { pre: "Before the link", launch: "Launch day", first_48h: "First 48 hours", weeks_1_8: "Weeks 1 to 8", ongoing: "Ongoing" };

// The standard plan from TED's own playbook (9.1 principle 3): relative until the link is confirmed. No credits.
export const STANDARD_PLAN: PlanItem[] = [
  { when: "launch day - 14", text: "Write the launch team list: 20 to 50 people who will watch, like and comment on day one. Ask each one personally.", phase: "pre" },
  { when: "launch day - 10", text: "Build the lists: email list, LinkedIn connections who care about the idea, partners, local press, communities on the topic.", phase: "pre" },
  { when: "launch day - 7", text: "Send the upload pack (titles, description, bio, tags) to the organizer if you have not already.", phase: "pre" },
  { when: "launch day - 3", text: "Draft the personal email, the LinkedIn post and the newsletter block from the copy kit; add the link the moment it exists.", phase: "pre" },
  { when: "launch day", text: "Launch on a Monday or Tuesday: post on LinkedIn by 09:00 your time with the idea first and the link in the post, then email the launch team.", phase: "launch" },
  { when: "launch day", text: "Send the personal email to your network with three asks: watch, like or comment, forward to one person who needs it.", phase: "launch" },
  { when: "launch day + 1", text: "Reply to every comment, in your own words. Add the signature line to your email.", phase: "first_48h" },
  { when: "launch day + 2", text: "Post the second angle (angle 1 from the ten) and send the newsletter block.", phase: "first_48h" },
  { when: "launch day + 7", text: "Week 1: post angle 2; send the three outreach notes to topic writers or communities.", phase: "weeks_1_8" },
  { when: "launch day + 14", text: "Week 2: post angle 3; pitch an article on the idea (new writing, not the transcript) to one publication.", phase: "weeks_1_8" },
  { when: "launch day + 21", text: "Week 3: post angle 4; pitch two podcasts that link to the talk.", phase: "weeks_1_8" },
  { when: "launch day + 28", text: "Week 4: post angle 5; share in two communities where the idea is debated, as a member, not an advertiser.", phase: "weeks_1_8" },
  { when: "launch day + 42", text: "Week 6: post angle 6 and angle 7; a 60-second clip at most, tagged to the event's TEDx account.", phase: "weeks_1_8" },
  { when: "launch day + 56", text: "Week 8: post angle 8; update your website bio and LinkedIn About with the bio updater lines.", phase: "weeks_1_8" },
  { when: "launch day + 90", text: "Every month after: one new angle (9, then 10, then your own), and log any inquiry or booking the talk brought.", phase: "ongoing" },
];

export function nextMondayOrTuesday(from: Date): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (d.getUTCDay() !== 1 && d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const REL = /^launch day\s*(?:([+-])\s*(\d+))?$/i;
export function isRelative(when: string) { return REL.test(when.trim()); }
export function datePlan(items: PlanItem[], launchIso: string): PlanItem[] {
  const base = new Date(launchIso + "T00:00:00Z");
  return items.map((it) => {
    const m = it.when.trim().match(REL);
    if (!m) return it;
    const d = new Date(base); if (m[1]) d.setUTCDate(d.getUTCDate() + (m[1] === "-" ? -1 : 1) * Number(m[2]));
    return { ...it, when: d.toISOString().slice(0, 10) };
  }).sort((a, b) => a.when.localeCompare(b.when));
}
export function planProgress(items: PlanItem[]) { const done = items.filter((i) => i.done).length; return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 }; }
export function dueNow(items: PlanItem[], todayIso: string) { return items.filter((i) => !i.done && !isRelative(i.when) && i.when <= todayIso); }

// --- Copy kit (F4.4) and upload pack (F4.2) --------------------------------------------------------
export interface CopyKit { personal_email?: string; linkedin_post?: string; newsletter_block?: string; email_signature_line?: string; ten_second_angles?: string[]; blogger_outreach?: string[]; bio_line?: string; bio_updates?: { linkedin_about?: string; website_bio?: string; signature_line?: string } }
export const KIT_BLOCKS: { key: keyof CopyKit; label: string; hint: string }[] = [
  { key: "personal_email", label: "Personal email to your network", hint: "120 to 180 words, three asks: watch, like or comment, forward to one person." },
  { key: "linkedin_post", label: "LinkedIn post", hint: "Idea first, one story line, the link in the post. No hashtag stuffing." },
  { key: "newsletter_block", label: "Newsletter block", hint: "About 80 words." },
  { key: "email_signature_line", label: "Email signature line", hint: "One line with the official link." },
  { key: "ten_second_angles", label: "Ten second-angle posts", hint: "One line each, for the next eight weeks." },
  { key: "blogger_outreach", label: "Outreach notes", hint: "Three short notes to topic writers or communities." },
  { key: "bio_line", label: "Bio line", hint: "\"spoke at <event>, an independently organized TEDx event\"." },
];
export function insertLink(kit: CopyKit, url: string): CopyKit {
  const put = (t?: string) => (t === undefined ? t : /\[link\]|\{\{\s*link\s*\}\}|<link>/i.test(t) ? t.replace(/\[link\]|\{\{\s*link\s*\}\}|<link>/gi, url) : t.includes(url) ? t : `${t.trimEnd()}\n${url}`);
  return { ...kit, personal_email: put(kit.personal_email), linkedin_post: put(kit.linkedin_post), newsletter_block: put(kit.newsletter_block), email_signature_line: kit.email_signature_line ? (kit.email_signature_line.includes(url) ? kit.email_signature_line : `${kit.email_signature_line.replace(/\s*(\[link\]|\{\{\s*link\s*\}\}|<link>)\s*/gi, " ").trim()} ${url}`) : kit.email_signature_line };
}
export function kitText(kit: CopyKit) {
  return KIT_BLOCKS.map((b) => { const v = kit[b.key]; const text = Array.isArray(v) ? v.map((x, i) => `${i + 1}. ${x}`).join("\n") : typeof v === "string" ? v : ""; return text ? `${b.label.toUpperCase()}\n${text}` : ""; }).filter(Boolean).join("\n\n");
}
export const bioLine = (eventName: string, year: number | string) => `Spoke at ${eventName} ${year}, an independently organized TEDx event.`;

export interface UploadPack { titles?: string[]; description?: string; bio?: string; tags?: string[] }
export const sentences = (t: string) => (t.match(/[^.!?]+[.!?]+/g) ?? (t.trim() ? [t] : [])).length;
export function uploadPackChecks(p: UploadPack, speakerName: string, eventName: string): string[] {
  const out: string[] = [];
  const titles = p.titles ?? [];
  if (titles.length !== 3) out.push(`${titles.length} title option${titles.length === 1 ? "" : "s"}; the organizer gets three to choose from.`);
  titles.forEach((t, i) => { if (t.length > 100) out.push(`Title ${i + 1} is ${t.length} characters; YouTube cuts at 100.`); if (speakerName && !t.toLowerCase().includes(speakerName.toLowerCase().split(" ")[0])) out.push(`Title ${i + 1} does not carry your name.`); if (eventName && !t.toLowerCase().includes(eventName.toLowerCase())) out.push(`Title ${i + 1} does not carry "${eventName}".`); });
  const ds = sentences(p.description ?? ""); if (ds < 2 || ds > 3) out.push(`Description has ${ds} sentence${ds === 1 ? "" : "s"}; two or three with a hook.`);
  const bs = sentences(p.bio ?? ""); if (bs < 4 || bs > 7) out.push(`Bio has ${bs} sentence${bs === 1 ? "" : "s"}; four to seven.`);
  if ((p.tags ?? []).length !== 5) out.push(`${(p.tags ?? []).length} tags; five.`);
  return out;
}
export function uploadPackText(p: UploadPack) {
  return [`TITLE OPTIONS\n${(p.titles ?? []).map((t, i) => `${i + 1}. ${t}`).join("\n")}`, `DESCRIPTION\n${p.description ?? ""}`, `BIO\n${p.bio ?? ""}`, `TAGS\n${(p.tags ?? []).join(", ")}`].join("\n\n");
}

// F4.12 Second-talk guard: TED discourages serial applicants and does not publish duplicate talks.
export const SECOND_TALK_GUARD = {
  title: "Thinking about a second talk?",
  body: "TED's guidance to organizers discourages speakers who collect stages, and a talk that repeats an idea already on the TEDx channel is not published. A second talk needs a second idea, one that is new, specific and yours. If you have one, the Idea Lab starts it from scratch; the first talk stays in your record and your bio.",
  cta: "Start a new idea",
};
