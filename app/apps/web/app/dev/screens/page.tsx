import { Card } from "@onebigtalk/ui";
import { AppShell } from "@/components/AppShell";
import { IdeaGrid, type IdeaRow } from "@/components/idea-lab/IdeaGrid";
import { InterviewForm } from "@/components/idea-lab/InterviewForm";
import { PriorStages, type StageRow } from "@/components/prior-stages/PriorStages";
import { PathAndQuestions, PickAndMatch } from "@/components/onboarding/Steps";
import { WeekControls } from "@/components/today/WeekControls";
import { nextBestAction, weekMessage, type JourneyInput } from "@/lib/journey/recommender";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { VerifyPanel, DiffPanel } from "@/components/curate/CuratorControls";
import { scoreEvent } from "@/lib/catalogue/matching";
import { Board, type BoardCard } from "@/components/pipeline/Board";
import { ApplicationDetail } from "@/components/pipeline/ApplicationDetail";
import { DEFAULT_FORM_FIELDS } from "@/lib/pipeline/formMapper";

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

const ev: EventCardData = { id: "e1", name: "TEDxWilson Park", city: "Edinburgh", country_code: "GB", event_date: "2027-03-14", event_type: "standard", theme: "Thresholds", application_status: "open", application_deadline: "2026-12-09", deadline_time: "23:59", deadline_timezone: "Europe/London", deadline_timezone_status: "stated", last_verified_at: "2026-10-30T00:00:00Z", source: "google_sheet", curator_verified: true, expired: false };
const match = scoreEvent({ title: "Hospital checklists fail without a stop rule", throughline: "Checklists fail when the most junior person cannot stop the room", belief: null }, { city: "Edinburgh", region: "Scotland", country_code: "GB", travel_radius_km: 800 }, { ...ev, region: "Scotland", lat: 55.95, lng: -3.19, theme_history: [], tags: ["health"], status_label: null, local_connection_required: null, pitch_video_required: true, talk_length_target: "8 min" }, new Date("2026-11-01T12:00:00Z"));

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
        <section id="event-finder" className="flex flex-col gap-4"><h1 className="t-page-title">Event Finder</h1><EventCard ev={ev} match={match} state={{ targeted: false, tracked: false, watched: true }} showDeadline /><EventCard ev={{ ...ev, id: "e2", name: "TEDxPune", city: "Pune", country_code: "IN", application_status: "announced", application_deadline: null }} match={null} state={{ targeted: true, tracked: true, watched: false }} showDeadline={false} /></section>
        <section id="curator" className="flex flex-col gap-4"><h1 className="t-page-title">Curator Console</h1>
          <DiffPanel runId="r1" rows={[{ id: 1, entity: "event", record_key: "tedx-wilson-park-2027", field: "deadline", before: "2026-11-09", after: "2026-11-16", confidence: 0.8, status: "pending", name: "TEDxWilson Park" }, { id: 2, entity: "event", record_key: "tedx-newone-2027", field: "*", before: null, after: "new", confidence: 0.7, status: "pending", name: "TEDxNewOne" }]} />
          <VerifyPanel rows={[{ id: "e1", name: "TEDxWilson Park", city: "Edinburgh", country_code: "GB", event_date: "2027-03-14", application_status: "open", application_deadline: "2026-12-09", curator_verified: false, needs_review: true, confidence: 0.8, last_verified_at: null, interest: 3, stale_days: 12, event_url: "https://www.ted.com/tedx/events/x", form_url: null, status_source_url: null }]} />
        </section>
        <section id="pipeline" className="flex flex-col gap-4"><h1 className="t-page-title">Applications</h1>
          <Board cards={[{ id: "a1", status: "planned", name: "TEDxPune", city: "Pune", deadline: "2026-11-22", appliedAt: null, followUpAt: null, followUpSent: false, outcomeAt: null, eventDate: null, readinessLevel: null, readinessPassed: false, counts: false, stale: false, expired: false }, { id: "a2", status: "drafting", name: "TEDxWilson Park", city: "Edinburgh", deadline: "2026-11-10", appliedAt: null, followUpAt: null, followUpSent: false, outcomeAt: null, eventDate: null, readinessLevel: 2, readinessPassed: false, counts: false, stale: false, expired: false }, { id: "a3", status: "applied", name: "TEDxLeeds", city: "Leeds", deadline: null, appliedAt: "2026-10-29", followUpAt: "2026-11-12", followUpSent: false, outcomeAt: null, eventDate: null, readinessLevel: 3, readinessPassed: true, counts: true, stale: false, expired: false }] as BoardCard[]} />
          <ApplicationDetail app={{ id: "a2", status: "drafting", answers: { one_sentence: "Checklists fail when the most junior person cannot stop the room", bio: "Ash leads hospital teams in Pune." }, answer_sources: { one_sentence: "llm", bio: "user" }, ai_originals: { one_sentence: "Checklists fail when the most junior person cannot stop the room" }, research_answers: { theme_in_own_words: "Thresholds: the moment before a decision becomes irreversible" }, readiness: { scores: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ criterion: n, level: (n === 3 ? 2 : 3) as 2 | 3, reason: "Quoted words earned this level." })), gate_passed: true, linter: { flags: [{ rule: "R1", quote: "my course", why: "Reads as selling.", fix: "my work with teams" }], blocking: false }, rewrites: [], organizer_eyes: "A clear idea from someone who has done the work; the theme fit is thin." }, readiness_passed: true, applied_at: null, follow_up_at: null, follow_up_sent_at: null, follow_up_draft: null, decision_date: null, no_enquiries: false, outcome: null, outcome_at: null, outcome_reason: null, event_date: null, notes: null, authorship: { your_words_pct: 38 }, counts_toward_100: false, stale: false, feedback_requested_at: null }} ev={{ id: "e1", name: "TEDxWilson Park", city: "Edinburgh", country_code: "GB", theme: "Thresholds", form_url: "https://example.org/apply", application_deadline: "2026-12-09", ai_policy: "unknown", ai_policy_snippet: null, talk_length_target: "8 min", local_connection_required: null, pitch_video_required: true, expired: false }} fields={DEFAULT_FORM_FIELDS} hasPack hasMemberAccess tailoredLeft={7} />
        </section>
        <section id="onboarding-path"><PathAndQuestions /></section>
        <section id="onboarding-pick"><PickAndMatch talkId="t" path="apply" showDeadlines={false} ideas={ideas.map((i) => ({ id: i.id, title_working: i.title_working, throughline: i.throughline, score: i.score }))} matches={[{ id: "e1", name: "TEDxWilson Park", city: "Edinburgh", country_code: "GB", theme: "Thresholds", application_deadline: "2026-12-09", event_date: "2027-03-14", tracked: false, reasons: ["theme \"Thresholds\"", "accepts applications from your region", "event Mar 2027"] }, { id: "e2", name: "TEDxPune", city: "Pune", country_code: "IN", theme: null, application_deadline: "2027-01-15", event_date: "2027-05-02", tracked: true, reasons: ["open call", "in your country", "event May 2027"] }]} /></section>
      </div>
    </AppShell>
  );
}
