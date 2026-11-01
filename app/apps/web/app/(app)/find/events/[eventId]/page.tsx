import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, DeadlineChip } from "@onebigtalk/ui";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { scoreEvent } from "@/lib/catalogue/matching";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { CalendarLink } from "@/components/events/CalendarLink";

export const dynamic = "force-dynamic";

// S3.5 Event detail: everything known, with sources and the verified date. Facts and links only; never TED's
// descriptions or images. Contact appears only as "contact via the organizer's published channel".
export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/find/events/${eventId}`);
  const sb = await supabaseServer();
  const talk = await currentTalk(user.id);
  const [{ data: ev }, { data: calls }, { data: tags }, { data: access }, { data: profile }, { data: idea }, { data: target }, { data: watch }, { data: app }, { data: org }] = await Promise.all([
    sb.from("events").select("*").eq("id", eventId).maybeSingle(),
    sb.from("application_calls").select("*").eq("event_id", eventId).order("edition_year", { ascending: false }),
    sb.from("event_topics").select("tag").eq("event_id", eventId).eq("accepted", true),
    sb.rpc("has_member_access", { p_user: user.id }),
    sb.from("profiles").select("city, region, country_code, travel_radius_km").eq("user_id", user.id).maybeSingle(),
    talk ? sb.from("ideas").select("title_working, throughline, belief_challenged").eq("talk_id", talk.id).eq("status", "locked").maybeSingle() : Promise.resolve({ data: null }),
    sb.from("target_list").select("event_id").eq("user_id", user.id).eq("event_id", eventId).maybeSingle(),
    sb.from("event_watches").select("event_id").eq("user_id", user.id).eq("event_id", eventId).maybeSingle(),
    sb.from("applications").select("id").eq("user_id", user.id).eq("event_id", eventId).maybeSingle(),
    sb.from("events").select("organizers(name, website_url, website_domain, instagram, linkedin_page)").eq("id", eventId).maybeSingle(),
  ]);
  if (!ev) notFound();
  const member = !!access;
  const match = scoreEvent(idea ? { title: idea.title_working, throughline: idea.throughline, belief: idea.belief_challenged } : { title: null, throughline: null, belief: null },
    { city: profile?.city ?? null, region: profile?.region ?? null, country_code: profile?.country_code ?? null, travel_radius_km: profile?.travel_radius_km ?? null },
    { ...ev, theme_history: (ev.theme_history as any[]) ?? [], tags: (tags ?? []).map((t) => t.tag), remote_friendly: null });
  const call = calls?.[0];
  const organizer = (org as any)?.organizers;
  const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const verified = ev.last_verified_at ? Math.floor((Date.now() - new Date(ev.last_verified_at).getTime()) / 86400000) : null;
  const fields = (ev.form_fields as { key?: string; label?: string; limit?: number; limit_type?: string; required?: boolean }[]) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Link href="/find/events" className="t-compact text-[var(--text-secondary)]">← Event Finder</Link>
      {verified !== null && verified > 60 && <div role="status" className="rounded-[var(--radius)] border border-[var(--warning-text)] bg-[var(--surface-2)] p-3 t-compact">Last verified {verified} days ago. Check the organizer's site before relying on the status or the deadline.</div>}
      <EventCard ev={ev as EventCardData} match={match} state={{ targeted: !!target, tracked: !!app, watched: !!watch }} showDeadline={member} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2 t-compact">
          <h2 className="t-section">The call</h2>
          <p>Status: <strong>{ev.application_status.replace("_", " ")}</strong>{ev.call_opens_on ? `, opens ${fmt(ev.call_opens_on)}` : ""}{ev.status_evidence ? <span className="block text-[var(--text-secondary)]">"{ev.status_evidence}"{ev.status_source_url && <> · <a className="underline" href={ev.status_source_url} target="_blank" rel="noreferrer">source</a></>}</span> : null}</p>
          {ev.application_deadline && <div>Deadline: {member ? <DeadlineChip deadline={ev.application_deadline} deadlineTime={ev.deadline_time} organizerTimezone={ev.deadline_timezone} timezoneStatus={ev.deadline_timezone_status} verifiedAt={ev.last_verified_at ?? new Date().toISOString()} sourceType="curator" /> : <span>shown to members</span>}</div>}
          {member && ev.form_url && ev.application_status !== "invitation_only" && <p><a className="underline" href={ev.form_url} target="_blank" rel="noreferrer">Open the organizer's form</a> {ev.form_type ? `(${ev.form_type.replace("_", " ")})` : ""}. You submit it yourself; the app never submits for you.</p>}
          {!member && ev.form_url && <p className="text-[var(--text-secondary)]">The form link is shown to members.</p>}
          {fields.length > 0 && <p>Form asks for: {fields.map((f) => `${f.label ?? f.key}${f.limit ? ` (${f.limit} ${f.limit_type ?? "chars"})` : ""}`).join(", ")}</p>}
          {ev.talk_length_target && <p>Talk length: {ev.talk_length_target}</p>}
          {ev.pitch_video_required != null && <p>Pitch video: {ev.pitch_video_required ? "asked for; you make it on your own device, outside the app" : "not required"}</p>}
          {ev.local_connection_required != null && <p>Local connection: {ev.local_connection_required ? "required" : "not required"}</p>}
          {ev.criteria_snippet && <p>In the organizer's words: "{ev.criteria_snippet}"{call?.status_source_url && <> · <a className="underline" href={call.status_source_url} target="_blank" rel="noreferrer">source</a></>}</p>}
          {ev.ai_policy !== "unknown" && <p>AI policy for applications: <strong>{ev.ai_policy}</strong>{ev.ai_policy_snippet ? ` ("${ev.ai_policy_snippet}")` : ""}{ev.ai_policy_source_url && <> · <a className="underline" href={ev.ai_policy_source_url} target="_blank" rel="noreferrer">source</a></>}</p>}
          <CalendarLink />
        </Card>
        <Card className="flex flex-col gap-2 t-compact">
          <h2 className="t-section">The event</h2>
          <p>{[ev.venue, ev.city, ev.region, ev.country_code].filter(Boolean).join(", ")}{ev.event_date ? ` · ${fmt(ev.event_date)}${ev.end_date ? ` to ${fmt(ev.end_date)}` : ""}` : ""} · {ev.event_type} licence{ev.attendee_tier ? ` · ${ev.attendee_tier} attendees` : ""}</p>
          {(ev.theme || ((ev.theme_history as any[]) ?? []).length > 0) && <p>Theme{ev.theme ? `: ${ev.theme}` : ""}{((ev.theme_history as { year?: number; theme?: string }[]) ?? []).length ? ` · earlier: ${((ev.theme_history as { year?: number; theme?: string }[]) ?? []).map((t) => `${t.year ?? ""} ${t.theme ?? ""}`.trim()).join("; ")}` : ""}</p>}
          {(tags ?? []).length > 0 && <p>Topics: {(tags ?? []).map((t) => t.tag).join(", ")}</p>}
          {ev.past_speakers_url && <p><a className="underline" href={ev.past_speakers_url} target="_blank" rel="noreferrer">Past speakers</a> (the organizer's page; videos stay where the organizer put them)</p>}
          {organizer && <p>Organizer: {organizer.name}{organizer.website_url && <> · <a className="underline" href={organizer.website_url} target="_blank" rel="noreferrer">{organizer.website_domain ?? "website"}</a></>}{organizer.instagram && <> · <a className="underline" href={organizer.instagram} target="_blank" rel="noreferrer">Instagram</a></>}{organizer.linkedin_page && <> · <a className="underline" href={organizer.linkedin_page} target="_blank" rel="noreferrer">LinkedIn</a></>}</p>}
          <p className="text-[var(--text-secondary)]">Contact: via the organizer's published channel (their site or form). The app never contacts organizers.</p>
          <p className="text-[var(--text-muted)]">Sources: {ev.event_url && <a className="underline" href={ev.event_url} target="_blank" rel="noreferrer">event directory page</a>}{ev.organizer_website_url && <> · <a className="underline" href={ev.organizer_website_url} target="_blank" rel="noreferrer">organizer site</a></>} · {ev.last_verified_at ? `verified ${verified === 0 ? "today" : `${verified} d ago`} by a curator` : "not yet verified"}{ev.confidence != null ? ` · confidence ${ev.confidence}` : ""}</p>
        </Card>
      </div>
    </div>
  );
}
