"use client";
import * as React from "react";
import {
  AIDraftBlock, AllowanceMeter, BeatRow, Button, Card, CharCountField, DeadlineChip, DrillCard, EmptyState,
  GateNotice, LinterFlag, PracticeTimer, ProgressRing, RubricChip, StatusBadge, WeekDots,
} from "@onebigtalk/ui";

// Component preview: every core component in its states (empty, loading, error, gated, success).
// A development page, not a product screen. Open /dev/components. Toggle the theme with the button.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="t-title mb-3">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export default function ComponentsPreview() {
  const [brief, setBrief] = React.useState("");
  const [dark, setDark] = React.useState(false);
  const [drillResult, setDrillResult] = React.useState<string>("");
  const [timerResult, setTimerResult] = React.useState<string>("");
  React.useEffect(() => { document.documentElement.className = dark ? "dark" : "light"; }, [dark]);
  const today = new Date();
  const iso = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 16px" }}>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="t-page-title">Components</h1>
        <Button variant="secondary" onClick={() => setDark((d) => !d)}>{dark ? "Light theme" : "Dark theme"}</Button>
      </div>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="milestone">Milestone</Button>
          <Button variant="ghost">Ghost</Button><Button variant="danger">Danger (errors only)</Button><Button loading loadingLabel="Saving">Loading</Button><Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Status badges">
        <div className="flex flex-wrap gap-2">
          {(["planned","researching","drafting","ready","applied","follow_up_due","interview","accepted","declined","withdrawn","reapply"] as const).map((s) => <StatusBadge key={s} status={s} />)}
        </div>
      </Section>

      <Section title="Deadline chips (provenance on every deadline)">
        <DeadlineChip deadline={iso(9)} deadlineTime="23:59" organizerTimezone="Europe/London" timezoneStatus="stated" verifiedAt={new Date(today.getTime() - 4 * 86400000).toISOString()} sourceType="organizer_site" />
        <DeadlineChip deadline={iso(21)} timezoneStatus="unknown" verifiedAt={today.toISOString()} sourceType="google_sheet" />
        <DeadlineChip deadline={iso(9)} timezoneStatus="stated" verifiedAt={today.toISOString()} sourceType="curator" hidden />
        <DeadlineChip deadline={iso(-3)} timezoneStatus="inferred" verifiedAt={new Date(today.getTime() - 40 * 86400000).toISOString()} sourceType="ted_directory" />
      </Section>

      <Section title="Rubric chips and linter flags">
        <div className="flex flex-wrap gap-2">
          <RubricChip criterion="Idea, not topic" level={4} standard="An idea is more than a story or a list of facts; it draws a larger conclusion from evidence or observations." />
          <RubricChip criterion="Arguable" level={3} standard="Defended by an argument, is not self-evident, and may have an antagonist." />
          <RubricChip criterion="Evidence" level={2} standard="Claims survive expert scrutiny; empirical over anecdotal." gated />
          <RubricChip criterion="Novelty" level={1} standard="The TED world should not have heard it before." />
        </div>
        <LinterFlag flag={{ rule: "R2 No selling", quote: "my book, available on Amazon", why: "Organizers treat a book plug as advertising.", fix: "the research behind a decade of hospital safety work", blocking: true }} onApplyFix={() => {}} />
        <LinterFlag flag={{ rule: "R10 Fresh idea", quote: "I have given this talk at three conferences", why: "The idea must be shared for the first time on a TEDx stage.", fix: "I have spoken to audiences of 40 to 400 on adjacent subjects; this idea has not yet been shared from any stage." }} />
      </Section>

      <Section title="AI draft block (labelled, regenerate with a steer, why this, stop)">
        <AIDraftBlock label="ai_draft" title="Throughline" steers={["shorter", "more personal", "stronger opening", "less jargon"]} onRegenerate={() => {}} onNotRight={() => {}}
          whyThis="Built from your interview answer about the night a checklist was read aloud and nobody could stop the surgeon." allowanceNote="unlimited, fair use"
          versions={[{ id: "1", label: "v1" }, { id: "2", label: "v2 (shorter)" }]}>
          Safety checklists fail when the most junior person in the room cannot stop it.
        </AIDraftBlock>
        <AIDraftBlock label="ai_draft" title="Section 2: The idea" streaming="writing" onStop={() => {}}>It is three in the morning and the checklist has just been read aloud ...</AIDraftBlock>
        <AIDraftBlock label="your_words" title="Belief it challenges">That reading the checklist out loud is enough to make a team safe.</AIDraftBlock>
      </Section>

      <Section title="Character-count field (the Idea Brief minimum)">
        <CharCountField label="a) The idea, in your words" hint="Write it the way you would say it to a friend." value={brief} onChange={setBrief} minChars={500} strength={brief.length < 200 ? "thin" : "adequate"} />
        <Button disabled={brief.length < 500}>Save brief</Button>
      </Section>

      <Section title="Allowance meters (plain words, never credits)">
        <AllowanceMeter label="Tailored applications" used={3} allowed={15} resetsOn="1 Dec" />
        <AllowanceMeter label="Script drafts" used={3} allowed={3} resetsOn="1 Dec" />
        <AllowanceMeter label="Outlines" used={4} allowed={5} resetsOn="1 Dec" />
      </Section>

      <Section title="Gate notice (inline, never a wall)">
        <GateNotice what="Write the script from your finalized outline" reason="Members get 3 full drafts a month, 5 outlines and 30 editing passes." seatsRemaining={17} trialAvailable onStartTrial={() => {}} onChoosePlan={() => {}} onNotNow={() => {}} />
        <GateNotice what="Write the script from your finalized outline" reason="Members get 3 full drafts a month." seatsRemaining={0} trialAvailable={false} onChoosePlan={() => {}} onNotNow={() => {}} />
        <GateNotice what="script drafts" reason="" seatsRemaining={17} trialAvailable={false} exhausted={{ used: 3, allowed: 3, resetsOn: "1 Dec" }} />
      </Section>

      <Section title="Empty state, progress rings, week dots">
        <EmptyState title="Start the Idea Interview" description="Eight written prompts. Your answers become the material every later step reads." actionLabel="Start the interview" minutes={6} />
        <div className="flex flex-wrap gap-6"><ProgressRing value={0.75} label="FIND" /><ProgressRing value={0.3} label="WRITE" /><ProgressRing value={0} label="DELIVER" /><ProgressRing value={0} label="AMPLIFY" /></div>
        <WeekDots completed={2} target={3} />
      </Section>

      <Section title="Beat map rows">
        <Card>
          <BeatRow order={1} firstWords="It is three" purpose="care" targetSeconds={28} state="known" nextReviewOn={iso(3)} />
          <BeatRow order={2} firstWords="The checklist has" purpose="care" targetSeconds={30} state="learning" dueToday stageNote="step to the left mark" onEditNote={() => {}} />
          <BeatRow order={3} firstWords="Nobody in that" purpose="idea" targetSeconds={24} state="new" dueToday />
          <BeatRow order={4} firstWords="So here is" purpose="evidence" targetSeconds={40} state="cold" nextReviewOn={iso(14)} />
        </Card>
      </Section>

      <Section title="Drill card (blank-fill 30%)">
        <DrillCard kind="blank_fill" blankRatio={0.3} index={2} total={6} firstWords="Nobody in that"
          beatText="Nobody in that room could stop the surgeon, and the checklist failed exactly as designed." onResult={(r) => setDrillResult(r)} onSkip={() => {}} onEnd={() => {}} />
        <p className="t-compact text-[var(--text-secondary)]">Last result: {drillResult || "none yet"}</p>
      </Section>

      <Section title="Practice timer (count-down, 10 minutes)">
        <Card>
          <PracticeTimer slotSeconds={600} mode="count_down" endingPoints={[540, 600]}
            beats={[{ order: 1, firstWords: "It is three", startsAtSeconds: 0 }, { order: 2, firstWords: "The checklist has", startsAtSeconds: 28 }, { order: 3, firstWords: "Nobody in that", startsAtSeconds: 58 }]}
            onFinish={(r) => setTimerResult(`${r.durationSeconds}s, beat ${r.beatReached ?? "none"}`)} />
          <p className="t-compact text-[var(--text-secondary)]">Saved: {timerResult || "nothing yet"}</p>
        </Card>
      </Section>
    </main>
  );
}
