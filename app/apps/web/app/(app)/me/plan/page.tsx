import { AllowanceMeter, Card } from "@onebigtalk/ui";
import { PRICING } from "@/lib/product";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { readAllowances } from "@/lib/allowances";
import { AddonButtons, PlanButtons, PortalButton } from "@/components/PlanButtons";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// S7.3 Me > Plan: plan, founding badge, renewal, change period, pause, cancel in two clicks,
// money-back status, the 100-applications counter, allowances with the reset date.
export default async function PlanPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/me/plan");
  const sb = await supabaseServer();
  const [{ data: m }, { data: sub }, { data: counts }, { data: ready }, { rows, resetsOn }, { data: inv }] = await Promise.all([
    sb.from("memberships").select("*").eq("user_id", user.id).single(),
    sb.from("subscriptions").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("public_counts").select("*").maybeSingle(),
    sb.rpc("ready_applications_sent", { p_user: user.id }),
    readAllowances(user.id),
    sb.from("invoices").select("paid_at").eq("user_id", user.id).order("paid_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  const seats = Number(counts?.founding_seats_remaining ?? 0);
  const paid = m?.plan === "founding" || m?.plan === "regular";
  const trialActive = m?.plan === "spark" && m?.trial_ends_at && new Date(m.trial_ends_at) > new Date();
  const periodLabel = { monthly: "a month", six_month: "for six months", twelve_month: "for twelve months" } as const;
  const price = m?.plan === "founding" ? { monthly: 17, six_month: 77, twelve_month: 147 }[m.billing_period as keyof typeof periodLabel] : PRICING.regular.monthly;
  const moneyBackUntil = inv?.paid_at ? new Date(new Date(inv.paid_at).getTime() + 30 * 86400000) : null;
  const dunning = sub?.status === "past_due";
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="t-page-title mb-6">Plan</h1>
      {dunning && (
        <div role="alert" className="mb-4 rounded-[var(--radius)] border border-[var(--warning-text)] bg-[var(--surface-2)] p-3 t-compact">
          Your last payment did not go through. Update your card to keep your plan and your founding price. <PortalButton label="Update card" variant="ghost" />
        </div>
      )}
      <Card>
        {paid ? (
          <>
            <h2 className="t-title">{m.plan === "founding" ? "Founding Member" : "Member"} <span className="t-compact text-[var(--text-secondary)]">${price} {periodLabel[m.billing_period as keyof typeof periodLabel]}</span></h2>
            {m.founding_price && <p className="t-compact text-[var(--accent-text)]">Price kept for life while active.</p>}
            {m.plan_ends_at && <p className="t-compact text-[var(--text-secondary)]">Renews {new Date(m.plan_ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <PortalButton label="Change period" /><PortalButton label="Pause" /><PortalButton label="Cancel" variant="ghost" />
            </div>
            {moneyBackUntil && moneyBackUntil > new Date() && <p className="t-metadata mt-2 text-[var(--text-muted)]">Money-back until {moneyBackUntil.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. Write to us and it is done.</p>}
          </>
        ) : (
          <>
            <h2 className="t-title">Free{trialActive ? ", trial active" : ""}</h2>
            {trialActive && <p className="t-compact text-[var(--text-secondary)]">Member tools are open for one idea and three events until {new Date(m.trial_ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.</p>}
            <div className="mt-4"><PlanButtons seatsRemaining={seats} signedIn /></div>
          </>
        )}
      </Card>
      <Card className="mt-6">
        <h2 className="t-section">Ready applications sent</h2>
        <p className="t-display tabular">{Number(ready ?? 0)} <span className="t-body text-[var(--text-secondary)]">of 100</span></p>
        <p className="t-compact text-[var(--text-secondary)]">If you reach 100 and are not chosen, send us the proof and we extend your access free while you keep applying every week.</p>
        {Number(ready ?? 0) >= 100 && <a className="t-compact underline" href="/me/extension">Request the extension</a>}
      </Card>
      <Card className="mt-6">
        <h2 className="t-section mb-3">Allowances {resetsOn && <span className="t-compact text-[var(--text-secondary)]">(reset {resetsOn})</span>}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => <AllowanceMeter key={r.key} label={r.label} used={r.used} allowed={r.allowed} resetsOn={resetsOn} />)}
        </div>
      </Card>
      {paid && (
        <Card className="mt-6">
          <h2 className="t-section">Human review</h2>
          <p className="t-compact text-[var(--text-secondary)] mb-3">Written notes against the rubric within {PRICING.addons.slaBusinessDays} business days.</p>
          <AddonButtons />
        </Card>
      )}
    </main>
  );
}
