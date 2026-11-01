// Next best action and Journey state (blueprint 5.3, 5.7, S2.1, S2.2). Pure functions: given what the
// database says, return what the member should do next and where each stage stands. Tested in
// tests/recommender.test.ts. Nothing here promises selection; every reason states a fact.

export type Stage = "position" | "discover" | "apply" | "write" | "rehearse" | "perform" | "amplify";
export type TalkPath = "apply" | "invited" | "published";
export type StageState = "locked" | "available" | "in_progress" | "done";

export interface JourneyInput {
  path: TalkPath;
  stage: Stage;
  ideaCount: number;                 // candidate ideas on this talk
  ideaLocked: boolean;
  dossierChars: number;              // interview answers plus pasted material
  trackedEvents: number;             // target list + applications with an event
  applications: { status: string; appliedAt?: string | null; followUpAt?: string | null; eventName: string; deadline?: string | null }[];
  priorStages: number;
  briefChars: number;                // 0 if none; 500 is the minimum
  outlineFinal: boolean;
  scriptLocked: boolean;
  fitToTime: boolean | null;         // last timed run under the slot; null when no run yet
  beatsMastered: number;
  beatsTotal: number;
  beatsDue?: number;                 // beats whose review is today or overdue (F3.6)
  eventDate?: string | null;         // once accepted or invited
  published: boolean;
  launchSteps: number;               // launch plan steps marked done
  weekCompleted: number;
  weekTarget: number;
  weekPaused: boolean;
  lastActivityAt?: string | null;
  now?: Date;
}

export interface NextAction {
  title: string;
  minutes: number;
  reason: string;
  href: string;
  alt?: { title: string; minutes: number; href: string };
}

export interface JourneyStage { stage: Stage; label: string; state: StageState; note: string }

const STAGE_ORDER: Stage[] = ["position", "discover", "apply", "write", "rehearse", "perform", "amplify"];
const LABELS: Record<Stage, string> = { position: "Position", discover: "Discover", apply: "Apply", write: "Write", rehearse: "Rehearse", perform: "Perform", amplify: "Amplify" };

function daysBetween(a: Date, isoDate: string) {
  const b = new Date(isoDate + (isoDate.length === 10 ? "T00:00:00Z" : ""));
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

export function nextBestAction(s: JourneyInput): NextAction {
  const now = s.now ?? new Date();
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  // Published path: everything is about the launch.
  if (s.path === "published" || s.published) {
    if (s.launchSteps === 0) return { title: "Set up your launch plan", minutes: 10, reason: "because your talk is published and the first two weeks matter most", href: "/amplify/launch" };
    return { title: "Do the next launch step", minutes: 15, reason: `because ${plural(s.launchSteps, "step")} of your launch plan are done`, href: "/amplify/launch", alt: { title: "Update your bio with the talk", minutes: 5, href: "/amplify/launch#bio" } };
  }

  // Deadline pressure wins when an application is open and near.
  const openDeadline = s.applications
    .filter((a) => ["planned", "researching", "drafting", "ready"].includes(a.status) && a.deadline)
    .map((a) => ({ a, days: daysBetween(now, a.deadline as string) }))
    .filter((x) => x.days >= 0 && x.days <= 10)
    .sort((x, y) => x.days - y.days)[0];
  if (openDeadline && s.ideaLocked) {
    const { a, days } = openDeadline;
    return { title: `Finish your application for ${a.eventName}`, minutes: 25, reason: `because the deadline is in ${plural(days, "day")}`, href: "/find/applications", alt: s.priorStages === 0 ? { title: "Add a prior stage (optional)", minutes: 3, href: "/find/prior-stages" } : undefined };
  }

  // Follow-ups that are due.
  const dueFollowUp = s.applications.find((a) => a.status === "applied" && a.followUpAt && daysBetween(now, a.followUpAt) <= 0);
  if (dueFollowUp) return { title: `Send your follow-up to ${dueFollowUp.eventName}`, minutes: 8, reason: "because the follow-up date you set has arrived", href: "/find/applications" };

  // Stage 1: Position.
  if (!s.ideaLocked) {
    if (s.dossierChars < 300 && s.ideaCount === 0) return { title: "Give the Idea Lab something to work with", minutes: 4, reason: "because every later step reads from your own words", href: "/find/idea-lab", alt: { title: "Start the Idea Interview", minutes: 6, href: "/find/idea-lab/interview" } };
    if (s.ideaCount === 0) return { title: "Generate your first five ideas", minutes: 2, reason: `because you have written ${s.dossierChars} characters of raw material`, href: "/find/idea-lab" };
    return { title: "Pick and lock one idea", minutes: 6, reason: `because you have ${plural(s.ideaCount, "candidate idea")} and later stages read only the locked one`, href: "/find/idea-lab", alt: { title: "Compare two ideas", minutes: 4, href: "/find/idea-lab?compare=1" } };
  }

  // Invited path skips Discover and Apply.
  if (s.path === "invited") {
    if (s.briefChars < 500) return { title: "Write your Idea Brief", minutes: 15, reason: `because the outline is written only from your brief (${s.briefChars} of 500 characters so far)`, href: "/write/brief" };
  } else {
    // Stage 2: Discover.
    if (s.trackedEvents === 0) return { title: "Find three events that fit your idea", minutes: 8, reason: "because your idea is locked and deadlines are what move this forward", href: "/find/events", alt: s.priorStages === 0 ? { title: "Add a prior stage (optional)", minutes: 3, href: "/find/prior-stages" } : undefined };
    // Stage 3: Apply.
    const sent = s.applications.filter((a) => ["applied", "follow_up_due", "interview", "accepted", "declined", "reapply"].includes(a.status)).length;
    const drafting = s.applications.filter((a) => ["planned", "researching", "drafting", "ready"].includes(a.status)).length;
    const accepted = s.applications.some((a) => a.status === "accepted");
    if (!accepted) {
      if (drafting > 0) return { title: "Work on your next application", minutes: 25, reason: `because ${plural(drafting, "application")} are in progress and ${sent} ${sent === 1 ? "has" : "have"} been sent`, href: "/find/applications", alt: { title: "Track another event", minutes: 5, href: "/find/events" } };
      return { title: "Start an application for a tracked event", minutes: 20, reason: `because you track ${plural(s.trackedEvents, "event")} and have sent ${plural(sent, "application")}`, href: "/find/applications", alt: { title: "Build your Pitch Pack", minutes: 15, href: "/find/pitch" } };
    }
    if (s.briefChars < 500) return { title: "Write your Idea Brief", minutes: 15, reason: `because you have been accepted and the outline is written only from your brief (${s.briefChars} of 500 characters so far)`, href: "/write/brief" };
  }

  // Stage 4: Write.
  if (!s.outlineFinal) return { title: "Finalize your outline", minutes: 20, reason: "because the script is written only from the outline you finalize", href: "/write/outline" };
  if (!s.scriptLocked) return { title: "Work on your script", minutes: 30, reason: "because your outline is final", href: "/write/script" };

  // Stage 5: Rehearse.
  const eventDays = s.eventDate ? daysBetween(now, s.eventDate) : null;
  if (s.beatsTotal > 0 && (s.beatsDue ?? 0) > 0) {
    return { title: `Drill ${plural(s.beatsDue ?? 0, "beat")} due today`, minutes: Math.min(15, 3 + (s.beatsDue ?? 0)), reason: `because spaced review keeps beats cold: ${s.beatsMastered} of ${s.beatsTotal} mastered`, href: "/deliver/drill/read_cover_recite?due=1", alt: { title: "Do a timed run", minutes: Math.max(5, Math.round(s.beatsTotal / 2)), href: "/deliver/timer" } };
  }
  if (s.beatsTotal > 0 && s.beatsMastered < s.beatsTotal) {
    return { title: "Drill your next beats", minutes: 12, reason: `because ${s.beatsMastered} of ${s.beatsTotal} beats are mastered${eventDays !== null ? ` and the event is in ${plural(eventDays, "day")}` : ""}`, href: "/deliver/memorize", alt: { title: "Do a timed run", minutes: Math.max(5, Math.round(s.beatsTotal / 2)), href: "/deliver/timer" } };
  }
  if (s.fitToTime !== true) return { title: "Do a timed run", minutes: 12, reason: s.fitToTime === null ? "because your script is locked and you have not timed it yet" : "because your last timed run went over the slot", href: "/deliver/timer" };

  // Stage 6: Perform.
  if (eventDays !== null && eventDays >= 0 && eventDays <= 14) return { title: "Go through the event-day checklist", minutes: 10, reason: `because the event is in ${plural(eventDays, "day")}`, href: "/deliver/event-day" };
  if (eventDays !== null && eventDays < 0 && !s.published) return { title: "Add the link once your talk is published", minutes: 2, reason: "because the event has happened and the launch plan starts from the link", href: "/amplify/launch" };

  return { title: "Keep your talk cold with a short run", minutes: 10, reason: "because you fit the slot and every beat is mastered", href: "/deliver/timer" };
}

export function computeJourney(s: JourneyInput): JourneyStage[] {
  const sent = s.applications.filter((a) => ["applied", "follow_up_due", "interview", "accepted", "declined", "reapply"].includes(a.status)).length;
  const accepted = s.applications.some((a) => a.status === "accepted");
  const skipsFind = s.path !== "apply";
  const done: Record<Stage, boolean> = {
    position: s.ideaLocked,
    discover: skipsFind || s.trackedEvents > 0,
    apply: skipsFind || accepted,
    write: s.scriptLocked,
    rehearse: s.fitToTime === true && s.beatsTotal > 0 && s.beatsMastered >= s.beatsTotal,
    perform: !!s.eventDate && new Date(s.eventDate) < (s.now ?? new Date()),
    amplify: s.published && s.launchSteps >= 5,
  };
  const notes: Record<Stage, string> = {
    position: s.ideaLocked ? "idea locked" : s.ideaCount > 0 ? `${s.ideaCount} candidates` : "no idea yet",
    discover: skipsFind ? "skipped (invited)" : `${s.trackedEvents} tracked`,
    apply: skipsFind ? "skipped (invited)" : `${sent} sent${accepted ? ", accepted" : ""}`,
    write: s.scriptLocked ? "script locked" : s.outlineFinal ? "outline final" : `brief ${Math.min(s.briefChars, 500)}/500`,
    rehearse: s.beatsTotal > 0 ? `${s.beatsMastered}/${s.beatsTotal} beats` : "not started",
    perform: s.eventDate ? `event ${s.eventDate}` : "no date yet",
    amplify: s.published ? `${s.launchSteps} launch steps` : "not published",
  };
  if (s.path === "published") { done.position = done.discover = done.apply = done.write = done.rehearse = done.perform = true; }
  const firstOpen = STAGE_ORDER.findIndex((st) => !done[st]);
  return STAGE_ORDER.map((stage, i) => {
    let state: StageState;
    if (done[stage]) state = "done";
    else if (i === firstOpen) state = "in_progress";
    else if (i < firstOpen || firstOpen === -1) state = "done";
    else state = i === firstOpen + 1 ? "available" : "locked";
    // Stages are never hard-gated (S2.2): "locked" only means "later"; the UI still lets the member open it.
    return { stage, label: LABELS[stage], state, note: notes[stage] };
  });
}

// Week framing (5.3 item 2, 5.6): a missed week shows a fresh start, never a broken streak.
export function weekMessage(s: Pick<JourneyInput, "weekCompleted" | "weekTarget" | "weekPaused">, missedLastWeek: boolean) {
  if (s.weekPaused) return "This week is paused. Resume when you are ready.";
  if (missedLastWeek && s.weekCompleted === 0) return "Fresh start. Last week got away; this week's target is set again.";
  if (s.weekCompleted >= s.weekTarget) return `Week done: ${s.weekCompleted} of ${s.weekTarget}. Anything more is extra.`;
  return `${s.weekCompleted} of ${s.weekTarget} this week.`;
}

// Default weekly target by stage (5.3): 3 practice blocks or 2 applications.
export function defaultWeekTarget(stage: Stage) {
  return stage === "discover" || stage === "apply" ? 2 : 3;
}
