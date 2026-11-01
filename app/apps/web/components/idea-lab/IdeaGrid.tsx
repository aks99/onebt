"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, RubricChip, cx } from "@onebigtalk/ui";
import { archiveIdea, lockIdea, unlockIdea } from "@/app/(app)/find/idea-lab/actions";
import { RUBRIC, lockCheck, totalScore, type Scorecard } from "@/lib/find/ideaRules";
import { Gate, gateFor } from "@/components/Gate";

export interface IdeaRow { id: string; talk_id: string; status: "candidate" | "locked" | "archived"; title_working: string | null; throughline: string | null; score: Scorecard | null; source: string; created_at: string; batch_id: string | null }

// S3.1 idea grid: the locked idea pinned on a gold card, candidates below. Compare lets the member pick two.
export function IdeaGrid({ ideas, compare }: { ideas: IdeaRow[]; compare?: boolean }) {
  const locked = ideas.find((i) => i.status === "locked");
  const candidates = ideas.filter((i) => i.status === "candidate");
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ code: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle(id: string) { setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)); }
  const pair = picked.length === 2 ? picked.map((id) => ideas.find((i) => i.id === id)!) : null;

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      {locked && (
        <Card milestone className="flex flex-col gap-2">
          <span className="t-label text-[var(--accent-text)]">LOCKED</span>
          <Link href={`/find/idea-lab/${locked.id}`} className="t-title">{locked.title_working}</Link>
          <p className="t-body">{locked.throughline}</p>
          <div className="flex flex-wrap items-center gap-3">
            <ScoreLine score={locked.score} />
            <UnlockButton talkId={locked.talk_id} onDone={() => router.refresh()} />
          </div>
        </Card>
      )}
      {msg && (gateFor(msg.code, msg.message, "Idea Lock") ? <Gate {...gateFor(msg.code, msg.message, "Idea Lock")!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="t-compact text-[var(--danger-text)]">{msg.message}</p>)}
      {pair && (
        <Card className="grid gap-4 sm:grid-cols-2">
          {pair.map((i) => (
            <div key={i.id} className="flex flex-col gap-2">
              <h3 className="t-section">{i.title_working}</h3>
              <p className="t-compact">{i.throughline}</p>
              <ul className="flex flex-col gap-1">
                {RUBRIC.map((r) => { const l = i.score?.scores.find((s) => s.criterion === r.n)?.level; return <li key={r.n} className="flex items-center justify-between t-metadata"><span>{r.name}</span><span className="tabular">{l ? `L${l}` : "not scored"}</span></li>; })}
              </ul>
            </div>
          ))}
          <div className="sm:col-span-2"><Button size="sm" variant="ghost" onClick={() => setPicked([])}>Close comparison</Button></div>
        </Card>
      )}
      {candidates.length > 0 && <h2 className="t-section">Candidates</h2>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {candidates.map((i) => {
          const verdict = lockCheck(i.score);
          const sel = picked.includes(i.id);
          return (
            <li key={i.id}>
              <Card className={cx("flex h-full flex-col gap-2", sel && "border-[var(--accent-outline)]")}>
                <div className="flex items-start justify-between gap-2">
                  <span className="t-metadata text-[var(--ai-text)]">{i.source === "user" ? "Your words" : "AI draft"}</span>
                  <ScoreLine score={i.score} />
                </div>
                <Link href={`/find/idea-lab/${i.id}`} className="t-section">{i.title_working ?? "Untitled idea"}</Link>
                <p className="t-compact text-[var(--text-secondary)]">{i.throughline}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link href={`/find/idea-lab/${i.id}`} className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">Open</Link>
                  {!locked && verdict.ok && <Button size="sm" variant="milestone" onClick={() => start(async () => { const r = await lockIdea(i.id); if (!r.ok) setMsg(r); else router.refresh(); })}>Lock</Button>}
                  {compare !== false && <Button size="sm" variant="ghost" aria-pressed={sel} onClick={() => toggle(i.id)}>{sel ? "Picked" : "Compare"}</Button>}
                  <Button size="sm" variant="ghost" onClick={() => start(async () => { await archiveIdea(i.id); router.refresh(); })}>Archive</Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ScoreLine({ score }: { score: Scorecard | null }) {
  const t = totalScore(score);
  if (!t) return <span className="t-metadata text-[var(--text-muted)]">not scored</span>;
  return <span className="t-compact tabular" aria-label={`Score ${t.total} of ${t.max}`}>{t.total}/{t.max}</span>;
}

export function RubricRow({ score }: { score: Scorecard | null }) {
  if (!score) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Scorecard">
      {RUBRIC.map((r) => { const s = score.scores.find((x) => x.criterion === r.n); return s ? <li key={r.n}><RubricChip criterion={r.name} level={s.level} standard={r.standard} /></li> : null; })}
    </ul>
  );
}

export function UnlockButton({ talkId, onDone }: { talkId: string; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Unlock</Button>;
  return (
    <form className="flex w-full flex-col gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await unlockIdea(talkId, reason); if (!r.ok) setErr(r.message); else { setOpen(false); onDone?.(); } }); }}>
      <label className="t-compact">Why unlock? Your outline, pitch pack and open applications will be marked as possibly outdated; nothing is deleted.
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 t-body" minLength={10} required />
      </label>
      {err && <p role="alert" className="t-compact text-[var(--danger-text)]">{err}</p>}
      <div className="flex gap-2"><Button size="sm" type="submit" loading={pending}>Unlock</Button><Button size="sm" type="button" variant="ghost" onClick={() => setOpen(false)}>Keep it locked</Button></div>
    </form>
  );
}
