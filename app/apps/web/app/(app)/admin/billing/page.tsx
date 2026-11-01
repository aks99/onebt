import { supabaseServer } from "@/lib/supabase/server";
import { Stat, Table, money, td, when } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// A7 Billing: subscriptions by period, founding flags and the seat counter, invoices with Stripe Tax, refunds,
// dunning (past due), the $497 add-ons with their review SLA. Refunds themselves are issued in Stripe; the webhook
// writes them back here.
export default async function BillingPage() {
  const sb = await supabaseServer();
  const { data } = await sb.rpc("admin_billing");
  const b = (data ?? {}) as any;
  const subs = (b.subscriptions ?? []) as any[]; const inv = (b.invoices ?? []) as any[]; const addons = (b.addons ?? []) as any[];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Founding seats left" value={`${b.founding_seats_remaining ?? 0} of 30`} note="the pricing page shows this same count" />
        <Stat label="Revenue this month" value={money(b.revenue_this_month_cents)} note="paid invoices less refunds" />
        <Stat label="Stripe Tax this month" value={money(b.tax_this_month_cents)} />
        <Stat label="Refunds this month" value={money(b.refunds_this_month_cents)} />
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Subscriptions</h2>
        <Table head={["Member", "Status", "Plan", "Period", "Founding", "Amount", "Monthly value", "Period ends", "Cancels"]} label="Subscriptions">
          {subs.map((s) => <tr key={s.id} className={s.status === "past_due" ? "bg-[var(--surface-2)]" : undefined}><td className={td}>{s.email}</td><td className={td}>{s.status}{s.status === "past_due" ? " (dunning)" : ""}</td><td className={td}>{s.plan}</td><td className={td}>{String(s.period).replace("_", " ")}</td><td className={td}>{s.founding ? "founding" : ""}</td><td className={`${td} tabular`}>{money(s.amount_cents)}</td><td className={`${td} tabular`}>{money(s.monthly_cents)}</td><td className={td}>{when(s.period_end)}</td><td className={td}>{when(s.cancel_at) || when(s.canceled_at)}</td></tr>)}
          {subs.length === 0 && <tr><td className={td} colSpan={9}>No subscriptions yet. Stripe test-mode purchases appear here through the webhook.</td></tr>}
        </Table>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Add-ons ($497 reviews) and their SLA</h2>
        <Table head={["Member", "Kind", "Amount", "Purchased", "Review status", "Due", "Refunded"]} label="Add-ons">
          {addons.map((a) => <tr key={a.id}><td className={td}>{a.email}</td><td className={td}>{String(a.kind).replace("_", " ")}</td><td className={`${td} tabular`}>{money(a.amount_cents)}</td><td className={td}>{when(a.purchased_at)}</td><td className={td}>{a.review_status ?? ""}</td><td className={td}>{when(a.due_at)}</td><td className={td}>{when(a.refunded_at)}</td></tr>)}
          {addons.length === 0 && <tr><td className={td} colSpan={7}>No add-on purchases yet.</td></tr>}
        </Table>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Invoices</h2>
        <Table head={["Member", "Paid", "Tax", "Refunded", "Status", "Paid on", "Stripe"]} label="Invoices">
          {inv.map((i) => <tr key={i.id}><td className={td}>{i.email}</td><td className={`${td} tabular`}>{money(i.amount_paid_cents)}</td><td className={`${td} tabular`}>{money(i.tax_cents)}</td><td className={`${td} tabular`}>{money(i.refunded_cents)}</td><td className={td}>{i.status}</td><td className={td}>{when(i.paid_at)}</td><td className={td}>{i.url ? <a href={i.url} className="underline" target="_blank" rel="noreferrer">invoice</a> : ""}</td></tr>)}
          {inv.length === 0 && <tr><td className={td} colSpan={7}>No invoices yet.</td></tr>}
        </Table>
      </section>
    </div>
  );
}
