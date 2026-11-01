import Link from "next/link";
import { Card } from "@onebigtalk/ui";
import { supabaseServer } from "@/lib/supabase/server";
import { DISCLAIMER, PRODUCT_NAME } from "@/lib/product";
import { EmailCapture } from "@/components/public/EmailCapture";

export const revalidate = 3600;

// S0.3 / F1.2.9 Open calls this week: three verified open calls, no deadline dates, email capture for the full list.
// Facts only, in the curator's words; the independence disclaimer on the page.
export default async function OpenCallsPage() {
  const sb = await supabaseServer();
  const [{ data: calls }, { data: counts }] = await Promise.all([
    sb.from("public_open_calls").select("*").order("event_date", { ascending: true, nullsFirst: false }).limit(3),
    sb.from("public_counts").select("*").maybeSingle(),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/" className="t-compact text-[var(--text-secondary)]">{PRODUCT_NAME}</Link>
        <h1 className="t-page-title">Open calls this week</h1>
        <p className="t-body text-[var(--text-secondary)]">Three independently organized TEDx events whose speaker application is open right now, verified by our curators. Members see all {counts?.open_calls ?? 0} open calls with deadlines, match reasons and the organizer's form.</p>
      </header>
      <ul className="flex flex-col gap-3">
        {(calls ?? []).length === 0 && <Card><p className="t-compact text-[var(--text-secondary)]">No verified open calls this week. New events arrive every week.</p></Card>}
        {(calls ?? []).map((c) => (
          <li key={c.id}><Card className="flex flex-col gap-1">
            <h2 className="t-section">{c.name}</h2>
            <p className="t-compact text-[var(--text-secondary)]">{[c.city, c.country_code].filter(Boolean).join(", ")}{c.event_date ? ` · event ${new Date(c.event_date + "T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}` : ""}{c.theme ? ` · theme "${c.theme}"` : ""}</p>
            <p className="t-compact">Call open · deadline shown to members · verified {c.last_verified_at ? new Date(c.last_verified_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "recently"}</p>
          </Card></li>
        ))}
      </ul>
      <Card className="flex flex-col gap-2">
        <h2 className="t-section">Get the full list every week</h2>
        <p className="t-compact text-[var(--text-secondary)]">One email a week with every verified open call. No selection promise, no hype, unsubscribe in one click.</p>
        <EmailCapture source="open_calls" consentText="Send me the weekly list of verified open calls. I can unsubscribe at any time." />
      </Card>
      <p className="t-metadata text-[var(--text-muted)]">{DISCLAIMER}</p>
    </main>
  );
}
