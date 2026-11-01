import { Card } from "@onebigtalk/ui";
import { PRICING, THE_PROMISE } from "@/lib/product";
import { supabaseServer, currentUser } from "@/lib/supabase/server";
import { PlanButtons } from "@/components/PlanButtons";

export const dynamic = "force-dynamic";

// S0.2 Pricing: three plans, one decision, the promise in full. The seats count is the real number.
export default async function PricingPage() {
  const sb = await supabaseServer();
  const { data: counts } = await sb.from("public_counts").select("*").maybeSingle();
  const seats = Number(counts?.founding_seats_remaining ?? PRICING.founding.seats);
  const user = await currentUser();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="t-page-title mb-8">Pricing</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="t-title">Free</h2>
          <p className="t-display mt-2">$0</p>
          <ul className="mt-4 space-y-1 t-body text-[var(--text-secondary)]">
            <li>1 idea batch and scorecard</li><li>Top 3 events, dates hidden</li><li>1 application record</li><li>Idea Brief and structure picker</li><li>Drills on a sample script</li>
            <li>3-day trial of the member tools: one idea, three events</li>
          </ul>
        </Card>
        <Card milestone>
          <h2 className="t-title">{seats > 0 ? "Founding Member" : "Member"}</h2>
          {seats > 0 ? (
            <>
              <p className="t-display mt-2">${PRICING.founding.monthly}<span className="t-body text-[var(--text-secondary)]"> a month</span></p>
              <p className="t-compact text-[var(--text-secondary)]">${PRICING.founding.sixMonth} for six months (save 25%). ${PRICING.founding.twelveMonth} for twelve months (save 28%). Price kept for life while active.</p>
              <p className="t-label mt-2 tabular">{seats} of {PRICING.founding.seats} founding seats left. After that, membership is ${PRICING.regular.monthly} a month.</p>
            </>
          ) : (
            <p className="t-display mt-2">${PRICING.regular.monthly}<span className="t-body text-[var(--text-secondary)]"> a month</span></p>
          )}
          <ul className="mt-4 space-y-1 t-body">
            <li>10 idea batches a month</li><li>Full catalogue, alerts, 50 targets, watch alerts</li><li>15 tailored applications a month</li>
            <li>5 outlines, 3 script drafts, 30 editing passes</li><li>Memorization system and practice timer</li><li>Launch kit</li>
          </ul>
          <div className="mt-6"><PlanButtons seatsRemaining={seats} signedIn={!!user} /></div>
        </Card>
      </div>
      <Card className="mt-8">
        <h2 className="t-title">Our only promise</h2>
        <p className="t-body mt-2">{THE_PROMISE}</p>
        <p className="t-compact mt-3 text-[var(--text-secondary)]">30-day money-back on your first purchase. Cancel in two clicks. Pause for up to three months once a year.</p>
      </Card>
      <Card className="mt-8">
        <h2 className="t-title">Human help, when you want it</h2>
        <p className="t-body mt-2 text-[var(--text-secondary)]">Application review, ${PRICING.addons.applicationReview}. Script review, ${PRICING.addons.scriptReview}. Written notes against the rubric, returned within {PRICING.addons.slaBusinessDays} business days. Available inside the app once you are a member.</p>
      </Card>
    </main>
  );
}
