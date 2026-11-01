"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AIDraftBlock, Button, Card, LinterFlag } from "@onebigtalk/ui";
import { expandIdea, lockIdea, refineThroughline, rescoreIdea, updateIdeaField } from "@/app/(app)/find/idea-lab/actions";
import { RUBRIC, lockCheck, totalScore, type Scorecard } from "@/lib/find/ideaRules";
import { RubricRow, UnlockButton } from "./IdeaGrid";
import { Gate, gateFor } from "@/components/Gate";

export interface IdeaDetail {
  id: string; talk_id: string; status: "candidate" | "locked" | "archived"; source: string;
  title_working: string | null; throughline: string | null; belief_challenged: string | null; antagonist: string | null;
  evidence_notes: string | null; audience_action: string | null; why_this_speaker: string | null; talk_type: string | null; risk_notes: string | null;
  score: (Scorecard & { flags?: { rule: string; quote: string; why: string; fix: string }[] }) | null;
}
export interface Expansion { thesis: string | null; why_it_matters: string | null; key_points: string[]; story_candidates: { moment: string; sensory_detail: string; change: string }[]; evidence_to_find: string[]; contrast: { what_is: string; what_could_be: string } | null; created_at: string }

type Field = "title_working" | "throughline" | "belief_challenged" | "antagonist" | "evidence_notes" | "audience_action" | "why_this_speaker";
const FIELDS: { key: Field; title: string; hint: string }[] = [
  { key: "throughline", title: "Throughline", hint: "One sentence, 15 words at most, a claim someone could disagree with." },
  { key: "belief_challenged", title: "Belief it challenges", hint: "The widely held belief and how the idea challenges it." },
  { key: "antagonist", title: "Who disagrees", hint: "Who would argue against it, and why." },
  { key: "evidence_notes", title: "Evidence you have", hint: "What supports it; mark what still needs a source." },
  { key: "audience_action", title: "What the audience would do", hint: "One small winnable first step." },
  { key: "why_this_speaker", title: "Why you", hint: "Original work or lived experience, not credentials." },
];

// S3.3 Idea Card: every field editable in the member's words, scorecard with the quoted standard, expansion,
// throughline builder, lock with the soft-gate override reason. Phone-first: one column, panel below on small screens.
export function IdeaCardDetail({ idea, expansion, canLock, scorecardsLeft }: { idea: IdeaDetail; expansion: Expansion | null; canLock: boolean; scorecardsLeft: number | null }) {
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<{ code: string; message: string; what: string } | null>(null);
  const [override, setOverride] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [tl, setTl] = useState<{ recommended: string; alternatives: string[] } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const verdict = lockCheck(idea.score, override);
  const total = totalScore(idea.score);

  function run(what: string, fn: () => Promise<{ ok: boolean; code?: string; message?: string }>) {
    setMsg(null);
    start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work.", what }); else router.refresh(); });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy={pending || undefined}>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          {idea.status === "locked" && <span className="t-label text-[var(--accent-text)]">LOCKED</span>}
          <h1 className="t-page-title">{idea.title_working}</h1>
          <p className="t-metadata text-[var(--text-muted)]">{idea.talk_type ? `${idea.talk_type} talk` : ""}{idea.risk_notes && idea.risk_notes !== "none" ? ` · note: ${idea.risk_notes}` : ""}</p>
        </header>

        {msg && (gateFor(msg.code, msg.message, msg.what) ? <Gate {...gateFor(msg.code, msg.message, msg.what)!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="rounded-[var(--radius)] border border-[var(--danger-text)] p-3 t-compact">{msg.message}</p>)}

        {FIELDS.map((f) => {
          const v = idea[f.key] ?? "";
          const isEditing = editing === f.key;
          return (
            <AIDraftBlock key={f.key} label={idea.source === "user" ? "your_words" : "ai_draft"} title={f.title}
              steers={f.key === "throughline" ? ["shorter", "more personal", "sharper claim"] : undefined}
              onRegenerate={f.key === "throughline" ? (steer) => run("Throughline builder", async () => { const r = await refineThroughline(idea.id, steer ?? ""); if (r.ok && r.data) setTl(r.data); return r; }) : undefined}
              whyThis={f.hint}>
              {isEditing ? (
                <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); run("Edit", async () => { const r = await updateIdeaField(idea.id, f.key, draft); if (r.ok) setEditing(null); return r; }); }}>
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-3 t-body" aria-label={f.title} />
                  <div className="flex gap-2"><Button size="sm" type="submit" loading={pending}>Save as my words</Button><Button size="sm" type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
                </form>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="t-body whitespace-pre-wrap">{v || <span className="text-[var(--text-muted)]">Nothing here yet.</span>}</p>
                  {f.key === "throughline" && tl && (
                    <ul className="flex flex-col gap-1 rounded-[var(--radius)] bg-[var(--surface)] p-2">
                      {[tl.recommended, ...tl.alternatives].map((opt, k) => (
                        <li key={k} className="flex items-start justify-between gap-2 t-compact"><span>{opt}</span><Button size="sm" variant="ghost" onClick={() => run("Edit", async () => { const r = await updateIdeaField(idea.id, "throughline", opt); if (r.ok) setTl(null); return r; })}>Use</Button></li>
                      ))}
                    </ul>
                  )}
                  <div><Button size="sm" variant="ghost" onClick={() => { setEditing(f.key); setDraft(v); }}>Edit</Button></div>
                </div>
              )}
            </AIDraftBlock>
          );
        })}

        {idea.score?.flags && idea.score.flags.length > 0 && (
          <Card className="flex flex-col gap-2">
            <h2 className="t-section">Content guideline flags</h2>
            {idea.score.flags.map((fl, k) => <LinterFlag key={k} flag={fl} />)}
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="t-section">Expansion</h2><Button size="sm" variant="secondary" loading={pending} onClick={() => run("Idea Expansion", () => expandIdea(idea.id))}>{expansion ? "Expand again" : "Expand"}</Button></div>
          {expansion ? (
            <div className="flex flex-col gap-3 t-body">
              <p><span className="t-label text-[var(--text-muted)]">Thesis</span><br />{expansion.thesis}</p>
              <p><span className="t-label text-[var(--text-muted)]">Why it matters</span><br />{expansion.why_it_matters}</p>
              <div><span className="t-label text-[var(--text-muted)]">Key points</span><ul className="list-disc pl-5">{expansion.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul></div>
              <div><span className="t-label text-[var(--text-muted)]">Story candidates</span>
                <ul className="flex flex-col gap-2">{expansion.story_candidates.map((s, i) => <li key={i} className="rounded-[var(--radius)] bg-[var(--surface-2)] p-2 t-compact"><strong>{s.moment}</strong> {s.sensory_detail} <em>{s.change}</em></li>)}</ul></div>
              {expansion.contrast && <p><span className="t-label text-[var(--text-muted)]">What is / what could be</span><br />{expansion.contrast.what_is} → {expansion.contrast.what_could_be}</p>}
              {expansion.evidence_to_find.length > 0 && <div><span className="t-label text-[var(--text-muted)]">Evidence to find</span><ul className="list-disc pl-5">{expansion.evidence_to_find.map((k, i) => <li key={i}>{k}</li>)}</ul></div>}
            </div>
          ) : <p className="t-compact text-[var(--text-secondary)]">Thesis, why it matters, key points, three story candidates and the evidence still to find. Written from your idea and your interview only.</p>}
        </Card>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="t-section">Scorecard</h2>{total && <span className="t-title tabular">{total.total}/{total.max}</span>}</div>
          <RubricRow score={idea.score} />
          {idea.score?.fixes?.length ? <div><h3 className="t-label text-[var(--text-muted)]">Highest-leverage fixes</h3><ul className="list-disc pl-5 t-compact">{idea.score.fixes.map((f, i) => <li key={i}>{f}</li>)}</ul></div> : null}
          <details><summary className="t-compact cursor-pointer">Why these scores</summary>
            <ul className="mt-2 flex flex-col gap-2 t-compact">{(idea.score?.scores ?? []).map((s) => <li key={s.criterion}><strong>{RUBRIC[s.criterion - 1]?.name}</strong> L{s.level}: {s.reason}</li>)}</ul></details>
          <Button size="sm" variant="secondary" loading={pending} onClick={() => run("Scorecard", () => rescoreIdea(idea.id))}>Rescore{scorecardsLeft !== null ? ` (${scorecardsLeft} left)` : ""}</Button>
        </Card>

        <Card className="flex flex-col gap-3">
          {idea.status === "locked" ? (
            <>
              <p className="t-body">This is the idea your talk is built on. Later stages read only this.</p>
              <UnlockButton talkId={idea.talk_id} onDone={() => router.refresh()} />
            </>
          ) : (
            <>
              {verdict.ok ? <p className="t-compact text-[var(--text-secondary)]">Locking snapshots your profile and sends you to the Event Finder.</p>
                : <p className="t-compact text-[var(--warning-text)]">{verdict.message}</p>}
              {!verdict.ok && verdict.code === "IDEA_NEEDS_WORK" && (
                <div className="flex flex-col gap-2">
                  {!showOverride ? <Button size="sm" variant="ghost" onClick={() => setShowOverride(true)}>Lock it anyway</Button> : (
                    <label className="t-compact">Why lock it anyway? (20 characters at least)
                      <textarea value={override} onChange={(e) => setOverride(e.target.value)} rows={2} className="mt-1 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-2 t-compact" />
                    </label>
                  )}
                </div>
              )}
              <Button variant="milestone" disabled={!canLock || !verdict.ok} loading={pending} onClick={() => run("Idea Lock", () => lockIdea(idea.id, override || undefined))}>Lock this idea</Button>
              {!canLock && <p className="t-metadata text-[var(--text-muted)]">Another idea is locked on this talk. Unlock it first.</p>}
            </>
          )}
        </Card>
      </aside>
    </div>
  );
}
