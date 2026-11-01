"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BeatRow, Button, Card, cx } from "@onebigtalk/ui";
import { buildBeatMap, updateBeat } from "@/app/(app)/deliver/actions";
import { DRILLS, coverage, nextDueDate, type BeatRow as BeatRowData } from "@/lib/deliver/rules";
import { formatClock } from "@/lib/write/rules";
import { Gate, gateFor } from "@/components/Gate";
import { loadSampleProgress, SAMPLE_BEATS } from "@/components/deliver/sample-progress";

// S5.1 Memorize: the locked script as beats with mastery states, due beats today, the drill picker, printables.
// Free plan: the drills run on the sample script; progress stays in this browser only.

export function Memorize({ talkId, rows: initialRows, scriptLocked, lockedVersion, sample, slotMinutes, title }: { talkId: string; rows: BeatRowData[]; scriptLocked: boolean; lockedVersion: number | null; sample: boolean; slotMinutes: number; title: string }) {
  const [rows, setRows] = useState<BeatRowData[]>(initialRows);
  const [msg, setMsg] = useState<{ code: string; message: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => { if (sample) setRows(loadSampleProgress(SAMPLE_BEATS)); else setRows(initialRows); }, [sample, initialRows]);
  const cov = coverage(rows); const due = rows.filter((r) => r.due).length; const total = rows.reduce((n, r) => n + r.target_seconds, 0);
  const nextDue = nextDueDate(rows);

  const build = () => { setMsg(null); setNote(null); start(async () => { const r = await buildBeatMap(talkId); if (!r.ok) setMsg({ code: r.code, message: r.message }); else { setNote(`${r.data!.count} beats.${r.data!.usedFallback ? " The model's split did not match your script word for word, so the beats follow your sections and sentences instead." : ""}`); router.refresh(); } }); };
  const gate = msg ? gateFor(msg.code, msg.message, "Beat map") : null;

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="t-page-title">Memorize</h1>
          <p className="t-compact text-[var(--text-secondary)]">
            {sample ? `Sample script "${title}" (${slotMinutes} minutes). Your own beat map opens when your script is locked.` : lockedVersion ? `${title}, v${lockedVersion} locked` : "Your beat map is built from the locked script."}
            {rows.length > 0 && <> · {rows.length} beats · {cov.mastered} mastered · <span className={cx(due > 0 && "text-[var(--accent-text)] font-medium")}>{due} due today</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!sample && scriptLocked && <Button variant={rows.length ? "secondary" : "milestone"} loading={pending} loadingLabel="Splitting the script" onClick={() => { if (rows.length && !confirm("Rebuild the beat map? Progress on the current beats is cleared.")) return; build(); }}>{rows.length ? "Rebuild beat map" : "Build the beat map"}</Button>}
          {rows.length > 0 && <Link href={`/deliver/print/beat-map${sample ? "?sample=1" : ""}`} className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border)] px-3 t-compact">Print beat map</Link>}
          {rows.length > 0 && <Link href={`/deliver/print/cue-cards${sample ? "?sample=1" : ""}`} className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border)] px-3 t-compact">Print cue cards</Link>}
        </div>
      </div>

      {!sample && !scriptLocked && <Card><p className="t-body text-[var(--text-secondary)]">Lock a script to build your beat map. Until then you can <Link href="/write/script" className="underline">finish the script</Link>, or <Link href="/deliver/memorize?sample=1" className="underline">try the drills on the sample script</Link>.</p></Card>}
      {note && <p role="status" className="t-compact text-[var(--text-secondary)]">{note}</p>}
      {gate ? <Gate {...gate} onNotNow={() => setMsg(null)} /> : msg && <p role="alert" className="t-compact text-[var(--danger-text)]">{msg.message}</p>}

      {rows.length > 0 && (
        <>
          <Card className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 t-compact">
              <span>Coverage <strong className="tabular">{cov.percent}%</strong> <span className="text-[var(--text-muted)]">(beats known or cold ÷ total; the aim is 95% in the final week)</span></span>
              <span className="tabular text-[var(--text-muted)]">{formatClock(total)} of beats · {slotMinutes}:00 slot</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--surface-2)]" role="progressbar" aria-valuenow={cov.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Coverage"><div className="h-2 rounded-full bg-[var(--accent-solid)]" style={{ width: `${cov.percent}%` }} /></div>
            {due === 0 && nextDue && <p className="t-metadata text-[var(--text-muted)]">Nothing due today. Next review {new Date(nextDue + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}. A short run keeps it warm.</p>}
          </Card>

          <section aria-labelledby="drills" className="flex flex-col gap-2">
            <h2 id="drills" className="t-label text-[var(--text-muted)]">Drills {due > 0 ? `(${due} due)` : "(all beats)"}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {DRILLS.map((d) => (
                <Link key={d.key} href={`/deliver/drill/${d.key}${due > 0 ? "?due=1" : ""}${sample ? (due > 0 ? "&" : "?") + "sample=1" : ""}`} className="flex min-h-11 flex-col gap-1 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3 hover:border-[var(--border-strong)]">
                  <span className="t-compact font-medium">{d.name}</span>
                  <span className="t-metadata text-[var(--text-secondary)]">{d.how}</span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-label="Beat map">
            {rows.map((r) => (
              <div key={r.id}>
                <BeatRow order={r.order} firstWords={r.first_words} purpose={r.purpose} targetSeconds={r.target_seconds} state={r.state} nextReviewOn={r.next_review_at} dueToday={r.due} stageNote={r.stage_note} onEditNote={sample ? undefined : () => setEditing(editing === r.id ? null : r.id)} />
                {editing === r.id && (
                  <form className="flex flex-wrap items-end gap-2 border-b border-[var(--border-subtle)] py-2 pl-11" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); start(async () => { const res = await updateBeat(r.id, { first_words: String(f.get("cue") ?? ""), stage_note: String(f.get("note") ?? "") }); if (!res.ok) setMsg({ code: res.code, message: res.message }); else { setEditing(null); router.refresh(); } }); }}>
                    <label className="flex flex-col t-metadata">Cue (first words)<input name="cue" defaultValue={r.first_words} maxLength={60} className="h-10 w-56 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 t-compact" /></label>
                    <label className="flex flex-1 flex-col t-metadata">Stage or gesture note<input name="note" defaultValue={r.stage_note ?? ""} maxLength={200} placeholder="where you stand, what your hands do" className="h-10 w-full min-w-[200px] rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 t-compact" /></label>
                    <Button size="sm" type="submit" loading={pending}>Save</Button>
                    <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </form>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
