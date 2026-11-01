import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@onebigtalk/ui";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { TargetRow, type TargetData } from "@/components/events/TargetRow";
import { CalendarLink } from "@/components/events/CalendarLink";

export const dynamic = "force-dynamic";

// F1.2.5 Target List: up to 50 saved events with a private note and a priority. Track turns one into a planned
// application. Sorted by priority then deadline.
export default async function TargetsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/find/targets");
  const sb = await supabaseServer();
  const [{ data: targets }, { data: apps }, { data: access }] = await Promise.all([
    sb.from("target_list").select("event_id, priority, note, created_at, events(id, name, city, country_code, event_date, application_status, application_deadline, expired)").eq("user_id", user.id).order("priority").limit(50),
    sb.from("applications").select("event_id, status").eq("user_id", user.id).not("event_id", "is", null),
    sb.rpc("has_member_access", { p_user: user.id }),
  ]);
  const appBy = new Map((apps ?? []).map((a) => [a.event_id as string, a.status as string]));
  const rows: TargetData[] = ((targets ?? []) as any[]).filter((t) => t.events).map((t) => ({ eventId: t.event_id, priority: t.priority, note: t.note, name: t.events.name, city: t.events.city, country_code: t.events.country_code, event_date: t.events.event_date, application_status: t.events.application_status, application_deadline: t.events.application_deadline, expired: t.events.expired, appStatus: appBy.get(t.event_id) ?? null }))
    .sort((a, b) => a.priority - b.priority || (a.application_deadline ?? "9999").localeCompare(b.application_deadline ?? "9999"));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><h1 className="t-page-title">Targets</h1><p className="t-compact text-[var(--text-secondary)]">{rows.length} of 50 saved. Priority 1 is "apply first".</p></div><Link href="/find/events" className="t-compact underline">Find more events</Link></div>
      {rows.length === 0 ? <Card><p className="t-body text-[var(--text-secondary)]">Nothing saved yet. In the Event Finder, Save keeps an event here; Track starts an application.</p></Card>
        : <ul className="flex flex-col gap-2">{rows.map((r) => <li key={r.eventId}><TargetRow t={r} showDeadline={!!access} /></li>)}</ul>}
      <Card><CalendarLink /></Card>
    </div>
  );
}
