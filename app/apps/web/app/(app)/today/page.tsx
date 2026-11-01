import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, DeadlineChip, StatusBadge, type PipelineStatus } from "@onebigtalk/ui";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk, loadJourneyInput, mondayIso } from "@/lib/talks";
import { nextBestAction, weekMessage } from "@/lib/journey/recommender";
import { WeekControls } from "@/components/today/WeekControls";

export const dynamic = "force-dynamic";

// S2.1 Today: one next action, this week, deadlines, pipeline, readiness. Each block reads its own data
// so one failure does not blank the page. Phone-first: a single column that becomes two on md.
export default async function TodayPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/today");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const [input, deadlines, lastWeek, access] = await Promise.all([
    loadJourneyInput(user.id, talk),
    sb.from("applications").select("id, status, event_name_manual, events(name, application_deadline, deadline_time, deadline_timezone, deadline_timezone_status, last_verified_at, city)")
      .eq("talk_id", talk.id).in("status", ["planned", "researching", "drafting", "ready"]).not("events.application_deadline", "is", null).limit(10),
    sb.from("week_commitments").select("completed, target, paused").eq("user_id", user.id).eq("week_start", mondayIso(new Date(Date.now() - 7 * 86400000))).maybeSingle(),
    sb.rpc("has_member_access", { p_user: user.id }),
  ]);
  const action = nextBestAction(input);
  const missedLastWeek = !!lastWeek.data && !lastWeek.data.paused && lastWeek.data.completed < lastWeek.data.target;
  const upcoming = ((deadlines.data ?? []) as any[])
    .filter((a) => a.events?.application_deadline)
    .sort((a, b) => String(a.events.application_deadline).localeCompare(String(b.events.application_deadline)))
    .slice(0, 3);
  const counts = countBy(input.applications.map((a) => a.status));
  const pipeline: { label: string; statuses: PipelineStatus[] }[] = [
    { label: "planned", statuses: ["planned", "researching", "drafting", "ready"] },
    { label: "applied", statuses: ["applied"] }, { label: "follow-up", statuses: ["follow_up_due"] },
    { label: "interview", statuses: ["interview"] }, { label: "accepted", statuses: ["accepted"] }, { label: "declined", statuses: ["declined"] },
  ];
  const inWrite = ["write", "rehearse", "perform", "amplify"].includes(input.stage) || input.path !== "apply";

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-4 md:col-span-2">
        <h1 className="t-page-title">Today</h1>
        <Card className="flex flex-col gap-3 border-[var(--border-strong)]">
          <div className="flex items-center justify-between"><span className="t-label text-[var(--text-muted)]">NEXT</span><span className="t-metadata tabular text-[var(--text-muted)]">{action.minutes} min</span></div>
          <h2 className="t-title">{action.title}</h2>
          <p className="t-body text-[var(--text-secondary)]">{action.reason}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={action.href} className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--primary)] px-5 font-medium text-[var(--primary-foreground)]">Start</Link>
            {action.alt && <Link href={action.alt.href} className="t-compact text-[var(--text-secondary)] underline-offset-2 hover:underline">or: {action.alt.title} ({action.alt.minutes} min)</Link>}
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <Card>
          <h2 className="t-label mb-3 text-[var(--text-muted)]">THIS WEEK</h2>
          <WeekControls completed={input.weekCompleted} target={input.weekTarget} paused={input.weekPaused} message={weekMessage(input, missedLastWeek)} />
        </Card>

        <Card>
          <h2 className="t-label mb-3 text-[var(--text-muted)]">DEADLINES</h2>
          {upcoming.length === 0 ? (
            <p className="t-compact text-[var(--text-secondary)]">No open deadlines tracked yet. <Link className="underline" href="/find/events">Find events</Link>.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((a) => (
                <li key={a.id} className="flex flex-col gap-1">
                  <Link href={`/find/applications/${a.id}`} className="t-body font-medium">{a.events?.name ?? a.event_name_manual}</Link>
                  <DeadlineChip deadline={a.events.application_deadline} deadlineTime={a.events.deadline_time} organizerTimezone={a.events.deadline_timezone}
                    timezoneStatus={a.events.deadline_timezone_status ?? "unknown"} verifiedAt={a.events.last_verified_at ?? new Date().toISOString()} sourceType="curator" hidden={!access.data} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <Card>
          <h2 className="t-label mb-3 text-[var(--text-muted)]">PIPELINE</h2>
          {input.applications.length === 0 ? (
            <p className="t-compact text-[var(--text-secondary)]">No applications yet. <Link className="underline" href="/find/applications?log=1">Already applied somewhere? Log it.</Link></p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {pipeline.map((p) => {
                const n = p.statuses.reduce((s, st) => s + (counts[st] ?? 0), 0);
                return <li key={p.label} className="flex items-center gap-1 t-compact"><StatusBadge status={p.statuses[0]} /><span className="tabular">{n}</span></li>;
              })}
            </ul>
          )}
        </Card>

        {inWrite && (
          <Card>
            <h2 className="t-label mb-3 text-[var(--text-muted)]">READINESS</h2>
            <ul className="grid grid-cols-1 gap-1 t-compact sm:grid-cols-2">
              <Ready ok={input.briefChars >= 500} label={`brief ${Math.min(input.briefChars, 500)}/500`} />
              <Ready ok={input.outlineFinal} label="outline final" />
              <Ready ok={input.scriptLocked} label="script locked" />
              <Ready ok={input.fitToTime === true} label={input.fitToTime === null ? "fit to time: no run yet" : input.fitToTime ? "last run under the slot" : "last run over the slot"} />
              <Ready ok={input.beatsTotal > 0 && input.beatsMastered >= input.beatsTotal} label={`beats mastered ${input.beatsMastered}/${input.beatsTotal}`} />
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function Ready({ ok, label }: { ok: boolean; label: string }) {
  return <li className="flex items-center gap-2"><span aria-hidden className={ok ? "text-[var(--success-text)]" : "text-[var(--text-muted)]"}>{ok ? "✓" : "○"}</span><span className={ok ? undefined : "text-[var(--text-secondary)]"}>{label}</span><span className="sr-only">{ok ? "done" : "not yet"}</span></li>;
}

function countBy(list: string[]) {
  return list.reduce<Record<string, number>>((acc, k) => { acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});
}
