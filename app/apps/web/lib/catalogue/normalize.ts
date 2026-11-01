// Column maps and value normalization for the crawler's three files (crawler prompt C.1 to C.3) as they
// arrive from the Google Sheet tabs or a CSV upload. The sheet is maintained by a person; the app never crawls.

export type Kind = "events" | "organizers" | "calls";

interface Col { key: string; aliases?: string[]; required?: boolean }

export const COLUMNS: Record<Kind, Col[]> = {
  events: [
    { key: "tedx_event_id", required: true }, { key: "event_name", aliases: ["name"], required: true }, { key: "name_key" }, { key: "event_url" },
    { key: "event_type", aliases: ["type"] }, { key: "status_label" }, { key: "start_date", aliases: ["event_date", "date"], required: true }, { key: "end_date" }, { key: "raw_date" },
    { key: "timezone" }, { key: "city", required: true }, { key: "region", aliases: ["state"] }, { key: "country_code", aliases: ["country"], required: true }, { key: "venue" },
    { key: "lat", aliases: ["latitude"] }, { key: "lng", aliases: ["lon", "longitude"] }, { key: "theme" }, { key: "organizer_id" }, { key: "organizer_website_url", aliases: ["website"] },
    { key: "social_links" }, { key: "speaker_link_on_ted_page" }, { key: "first_seen_at" }, { key: "last_seen_at" }, { key: "last_modified" },
    { key: "confidence" }, { key: "needs_review" }, { key: "expired" }, { key: "source_urls" }, { key: "curator_verified", aliases: ["verified"] },
  ],
  organizers: [
    { key: "organizer_id", required: true }, { key: "organizer_name", aliases: ["name"], required: true }, { key: "website_domain" }, { key: "website_url" },
    { key: "public_contact_email" }, { key: "public_contact_role" }, { key: "public_contact_name" }, { key: "contact_form_url" },
    { key: "instagram" }, { key: "linkedin_page" }, { key: "facebook_page" }, { key: "x_handle" }, { key: "youtube_channel" },
    { key: "city" }, { key: "country_code" }, { key: "licensee_name" }, { key: "contact_source_url" }, { key: "contact_seen_at" },
    { key: "confidence" }, { key: "needs_review" }, { key: "removal_requested_at" },
  ],
  calls: [
    { key: "call_id" }, { key: "tedx_event_id", required: true }, { key: "edition_year" }, { key: "call_status", aliases: ["status"], required: true }, { key: "call_opens_on" },
    { key: "ai_policy" }, { key: "ai_policy_snippet" }, { key: "ai_policy_source_url" }, { key: "status_evidence" }, { key: "status_source_url" }, { key: "status_seen_at" },
    { key: "application_form_url", aliases: ["form_url"] }, { key: "form_type" }, { key: "deadline", aliases: ["application_deadline"] }, { key: "deadline_timezone" }, { key: "deadline_raw" },
    { key: "criteria_snippet" }, { key: "slot_lengths" }, { key: "video_required" }, { key: "requirements_notes" }, { key: "past_speakers_url" },
    { key: "confidence" }, { key: "needs_review" }, { key: "curator_verified", aliases: ["verified"] },
  ],
};

export interface ColumnCheck { ok: boolean; missingRequired: string[]; unknown: string[]; mapped: Record<string, string> }

// Maps the sheet's header names to canonical keys (case and spaces ignored; aliases accepted).
export function checkColumns(headers: string[], kind: Kind): ColumnCheck {
  const canon = (s: string) => s.toLowerCase().replace(/[\s-]+/g, "_");
  const mapped: Record<string, string> = {};
  const unknown: string[] = [];
  for (const h of headers) {
    const c = canon(h);
    const col = COLUMNS[kind].find((x) => x.key === c || (x.aliases ?? []).includes(c));
    if (col) mapped[h] = col.key; else if (h) unknown.push(h);
  }
  const have = new Set(Object.values(mapped));
  const missingRequired = COLUMNS[kind].filter((c) => c.required && !have.has(c.key)).map((c) => c.key);
  return { ok: missingRequired.length === 0, missingRequired, unknown, mapped };
}

export function remap(row: Record<string, string>, mapped: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [h, v] of Object.entries(row)) { const k = mapped[h]; if (k) out[k] = v; }
  return out;
}

// --- value helpers ---------------------------------------------------------
export function bool(v: string | undefined): boolean | null {
  const s = (v ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "1", "x"].includes(s)) return true;
  if (["no", "n", "false", "0", ""].includes(s)) return s === "" ? null : false;
  return null;
}
export function num(v: string | undefined): number | null {
  const s = (v ?? "").trim().replace(/,/g, ""); if (!s) return null;
  const n = Number(s); return Number.isFinite(n) ? n : null;
}
export function isoDate(v: string | undefined): string | null {
  const s = (v ?? "").trim(); if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;   // US sheets default
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (m) { const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); if (mon >= 0) return `${m[3]}-${String(mon + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export function isoDateTime(v: string | undefined): string | null {
  const s = (v ?? "").trim(); if (!s) return null;
  const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString();
}
export function json(v: string | undefined, fallback: unknown) {
  const s = (v ?? "").trim(); if (!s) return fallback;
  try { return JSON.parse(s); } catch { return s.includes(",") || s.includes("http") ? s.split(/\s*[,;]\s*/).filter(Boolean) : fallback; }
}
export function nameKey(name: string) {
  return (name ?? "").toLowerCase().replace(/\btedx(youth|women|salon)?@?/g, " ").replace(/\b(19|20)\d{2}\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
export function countryCode(v: string | undefined): string | null {
  const s = (v ?? "").trim().toUpperCase(); if (/^[A-Z]{2}$/.test(s)) return s;
  const map: Record<string, string> = { "UNITED STATES": "US", USA: "US", "UNITED KINGDOM": "GB", UK: "GB", INDIA: "IN", CANADA: "CA", AUSTRALIA: "AU", GERMANY: "DE", FRANCE: "FR", NETHERLANDS: "NL", SINGAPORE: "SG", "UNITED ARAB EMIRATES": "AE", UAE: "AE" };
  return map[s] ?? null;
}

export const EVENT_TYPES = ["standard", "university", "youth", "salon", "women", "business", "ed", "play", "live", "internal", "library", "countdown", "studio", "other"] as const;
export function eventType(v: string | undefined): typeof EVENT_TYPES[number] {
  const s = (v ?? "").trim().toLowerCase();
  return (EVENT_TYPES as readonly string[]).includes(s) ? (s as typeof EVENT_TYPES[number]) : "other";
}

export const CALL_STATUSES = ["open", "announced", "rolling", "closed", "nomination", "invitation_only", "stale", "unknown"] as const;
export type CallStatus = typeof CALL_STATUSES[number];
// Crawler values (C.3) to database enum values.
export function callStatus(v: string | undefined): CallStatus {
  const s = (v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const map: Record<string, CallStatus> = { invite_only: "invitation_only", invitation_only: "invitation_only", nominations_only: "nomination", nomination_only: "nomination", nominations: "nomination", by_nomination: "nomination" };
  if (map[s]) return map[s];
  return (CALL_STATUSES as readonly string[]).includes(s) ? (s as CallStatus) : "unknown";
}
export function aiPolicy(v: string | undefined): "allowed" | "restricted" | "prohibited" | "unknown" {
  const s = (v ?? "").trim().toLowerCase();
  return s === "allowed" || s === "restricted" || s === "prohibited" ? s : "unknown";
}
export function tzStatus(tz: string | null, raw: string | null): "stated" | "inferred" | "unknown" {
  if (!tz) return "unknown";
  if (raw && /\b(utc|gmt|[a-z]{2,4}t\b|[+-]\d{2}:?\d{2})/i.test(raw)) return "stated";
  return "inferred";
}
export function clip(v: string | undefined, n: number) { const s = (v ?? "").trim(); return s ? s.slice(0, n) : null; }

// --- typed records ---------------------------------------------------------
export interface EventRecord {
  tedx_event_id: string; name: string; name_key: string; event_url: string | null; event_type: typeof EVENT_TYPES[number]; status_label: string | null;
  event_date: string | null; end_date: string | null; raw_date: string | null; timezone: string | null; city: string | null; region: string | null; country_code: string | null; venue: string | null;
  lat: number | null; lng: number | null; theme: string | null; organizer_external_id: string | null; organizer_website_url: string | null; social_links: unknown; source_urls: unknown;
  confidence: number | null; needs_review: boolean; expired: boolean; curator_verified: boolean;
}
export interface OrganizerRecord {
  external_id: string; name: string; name_key: string; website_domain: string | null; website_url: string | null; city: string | null; country_code: string | null;
  instagram: string | null; linkedin_page: string | null; facebook_page: string | null; x_handle: string | null; youtube_channel: string | null; licensee_name: string | null;
  confidence: number | null; needs_review: boolean; removal_requested_at: string | null;
  contact: { email: string | null; role: string | null; name: string | null; form_url: string | null; source_url: string | null; seen_at: string | null } | null;
}
export interface CallRecord {
  call_id: string; tedx_event_id: string; edition_year: number | null; call_status: CallStatus; call_opens_on: string | null; ai_policy: ReturnType<typeof aiPolicy>; ai_policy_snippet: string | null; ai_policy_source_url: string | null;
  status_evidence: string | null; status_source_url: string | null; status_seen_at: string | null; application_form_url: string | null; form_type: string | null;
  deadline: string | null; deadline_timezone: string | null; deadline_timezone_status: ReturnType<typeof tzStatus>; deadline_raw: string | null; criteria_snippet: string | null; slot_lengths: string | null;
  video_required: boolean | null; requirements_notes: string | null; past_speakers_url: string | null; confidence: number | null; needs_review: boolean; curator_verified: boolean;
}

export interface RowProblem { row: number; key: string; problem: string }

export function toEvent(r: Record<string, string>, i: number, problems: RowProblem[]): EventRecord | null {
  const id = (r.tedx_event_id ?? "").trim(); const name = (r.event_name ?? "").trim();
  if (!id || !name) { problems.push({ row: i, key: id || name || "(blank)", problem: "tedx_event_id and event_name are required" }); return null; }
  const date = isoDate(r.start_date);
  if (r.start_date && !date) problems.push({ row: i, key: id, problem: `start_date "${r.start_date}" not understood; left empty` });
  const cc = countryCode(r.country_code);
  if (r.country_code && !cc) problems.push({ row: i, key: id, problem: `country_code "${r.country_code}" is not a two-letter code; left empty` });
  return {
    tedx_event_id: id, name, name_key: (r.name_key ?? "").trim() || nameKey(name), event_url: clip(r.event_url, 500), event_type: eventType(r.event_type), status_label: clip(r.status_label, 80),
    event_date: date, end_date: isoDate(r.end_date), raw_date: clip(r.raw_date, 120), timezone: clip(r.timezone, 64), city: clip(r.city, 120), region: clip(r.region, 120), country_code: cc, venue: clip(r.venue, 200),
    lat: num(r.lat), lng: num(r.lng), theme: clip(r.theme, 200), organizer_external_id: clip(r.organizer_id, 200), organizer_website_url: clip(r.organizer_website_url, 500),
    social_links: json(r.social_links, {}), source_urls: json(r.source_urls, []),
    confidence: num(r.confidence), needs_review: bool(r.needs_review) ?? false, expired: bool(r.expired) ?? false, curator_verified: bool(r.curator_verified) ?? false,
  };
}

export function toOrganizer(r: Record<string, string>, i: number, problems: RowProblem[]): OrganizerRecord | null {
  const id = (r.organizer_id ?? "").trim(); const name = (r.organizer_name ?? "").trim();
  if (!id || !name) { problems.push({ row: i, key: id || name || "(blank)", problem: "organizer_id and organizer_name are required" }); return null; }
  const hasContact = !!(r.public_contact_email || r.public_contact_name || r.contact_form_url);
  let contact: OrganizerRecord["contact"] = null;
  if (hasContact) {
    if (!r.contact_source_url || !r.contact_seen_at) { problems.push({ row: i, key: id, problem: "contact fields need contact_source_url and contact_seen_at (R6); contact dropped" }); }
    else contact = { email: clip(r.public_contact_email, 200), role: clip(r.public_contact_role, 40), name: clip(r.public_contact_name, 120), form_url: clip(r.contact_form_url, 500), source_url: clip(r.contact_source_url, 500), seen_at: isoDateTime(r.contact_seen_at) };
  }
  return {
    external_id: id, name, name_key: nameKey(name), website_domain: clip(r.website_domain, 200)?.toLowerCase() ?? null, website_url: clip(r.website_url, 500), city: clip(r.city, 120), country_code: countryCode(r.country_code),
    instagram: clip(r.instagram, 200), linkedin_page: clip(r.linkedin_page, 300), facebook_page: clip(r.facebook_page, 300), x_handle: clip(r.x_handle, 100), youtube_channel: clip(r.youtube_channel, 300), licensee_name: clip(r.licensee_name, 200),
    confidence: num(r.confidence), needs_review: bool(r.needs_review) ?? false, removal_requested_at: isoDateTime(r.removal_requested_at), contact,
  };
}

export function toCall(r: Record<string, string>, i: number, problems: RowProblem[]): CallRecord | null {
  const ev = (r.tedx_event_id ?? "").trim();
  if (!ev) { problems.push({ row: i, key: "(blank)", problem: "tedx_event_id is required" }); return null; }
  const year = num(r.edition_year);
  const deadline = isoDate(r.deadline);
  if (r.deadline && !deadline) problems.push({ row: i, key: ev, problem: `deadline "${r.deadline}" not understood; left empty` });
  const tz = clip(r.deadline_timezone, 64);
  const status = callStatus(r.call_status);
  if (r.call_status && status === "unknown" && r.call_status.trim().toLowerCase() !== "unknown") problems.push({ row: i, key: ev, problem: `call_status "${r.call_status}" not understood; set to unknown` });
  return {
    call_id: (r.call_id ?? "").trim() || `${ev}-${year ?? (deadline ?? "").slice(0, 4) ?? "na"}`, tedx_event_id: ev, edition_year: year, call_status: status, call_opens_on: isoDate(r.call_opens_on),
    ai_policy: aiPolicy(r.ai_policy), ai_policy_snippet: clip(r.ai_policy_snippet, 200), ai_policy_source_url: clip(r.ai_policy_source_url, 500),
    status_evidence: clip(r.status_evidence, 200), status_source_url: clip(r.status_source_url, 500), status_seen_at: isoDateTime(r.status_seen_at), application_form_url: clip(r.application_form_url, 500), form_type: clip(r.form_type, 40),
    deadline, deadline_timezone: tz, deadline_timezone_status: tzStatus(tz, r.deadline_raw ?? null), deadline_raw: clip(r.deadline_raw, 120), criteria_snippet: clip(r.criteria_snippet, 200), slot_lengths: clip(r.slot_lengths, 60),
    video_required: bool(r.video_required), requirements_notes: clip(r.requirements_notes, 500), past_speakers_url: clip(r.past_speakers_url, 500), confidence: num(r.confidence), needs_review: bool(r.needs_review) ?? false, curator_verified: bool(r.curator_verified) ?? false,
  };
}
