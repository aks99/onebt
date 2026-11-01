import { supabaseServer } from "@/lib/supabase/server";
import { rankEvents, type MatchEvent, type MatchIdea, type MatchProfile, type MatchResult } from "./matching";
import type { EventCardData, MemberState } from "@/components/events/EventCard";

// Loads what the Event Finder needs with RLS on: the catalogue slice, the member's locked idea and profile,
// accepted tags, and the member's own target, watch and application sets. Ranks in memory (a few thousand rows).

export interface Filters { country?: string; region?: string; city?: string; type?: string; status?: string; from?: string; to?: string; deadlineWithin?: number; slot?: number; watch?: boolean; q?: string; local?: boolean }

export interface FinderData {
  events: EventCardData[]; matches: Map<string, MatchResult>; state: Map<string, MemberState>;
  apply: MatchResult[]; watch: MatchResult[]; idea: MatchIdea | null; hasMemberAccess: boolean; profile: MatchProfile;
}

export async function loadFinder(userId: string, talkId: string | null, f: Filters, now = new Date()): Promise<FinderData> {
  const sb = await supabaseServer();
  const today = now.toISOString().slice(0, 10);
  let q = sb.from("events").select("id, name, city, region, country_code, venue, lat, lng, event_type, event_date, theme, theme_history, application_status, application_deadline, deadline_time, deadline_timezone, deadline_timezone_status, status_label, local_connection_required, pitch_video_required, talk_length_target, last_verified_at, source, curator_verified, expired")
    .eq("curator_verified", true).eq("expired", false).or(`event_date.is.null,event_date.gte.${today}`).limit(800);
  if (f.country) q = q.eq("country_code", f.country.toUpperCase());
  if (f.region) q = q.ilike("region", `%${f.region}%`);
  if (f.city) q = q.ilike("city", `%${f.city}%`);
  if (f.type) q = q.eq("event_type", f.type);
  if (f.status) q = q.eq("application_status", f.status);
  if (f.from) q = q.gte("event_date", f.from);
  if (f.to) q = q.lte("event_date", f.to);
  if (f.q) q = q.or(`name.ilike.%${f.q}%,theme.ilike.%${f.q}%`);
  const [{ data: evs }, { data: idea }, { data: profile }, { data: access }, { data: targets }, { data: watches }, { data: apps }] = await Promise.all([
    q,
    talkId ? sb.from("ideas").select("title_working, throughline, belief_challenged").eq("talk_id", talkId).eq("status", "locked").maybeSingle() : Promise.resolve({ data: null }),
    sb.from("profiles").select("city, region, country_code, travel_radius_km, hometown, alma_mater, places_lived").eq("user_id", userId).maybeSingle(),
    sb.rpc("has_member_access", { p_user: userId }),
    sb.from("target_list").select("event_id").eq("user_id", userId),
    sb.from("event_watches").select("event_id").eq("user_id", userId),
    sb.from("applications").select("event_id").eq("user_id", userId).not("event_id", "is", null),
  ]);
  // F1.4.4 Local-connection finder: events in the member's city, hometown, places lived, or at the alma mater.
  let list = (evs ?? []) as any[];
  if (f.local) {
    const places = [profile?.city, profile?.region, profile?.hometown, ...((profile?.places_lived as string[] | null) ?? [])].filter((x): x is string => !!x && x.trim().length > 1).map((x) => x.toLowerCase());
    const alma = profile?.alma_mater?.toLowerCase();
    list = list.filter((e) => {
      const here = [e.city, e.region, e.venue].filter(Boolean).map((x: string) => x.toLowerCase());
      const placeHit = places.some((p) => here.some((h) => h.includes(p) || p.includes(h)));
      const almaHit = !!alma && alma.length > 3 && (`${e.name} ${e.venue ?? ""}`.toLowerCase().includes(alma) || (e.event_type === "university" && here.some((h) => alma.includes(h))));
      return placeHit || almaHit;
    });
  }
  const ids = list.map((e) => e.id);
  const { data: tags } = ids.length ? await sb.from("event_topics").select("event_id, tag").eq("accepted", true).in("event_id", ids) : { data: [] as any[] };
  const tagBy = new Map<string, string[]>(); for (const t of tags ?? []) tagBy.set(t.event_id, [...(tagBy.get(t.event_id) ?? []), t.tag]);
  const matchEvents: MatchEvent[] = list.map((e) => ({ ...e, theme_history: (e.theme_history as any[]) ?? [], tags: tagBy.get(e.id) ?? [], remote_friendly: null }));
  const matchIdea: MatchIdea | null = idea ? { title: idea.title_working, throughline: idea.throughline, belief: idea.belief_challenged } : null;
  const mp: MatchProfile = { city: profile?.city ?? null, region: profile?.region ?? null, country_code: profile?.country_code ?? null, travel_radius_km: profile?.travel_radius_km ?? null };
  const ranked = rankEvents(matchIdea ?? { title: null, throughline: null, belief: null }, mp, matchEvents, now);
  let apply = ranked.apply, watch = ranked.watch;
  if (f.deadlineWithin) apply = apply.filter((r) => r.daysToDeadline !== null && r.daysToDeadline <= f.deadlineWithin!);
  if (f.slot) { const byId = new Map(matchEvents.map((e) => [e.id, e])); apply = apply.filter((r) => { const t = byId.get(r.eventId)?.talk_length_target; if (!t) return true; const nums = t.match(/\d+/g)?.map(Number) ?? []; return nums.length === 0 || nums.some((n) => n >= f.slot!); }); }
  const matches = new Map<string, MatchResult>([...apply, ...watch].map((r) => [r.eventId, r]));
  const tSet = new Set((targets ?? []).map((t) => t.event_id)), wSet = new Set((watches ?? []).map((w) => w.event_id)), aSet = new Set((apps ?? []).map((a) => a.event_id as string));
  const state = new Map<string, MemberState>(ids.map((id) => [id, { targeted: tSet.has(id), tracked: aSet.has(id), watched: wSet.has(id) }]));
  return { events: list as EventCardData[], matches, state, apply, watch, idea: matchIdea, hasMemberAccess: !!access, profile: mp };
}
