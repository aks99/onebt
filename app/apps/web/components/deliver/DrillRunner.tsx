"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DrillCard } from "@onebigtalk/ui";
import { drillResult, logDrillBlock } from "@/app/(app)/deliver/actions";
import { BLANK_LEVELS, DRILLS, blankFill, chainingRounds, drillQueue, scoreTyped, type BeatRow, type DrillKind } from "@/lib/deliver/rules";
import { recordSampleResult } from "@/components/deliver/sample-progress";

// S5.2 Drill: one card per beat, two large targets, keyboard G and M. Four variants share this runner:
// read-cover-recite (show, cover, self-mark), cue cards (first three words, reveal), blank-fill (10, 30, 60 percent;
// typed mode is scored, spoken mode is self-marked) and bottom-up chaining (last beat first, add the previous beat
// each round). Results go to the spaced schedule. Nothing is recorded.

type Outcome = { beat: BeatRow; result: "hit" | "miss"; next: string };

export function DrillRunner({ kind, rows, onlyDue, sample, talkId }: { kind: DrillKind; rows: BeatRow[]; onlyDue: boolean; sample: boolean; talkId: string }) {
  const drill = DRILLS.find((d) => d.key === kind)!;
  const queue = useMemo(() => drillQueue(rows, onlyDue), [rows, onlyDue]);
  const rounds = useMemo(() => (kind === "chaining" ? chainingRounds(queue) : [queue.map((q) => q.order)]), [kind, queue]);
  const [round, setRound] = useState(0);
  const [i, setI] = useState(0);
  const [level, setLevel] = useState(0);
  const [typedMode, setTypedMode] = useState(true);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState<{ correct: number; total: number; hit: boolean } | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [done, setDone] = useState(false);
  const [reduced, setReduced] = useState(false);
  const logged = useRef(false);
  useEffect(() => { try { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { /* fine */ } }, []);

  const current = rounds[round] ?? [];
  const beat = queue.find((q) => q.order === current[i]) ?? null;
  const total = current.length;
  const blanks = useMemo(() => (beat && kind === "blank_fill" ? blankFill(beat.text, BLANK_LEVELS[level], beat.order * 7 + level) : null), [beat, kind, level]);
  const masked = blanks ? blanks.tokens.map((t) => (t.blank ? "_".repeat(Math.max(3, Math.min(8, t.word.length))) : t.word)).join(" ") : undefined;

  useEffect(() => { if (done && !sample && !logged.current) { logged.current = true; void logDrillBlock(talkId); } }, [done, sample, talkId]);

  const advance = () => {
    setTyped(""); setScore(null);
    if (i + 1 < total) { setI(i + 1); return; }
    if (kind === "chaining" && round + 1 < rounds.length) { setRound(round + 1); setI(0); return; }
    setDone(true);   // blank-fill levels (10, 30, 60) are chosen per run; the summary names the next one
  };
  const mark = async (result: "hit" | "miss") => {
    if (!beat || done) return;
    let next = "";
    if (sample) next = recordSampleResult(beat.id, result).next_review_at;
    else { const r = await drillResult(beat.id, result); next = r.ok ? r.data!.next_review_at : ""; }
    setOutcomes((o) => [...o, { beat, result, next }]);
    advance();
  };
  const checkTyped = () => { if (!blanks) return; const s = scoreTyped(blanks.answers, typed); setScore(s); };

  if (!queue.length) return <Card><p className="t-body">No beats yet. <Link className="underline" href="/deliver/memorize">Build the beat map</Link> first.</p></Card>;

  if (done) {
    const up = outcomes.filter((o) => o.result === "hit"), down = outcomes.filter((o) => o.result === "miss");
    return (
      <Card className="flex flex-col gap-3">
        <h1 className="t-title">{drill.name}: done</h1>
        <p className="t-body">{up.length} marked got it, {down.length} missed. Missed beats are due again tomorrow; the rest moved to their next review date.</p>
        {down.length > 0 && <ul className="t-compact flex flex-col gap-1">{down.map((o) => <li key={o.beat.id}>{o.beat.order} "{o.beat.first_words} ..." due {o.next || "tomorrow"}</li>)}</ul>}
        {kind === "blank_fill" && level + 1 < BLANK_LEVELS.length && <p className="t-compact text-[var(--text-secondary)]">Next time this drill removes {BLANK_LEVELS[level + 1]} percent of the words.</p>}
        {sample && <p className="t-metadata text-[var(--text-muted)]">Sample progress is kept in this browser only.</p>}
        <div className="flex flex-wrap gap-2">
          <Link href="/deliver/memorize" className="inline-flex min-h-11 items-center rounded-[var(--radius)] bg-[var(--primary)] px-4 t-compact font-medium text-[var(--primary-foreground)]">Back to Memorize</Link>
          <Link href="/deliver/timer" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-[var(--border)] px-4 t-compact">Do a timed run</Link>
        </div>
      </Card>
    );
  }
  if (!beat) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 t-compact text-[var(--text-secondary)]">
        <span>{drill.how}</span>
        {kind === "chaining" && <span className="tabular">Round {round + 1} of {rounds.length}: beats {current[0]} to {current[current.length - 1]}</span>}
        {kind === "blank_fill" && (
          <span className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">Remove <select value={level} onChange={(e) => { setLevel(Number(e.target.value)); setTyped(""); setScore(null); }} className="h-9 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2" aria-label="Share of words removed">{BLANK_LEVELS.map((l, k) => <option key={l} value={k}>{l}%</option>)}</select></label>
            <label className="flex items-center gap-1"><input type="checkbox" className="h-5 w-5" checked={typedMode} onChange={(e) => { setTypedMode(e.target.checked); setScore(null); }} /> type the missing words</label>
          </span>
        )}
      </div>
      <DrillCard
        kind={kind} beatText={beat.text} firstWords={beat.first_words} index={i} total={total} blankRatio={[0.1, 0.3, 0.6][level] as 0.1 | 0.3 | 0.6} seed={beat.order}
        maskedText={masked}
        extra={kind === "blank_fill" && typedMode ? (
          <form className="flex w-full max-w-xl flex-col gap-2" onSubmit={(e) => { e.preventDefault(); checkTyped(); }}>
            <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={2} placeholder="Type the missing words, in any order" className="w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-2 t-body" aria-label="Missing words" />
            <div className="flex justify-center gap-2"><Button type="submit" variant="secondary" size="sm">Check</Button>{score && <Button type="button" size="sm" variant={score.hit ? "milestone" : "secondary"} onClick={() => mark(score.hit ? "hit" : "miss")}>Record {score.hit ? "got it" : "missed"}</Button>}</div>
          </form>
        ) : kind === "chaining" && i > 0 ? <p className="t-metadata text-[var(--text-muted)]">Carry straight on from the beat before.</p> : undefined}
        resultLabel={score ? `${score.correct} of ${score.total} missing words${score.hit ? ", that is a got it" : ", under 80 percent, so a miss"}` : undefined}
        onResult={(r) => void mark(r)} onSkip={advance} onEnd={() => setDone(true)}
      />
      {reduced && <p className="t-metadata text-[var(--text-muted)]">Reduced motion: cards swap without animation.</p>}
    </div>
  );
}
