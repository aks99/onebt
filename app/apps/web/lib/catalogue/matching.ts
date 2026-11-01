import { contentWords } from "@/lib/find/ideaRules";

// Match ranking (6.2 F1.2.1, F1.2.2; 12.5). Eligibility first, then a score with four parts, then three
// "why you match" lines and one caution. Pure function; tested in tests/catalogue.test.ts.
// Theme similarity is lexical in the first release (content words and accepted Haiku tags). The embedding
// term (pgvector cosine) plugs into `themeSimilarity` when an embedding provider is configured (Appendix C).

export interface MatchIdea { title: string | null; throughline: string | null; belief: string | null; tags?: string[] }
export interface MatchProfile { city: string | null; region: string | null; country_code: string | null; travel_radius_km: number | null; lat?: number | null; lng?: number | null }
export interface MatchEvent {
  id: string; name: string; city: string | null; region: string | null; country_code: string | null; lat: number | null; lng: number | null;
  event_type: string; event_date: string | null; theme: string | null; theme_history: { year?: number; theme?: string }[]; tags: string[];
  application_status: string; application_deadline: string | null; status_label: string | null;
  local_connection_required: boolean | null; pitch_video_required: boolean | null; talk_length_target: string | null; remote_friendly?: boolean | null;
  last_verified_at: string | null; expired: boolean; curator_verified: boolean;
}
export interface MatchResult {
  eventId: string; bucket: "apply" | "watch"; score: number;
  parts: { theme: number; geography: number; deadline: number; openCall: number };
  why: string[]; caution: string | null; daysToDeadline: number | null; distanceKm: number | null;
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function daysUntil(iso: string, now: Date) {
  return Math.ceil((new Date(iso + "T00:00:00Z").getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000);
}

// 0..1. Shared content words between the idea and the event's theme, theme history and tags.
export function themeSimilarity(idea: MatchIdea, ev: MatchEvent): { score: number; shared: string[] } {
  const ideaWords = new Set([...contentWords([idea.title, idea.throughline, idea.belief].filter(Boolean).join(" ")), ...(idea.tags ?? []).map((t) => t.toLowerCase())]);
  const evText = [ev.theme, ...ev.theme_history.map((t) => t.theme ?? "")].filter(Boolean).join(" ");
  const evWords = new Set([...contentWords(evText), ...ev.tags.map((t) => t.toLowerCase())]);
  if (!ideaWords.size || !evWords.size) return { score: 0, shared: [] };
  const shared = Array.from(ideaWords).filter((w) => evWords.has(w));
  const score = Math.min(1, shared.length / Math.min(4, evWords.size));   // a theme is a few words; two shared words is a strong fit
  return { score, shared };
}

export function scoreEvent(idea: MatchIdea, profile: MatchProfile, ev: MatchEvent, now = new Date()): MatchResult {
  const days = ev.application_deadline ? daysUntil(ev.application_deadline, now) : null;
  const km = profile.lat != null && profile.lng != null && ev.lat != null && ev.lng != null ? Math.round(distanceKm(profile.lat, profile.lng, ev.lat, ev.lng)) : null;
  const why: string[] = [];
  let caution: string | null = null;

  // Eligibility (v1.4): closed, invitation-only, nomination, passed deadline or a local-connection rule the
  // member does not meet moves the event to "watch". Unknown constraints are cautions, never passes.
  let bucket: MatchResult["bucket"] = "apply";
  const sameCity = !!profile.city && !!ev.city && profile.city.toLowerCase() === ev.city.toLowerCase();
  const sameRegion = !!profile.region && !!ev.region && profile.region.toLowerCase() === ev.region.toLowerCase();
  const sameCountry = !!profile.country_code && !!ev.country_code && profile.country_code === ev.country_code;
  if (["closed", "invitation_only", "nomination", "stale"].includes(ev.application_status)) bucket = "watch";
  if (days !== null && days < 0) bucket = "watch";
  if (ev.local_connection_required === true && !sameCity && !sameRegion) bucket = "watch";
  if (ev.expired) bucket = "watch";

  // Theme
  const t = themeSimilarity(idea, ev);
  const theme = Math.round(t.score * 4 * 100) / 100;   // 0..4
  if (t.shared.length) why.push(`theme "${ev.theme ?? ev.theme_history[0]?.theme ?? ""}" shares ${t.shared.slice(0, 3).join(", ")} with your idea`);
  else if (ev.theme) why.push(`theme "${ev.theme}" is broad enough for your idea`);
  else why.push("theme not announced yet");

  // Geography (12.5: same city 3, region 2, country 1, remote-friendly bonus)
  let geography = sameCity ? 3 : sameRegion ? 2 : sameCountry ? 1 : 0;
  if (ev.remote_friendly) geography += 0.5;
  if (km !== null) {
    why.push(`${km} km from ${profile.city ?? "you"}`);
    if (profile.travel_radius_km != null && km > profile.travel_radius_km && !ev.remote_friendly) caution = caution ?? `${km} km is beyond the ${profile.travel_radius_km} km you set`;
  } else why.push(sameCity ? `in your city, ${ev.city}` : sameCountry ? `in your country (${ev.city ?? ev.country_code})` : `${ev.city ?? "city not listed"}, ${ev.country_code ?? ""}`.trim());

  // Deadline fit: open and at least 14 days away scores full marks; closer is still possible but tight
  let deadline = 0;
  if (ev.application_status === "open" && days !== null) {
    deadline = days >= 14 ? 2 : days >= 0 ? 1 : 0;
    why.push(days >= 0 ? `call open, ${days} day${days === 1 ? "" : "s"} to the deadline` : "deadline has passed");
  } else if (ev.application_status === "rolling") { deadline = 1.5; why.push("rolling call, no fixed deadline"); }
  else if (ev.application_status === "announced") { deadline = 1; why.push("call announced, opens soon"); }
  else if (ev.application_status === "open") { deadline = 1; why.push("call open, deadline not stated"); }
  else why.push(`call ${ev.application_status.replace("_", " ")}`);

  // Open-call likelihood (standard and university events with an open label rank above others)
  let openCall = 0;
  if (["standard", "university"].includes(ev.event_type)) openCall += 1;
  if (ev.application_status === "open" || ev.application_status === "rolling") openCall += 1;
  if (ev.application_status === "invitation_only" || ev.application_status === "nomination") openCall = 0;

  // Cautions (one, the most useful)
  if (!caution && ev.local_connection_required === true) caution = `requires a local connection to ${ev.region ?? ev.city ?? "the area"}`;
  if (!caution && ev.local_connection_required === null && ev.event_type === "university") caution = "university events often prefer campus or alumni ties; check the call";
  if (!caution && ev.pitch_video_required === true) caution = "asks for a short pitch video, which you make on your own device";
  if (!caution && ev.talk_length_target && /^\s*\d+\s*(min)?\s*$/i.test(ev.talk_length_target) && Number(ev.talk_length_target.replace(/\D/g, "")) <= 8) caution = `${ev.talk_length_target.replace(/\D/g, "")}-minute slots only`;
  if (!caution && ev.last_verified_at && (now.getTime() - new Date(ev.last_verified_at).getTime()) / 86400000 > 60) caution = "not verified in 60 days; check the organizer site";
  if (!caution && !ev.curator_verified) caution = "not yet verified by a curator";

  const score = Math.round((theme + geography + deadline + openCall) * 100) / 100;   // max 4 + 3.5 + 2 + 2 = 11.5
  return { eventId: ev.id, bucket, score, parts: { theme, geography, deadline, openCall }, why: why.slice(0, 3), caution, daysToDeadline: days, distanceKm: km };
}

export function rankEvents(idea: MatchIdea, profile: MatchProfile, events: MatchEvent[], now = new Date()) {
  const results = events.map((e) => scoreEvent(idea, profile, e, now));
  const apply = results.filter((r) => r.bucket === "apply").sort((a, b) => b.score - a.score || (a.daysToDeadline ?? 9999) - (b.daysToDeadline ?? 9999));
  const watch = results.filter((r) => r.bucket === "watch").sort((a, b) => b.score - a.score);
  return { apply, watch };
}

// Normalized 0..1 for display ("Match 0.82").
export function matchRatio(score: number) { return Math.min(1, Math.round((score / 11.5) * 100) / 100); }
