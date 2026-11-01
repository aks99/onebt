"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AIDraftBlock, Button, Card } from "@onebigtalk/ui";
import { generatePack, resetPackField, savePitchKit, saveWritingSample, updatePackField, type PackFields } from "@/app/(app)/find/pitch/actions";
import { Gate, gateFor } from "@/components/Gate";

export interface PackRow { id: string; version: number; fields: PackFields; ai_fields: PackFields; field_sources: Record<string, string>; stale: boolean; pitch_kit: { length_seconds?: number; checklist?: Record<string, boolean>; self_review?: Record<string, string>; link?: string | null } | null; created_at: string }

const BLOCKS: { key: keyof PackFields; title: string; hint: string; rows?: number }[] = [
  { key: "titles", title: "Titles (3)", hint: "Specific, verb-driven, searchable, 60 characters at most, no generic praise. One per line.", rows: 3 },
  { key: "one_sentence", title: "One-sentence idea", hint: "15 words or fewer, a claim someone could disagree with.", rows: 2 },
  { key: "idea_statement", title: "Idea statement", hint: "180 to 230 words: surprising claim, belief it challenges, evidence, why now, who it helps.", rows: 8 },
  { key: "why_now", title: "Why now", hint: "90 to 130 words.", rows: 4 },
  { key: "why_you", title: "Why you", hint: "Original work and lived experience. Never coach, speaker or author of.", rows: 4 },
  { key: "accomplishment", title: "Accomplishment", hint: "One concrete thing, 100 words at most. Uses your Prior Stages when they fit.", rows: 3 },
  { key: "bio_150", title: "Bio (150 words)", hint: "Answers why trust this person.", rows: 5 },
  { key: "bio_250", title: "Bio (250 words)", hint: "", rows: 7 },
  { key: "youtube_bio", title: "Bio for the video description", hint: "4 to 7 sentences.", rows: 4 },
  { key: "links", title: "Links", hint: "Your words: website, LinkedIn, articles, a public talk link if you have one.", rows: 2 },
];
const CHECKLIST = ["Standing, not sitting", "Well lit, light on your face", "Eye-line at the lens", "Dressed as you would be on stage", "Quiet room, no echo", "Phone or camera at eye height", "The first sentence is the idea", "Finished under the time"];
const SELF_REVIEW = [{ key: "first_sentence", q: "Did I state the idea in the first sentence?" }, { key: "under_time", q: "Did I finish under time? By how much?" }, { key: "three_beats", q: "Idea, why it matters, why me: were all three there?" }, { key: "redo", q: "One thing I would redo" }];

// S3.8 Pitch Pack and the text-only Pitch Video Kit (F1.4.1, F1.4.2). The member films on their own device.
export function PitchStudio({ pack, hasLockedIdea, hasSample, packsLeft }: { pack: PackRow | null; hasLockedIdea: boolean; hasSample: boolean; packsLeft: number | null }) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() => flatten(pack?.fields ?? {}));
  const [msg, setMsg] = useState<{ code: string; message: string; what: string } | null>(null);
  const [steer, setSteer] = useState("");
  const [sample, setSample] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (what: string, fn: () => Promise<{ ok: boolean; code?: string; message?: string }>) => { setMsg(null); start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work.", what }); else router.refresh(); }); };
  const label = (k: string) => pack?.field_sources?.[k] === "user" ? "your_words" : "ai_draft";

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="t-page-title">Pitch Pack</h1><p className="t-compact text-[var(--text-secondary)]">The reusable material every form asks for, written from your locked idea and your own words. Personalize it per event from each application.</p></div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2"><input value={steer} onChange={(e) => setSteer(e.target.value)} placeholder="Steer (optional): plainer, warmer, for a health audience" className="h-11 w-64 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-compact" /><Button variant={pack ? "secondary" : "milestone"} disabled={!hasLockedIdea} loading={pending} loadingLabel="Writing your pack" onClick={() => run("Pitch Pack", () => generatePack(steer))}>{pack ? `Regenerate (v${pack.version + 1})` : "Generate from my idea"}</Button></div>
          {packsLeft !== null && <span className="t-metadata text-[var(--text-muted)]">{packsLeft === 0 ? "Free plan: one generation. Members regenerate as they like." : ""}</span>}
        </div>
      </div>
      {!hasLockedIdea && <Card><p className="t-body text-[var(--text-secondary)]">Lock an idea in the Idea Lab first. The pack is written only from the locked idea, your interview and your Prior Stages.</p></Card>}
      {pack?.stale && <div role="status" className="rounded-[var(--radius)] border border-[var(--warning-text)] bg-[var(--surface-2)] p-3 t-compact">Your idea or Prior Stages changed after this pack was written. Regenerate the accomplishment and why-you blocks, or edit them.</div>}
      {msg && (gateFor(msg.code, msg.message, msg.what) ? <Gate {...gateFor(msg.code, msg.message, msg.what)!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="rounded-[var(--radius)] border border-[var(--danger-text)] p-3 t-compact">{msg.message}</p>)}

      {!hasSample && (
        <Card className="flex flex-col gap-2">
          <h2 className="t-section">Sound like you (optional, 2 min)</h2>
          <p className="t-compact text-[var(--text-secondary)]">Paste 200 characters or more of something you wrote: an email, a post, a page from your book. The pack borrows your rhythm, never your facts.</p>
          <textarea rows={4} value={sample} onChange={(e) => setSample(e.target.value)} className="w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-3 t-body" />
          <div><Button size="sm" variant="secondary" disabled={sample.trim().length < 200} loading={pending} onClick={() => run("Writing sample", () => saveWritingSample(sample))}>Save sample</Button></div>
        </Card>
      )}

      {pack && (
        <>
          {BLOCKS.map((b) => {
            const v = drafts[b.key] ?? "";
            return (
              <AIDraftBlock key={b.key} label={b.key === "links" ? "your_words" : label(b.key)} title={b.title} whyThis={b.hint || undefined}>
                <textarea rows={b.rows ?? 4} value={v} onChange={(e) => setDrafts({ ...drafts, [b.key]: e.target.value })} onBlur={() => { if (v !== (flatten(pack.fields)[b.key] ?? "")) run("Edit", () => updatePackField(pack.id, b.key, v)); }} className="w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-3 t-body" aria-label={b.title} />
                <div className="mt-1 flex flex-wrap items-center gap-2 t-metadata text-[var(--text-muted)]">
                  <span className="tabular">{words(v)} words</span>
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(v)}>Copy</Button>
                  {pack.field_sources?.[b.key] === "user" && (pack.ai_fields as any)?.[b.key] !== undefined && <Button size="sm" variant="ghost" onClick={() => run("Reset", () => resetPackField(pack.id, b.key))}>Reset to AI version</Button>}
                </div>
              </AIDraftBlock>
            );
          })}
          {(pack.fields.needs_source ?? []).length > 0 && <Card><h2 className="t-section">Claims that need a source</h2><ul className="list-disc pl-5 t-compact">{pack.fields.needs_source!.map((c, i) => <li key={i}>{c}</li>)}</ul></Card>}
          <PitchKit pack={pack} onSave={(kit) => run("Pitch kit", () => savePitchKit(pack.id, kit))} pending={pending} />
        </>
      )}
    </div>
  );
}

function flatten(f: PackFields): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) { if (k === "needs_source") continue; out[k] = Array.isArray(v) ? v.join("\n") : (v as string) ?? ""; }
  return out;
}
function words(s: string) { return s.trim() ? s.trim().split(/\s+/).length : 0; }

// F1.4.2: script with three beats and timings, a shot checklist, a read-along pacer and a typed self-review.
// Nothing here records, uploads or stores a file. The member films on their own phone or laptop.
function PitchKit({ pack, onSave, pending }: { pack: PackRow; onSave: (kit: { lengthSeconds: 60 | 90 | 120 | 180; checklist: Record<string, boolean>; selfReview: Record<string, string>; linkPasted?: string }) => void; pending: boolean }) {
  const [len, setLen] = useState<60 | 90 | 120 | 180>((pack.pitch_kit?.length_seconds as any) ?? 90);
  const [checks, setChecks] = useState<Record<string, boolean>>(pack.pitch_kit?.checklist ?? {});
  const [review, setReview] = useState<Record<string, string>>(pack.pitch_kit?.self_review ?? {});
  const [link, setLink] = useState(pack.pitch_kit?.link ?? "");
  const script = pack.fields.pitch_video_script_90s ?? "";
  const scaled = Math.round(len / 90 * 100);
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="t-section">Pitch video kit (text)</h2>
      <p className="t-compact text-[var(--text-secondary)]">Some forms ask for a short video. You film it on your own phone or laptop. Here is the script, the checklist and a self-review to fill in afterwards. Nothing is uploaded here.</p>
      <div className="flex flex-wrap items-center gap-2 t-compact">Length the form asks for:
        {[60, 90, 120, 180].map((n) => <button key={n} type="button" aria-pressed={len === n} onClick={() => setLen(n as any)} className={`h-10 rounded-full border px-3 ${len === n ? "border-[var(--accent-outline)] bg-[var(--surface-2)]" : "border-[var(--border-subtle)]"}`}>{n} s</button>)}
        {len !== 90 && <span className="text-[var(--text-muted)]">The script below is written for 90 seconds; aim for about {scaled}% of its length.</span>}
      </div>
      <AIDraftBlock label="ai_draft" title="Script: idea (0 to 30 s), why it matters (30 to 60 s), why you (60 to 90 s)">
        <p className="t-body whitespace-pre-wrap">{script || "Generate the pack to get the script."}</p>
      </AIDraftBlock>
      {script && <Pacer text={script} seconds={len} />}
      <div className="grid gap-2 sm:grid-cols-2">
        <div><h3 className="t-label mb-1 text-[var(--text-muted)]">SHOT CHECKLIST</h3><ul className="flex flex-col gap-1 t-compact">{CHECKLIST.map((c) => <li key={c}><label className="flex items-center gap-2"><input type="checkbox" className="h-6 w-6" checked={!!checks[c]} onChange={(e) => setChecks({ ...checks, [c]: e.target.checked })} />{c}</label></li>)}</ul></div>
        <div><h3 className="t-label mb-1 text-[var(--text-muted)]">SELF-REVIEW AFTER FILMING</h3><div className="flex flex-col gap-2">{SELF_REVIEW.map((q) => <label key={q.key} className="t-compact">{q.q}<input value={review[q.key] ?? ""} onChange={(e) => setReview({ ...review, [q.key]: e.target.value })} className="mt-1 h-10 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2" /></label>)}</div></div>
      </div>
      <label className="t-compact">Unlisted link, if a form asks for the video (a link, never a file)<input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://" className="mt-1 h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3" /></label>
      <div><Button size="sm" variant="secondary" loading={pending} onClick={() => onSave({ lengthSeconds: len, checklist: checks, selfReview: review, linkPasted: link || undefined })}>Save kit</Button></div>
    </Card>
  );
}

// Read-along pacer: highlights where you should be in the script as the seconds pass. A timer and text; no capture.
function Pacer({ text, seconds }: { text: string; seconds: number }) {
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { if (running) ref.current = setInterval(() => setT((x) => Math.min(seconds, x + 1)), 1000); return () => { if (ref.current) clearInterval(ref.current); }; }, [running, seconds]);
  useEffect(() => { if (t >= seconds) setRunning(false); }, [t, seconds]);
  const wordsArr = text.split(/\s+/).filter(Boolean);
  const pos = Math.floor((t / seconds) * wordsArr.length);
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] bg-[var(--surface-2)] p-3">
      <div className="flex flex-wrap items-center gap-2 t-compact"><span className="t-timer tabular">{String(Math.floor(t / 60)).padStart(1, "0")}:{String(t % 60).padStart(2, "0")}</span><span className="text-[var(--text-muted)]">of {seconds} s</span>
        <Button size="sm" variant={running ? "ghost" : "secondary"} onClick={() => setRunning((r) => !r)}>{running ? "Pause" : t > 0 && t < seconds ? "Resume" : "Start pacer"}</Button><Button size="sm" variant="ghost" onClick={() => { setRunning(false); setT(0); }}>Reset</Button></div>
      <p className="t-body leading-relaxed" aria-live="off">{wordsArr.map((w, i) => <span key={i} className={i < pos ? "text-[var(--text-muted)]" : i === pos ? "bg-[var(--accent-solid)] text-[var(--accent-foreground)]" : ""}>{w} </span>)}</p>
    </div>
  );
}
