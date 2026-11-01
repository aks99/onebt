import { supabaseServer } from "@/lib/supabase/server";
import { Stat, Table, td } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// A6 Reports: cohort outcome stats, churn by plan and billing period, allowance burn, event coverage. Aggregates only;
// cohort stats for members are shown only when the cohort is 20 or more (F1.3.10 rule), so small numbers stay private.
export default async function ReportsPage() {
  const sb = await supabaseServer();
  const { data } = await sb.rpc("admin_reports");
  const r = (data ?? {}) as any;
  const o = r.outcomes ?? {}; const ev = r.event_coverage ?? {}; const burn = r.allowance_burn ?? {}; const churn = (r.churn ?? []) as any[]; const practice = r.practice_this_week ?? {};
  const cohortOk = Number(o.applied ?? 0) >= 20;
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Application outcomes (cohort)</h2>
        {cohortOk ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Applied" value={o.applied} /><Stat label="Interview" value={o.interview} /><Stat label="Accepted" value={o.accepted} /><Stat label="Declined" value={o.declined} /><Stat label="Ready and sent" value={o.ready_sent} note="counts toward the 100" />
          </div>
        ) : <p className="t-compact text-[var(--text-secondary)]">{o.applied ?? 0} applications sent so far. Outcome rates show once the cohort reaches 20 (the same rule the member-facing cohort stats will use), so a handful of early results are not read as a trend.</p>}
        <p className="t-metadata text-[var(--text-muted)]">Applications sent to events discovered in-app: {r.discovered_in_app_pct ?? 0}% (Phase 3 target 60%).</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Churn by plan and billing period</h2>
        <Table head={["Plan", "Period", "Subscriptions", "Canceled or expired", "Churn"]} label="Churn">
          {churn.map((c, i) => <tr key={i}><td className={td}>{c.plan}</td><td className={td}>{String(c.period ?? "").replace("_", " ")}</td><td className={`${td} tabular`}>{c.total}</td><td className={`${td} tabular`}>{c.canceled}</td><td className={`${td} tabular`}>{c.churn_pct}%</td></tr>)}
          {churn.length === 0 && <tr><td className={td} colSpan={5}>No subscriptions yet.</td></tr>}
        </Table>
      </section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="t-section">Allowance burn this month</h2>
          <Table head={["Allowance", "Used of allowed"]} label="Allowance burn">
            {["idea_batches", "tailored_applications", "outlines", "script_drafts", "editing_passes"].map((k) => <tr key={k}><td className={td}>{k.replace(/_/g, " ")}</td><td className={`${td} tabular`}>{burn[`${k}_pct`] ?? 0}%</td></tr>)}
            <tr><td className={td}>members with an allowance row</td><td className={`${td} tabular`}>{burn.members_with_usage ?? 0}</td></tr>
          </Table>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="t-section">Event coverage</h2>
          <Table head={["Measure", "Value"]} label="Event coverage">
            <tr><td className={td}>events in the catalogue</td><td className={`${td} tabular`}>{ev.total ?? 0}</td></tr>
            <tr><td className={td}>verified by a curator</td><td className={`${td} tabular`}>{ev.verified ?? 0}</td></tr>
            <tr><td className={td}>with a known deadline</td><td className={`${td} tabular`}>{ev.with_deadline ?? 0} ({ev.deadline_coverage_pct ?? 0}%; Phase 3 target 60%)</td></tr>
            <tr><td className={td}>open calls now</td><td className={`${td} tabular`}>{ev.open_calls ?? 0}</td></tr>
            <tr><td className={td}>not verified for 60 days</td><td className={`${td} tabular`}>{ev.stale_60d ?? 0}</td></tr>
          </Table>
        </section>
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Practice this week (8.7)</h2>
        <p className="t-compact">{practice.runs ?? 0} timed runs by {practice.members_with_runs ?? 0} members since Monday. Target: three timed runs a week per paying member in Rehearse.</p>
      </section>
    </div>
  );
}
