import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, cx } from "@onebigtalk/ui";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk, loadJourneyInput } from "@/lib/talks";
import { computeJourney, type JourneyStage } from "@/lib/journey/recommender";

export const dynamic = "force-dynamic";

const HREF: Record<JourneyStage["stage"], string> = {
  position: "/find/idea-lab", discover: "/find/events", apply: "/find/applications", write: "/write/brief",
  rehearse: "/deliver/memorize", perform: "/deliver/event-day", amplify: "/amplify/launch",
};
const MILESTONE_LABEL: Record<string, string> = {
  idea_locked: "Idea locked", first_application_sent: "First application sent", acceptance_logged: "Acceptance logged",
  outline_finalized: "Outline finalized", script_locked: "Script locked", first_run_under_time: "First run under time", talk_published: "Talk published",
};

// S2.2 Journey: seven stages, "you are here", milestones tied to real artifacts, and the application list
// with dates (v1.5). Stages are never gated; the member can open any of them.
export default async function JourneyPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/journey");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const [input, milestones] = await Promise.all([
    loadJourneyInput(user.id, talk),
    sb.from("milestones").select("key, earned_at").eq("talk_id", talk.id).order("earned_at"),
  ]);
  const stages = computeJourney(input);
  const here = stages.find((s) => s.state === "in_progress") ?? stages[stages.length - 1];
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="t-page-title">Your path</h1>
      <ol className="flex flex-col gap-0 md:grid md:grid-cols-7 md:gap-2" aria-label="Seven stages">
        {stages.map((s, i) => {
          const isHere = s.stage === here.stage;
          return (
            <li key={s.stage} className="relative flex md:flex-col">
              <div className="flex flex-col items-center md:w-full md:flex-row">
                <span aria-hidden className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-medium",
                  s.state === "done" ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-[var(--accent-foreground)]"
                    : s.state === "in_progress" ? "border-[var(--text)] bg-[var(--surface)] text-[var(--text)]"
                    : "border-[var(--border)] bg-transparent text-[var(--text-muted)]")}>{s.state === "done" ? "✓" : i + 1}</span>
                {i < stages.length - 1 && <span aria-hidden className={cx("block w-px flex-1 md:h-px md:w-auto md:flex-1", s.state === "done" ? "bg-[var(--accent-solid)]" : "bg-[var(--border)]")} style={{ minHeight: 24 }} />}
              </div>
              <div className="mb-4 ml-3 flex flex-col gap-0.5 pb-2 md:ml-0 md:mt-2 md:pb-0">
                <Link href={HREF[s.stage]} className={cx("t-body font-medium", s.state === "locked" && "text-[var(--text-secondary)]")}>{s.label}</Link>
                <span className="t-metadata text-[var(--text-muted)]">{s.note}</span>
                {isHere && <span className="t-metadata text-[var(--accent-text)]">you are here</span>}
                <span className="sr-only">{s.state === "done" ? "done" : s.state === "in_progress" ? "in progress" : "later"}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="t-section mb-2">Milestones</h2>
          {(milestones.data ?? []).length === 0
            ? <p className="t-compact text-[var(--text-secondary)]">Your first milestone is a locked idea. It is earned, not ticked.</p>
            : <ul className="flex flex-col gap-1 t-compact">{(milestones.data ?? []).map((m) => <li key={m.key}>{MILESTONE_LABEL[m.key] ?? m.key} <span className="text-[var(--text-muted)]">({fmt(m.earned_at)})</span></li>)}</ul>}
        </Card>
        <Card>
          <h2 className="t-section mb-2">Applications</h2>
          {input.applications.length === 0 ? (
            <p className="t-compact text-[var(--text-secondary)]">None yet. <Link href="/find/applications?log=1" className="underline">Log one I already sent</Link>.</p>
          ) : (
            <ul className="flex flex-col gap-1 t-compact">
              {input.applications.map((a, i) => (
                <li key={i}>{a.eventName}: {a.status.replace("_", " ")}{a.appliedAt ? `, applied ${fmt(a.appliedAt)}` : ""}{a.followUpAt && a.status === "applied" ? `, follow-up ${fmt(a.followUpAt)}` : ""}</li>
              ))}
              <li><Link href="/find/applications?log=1" className="underline">Log one I already sent</Link></li>
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
