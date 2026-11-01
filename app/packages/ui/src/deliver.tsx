import * as React from "react";
import { Button, cx } from "./primitives";

// DELIVER components for the first release (blueprint 8.3 F3.1 to F3.7, 11.7): BeatRow, DrillCard,
// PracticeTimer. Pure client code. No recording, no microphone, no camera. The product never says
// "you sounded" anything; it has not heard anything.

// ---------------------------------------------------------------
// BeatRow: first three words in Newsreader, purpose, budget, mastery state as a four-step dot row
// ---------------------------------------------------------------
export type BeatState = "new" | "learning" | "known" | "cold";
export interface BeatRowProps {
  order: number;
  firstWords: string;
  purpose?: string | null;
  targetSeconds: number;
  state: BeatState;
  nextReviewOn?: string | null;   // ISO date
  dueToday?: boolean;
  stageNote?: string | null;
  onEditNote?: () => void;
}
const stateStep: Record<BeatState, number> = { new: 1, learning: 2, known: 3, cold: 4 };
export function formatSeconds(s: number) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
export function BeatRow(p: BeatRowProps) {
  return (
    <div className="grid grid-cols-[2rem_1fr] items-center gap-x-3 gap-y-1 border-b border-[var(--border-subtle)] py-2 sm:grid-cols-[2rem_1fr_auto]">
      <span className="t-metadata tabular text-[var(--text-muted)]">{p.order}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="t-lede break-words">"{p.firstWords} ..."</span>
          {p.purpose && <span className="t-metadata text-[var(--text-muted)]">{p.purpose}</span>}
          <span className="t-metadata tabular text-[var(--text-muted)]">{formatSeconds(p.targetSeconds)}</span>
        </div>
        {p.stageNote && <p className="t-compact text-[var(--text-secondary)]">Stage: {p.stageNote}</p>}
      </div>
      <div className="col-start-2 flex items-center gap-3 sm:col-start-auto">
        <span className="flex gap-1" role="img" aria-label={`mastery: ${p.state}`}>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} aria-hidden="true" className={cx("block h-2.5 w-2.5 rounded-full", i <= stateStep[p.state] ? "bg-[var(--accent-solid)]" : "border border-[var(--border)]")} />
          ))}
        </span>
        <span className="t-metadata text-[var(--text-secondary)] sm:w-20 sm:text-right">
          {p.dueToday ? "due today" : p.nextReviewOn ? `due ${new Date(p.nextReviewOn + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}` : p.state}
        </span>
        {p.onEditNote && <Button size="sm" variant="ghost" onClick={p.onEditNote} aria-label={`Edit stage note for beat ${p.order}`}>Note</Button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// DrillCard: one card per beat, two large targets (G and M), Reveal, Skip.
// Variants: read-cover-recite, cue cards, blank-fill (10, 30, 60 percent), chaining.
// ---------------------------------------------------------------
export type DrillKind = "read_cover_recite" | "cue_cards" | "blank_fill" | "chaining";
export interface DrillCardProps {
  kind: DrillKind;
  beatText: string;
  firstWords: string;
  index: number;
  total: number;
  blankRatio?: 0.1 | 0.3 | 0.6;
  seed?: number;
  maskedText?: string;             // caller-supplied masked text (keeps the blanks and the typed answers in step)
  extra?: React.ReactNode;         // a typed field or a hint under the text
  resultLabel?: string;            // e.g. "4 of 5 words" for typed blank-fill
  onResult: (result: "hit" | "miss") => void;
  onSkip?: () => void;
  onEnd?: () => void;
}

// Deterministic word masking: the same seed hides the same words within one run (12.6)
export function maskWords(text: string, ratio: number, seed = 1) {
  const words = text.split(/(\s+)/);
  let s = seed >>> 0 || 1;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  return words.map((w) => (/\S/.test(w) && rand() < ratio ? "_".repeat(Math.max(3, Math.min(8, w.length))) : w)).join("");
}

export function DrillCard(p: DrillCardProps) {
  const [revealed, setRevealed] = React.useState(p.kind === "read_cover_recite");
  const [covered, setCovered] = React.useState(false);
  React.useEffect(() => { setRevealed(p.kind === "read_cover_recite"); setCovered(false); }, [p.index, p.kind]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "g") p.onResult("hit");
      if (k === "m") p.onResult("miss");
      if (k === "r") setRevealed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p]);

  const shown = (() => {
    if (p.kind === "read_cover_recite") return covered ? "" : p.beatText;
    if (p.kind === "cue_cards") return revealed ? p.beatText : `${p.firstWords} ...`;
    if (p.kind === "blank_fill") return revealed ? p.beatText : (p.maskedText ?? maskWords(p.beatText, p.blankRatio ?? 0.3, p.seed ?? p.index + 1));
    return revealed ? p.beatText : `${p.firstWords} ...`;   // chaining shows the cue, the member recites the rest
  })();

  const title = { read_cover_recite: "Read, cover, recite", cue_cards: "Cue cards", blank_fill: `Blank-fill ${Math.round((p.blankRatio ?? 0.3) * 100)}%`, chaining: "Bottom-up chaining" }[p.kind];

  return (
    <section className="flex min-h-[60vh] flex-col rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-6" aria-label={`${title}, beat ${p.index + 1} of ${p.total}`}>
      <header className="flex items-center justify-between t-compact text-[var(--text-secondary)]">
        <span>{title} <span className="tabular">beat {p.index + 1} of {p.total}</span></span>
        {p.onEnd && <Button size="sm" variant="ghost" onClick={p.onEnd}>End</Button>}
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-6 text-center sm:px-4 sm:py-8">
        <p className="t-editor-body whitespace-pre-wrap" aria-live="polite">{shown || <span className="text-[var(--text-muted)]">Covered. Say it, then mark yourself.</span>}</p>
        {p.extra}
        {p.resultLabel && <p className="t-compact text-[var(--text-secondary)]" role="status">{p.resultLabel}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {p.kind === "read_cover_recite" && !covered && <Button variant="secondary" onClick={() => setCovered(true)}>Cover it</Button>}
        {p.kind !== "read_cover_recite" && !revealed && <Button variant="secondary" onClick={() => setRevealed(true)}>Reveal <kbd className="t-metadata">R</kbd></Button>}
        {p.onSkip && <Button variant="ghost" onClick={p.onSkip}>Skip</Button>}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Button size="lg" variant="milestone" className="min-h-[56px]" onClick={() => p.onResult("hit")}>Got it <kbd className="t-metadata opacity-80">G</kbd></Button>
        <Button size="lg" variant="secondary" className="min-h-[56px]" onClick={() => p.onResult("miss")}>Missed <kbd className="t-metadata opacity-80">M</kbd></Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// PracticeTimer: count-up and count-down, 6-minute checkpoint ticks, two ending markers, the beat the
// member should be on, space to pause, Esc to leave. Large mono digits. Quiet visual pulse, no sound.
// Finish saves the duration (the caller writes timed_runs). No recording of any kind.
// ---------------------------------------------------------------
export interface TimerBeat { order: number; firstWords: string; startsAtSeconds: number }
export interface PracticeTimerProps {
  slotSeconds: number;
  mode: "count_up" | "count_down";
  beats?: TimerBeat[];
  endingPoints?: number[];           // seconds from start; the first is the safe ending
  checkpointLabels?: { at: number; label: string }[];   // the beat under each 6-minute tick (11.7)
  onFinish: (result: { durationSeconds: number; beatReached: number | null }) => void;
  onExit?: () => void;
  reducedMotion?: boolean;
}
export function PracticeTimer(p: PracticeTimerProps) {
  const [elapsed, setElapsed] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const startRef = React.useRef<number | null>(null);
  const accRef = React.useRef(0);
  const raf = React.useRef<number | null>(null);

  const tick = React.useCallback(() => {
    if (startRef.current !== null) setElapsed(accRef.current + (performance.now() - startRef.current) / 1000);
    raf.current = requestAnimationFrame(tick);
  }, []);
  React.useEffect(() => {
    if (running) { startRef.current = performance.now(); raf.current = requestAnimationFrame(tick); }
    else { if (startRef.current !== null) accRef.current += (performance.now() - startRef.current) / 1000; startRef.current = null; if (raf.current) cancelAnimationFrame(raf.current); }
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [running, tick]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setRunning((r) => !r); }
      if (e.key === "Escape") p.onExit?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p]);

  const shown = p.mode === "count_up" ? elapsed : Math.max(0, p.slotSeconds - elapsed);
  const currentBeat = (p.beats ?? []).filter((b) => b.startsAtSeconds <= elapsed).at(-1) ?? null;
  const checkpoints = Array.from({ length: Math.floor(p.slotSeconds / 360) }, (_, i) => (i + 1) * 360);
  const atCheckpoint = checkpoints.some((c) => Math.abs(elapsed - c) < 0.5);
  const pct = Math.min(100, (elapsed / p.slotSeconds) * 100);
  const reset = () => { setRunning(false); accRef.current = 0; startRef.current = null; setElapsed(0); };

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-4 sm:p-6" aria-label="Practice timer">
      <p className="t-compact text-[var(--text-secondary)]">{p.mode === "count_up" ? "Count-up: learn the real length" : `Count-down to ${formatSeconds(p.slotSeconds)}`}</p>
      <div className={cx("t-timer tabular", atCheckpoint && !p.reducedMotion && "animate-pulse")} role="timer" aria-live="off">{formatSeconds(Math.floor(shown))}</div>
      <div className="relative h-3 w-full max-w-3xl rounded-full bg-[var(--surface-2)]" aria-hidden="true">
        <div className="absolute left-0 top-0 h-full rounded-full bg-[var(--accent-solid)]" style={{ width: `${pct}%` }} />
        {checkpoints.map((c) => <span key={c} className="absolute top-[-4px] h-5 w-0.5 bg-[var(--border-strong)]" style={{ left: `${(c / p.slotSeconds) * 100}%` }} title={`${c / 60} min`} />)}
        {p.endingPoints?.map((e, i) => <span key={e} className="absolute top-[-6px] h-6 w-1 bg-[var(--text)]" style={{ left: `${(e / p.slotSeconds) * 100}%` }} title={`ending point ${i + 1}`} />)}
      </div>
      {p.checkpointLabels && p.checkpointLabels.length > 0 && (
        <ul className="flex w-full max-w-3xl flex-wrap justify-between gap-x-4 gap-y-1 t-metadata text-[var(--text-muted)]" aria-label="Checkpoints">
          {p.checkpointLabels.map((c) => <li key={c.at} className="tabular">{formatSeconds(c.at)} <span className="text-[var(--text-secondary)]">{c.label}</span></li>)}
        </ul>
      )}
      <p className="t-body text-[var(--text-secondary)]" aria-live="polite">
        {currentBeat ? <>You should be on: <strong>{currentBeat.order} "{currentBeat.firstWords} ..."</strong></> : "Start when ready."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={() => setRunning((r) => !r)}>{running ? "Pause" : elapsed > 0 ? "Resume" : "Start"} <kbd className="t-metadata opacity-80">space</kbd></Button>
        <Button size="lg" variant="ghost" onClick={reset}>Reset</Button>
        <Button size="lg" variant="milestone" disabled={elapsed < 1} onClick={() => { setRunning(false); p.onFinish({ durationSeconds: Math.round(elapsed), beatReached: currentBeat?.order ?? null }); }}>Finish and save</Button>
        {p.onExit && <Button size="lg" variant="ghost" onClick={p.onExit}>Leave <kbd className="t-metadata opacity-80">Esc</kbd></Button>}
      </div>
    </section>
  );
}
