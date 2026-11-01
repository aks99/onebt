import type { CallRecord, EventRecord, OrganizerRecord } from "./normalize";

// Field-level diff between what the sheet says and what the catalogue holds (S8.3 Diff tab).
// Rules (6.2 F1.2.16, 12.5): a row the owner marked curator_verified publishes directly; other rows and
// changes wait in the verify queue; a row missing from the sheet is expired, never deleted; a status
// is a fact with a source, never set by a model.

export type Entity = "event" | "organizer" | "call";
export interface DiffItem { entity: Entity; key: string; field: string; before: unknown; after: unknown; confidence: number | null; auto: boolean }
export interface RunSummary { total: number; new: number; changed: number; unchanged: number; expired: number; errors: number }

export const EVENT_FIELDS: (keyof EventRecord)[] = ["name", "name_key", "event_url", "event_type", "status_label", "event_date", "end_date", "raw_date", "timezone", "city", "region", "country_code", "venue", "lat", "lng", "theme", "organizer_website_url", "social_links", "source_urls", "confidence", "needs_review", "expired", "curator_verified"];
export const ORGANIZER_FIELDS: (keyof OrganizerRecord)[] = ["name", "website_domain", "website_url", "city", "country_code", "instagram", "linkedin_page", "facebook_page", "x_handle", "youtube_channel", "licensee_name", "confidence", "needs_review", "removal_requested_at"];
export const CALL_FIELDS: (keyof CallRecord)[] = ["edition_year", "call_status", "call_opens_on", "ai_policy", "ai_policy_snippet", "ai_policy_source_url", "status_evidence", "status_source_url", "status_seen_at", "application_form_url", "form_type", "deadline", "deadline_timezone", "deadline_timezone_status", "deadline_raw", "criteria_snippet", "slot_lengths", "video_required", "requirements_notes", "past_speakers_url", "confidence", "needs_review"];

export const AUTO_ACCEPT_CONFIDENCE = 0.8;

function same(a: unknown, b: unknown) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === "object" || typeof b === "object") return JSON.stringify(a) === JSON.stringify(b);
  return String(a) === String(b);
}

// A change is auto-applied when the row is curator-verified, or when its confidence is high and the field is
// not a status or deadline (those two always wait for a person unless the row is verified).
function autoFor(field: string, verified: boolean, confidence: number | null) {
  if (verified) return true;
  if (field === "call_status" || field === "deadline" || field === "application_status" || field === "application_deadline") return false;
  return (confidence ?? 0) >= AUTO_ACCEPT_CONFIDENCE;
}

export function diffRecords<T extends Record<string, unknown>>(entity: Entity, key: string, incoming: T, current: T | null, fields: (keyof T)[], verified: boolean): DiffItem[] {
  const items: DiffItem[] = [];
  const confidence = (incoming.confidence as number | null) ?? null;
  if (!current) {
    items.push({ entity, key, field: "*", before: null, after: "new", confidence, auto: verified || (confidence ?? 0) >= AUTO_ACCEPT_CONFIDENCE });
    return items;
  }
  for (const f of fields) {
    const after = incoming[f]; const before = current[f];
    if (after === null || after === undefined) continue;          // the sheet leaving a cell blank never erases a fact
    if (same(before, after)) continue;
    items.push({ entity, key, field: String(f), before: before ?? null, after, confidence, auto: autoFor(String(f), verified, confidence) });
  }
  return items;
}

export function summarize(items: DiffItem[], incomingKeys: string[], expiredKeys: string[], errors: number): RunSummary {
  const keysWithChange = new Set(items.filter((i) => i.field !== "*").map((i) => `${i.entity}:${i.key}`));
  const newKeys = new Set(items.filter((i) => i.field === "*").map((i) => `${i.entity}:${i.key}`));
  const total = incomingKeys.length;
  return { total, new: newKeys.size, changed: keysWithChange.size, unchanged: Math.max(0, total - newKeys.size - keysWithChange.size), expired: expiredKeys.length, errors };
}

// Rows present in the catalogue from this source and absent from the sheet are expired (never deleted).
export function missingKeys(currentKeys: string[], incomingKeys: string[]) {
  const have = new Set(incomingKeys);
  return currentKeys.filter((k) => !have.has(k));
}
