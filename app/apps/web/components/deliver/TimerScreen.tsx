"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, PracticeTimer, cx } from "@onebigtalk/ui";
import { saveRun, setTargetWpm } from "@/app/(app)/deliver/actions";
import { checkpoints, cumulative, runVerdict, type Beat } from "@/lib/deliver/rules";
import { formatClock, paceLine, type ScriptDoc } from "@/lib/write/rules";

// S5.3 Practice timer: count-up to learn the real length, count-down to the slot with 6-minute checkpoints and the
// ending points, the beat the speaker should be on, space to pause, Esc to leave. Finish saves the duration to
// timed_runs; after three runs the measured pace replaces the 150 wpm assumption. No recording of any kind.

export interface RunRow { id: string; started_at: string; duration_s: number; beat_reached: number | null; word_count: number | null; wpm: number | null; under_slot: boolean }

export function TimerScreen({ talkId, beats, doc, slotMinutes, targetWpm, measuredWpm, wordCount, runs, sample }: { talkId: string; beats: Beat[]; doc: ScriptDoc | null; slotMinutes: number; targetWpm: number; measuredWpm: number | null; wordCount: number; runs: RunRow[]; sample: boolean }) {
  const [mode, setMode] = useState<"count_up" | "count_down">(runs.length === 0 ? "count_up" : "count_down");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<{ text: string; under: boolean; wpm: number | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => { try { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch { /* fine */ } }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const cps = useMemo(() => checkpoints(beats, doc, slotMinutes), [beats, doc, slotMinutes]);
  const timerBeats = useMemo(() => cumulative(beats).map((c) => ({ order: c.beat.order, firstWords: c.beat.first_words, startsAtSeconds: c.start })), [beats]);
  const endings = cps.filter((c) => c.kind === "ending").map((c) => c.at).slice(0, 2);
  const labels = cps.filter((c) => c.kind === "checkpoint").map((c) => ({ at: c.at, label: c.beat ? `${c.beat.order} "${c.beat.first_words} ..."` : "" }));
  const pace = paceLine(wordCount, slotMinutes, measuredWpm ?? targetWpm, measuredWpm !== null);

  const finish = (r: { durationSeconds: number; beatReached: number | null }) => {
    setOpen(false); setErr(null);
    const v = runVerdict(r.durationSeconds, slotMinutes);
    if (sample) { setSaved({ text: `${v.text}. Sample runs are not saved; your own runs will be.`, under: v.under, wpm: null }); return; }
    start(async () => { const res = await saveRun(talkId, r.durationSeconds, r.beatReached); if (!res.ok) setErr(res.message); else { setSaved({ text: v.text, under: v.under, wpm: res.data!.measured_wpm }); router.refresh(); } });
  };

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]" role="dialog" aria-label="Practice timer, full screen">
        <PracticeTimer slotSeconds={slotMinutes * 60} mode={mode} beats={timerBeats} endingPoints={endings} checkpointLabels={labels} onFinish={finish} onExit={() => setOpen(false)} reducedMotion={reduced} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div>
        <h1 className="t-page-title">Practice timer</h1>
        <p className="t-compact text-[var(--text-secondary)]">{sample ? "Timing the sample script. " : ""}Count-up first to learn the real length, then count-down to the slot. The timer keeps the time; you keep the words. Nothing is recorded.</p>
      </div>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Mode">
          {(["count_up", "count_down"] as const).map((m) => <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cx("min-h-11 rounded-[var(--radius)] border px-3 t-compact", mode === m ? "border-[var(--accent-solid)] bg-[var(--surface-2)] font-medium" : "border-[var(--border)]")}>{m === "count_up" ? "Count-up" : `Count-down to ${slotMinutes}:00`}</button>)}
          <Button variant="milestone" onClick={() => { setSaved(null); setOpen(true); }}>Open the timer</Button>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 t-compact text-[var(--text-secondary)]">
          {cps.map((c) => <li key={`${c.kind}-${c.at}`} className="tabular">{c.kind === "slot" ? `${c.label} slot ends` : c.kind === "ending" ? `${formatClock(c.at)} ending point${c.beat ? ` after ${c.beat.order}` : ""}` : `${c.label} you should be on ${c.beat ? `${c.beat.order} "${c.beat.first_words} ..."` : "the last beat"}`}</li>)}
          {beats.length === 0 && <li>Build the beat map to see which beat you should be on at each checkpoint.</li>}
        </ul>
        <p className="t-compact">{pace.text}</p>
        {!sample && (
          <form className="flex flex-wrap items-end gap-2 t-compact" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); start(async () => { const r = await setTargetWpm(talkId, Number(f.get("wpm"))); if (!r.ok) setErr(r.message); else router.refresh(); }); }}>
            <label className="flex flex-col t-metadata">Target pace (words a minute, 110 to 190)<input name="wpm" type="number" min={110} max={190} defaultValue={targetWpm} className="h-10 w-28 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 t-compact" /></label>
            <Button size="sm" type="submit" variant="secondary" loading={pending}>Save</Button>
            {measuredWpm !== null && <span className="t-metadata text-[var(--text-muted)]">Your measured pace is {measuredWpm} wpm from your timer runs; it is what the estimates use now.</span>}
          </form>
        )}
      </Card>
      {saved && <div role="status" className={cx("rounded-[var(--radius)] border p-3 t-compact", saved.under ? "border-[var(--accent-outline)] bg-[var(--surface-2)]" : "border-[var(--warning-text)]")}>{saved.text}{saved.wpm !== null ? ` Measured pace now ${saved.wpm} wpm.` : ""}</div>}
      {err && <p role="alert" className="t-compact text-[var(--danger-text)]">{err}</p>}

      {runs.length > 0 && (
        <Card className="flex flex-col gap-2">
          <h2 className="t-section">Runs</h2>
          <p className="t-metadata text-[var(--text-muted)]">Your last {Math.min(3, runs.length)} {runs.slice(0, 3).every((r) => r.under_slot) ? "are all under the slot" : "include a run over the slot"}. Shown as bands, never as a score.</p>
          <ol className="flex flex-col gap-1 t-compact">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3">
                <span className="w-28 text-[var(--text-muted)]">{new Date(r.started_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <span className={cx("tabular font-medium", r.under_slot ? "text-[var(--accent-text)]" : "text-[var(--warning-text)]")}>{formatClock(r.duration_s)}</span>
                <span className="h-2 flex-1 rounded-full bg-[var(--surface-2)]" aria-hidden="true"><span className={cx("block h-2 rounded-full", r.under_slot ? "bg-[var(--accent-solid)]" : "bg-[var(--warning-text)]")} style={{ width: `${Math.min(100, (r.duration_s / (slotMinutes * 60)) * 100)}%` }} /></span>
                <span className="t-metadata text-[var(--text-muted)]">{r.beat_reached ? `reached beat ${r.beat_reached}` : ""}{r.wpm ? ` · ${r.wpm} wpm` : ""}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <p className="t-metadata text-[var(--text-muted)]"><Link href="/deliver/memorize" className="underline">Memorize</Link> · the prompter, run log and rehearsal plan arrive after launch.</p>
    </div>
  );
}
