"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AIDraftBlock, Button, Card } from "@onebigtalk/ui";
import { deleteStage, generateExperienceSummary, generateFraming, saveStage } from "@/app/(app)/find/prior-stages/actions";
import { validateStage, type StageInput } from "@/lib/find/priorStages";
import { OVERLAP_THRESHOLD, topicOverlap } from "@/lib/find/ideaRules";
import { Gate, gateFor } from "@/components/Gate";

export interface StageRow { id: string; month: number | null; year: number | null; city: string | null; country_code: string | null; organization: string; audience_size: number | null; topic: string; result_line: string | null; link: string | null }
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const empty: StageInput = { month: null, year: null, city: "", countryCode: null, organization: "", audienceSize: null, topic: "", resultLine: "", link: "" };

// S3.9 Prior Stages: optional log, fresh-idea warning per entry, framing and the 60-word summary (member tools).
export function PriorStages({ talkId, stages, lockedIdeaText, hasMemberAccess, overlaps }: { talkId: string; stages: StageRow[]; lockedIdeaText: string | null; hasMemberAccess: boolean; overlaps: Record<string, { score: number; isOverlap: boolean; sharedWords: string[] }> }) {
  const [editing, setEditing] = useState<StageRow | "new" | null>(null);
  const [framing, setFraming] = useState<{ experience: string; firstTime: string; overlap: { entry_id: string; why: string }[]; violations: string[] } | null>(null);
  const [summary, setSummary] = useState<{ paragraph: string; wordCount: number; violations: string[] } | null>(null);
  const [msg, setMsg] = useState<{ code: string; message: string; what: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(what: string, fn: () => Promise<any>) { setMsg(null); start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code, message: r.message, what }); }); }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-page-title">Prior stages <span className="t-compact text-[var(--text-muted)]">(optional)</span></h1>
          <p className="t-compact text-[var(--text-secondary)]">This idea stays fresh. We describe your other talks as other topics.</p>
        </div>
        {editing === null && <Button onClick={() => setEditing("new")}>Add a stage</Button>}
      </div>

      {editing !== null && <StageForm initial={editing === "new" ? empty : toInput(editing)} id={editing === "new" ? undefined : editing.id} lockedIdeaText={lockedIdeaText} onClose={() => { setEditing(null); router.refresh(); }} />}

      {stages.length === 0 && editing === null && (
        <Card><p className="t-body text-[var(--text-secondary)]">Optional. If you have spoken before, log it here. If not, your idea carries the application.</p></Card>
      )}

      <ul className="flex flex-col gap-2">
        {stages.map((s) => {
          const ov = overlaps[s.id];
          return (
            <li key={s.id}>
              <Card className="flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="t-body">
                    <span className="text-[var(--text-secondary)]">{s.month ? `${MONTHS[s.month - 1]} ` : ""}{s.year ?? ""}{s.city ? ` · ${s.city}` : ""}</span> · {s.organization}{s.audience_size ? ` · ${s.audience_size} people` : ""} · {s.topic}{s.result_line ? <span className="text-[var(--text-secondary)]"> · "{s.result_line}"</span> : null}
                    {s.link && <> · <a href={s.link} target="_blank" rel="noreferrer" className="underline">public link</a></>}
                  </p>
                  <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => run("Remove", async () => { const r = await deleteStage(s.id); if (r.ok) router.refresh(); return r; })}>Remove</Button></div>
                </div>
                {ov?.isOverlap && (
                  <div role="status" className="rounded-[var(--radius)] border border-[var(--warning-text)] bg-[var(--surface-2)] p-3 t-compact">
                    <p><strong>This topic overlaps your locked idea</strong>{ov.sharedWords.length ? ` (shared: ${ov.sharedWords.slice(0, 4).join(", ")})` : ""}. Organizers want a fresh idea. Choose one:</p>
                    <ul className="mt-1 list-disc pl-5">
                      <li>Describe this stage as adjacent ground (recommended): edit the topic line so it names what was different about that talk.</li>
                      <li>Or change the idea's angle in the <a href="/find/idea-lab" className="underline">Idea Lab</a> so the TEDx idea is new.</li>
                    </ul>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      {msg && (gateFor(msg.code, msg.message, msg.what) ? <Gate {...gateFor(msg.code, msg.message, msg.what)!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="rounded-[var(--radius)] border border-[var(--danger-text)] p-3 t-compact">{msg.message}</p>)}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="t-section">Strong-candidate framing</h2>
          <p className="t-compact text-[var(--text-secondary)]">One or two sentences for applications: specific, measurable, and clear that the TEDx idea would be shared for the first time.</p>
          {framing && (
            <AIDraftBlock label="ai_draft" title="Framing" onRegenerate={() => run("Framing", async () => { const r = await generateFraming(talkId); if (r.ok && r.data) setFraming(r.data); return r; })}
              whyThis="Written only from the stages you logged and your locked idea. Prior talks are described as other topics (rule R10).">
              <p className="t-body">{framing.experience} {framing.firstTime}</p>
              {framing.violations.length > 0 && <p role="alert" className="mt-2 t-compact text-[var(--danger-text)]">This draft ties a prior stage to the idea, which breaks the fresh-idea rule. Regenerate or edit before using it. Sentence: "{framing.violations[0]}"</p>}
              {framing.overlap.length > 0 && <p className="mt-2 t-compact text-[var(--warning-text)]">Left out as overlapping: {framing.overlap.map((o) => o.why).join("; ")}</p>}
              <div className="mt-2"><Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(`${framing.experience} ${framing.firstTime}`)}>Copy</Button></div>
            </AIDraftBlock>
          )}
          {!framing && <div><Button variant="secondary" loading={pending} disabled={stages.length === 0 || !hasMemberAccess} onClick={() => run("Framing", async () => { const r = await generateFraming(talkId); if (r.ok && r.data) setFraming(r.data); return r; })}>Generate framing</Button></div>}
          {!hasMemberAccess && <p className="t-metadata text-[var(--text-muted)]">The log is free. Framing and the summary are member tools.</p>}
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="t-section">Experience summary for forms</h2>
          <p className="t-compact text-[var(--text-secondary)]">About 60 words for a "speaking experience" field. Works with no stages too.</p>
          {summary && (
            <AIDraftBlock label="ai_draft" title={`${summary.wordCount} words`} onRegenerate={() => run("Summary", async () => { const r = await generateExperienceSummary(talkId); if (r.ok && r.data) setSummary(r.data); return r; })}>
              <p className="t-body">{summary.paragraph}</p>
              {summary.violations.length > 0 && <p role="alert" className="mt-2 t-compact text-[var(--danger-text)]">This draft breaks the fresh-idea rule. Regenerate before using it.</p>}
              <div className="mt-2"><Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(summary.paragraph)}>Copy</Button></div>
            </AIDraftBlock>
          )}
          {!summary && <div><Button variant="secondary" loading={pending} disabled={!hasMemberAccess} onClick={() => run("Summary", async () => { const r = await generateExperienceSummary(talkId); if (r.ok && r.data) setSummary(r.data); return r; })}>Generate</Button></div>}
        </Card>
      </div>
    </div>
  );
}

function toInput(s: StageRow): StageInput {
  return { month: s.month, year: s.year, city: s.city ?? "", countryCode: s.country_code, organization: s.organization, audienceSize: s.audience_size, topic: s.topic, resultLine: s.result_line ?? "", link: s.link ?? "" };
}

function StageForm({ initial, id, lockedIdeaText, onClose }: { initial: StageInput; id?: string; lockedIdeaText: string | null; onClose: () => void }) {
  const [v, setV] = useState<StageInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const live = lockedIdeaText ? topicOverlap(v.topic, lockedIdeaText) : null;
  const inputCls = "h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-body";
  const set = <K extends keyof StageInput>(k: K, val: StageInput[K]) => setV((x) => ({ ...x, [k]: val }));
  return (
    <Card>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault(); const errs = validateStage(v); setErrors(errs); if (Object.keys(errs).length) return;
        start(async () => { const r = await saveStage(v, id); if (!r.ok) { setServerMsg(r.message); if (r.detail) setErrors(r.detail as Record<string, string>); } else onClose(); });
      }}>
        <h2 className="t-section sm:col-span-2">{id ? "Edit stage" : "Add a stage"}</h2>
        <label className="t-compact">Month<select className={inputCls} value={v.month ?? ""} onChange={(e) => set("month", e.target.value ? Number(e.target.value) : null)}><option value="">Not sure</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
        <label className="t-compact">Year<input className={inputCls} inputMode="numeric" value={v.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} />{errors.year && <span className="text-[var(--danger-text)]"> {errors.year}</span>}</label>
        <label className="t-compact">City<input className={inputCls} value={v.city} onChange={(e) => set("city", e.target.value)} /></label>
        <label className="t-compact">Organization or event<input className={inputCls} value={v.organization} onChange={(e) => set("organization", e.target.value)} required />{errors.organization && <span className="text-[var(--danger-text)]"> {errors.organization}</span>}</label>
        <label className="t-compact">Approximate audience size<input className={inputCls} inputMode="numeric" value={v.audienceSize ?? ""} onChange={(e) => set("audienceSize", e.target.value ? Number(e.target.value) : null)} /></label>
        <label className="t-compact sm:col-span-2">What you spoke about (one line)<input className={inputCls} value={v.topic} onChange={(e) => set("topic", e.target.value)} required maxLength={200} />{errors.topic && <span className="text-[var(--danger-text)]"> {errors.topic}</span>}
          {live && live.score >= OVERLAP_THRESHOLD && <span className="block pt-1 text-[var(--warning-text)]">This looks like your locked idea. Describe what was different about that talk, so the TEDx idea stays fresh.</span>}
        </label>
        <label className="t-compact sm:col-span-2">Result (one line, optional)<input className={inputCls} value={v.resultLine} onChange={(e) => set("resultLine", e.target.value)} maxLength={200} placeholder="for example: the hospital adopted the checklist in two units" /></label>
        <label className="t-compact sm:col-span-2">Public link (optional; a link, never a file)<input className={inputCls} inputMode="url" value={v.link} onChange={(e) => set("link", e.target.value)} />{errors.link && <span className="text-[var(--danger-text)]"> {errors.link}</span>}</label>
        {serverMsg && <p role="alert" className="t-compact text-[var(--danger-text)] sm:col-span-2">{serverMsg}</p>}
        <div className="flex gap-2 sm:col-span-2"><Button type="submit" loading={pending}>Save</Button><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button></div>
      </form>
    </Card>
  );
}
