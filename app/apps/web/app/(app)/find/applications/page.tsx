import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, StatusBadge, type PipelineStatus } from "@onebigtalk/ui";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { Board, type BoardCard } from "@/components/pipeline/Board";
import { LogExisting } from "@/components/pipeline/LogExisting";

export const dynamic = "force-dynamic";

// S3.6 Applications board: the pipeline across events, the 100-ready counter, the five-draft notice, CSV export.
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ log?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/find/applications");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: apps }, { data: ready }, { data: access }] = await Promise.all([
    sb.from("applications").select("id, status, applied_at, follow_up_at, follow_up_sent_at, outcome, outcome_at, event_date, readiness, readiness_passed, counts_toward_100, event_name_manual, stale, events(name, city, country_code, application_deadline, application_status, expired)").eq("talk_id", talk.id).order("updated_at", { ascending: false }),
    sb.rpc("ready_applications_detail", { p_user: user.id }),
    sb.rpc("has_member_access", { p_user: user.id }),
  ]);
  const cards: BoardCard[] = ((apps ?? []) as any[]).map((a) => ({
    id: a.id, status: a.status as PipelineStatus, name: a.events?.name ?? a.event_name_manual ?? "Event", city: a.events?.city ?? null, deadline: a.events?.application_deadline ?? null,
    appliedAt: a.applied_at, followUpAt: a.follow_up_at, followUpSent: !!a.follow_up_sent_at, outcomeAt: a.outcome_at, eventDate: a.event_date, readinessLevel: readinessMin(a.readiness), readinessPassed: !!a.readiness_passed, counts: !!a.counts_toward_100, stale: !!a.stale, expired: !!a.events?.expired,
  }));
  const counter = Array.isArray(ready) ? ready[0] : ready;
  const activeDrafts = cards.filter((c) => c.status === "drafting" || c.status === "ready").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="t-page-title">Applications</h1><p className="t-compact text-[var(--text-secondary)]">One per event per year. You write, you submit on the organizer's form, you mark it applied.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="t-compact tabular">Ready applications sent: <strong>{counter?.sent ?? 0}</strong> of 100</span>
          <a href="/api/export/pipeline.csv" className="t-compact underline">CSV</a>
          <Link href="/find/events" className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">Add from the Event Finder</Link>
        </div>
      </div>
      {activeDrafts >= 5 && <div role="status" className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 t-compact">You have 5 applications in Drafting or Ready. Finish or park one before starting another. Organizers get better applications that way.</div>}
      {!access && cards.length >= 1 && <div role="status" className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 t-compact">The free plan keeps one application record. Members keep every application, personalize each one and see the Readiness Review.</div>}
      <Card className="flex flex-col gap-2">
        <h2 className="t-section">Already applied somewhere?</h2>
        <LogExisting talkId={talk.id} open={sp.log === "1"} />
      </Card>
      {cards.length === 0 ? <Card><p className="t-body text-[var(--text-secondary)]">Track an event to start your first application. <Link href="/find/events" className="underline">Open the Event Finder</Link>.</p></Card> : <Board cards={cards} />}
      <p className="t-metadata text-[var(--text-muted)]">Statuses: <StatusBadge status="planned" /> <StatusBadge status="researching" /> <StatusBadge status="drafting" /> <StatusBadge status="ready" /> <StatusBadge status="applied" /> <StatusBadge status="follow_up_due" /> <StatusBadge status="interview" /> <StatusBadge status="accepted" /> <StatusBadge status="declined" /></p>
    </div>
  );
}

function readinessMin(r: any): number | null {
  const scores = r?.scores as { criterion: number; level: number }[] | undefined;
  if (!scores?.length) return null;
  return Math.min(...scores.filter((s) => [1, 4, 8].includes(s.criterion)).map((s) => s.level));
}
