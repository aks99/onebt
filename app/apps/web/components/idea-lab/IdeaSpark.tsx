"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, CharCountField } from "@onebigtalk/ui";
import { Gate, gateFor } from "@/components/Gate";
import { generateIdeas, savePastedMaterial } from "@/app/(app)/find/idea-lab/actions";
import { PASTE_MINIMUM } from "@/lib/find/interview";

// S1.3 / S3.1 "Paste something": a bio, a book summary or a LinkedIn About, then one batch of five ideas.
// Loading shows a two-phase indicator with a Stop control (the request completes server-side; Stop only
// returns the member to the page). Error keeps the text.
export function IdeaSpark({ talkId, initialText = "", allowanceLeft, interviewHref, onDone }: { talkId: string; initialText?: string; allowanceLeft: number | null; interviewHref: string; onDone?: () => void }) {
  const [text, setText] = useState(initialText);
  const [steer, setSteer] = useState("");
  const [phase, setPhase] = useState<"idle" | "reading" | "writing">("idle");
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const canGo = text.trim().length >= PASTE_MINIMUM && !pending;

  function go() {
    setError(null);
    start(async () => {
      setPhase("reading");
      const saved = await savePastedMaterial(talkId, text);
      if (!saved.ok) { setError(saved); setPhase("idle"); return; }
      setPhase("writing");
      const r = await generateIdeas(talkId, steer);
      setPhase("idle");
      if (!r.ok) { setError(r); return; }
      onDone?.(); router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <CharCountField id="spark" label="Paste your bio, a book summary or your LinkedIn About" value={text} onChange={setText} minChars={PASTE_MINIMUM} maxChars={20000}
        hint="Text only. Nothing is recorded." rows={8} className="min-h-[180px]" />
      <label className="flex flex-col gap-1 t-compact">
        <span className="text-[var(--text-secondary)]">Steer (optional)</span>
        <input value={steer} onChange={(e) => setSteer(e.target.value)} maxLength={200} placeholder="for example: ideas for hospital leaders, not patients"
          className="h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 t-body" />
      </label>
      {error && (gateFor(error.code, error.message, "Idea batches")
        ? <Gate {...gateFor(error.code, error.message, "Idea batches")!} onNotNow={() => setError(null)} />
        : <p role="alert" className="rounded-[var(--radius)] border border-[var(--danger-text)] p-3 t-compact">{error.message} Your text is still here.</p>)}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={go} disabled={!canGo} loading={pending} loadingLabel={phase === "reading" ? "Reading what you wrote" : "Writing your five ideas"}>Find my ideas</Button>
        {pending && <Button variant="ghost" size="sm" onClick={() => { setPhase("idle"); router.refresh(); }}>Stop</Button>}
        {!pending && <a href={interviewHref} className="t-compact underline-offset-2 hover:underline">Or answer the eight prompts instead</a>}
        {allowanceLeft !== null && !pending && <span className="t-metadata text-[var(--text-muted)]">{allowanceLeft === 0 ? "No batches left this month" : `${allowanceLeft} batch${allowanceLeft === 1 ? "" : "es"} left`}</span>}
      </div>
    </div>
  );
}
