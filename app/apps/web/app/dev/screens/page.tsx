import { Card } from "@onebigtalk/ui";
import { AppShell } from "@/components/AppShell";
import { IdeaGrid, type IdeaRow } from "@/components/idea-lab/IdeaGrid";
import { InterviewForm } from "@/components/idea-lab/InterviewForm";
import { PriorStages, type StageRow } from "@/components/prior-stages/PriorStages";
import { PathAndQuestions, PickAndMatch } from "@/components/onboarding/Steps";
import { WeekControls } from "@/components/today/WeekControls";
import { nextBestAction, weekMessage, type JourneyInput } from "@/lib/journey/recommender";

// Dev preview of the step-5 screens with fixture data, for the phone and desktop screenshots in the
// acceptance report. No database, no AI calls. Not linked from the product.
export const dynamic = "force-static";

const score = (levels: number[]) => ({ scores: levels.map((l, i) => ({ criterion: i + 1, level: l as 1 | 2 | 3 | 4, reason: "Quoted words earned this level." })), gate_passed: true, fixes: ["Name the two hospital studies.", "Say who disagrees and why."] });
const ideas: IdeaRow[] = [
  { id: "1", talk_id: "t", status: "locked", title_working: "Hospital checklists fail without a stop rule", throughline: "Checklists fail when the most junior person cannot stop the room", score: score([4, 4, 3, 3, 3, 4, 4, 3, 3]), source: "llm", created_at: "", batch_id: "b" },
  { id: "2", talk_id: "t", status: "candidate", title_working: "Why hospitals reward silence", throughline: "Hospitals promote the people who never stop a surgeon", score: score([3, 3, 3, 3, 2, 3, 3, 3, 3]), source: "llm", created_at: "", batch_id: "b" },
  { id: "3", talk_id: "t", status: "candidate", title_working: "The 3 am rule", throughline: "Every safety rule should be tested at 3 am by the most tired nurse", score: score([3, 4, 2, 3, 2, 3, 3, 2, 3]), source: "user", created_at: "", batch_id: "b" },
];
const stages: StageRow[] = [
  { id: "s1", month: 3, year: 2025, city: "Mumbai", country_code: "IN", organization: "Hospital leadership summit", audience_size: 400, topic: "Leading hospital teams", result_line: "invited back", link: null },
  { id: "s2", month: 9, year: 2024, city: "Pune", country_code: "IN", organization: "Nurses' association", audience_size: 60, topic: "Why surgical checklists fail", result_line: null, link: null },
];
const input: JourneyInput = { path: "apply", stage: "apply", ideaCount: 2, ideaLocked: true, dossierChars: 900, trackedEvents: 3, applications: [{ status: "drafting", eventName: "TEDxWilson Park", deadline: "2026-11-10" }, { status: "applied", eventName: "TEDxPune", appliedAt: "2026-10-20", followUpAt: "2026-11-03" }], priorStages: 2, briefChars: 0, outlineFinal: false, scriptLocked: false, fitToTime: null, beatsMastered: 0, beatsTotal: 0, published: false, launchSteps: 0, weekCompleted: 2, weekTarget: 3, weekPaused: false, now: new Date("2026-11-01T12:00:00Z") };

export default function DevScreens() {
  const action = nextBestAction(input);
  return (
    <AppShell talkTitle="Checklists">
      <div className="flex flex-col gap-10">
        <section id="today" className="flex flex-col gap-4">
          <h1 className="t-page-title">Today</h1>
          <Card className="flex flex-col gap-3 border-[var(--border-strong)]">
            <div className="flex items-center justify-between"><span className="t-label text-[var(--text-muted)]">NEXT</span><span className="t-metadata tabular text-[var(--text-muted)]">{action.minutes} min</span></div>
            <h2 className="t-title">{action.title}</h2>
            <p className="t-body text-[var(--text-secondary)]">{action.reason}</p>
            <div className="flex flex-wrap items-center gap-3"><a href="#" className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--primary)] px-5 font-medium text-[var(--primary-foreground)]">Start</a>{action.alt && <span className="t-compact text-[var(--text-secondary)]">or: {action.alt.title} ({action.alt.minutes} min)</span>}</div>
          </Card>
          <Card><h2 className="t-label mb-3 text-[var(--text-muted)]">THIS WEEK</h2><WeekControls completed={2} target={3} paused={false} message={weekMessage(input, false)} /></Card>
        </section>
        <section id="idea-lab" className="flex flex-col gap-4"><h1 className="t-page-title">Idea Lab</h1><IdeaGrid ideas={ideas} /></section>
        <section id="interview"><InterviewForm talkId="t" initial={{ controversy: "Surgeons say checklists slow them down; nurses say the checklist is the only moment they are allowed to speak. The disagreement is about who may stop the room." }} /></section>
        <section id="prior-stages"><PriorStages talkId="t" stages={stages} lockedIdeaText="Hospital checklists fail without a stop rule" hasMemberAccess overlaps={{ s2: { score: 0.52, isOverlap: true, sharedWords: ["checklists", "fail"] } }} /></section>
        <section id="onboarding-path"><PathAndQuestions /></section>
        <section id="onboarding-pick"><PickAndMatch talkId="t" path="apply" showDeadlines={false} ideas={ideas.map((i) => ({ id: i.id, title_working: i.title_working, throughline: i.throughline, score: i.score }))} matches={[{ id: "e1", name: "TEDxWilson Park", city: "Edinburgh", country_code: "GB", theme: "Thresholds", application_deadline: "2026-12-09", event_date: "2027-03-14", tracked: false, reasons: ["theme \"Thresholds\"", "accepts applications from your region", "event Mar 2027"] }, { id: "e2", name: "TEDxPune", city: "Pune", country_code: "IN", theme: null, application_deadline: "2027-01-15", event_date: "2027-05-02", tracked: true, reasons: ["open call", "in your country", "event May 2027"] }]} /></section>
      </div>
    </AppShell>
  );
}
