import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@onebigtalk/ui";
import { currentUser } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { loadFinder, type Filters } from "@/lib/catalogue/load";
import { EventCard } from "@/components/events/EventCard";
import { Gate } from "@/components/Gate";

export const dynamic = "force-dynamic";

const TYPES = ["standard", "university", "youth", "salon", "women", "business", "other"];
const STATUSES = ["open", "announced", "rolling", "closed", "nomination", "invitation_only", "stale", "unknown"];

// S3.4 Event Finder: ranked, explained, filterable. Free members outside the trial see the top three with
// deadline dates hidden and the filters visible but disabled. Phone-first: filters stack, cards are one column.
export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/find/events");
  const talk = await currentTalk(user.id);
  const sp = await searchParams;
  const f: Filters = { country: sp.country, region: sp.region, city: sp.city, type: sp.type, status: sp.status, from: sp.from, to: sp.to, deadlineWithin: sp.deadline ? Number(sp.deadline) : undefined, slot: sp.slot ? Number(sp.slot) : undefined, q: sp.q };
  const data = await loadFinder(user.id, talk?.id ?? null, f);
  const member = data.hasMemberAccess;
  const byId = new Map(data.events.map((e) => [e.id, e]));
  const applyList = (member ? data.apply : data.apply.slice(0, 3)).map((r) => byId.get(r.eventId)!).filter(Boolean);
  const watchList = member ? data.watch.map((r) => byId.get(r.eventId)!).filter(Boolean) : [];
  const openCount = data.events.filter((e) => e.application_status === "open").length;
  const sel = "h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-compact disabled:opacity-60";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="t-page-title">Event Finder</h1><p className="t-compact text-[var(--text-secondary)]">{data.idea ? `Ranked for "${data.idea.throughline ?? data.idea.title}".` : "Lock an idea in the Idea Lab and the ranking will use it."} {data.events.length} events · {openCount} open calls.</p></div>
        <div className="flex gap-2"><Link href="/find/targets" className="t-compact underline">Targets</Link><Link href="/open-calls" className="t-compact underline">Public open calls</Link></div>
      </div>

      <form method="get" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Filters">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Name or theme" className={sel} disabled={!member} />
        <input name="country" defaultValue={sp.country ?? ""} placeholder="Country (US, IN, GB)" maxLength={2} className={sel} disabled={!member} />
        <input name="city" defaultValue={sp.city ?? ""} placeholder="City" className={sel} disabled={!member} />
        <select name="type" defaultValue={sp.type ?? ""} className={sel} disabled={!member} aria-label="Event type"><option value="">Any type</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ""} className={sel} disabled={!member} aria-label="Call status"><option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
        <select name="deadline" defaultValue={sp.deadline ?? ""} className={sel} disabled={!member} aria-label="Deadline window"><option value="">Any deadline</option><option value="14">Within 14 days</option><option value="30">Within 30 days</option><option value="90">Within 90 days</option></select>
        <input type="date" name="from" defaultValue={sp.from ?? ""} className={sel} disabled={!member} aria-label="Events from" />
        <input type="date" name="to" defaultValue={sp.to ?? ""} className={sel} disabled={!member} aria-label="Events to" />
        <select name="slot" defaultValue={sp.slot ?? ""} className={sel} disabled={!member} aria-label="Talk length"><option value="">Any talk length</option><option value="10">10 minutes or more</option><option value="14">14 minutes or more</option><option value="18">18 minutes</option></select>
        <button type="submit" disabled={!member} className="h-11 rounded-[var(--radius)] bg-[var(--primary)] px-4 t-compact font-medium text-[var(--primary-foreground)] disabled:opacity-60">Apply filters</button>
        <Link href="/find/events" className="flex h-11 items-center justify-center rounded-[var(--radius)] border border-[var(--border-subtle)] t-compact">Clear</Link>
      </form>
      {!member && <Gate what="The full Event Finder" reason="Free members see the three best matches. Members see every event, the deadline dates, filters and the season planner." />}

      <SeasonPlanner member={member} />

      <section className="flex flex-col gap-3">
        <h2 className="t-section">Apply {member ? `(${applyList.length})` : "(top 3)"}</h2>
        {applyList.length === 0 ? <Card><p className="t-compact text-[var(--text-secondary)]">No events match these filters. Loosen one: widen the country, drop the deadline window, or allow any type.</p></Card>
          : applyList.map((ev) => <EventCard key={ev.id} ev={ev} match={data.matches.get(ev.id) ?? null} state={data.state.get(ev.id)!} showDeadline={member} />)}
      </section>
      {member && watchList.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="t-section">Watch ({watchList.length})</h2>
          <p className="t-compact text-[var(--text-secondary)]">Closed, invitation-only, past deadline or a local rule you do not meet. Watch one to hear when its call opens.</p>
          {watchList.slice(0, 40).map((ev) => <EventCard key={ev.id} ev={ev} match={data.matches.get(ev.id) ?? null} state={data.state.get(ev.id)!} showDeadline />)}
        </section>
      )}
    </div>
  );
}

// F1.2.6 Season planner. Numbers trace to research-notes/03 (62% of 2026 events in Q1) and blueprint 2.x
// (windows close 3 to 7 months before the event, A15 to A128). Default sprint: 2 ready applications a week.
function SeasonPlanner({ member }: { member: boolean }) {
  const now = new Date(); const month = now.getUTCMonth();
  const phase = month >= 5 && month <= 9 ? "Peak application season: most Q1 events close their calls between June and October." : month >= 10 || month <= 0 ? "Late season: Q1 calls are mostly closed; look at Q2 and Q3 events and watch next year's." : "Early season: calls for Q3 and Q4 events are opening; Q1 events announce in spring.";
  return (
    <Card className="flex flex-col gap-1">
      <h2 className="t-label text-[var(--text-muted)]">SEASON PLANNER</h2>
      <p className="t-compact">About 62% of events happen in the first quarter, and application windows close 3 to 7 months before the event. {phase}</p>
      <p className="t-compact text-[var(--text-secondary)]">A 90-day sprint at 2 ready applications a week reaches about 25 events. {member ? "Set the weekly target on Today." : "Members set the weekly target on Today."}</p>
    </Card>
  );
}
