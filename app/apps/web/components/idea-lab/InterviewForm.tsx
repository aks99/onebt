"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CharCountField } from "@onebigtalk/ui";
import { generateIdeas, saveInterviewAnswer } from "@/app/(app)/find/idea-lab/actions";
import { INTERVIEW_PROMPTS, interviewProgress, type Answers } from "@/lib/find/interview";
import { Gate, gateFor } from "@/components/Gate";

// S3.2 Idea Interview: eight prompts, one at a time, autosaved 1.5 s after typing stops. Partial saves resume.
export function InterviewForm({ talkId, initial }: { talkId: string; initial: Answers }) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const [i, setI] = useState(() => Math.min(INTERVIEW_PROMPTS.findIndex((p) => !(initial[p.key] ?? "").trim()) === -1 ? INTERVIEW_PROMPTS.length - 1 : INTERVIEW_PROMPTS.findIndex((p) => !(initial[p.key] ?? "").trim()), INTERVIEW_PROMPTS.length - 1));
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [genError, setGenError] = useState<{ code: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const p = INTERVIEW_PROMPTS[i];
  const value = answers[p.key] ?? "";
  const progress = interviewProgress(answers);

  function onChange(v: string) {
    setAnswers((a) => ({ ...a, [p.key]: v }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(p.key, v), 1500);
  }
  async function save(key: string, v: string) {
    const r = await saveInterviewAnswer(talkId, key, v);
    if (r.ok) { setSavedAt(new Date()); setSaveError(null); } else setSaveError(r.message);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function next() { if (timer.current) { clearTimeout(timer.current); save(p.key, value); } setI((x) => Math.min(x + 1, INTERVIEW_PROMPTS.length - 1)); }
  function back() { setI((x) => Math.max(x - 1, 0)); }
  const ok = value.trim().length >= p.minChars;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="t-title">Idea Interview</h1>
        <p className="t-compact tabular text-[var(--text-secondary)]" aria-live="polite">{progress.answered} of {progress.total} answered{savedAt ? ` · saved ${Math.max(0, Math.round((Date.now() - savedAt.getTime()) / 1000))} s ago` : ""}</p>
      </div>
      <ol className="flex gap-1" aria-label="Progress">
        {INTERVIEW_PROMPTS.map((q, k) => <li key={q.key} aria-current={k === i ? "step" : undefined} className={`h-1.5 flex-1 rounded-full ${(answers[q.key] ?? "").trim().length >= q.minChars ? "bg-[var(--accent-solid)]" : k === i ? "bg-[var(--text)]" : "bg-[var(--surface-2)]"}`} />)}
      </ol>
      <CharCountField id={`q-${p.key}`} label={`${i + 1}. ${p.question}`} hint={p.help} value={value} onChange={onChange} minChars={p.minChars} maxChars={4000} rows={7} />
      {saveError && <p role="alert" className="t-compact text-[var(--danger-text)]">{saveError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={back} disabled={i === 0}>Back</Button>
        {i < INTERVIEW_PROMPTS.length - 1
          ? <Button onClick={next} disabled={!ok}>Next prompt</Button>
          : <Button variant="milestone" disabled={!progress.complete || pending} loading={pending} loadingLabel="Writing your five ideas"
              onClick={() => { if (timer.current) { clearTimeout(timer.current); } start(async () => { await save(p.key, value); const r = await generateIdeas(talkId); if (!r.ok) setGenError(r); else router.push("/find/idea-lab"); }); }}>
              Generate ideas from this interview</Button>}
      </div>
      {!ok && <p className="t-metadata text-[var(--text-muted)]">Next opens at {p.minChars} characters. Specifics make better ideas.</p>}
      {genError && (gateFor(genError.code, genError.message, "Idea batches") ? <Gate {...gateFor(genError.code, genError.message, "Idea batches")!} onNotNow={() => setGenError(null)} /> : <p role="alert" className="t-compact text-[var(--danger-text)]">{genError.message}</p>)}
    </Card>
  );
}
