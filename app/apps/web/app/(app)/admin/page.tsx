import { supabaseServer } from "@/lib/supabase/server";
import { Stat, Table, money, td } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// A1 Admin home: the funnel by stage, MRR, allowances consumed, AI cost by action. Counts, never content.
export default async function AdminHome() {
  const sb = await supabaseServer();
  const [{ data: funnel }, { data: ov }] = await Promise.all([sb.rpc("admin_funnel"), sb.rpc("admin_overview")]);
  const o = (ov ?? {}) as Record<string, any>;
  const plans = (o.members_by_plan ?? {}) as Record<string, number>;
  const cost = (o.ai_cost_this_month ?? []) as { action: string; calls: number; cost_usd: number; errors: number }[];
  const allow = (o.allowances_this_month ?? {}) as Record<string, number>;
  const rows = (funnel ?? []) as { step: string; members: number }[];
  const max = Math.max(1, ...rows.map((r) => r.members));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="MRR" value={money(o.mrr_cents)} note={`${o.active_subscriptions ?? 0} active subscriptions, ${o.past_due ?? 0} past due`} />
        <Stat label="Founding seats left" value={`${o.founding_seats_remaining ?? 0} of 30`} note={`${o.founding_active ?? 0} founding members active`} />
        <Stat label="Members" value={Object.values(plans).reduce((n, v) => n + Number(v), 0)} note={`spark ${plans.spark ?? 0} · founding ${plans.founding ?? 0} · regular ${plans.regular ?? 0} · ${o.trials_active ?? 0} in trial`} />
        <Stat label="AI cost this month" value={money(Math.round(Number(o.ai_cost_total_usd ?? 0) * 100))} note={`${o.credits_settled_this_month ?? 0} credits settled`} />
      </div>
      <section aria-labelledby="funnel" className="flex flex-col gap-2">
        <h2 id="funnel" className="t-section">Funnel by stage</h2>
        <ol className="flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.step} className="grid grid-cols-[140px_1fr_48px] items-center gap-2 t-compact">
              <span>{r.step}</span>
              <span className="h-3 rounded-full bg-[var(--surface-2)]" aria-hidden="true"><span className="block h-3 rounded-full bg-[var(--accent-solid)]" style={{ width: `${Math.round((r.members / max) * 100)}%` }} /></span>
              <span className="tabular text-right">{r.members}</span>
            </li>
          ))}
        </ol>
      </section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="allow" className="flex flex-col gap-2">
          <h2 id="allow" className="t-section">Allowances consumed this month</h2>
          <Table head={["Allowance", "Used"]} label="Allowances consumed">
            {Object.entries(allow).map(([k, v]) => <tr key={k}><td className={td}>{k.replace(/_/g, " ")}</td><td className={`${td} tabular`}>{v}</td></tr>)}
            {Object.keys(allow).length === 0 && <tr><td className={td} colSpan={2}>No usage yet this month.</td></tr>}
          </Table>
        </section>
        <section aria-labelledby="cost" className="flex flex-col gap-2">
          <h2 id="cost" className="t-section">AI cost by action this month</h2>
          <Table head={["Action", "Calls", "Errors", "Cost"]} label="AI cost by action">
            {cost.map((c) => <tr key={c.action}><td className={td}>{c.action}</td><td className={`${td} tabular`}>{c.calls}</td><td className={`${td} tabular`}>{c.errors}</td><td className={`${td} tabular`}>{money(Math.round(c.cost_usd * 100))}</td></tr>)}
            {cost.length === 0 && <tr><td className={td} colSpan={4}>No model calls yet this month.</td></tr>}
          </Table>
        </section>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Reviews open" value={o.reviews_open ?? 0} note={`${o.reviews_overdue ?? 0} past the 5-business-day SLA`} />
        <Stat label="Events" value={o.events_total ?? 0} note={`${o.events_verified ?? 0} verified · ${o.events_with_deadline ?? 0} with a deadline`} />
      </div>
    </div>
  );
}
