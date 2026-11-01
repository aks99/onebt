"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CharCountField } from "@onebigtalk/ui";
import { briefCompleteness, saveBrief, setStructure, setTalkLength } from "@/app/(app)/write/actions";
import { BRIEF_MIN, BRIEF_PROMPTS, BRIEF_RECOMMENDED, TEMPLATES, briefChars, wordBudget } from "@/lib/write/rules";
import { Gate, gateFor } from "@/components/Gate";

export interface BriefProps { talkId: string; briefId: string | null; initial: Record<string, string>; isDraft: boolean; completeness: { answers: { key: string; present: boolean; strength: string; ask: string }[]; ready_for_outline: boolean; note: string } | null; slotMinutes: number; targetWpm: number; measuredWpm: number | null; template: string }

// S4.1 Idea Brief: six prompts (plus one optional), live counter, Save disabled under 500 characters with
// the reason shown, autosave of drafts, completeness advice that never blocks. Plus talk length and structure.
export function BriefForm(p: BriefProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(p.initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ code: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const chars = briefChars(answers);
  const can = chars >= BRIEF_MIN;
  const strength = (k: string) => p.completeness?.answers.find((a) => a.key === k)?.strength as "thin" | "adequate" | "strong" | undefined;

  function onChange(key: string, v: string) {
    const next = { ...answers, [key]: v }; setAnswers(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => start(async () => { const r = await saveBrief(p.talkId, next, false); if (r.ok) setSavedAt("draft saved"); }), 1500);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const budget = wordBudget(p.slotMinutes, p.measuredWpm ?? p.targetWpm);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <div><h1 className="t-page-title">Idea Brief</h1><p className="t-compact text-[var(--text-secondary)]">Your words first. The outline is written only from this brief, and the script only from the outline you finalize. {BRIEF_MIN} characters is the minimum; {BRIEF_RECOMMENDED[0].toLocaleString()} to {BRIEF_RECOMMENDED[1].toLocaleString()} is where good talks start.</p></div>
        {BRIEF_PROMPTS.map((q) => (
          <CharCountField key={q.key} id={`brief-${q.key}`} label={q.label} hint={q.help} value={answers[q.key] ?? ""} onChange={(v) => onChange(q.key, v)} rows={q.key === "not_claiming" ? 3 : 5} maxChars={12000} strength={strength(q.key)} />
        ))}
        {p.completeness && (
          <Card className="flex flex-col gap-1 t-compact">
            <p><strong>Completeness check:</strong> {p.completeness.note}</p>
            <ul className="list-disc pl-5">{p.completeness.answers.filter((a) => a.strength === "thin" || !a.present).map((a) => <li key={a.key}>{BRIEF_PROMPTS.find((q) => q.key === a.key)?.label}: {a.ask}</li>)}</ul>
          </Card>
        )}
        {msg && (gateFor(msg.code, msg.message, "Idea Brief") ? <Gate {...gateFor(msg.code, msg.message, "Idea Brief")!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="t-compact text-[var(--danger-text)]">{msg.message}</p>)}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!can} loading={pending} onClick={() => start(async () => { const r = await saveBrief(p.talkId, answers, true); if (!r.ok) setMsg(r); else { setSavedAt("saved"); setMsg(null); router.refresh(); } })}>Save brief</Button>
          <span className={`t-compact tabular ${can ? "text-[var(--text-secondary)]" : "text-[var(--warning-text)]"}`} aria-live="polite">{chars.toLocaleString()} / {BRIEF_MIN} characters{can ? "" : `; ${BRIEF_MIN - chars} more before Save opens`}{savedAt ? ` · ${savedAt}` : ""}</span>
          {p.briefId && !p.isDraft && <Button variant="ghost" size="sm" loading={pending} onClick={() => start(async () => { const r = await briefCompleteness(p.briefId!); if (!r.ok) setMsg(r); else router.refresh(); })}>Check completeness</Button>}
          {p.briefId && !p.isDraft && <Link href="/write/outline" className="t-compact underline">Next: build the outline</Link>}
        </div>
      </div>
      <aside className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2 t-compact">
          <h2 className="t-section">Talk length and pace</h2>
          <label>Slot (minutes)<input type="number" min={3} max={18} defaultValue={p.slotMinutes} className="mt-1 h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3" onBlur={(e) => start(async () => { await setTalkLength(p.talkId, Number(e.target.value), p.targetWpm); router.refresh(); })} /></label>
          <label>Target pace (words a minute, 130 to 160)<input type="number" min={110} max={190} defaultValue={p.targetWpm} className="mt-1 h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3" onBlur={(e) => start(async () => { await setTalkLength(p.talkId, p.slotMinutes, Number(e.target.value)); router.refresh(); })} /></label>
          <p>Word budget: <strong className="tabular">{budget.low.toLocaleString()} to {budget.high.toLocaleString()}</strong>, aim for about <strong className="tabular">{budget.target.toLocaleString()}</strong> with a {Math.round(budget.bufferSeconds / 6) / 10}-minute buffer.</p>
          <p className="text-[var(--text-muted)]">{p.measuredWpm ? `Using your measured pace of ${p.measuredWpm} words a minute.` : `Assumed ${p.targetWpm} words a minute until three timed runs measure your pace.`}</p>
        </Card>
        <Card className="flex flex-col gap-2 t-compact">
          <h2 className="t-section">Structure</h2>
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <label key={key} className="flex items-start gap-2"><input type="radio" name="template" className="mt-0.5 h-6 w-6" defaultChecked={p.template === key} onChange={() => start(async () => { await setStructure(p.talkId, key); router.refresh(); })} /><span><strong>{t.name}</strong> <span className="text-[var(--text-muted)]">{t.sections.map((s) => s.title).join(" · ")}</span><br /><span className="text-[var(--text-secondary)]">{t.source}</span></span></label>
          ))}
        </Card>
      </aside>
    </div>
  );
}
