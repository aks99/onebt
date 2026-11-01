import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@onebigtalk/ui";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { PRODUCT_NAME, THE_PROMISE } from "@/lib/product";
import { IdeaSpark } from "@/components/idea-lab/IdeaSpark";
import { PathAndQuestions, PickAndMatch, type MatchRow, type OnboardingIdea } from "@/components/onboarding/Steps";
import { acknowledgeExpectations } from "./actions";

export const dynamic = "force-dynamic";

// Onboarding (5.4): the first session produces a scored idea and a shortlist in under 12 minutes.
// The step is derived from what exists, so a member who leaves and returns resumes where they were.
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");
  const sb = await supabaseServer();
  const sp = await searchParams;
  const [{ data: profile }, talk] = await Promise.all([
    sb.from("profiles").select("expertise_line, city, country_code, expectation_acknowledged_at").eq("user_id", user.id).maybeSingle(),
    currentTalk(user.id),
  ]);
  if (profile?.expectation_acknowledged_at && sp.step !== "expect") redirect("/today");

  let step: "path" | "spark" | "pick" | "expect";
  let ideas: OnboardingIdea[] = [];
  if (!talk || !profile?.expertise_line) step = "path";
  else {
    const { data } = await sb.from("ideas").select("id, title_working, throughline, score").eq("talk_id", talk.id).neq("status", "archived").order("created_at", { ascending: false }).limit(5);
    ideas = (data ?? []) as OnboardingIdea[];
    step = sp.step === "expect" ? "expect" : talk.path !== "apply" && talk.path !== "invited" ? "expect" : ideas.length === 0 ? "spark" : "pick";
    if (talk.path === "invited" && sp.step !== "expect") step = ideas.length === 0 ? "spark" : "pick";
  }

  let matches: MatchRow[] = [];
  let showDeadlines = false;
  if (step === "pick" && talk) {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: events }, { data: tracked }, { data: access }] = await Promise.all([
      sb.from("events").select("id, name, city, country_code, theme, application_deadline, event_date, application_status").eq("curator_verified", true).eq("expired", false)
        .eq("application_status", "open").gte("application_deadline", today).order("application_deadline", { ascending: true }).limit(12),
      sb.from("target_list").select("event_id").eq("user_id", user.id),
      sb.rpc("has_member_access", { p_user: user.id }),
    ]);
    showDeadlines = !!access;
    const trackedIds = new Set(((tracked ?? []) as { event_id: string }[]).map((t) => t.event_id));
    // Step 5 ranking: open call, soonest deadline, home country first. The matching engine with theme fit
    // and past-speaker topics replaces this in step 6 (Appendix C).
    matches = ((events ?? []) as any[])
      .map((e) => ({ ...e, home: e.country_code === profile?.country_code }))
      .sort((a, b) => Number(b.home) - Number(a.home))
      .slice(0, 3)
      .map((e) => ({
        id: e.id, name: e.name, city: e.city, country_code: e.country_code, theme: e.theme, application_deadline: e.application_deadline, event_date: e.event_date, tracked: trackedIds.has(e.id),
        reasons: [e.theme ? `theme "${e.theme}"` : "open call", e.home ? "in your country" : "accepts applications from your region", e.event_date ? `event ${new Date(e.event_date + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}` : "date to be announced"],
      }));
  }

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4">
        <span className="t-title">{PRODUCT_NAME}</span>
        <ol className="flex gap-1" aria-label="Onboarding progress">
          {(["path", "spark", "pick", "expect"] as const).map((s, i) => <li key={s} aria-current={s === step ? "step" : undefined} className={`h-1.5 w-8 rounded-full ${s === step ? "bg-[var(--text)]" : i < ["path", "spark", "pick", "expect"].indexOf(step) ? "bg-[var(--accent-solid)]" : "bg-[var(--surface-2)]"}`} />)}
        </ol>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        {step === "path" && <PathAndQuestions initialPath={talk?.path} />}
        {step === "spark" && talk && (
          <Card className="flex flex-col gap-4">
            <div><h1 className="t-page-title">Give the Idea Lab something to work with</h1><p className="t-body text-[var(--text-secondary)]">Paste a bio, a book summary or your LinkedIn About. You get five candidate ideas with scores. Nothing is recorded. Text only.</p></div>
            <IdeaSpark talkId={talk.id} allowanceLeft={null} interviewHref="/find/idea-lab/interview" />
          </Card>
        )}
        {step === "pick" && talk && <PickAndMatch talkId={talk.id} ideas={ideas} matches={matches} showDeadlines={showDeadlines} path={talk.path} />}
        {step === "expect" && (
          <form action={acknowledgeExpectations} className="flex flex-col gap-4">
            <h1 className="t-page-title">What to expect</h1>
            <Card className="flex flex-col gap-3 t-body">
              <p>Most open-call city events accept a single-digit percentage of applicants. Expect to apply to 10 to 20 well-matched events over 3 to 12 months. Many speakers hear no dozens of times before a yes.</p>
              <p>A first-year view count in the low thousands is normal. Fewer than 1% of TEDx talks are lifted to TED.com, and that can take 15 months.</p>
              <p>What we track instead: applications sent, interviews, acceptances, assets built, stages booked.</p>
              <p>What {PRODUCT_NAME} does not do: it never submits an application for you, never contacts an organizer, and never records anything. You write; it helps you write better and keep going.</p>
              <p className="t-compact text-[var(--text-secondary)]">{THE_PROMISE}</p>
            </Card>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--primary)] px-5 font-medium text-[var(--primary-foreground)]">I understand, show me my path</button>
              {!profile?.expectation_acknowledged_at && <Link href="/onboarding" className="t-compact underline">Back</Link>}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
