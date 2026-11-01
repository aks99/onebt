"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AIDraftBlock, Button, Card, LinterFlag, RubricChip, StatusBadge, type PipelineStatus } from "@onebigtalk/ui";
import { acceptVariantField, authorshipNoteFor, checkReadiness, draftFollowUp, logOutcome, markFeedbackRequested, markFollowUpSent, moveStatus, personalize, prefillFromPack, saveAnswer, saveResearch, updateDates } from "@/app/(app)/find/applications/actions";
import { APPLICATION_RUBRIC, FOLLOW_UP_REASONS, RESEARCH_MIN, RESEARCH_QUESTIONS, followUpAllowed, readinessPassed, researchComplete, type FollowUpVerdict, type Readiness } from "@/lib/pipeline/rules";
import { countFor, overLimit, type FormField } from "@/lib/pipeline/formMapper";
import { Gate, gateFor } from "@/components/Gate";

export interface AppDetail {
  id: string; status: PipelineStatus; answers: Record<string, string>; answer_sources: Record<string, string>; ai_originals: Record<string, string>; research_answers: Record<string, string> | null;
  readiness: Readiness | null; readiness_passed: boolean; applied_at: string | null; follow_up_at: string | null; follow_up_sent_at: string | null; follow_up_draft: string | null; decision_date: string | null; no_enquiries: boolean;
  outcome: string | null; outcome_at: string | null; outcome_reason: string | null; event_date: string | null; notes: string | null; authorship: { your_words_pct?: number } | null; counts_toward_100: boolean; stale: boolean; feedback_requested_at: string | null;
}
export interface AppEvent { id: string | null; name: string; city: string | null; country_code: string | null; theme: string | null; form_url: string | null; application_deadline: string | null; ai_policy: string; ai_policy_snippet: string | null; talk_length_target: string | null; local_connection_required: boolean | null; pitch_video_required: boolean | null; expired: boolean }

type Msg = { code: string; message: string; what: string } | null;
const input = "w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-3 t-body";

// S3.7 Application detail: Step 1 research, Step 2 fields from the Pitch Pack with personalization and the
// readiness panel, Step 3 submit assist and follow-up, then the outcome. The product never submits.
export function ApplicationDetail({ app, ev, fields, hasPack, tailoredLeft, hasMemberAccess }: { app: AppDetail; ev: AppEvent; fields: FormField[]; hasPack: boolean; tailoredLeft: number | null; hasMemberAccess: boolean }) {
  const [research, setResearch] = useState<Record<string, string>>(app.research_answers ?? {});
  const [drafts, setDrafts] = useState<Record<string, string>>(app.answers ?? {});
  const [variant, setVariant] = useState<{ fields: { key: string; text: string }[]; what_changed: string[]; cautions: string[] } | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<{ subject: string; body: string } | null>(app.follow_up_draft ? { subject: app.follow_up_draft.split("\n\n")[0], body: app.follow_up_draft.split("\n\n").slice(1).join("\n\n") } : null);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ subject: string; body: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const researchDone = researchComplete(research);
  const aiOff = ev.ai_policy === "prohibited";
  const verdict = readinessPassed(app.readiness);
  const fu: FollowUpVerdict = followUpAllowed({ status: app.status, appliedAt: app.applied_at, followUpSentAt: app.follow_up_sent_at, decisionDate: app.decision_date, noEnquiries: app.no_enquiries, hasPublicForm: !!ev.form_url });
  const sent = ["applied", "follow_up_due", "interview", "accepted", "declined", "reapply"].includes(app.status);

  function run(what: string, fn: () => Promise<{ ok: boolean; code?: string; message?: string; data?: any }>, after?: (d: any) => void) {
    setMsg(null);
    start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work.", what }); else { after?.(r.data); router.refresh(); } });
  }
  const label = (key: string) => app.answer_sources?.[key] === "user" ? "your_words" : app.answer_sources?.[key] === "ai_assisted" ? "ai_assisted" : app.answer_sources?.[key] === "llm" ? "ai_draft" : "your_words";

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <Link href="/find/applications" className="t-compact text-[var(--text-secondary)]">← Applications</Link>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="t-page-title">{ev.name}</h1><p className="t-compact text-[var(--text-secondary)]">{[ev.city, ev.country_code].filter(Boolean).join(", ")}{ev.theme ? ` · theme "${ev.theme}"` : ""}{ev.application_deadline ? ` · deadline ${ev.application_deadline}` : ""}{ev.expired ? " · event cancelled or past" : ""}</p></div>
        <div className="flex items-center gap-2"><StatusBadge status={app.status} />{app.authorship?.your_words_pct != null && <span className="t-compact tabular">Your words: {app.authorship.your_words_pct}%</span>}</div>
      </header>
      {app.stale && <div role="status" className="rounded-[var(--radius)] border border-[var(--warning-text)] bg-[var(--surface-2)] p-3 t-compact">Your idea or Prior Stages changed after this was written. Re-read the fields before sending.</div>}
      {aiOff && <div role="status" className="rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface-2)] p-3 t-compact">This organizer asks for applications written without AI{ev.ai_policy_snippet ? `: "${ev.ai_policy_snippet}"` : ""}. Drafting tools are off inside this application. Scoring, the linter and the completeness check stay on.</div>}
      {msg && (gateFor(msg.code, msg.message, msg.what) ? <Gate {...gateFor(msg.code, msg.message, msg.what)!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="rounded-[var(--radius)] border border-[var(--danger-text)] p-3 t-compact">{msg.message}</p>)}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          {/* Step 1: research */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><h2 className="t-section">Step 1. Research the event</h2><span className="t-metadata text-[var(--text-muted)]">{researchDone ? "done" : "required before personalizing"}</span></div>
            <p className="t-compact text-[var(--text-secondary)]">Three short notes in your own words, from the organizer's page. {ev.form_url && <a className="underline" href={ev.form_url} target="_blank" rel="noreferrer">Open their page</a>}</p>
            {RESEARCH_QUESTIONS.map((q) => (
              <label key={q.key} className="flex flex-col gap-1 t-compact">{q.label}<span className="text-[var(--text-muted)]">{q.help}</span>
                <textarea rows={2} value={research[q.key] ?? ""} onChange={(e) => setResearch({ ...research, [q.key]: e.target.value })} onBlur={() => run("Research", () => saveResearch(app.id, research))} className={input} />
                <span className="t-metadata tabular text-[var(--text-muted)]">{(research[q.key] ?? "").trim().length} / {RESEARCH_MIN} minimum</span>
              </label>
            ))}
          </Card>

          {/* Step 2: fields */}
          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="t-section">Step 2. The organizer's fields</h2>
              <div className="flex flex-wrap gap-2">
                {hasPack ? <Button size="sm" variant="secondary" loading={pending} onClick={() => run("Pitch Pack", () => prefillFromPack(app.id))}>Fill empty fields from my Pitch Pack</Button> : <Link href="/find/pitch" className="inline-flex h-9 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">Build your Pitch Pack first (8 min)</Link>}
                {!aiOff && <Button size="sm" variant="milestone" disabled={!researchDone || !hasPack} loading={pending} onClick={() => run("Personalize for this event", () => personalize(app.id), (d) => setVariant(d))}>Personalize for this event{tailoredLeft !== null ? ` (${tailoredLeft} left)` : ""}</Button>}
              </div>
            </div>
            {!researchDone && <p className="t-metadata text-[var(--text-muted)]">Personalize opens once Step 1 is complete.</p>}
            {variant && (
              <div className="flex flex-col gap-2 rounded-[var(--radius)] bg-[var(--ai-bg)] p-3 t-compact">
                <p><strong>What changed:</strong> {variant.what_changed.join("; ") || "nothing material"}</p>
                {variant.cautions.length > 0 && <p className="text-[var(--warning-text)]"><strong>Cautions:</strong> {variant.cautions.join("; ")}</p>}
                <p className="text-[var(--text-secondary)]">Accept a field to replace your current answer with the personalized one. Nothing is changed until you do.</p>
              </div>
            )}
            {fields.map((f) => {
              const v = drafts[f.key] ?? "";
              const pv = variant?.fields.find((x) => x.key === f.key);
              const n = countFor(v, f); const over = overLimit(v, f);
              return (
                <AIDraftBlock key={f.key} label={label(f.key)} title={`${f.label}${f.required ? "" : " (optional)"}`}>
                  <textarea rows={f.key === "links" || f.key === "video_link" ? 2 : 5} value={v} onChange={(e) => setDrafts({ ...drafts, [f.key]: e.target.value })} onBlur={() => { if (v !== (app.answers?.[f.key] ?? "")) run("Edit", () => saveAnswer(app.id, f.key, v)); }} className={input} aria-label={f.label} placeholder={f.key === "video_link" ? "Paste an unlisted YouTube or Vimeo link if the form asks for one" : ""} />
                  <p className={`t-metadata tabular ${over ? "text-[var(--danger-text)]" : "text-[var(--text-muted)]"}`}>{f.limit ? `${n} / ${f.limit} ${f.limit_type}${over ? ", over the limit" : ""}` : `${n} characters`}</p>
                  {pv && pv.text.trim() !== v.trim() && (
                    <div className="mt-2 rounded-[var(--radius)] border border-[var(--accent-outline)] bg-[var(--surface)] p-2">
                      <p className="t-metadata text-[var(--ai-text)]">Personalized for {ev.name}</p>
                      <p className="t-compact whitespace-pre-wrap">{pv.text}</p>
                      <div className="mt-1 flex gap-2"><Button size="sm" onClick={() => run("Accept", () => acceptVariantField(app.id, f.key, pv.text), () => setDrafts((d) => ({ ...d, [f.key]: pv.text })))}>Accept</Button><Button size="sm" variant="ghost" onClick={() => setVariant((x) => x ? { ...x, fields: x.fields.filter((y) => y.key !== f.key) } : x)}>Keep mine</Button></div>
                    </div>
                  )}
                </AIDraftBlock>
              );
            })}
          </Card>

          {/* Step 3: submit assist */}
          <Card className="flex flex-col gap-3">
            <h2 className="t-section">Step 3. Submit on the organizer's form</h2>
            <p className="t-compact text-[var(--text-secondary)]">Open their form in a new tab, copy each answer across, press their submit button. Then mark it applied here. {PRODUCT_NOTE}</p>
            <div className="flex flex-wrap gap-2">
              {ev.form_url ? <a href={ev.form_url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-4 t-body">Open the organizer form</a> : <span className="t-compact text-[var(--text-muted)]">No public form link on file; use the organizer's published channel.</span>}
              {fields.map((f) => (drafts[f.key] ?? "").trim() ? <Button key={f.key} size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(drafts[f.key])}>Copy {f.label.toLowerCase().slice(0, 28)}</Button> : null)}
            </div>
            {!sent && (
              <div className="flex flex-col gap-2">
                {!verdict.ok && <p className="t-compact text-[var(--warning-text)]">{verdict.reason} You can still mark it applied; it will not count toward your 100.</p>}
                {confirm ? <div className="flex flex-wrap items-center gap-2 t-compact"><span>{confirm}</span><Button size="sm" onClick={() => run("Applied", () => moveStatus(app.id, "applied", { confirmed: true }), () => setConfirm(null))}>Yes, I submitted it</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Not yet</Button></div>
                  : <div><Button variant="milestone" loading={pending} onClick={() => run("Applied", () => moveStatus(app.id, "applied"), (d) => { if (d?.confirm) setConfirm(d.confirm); })}>Mark as applied</Button></div>}
              </div>
            )}
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><h2 className="t-section">Readiness</h2>{app.readiness && <span className={`t-compact ${verdict.ok ? "text-[var(--success-text)]" : "text-[var(--warning-text)]"}`}>{verdict.ok ? "passes" : "not ready yet"}</span>}</div>
            {app.readiness ? (
              <>
                <ul className="flex flex-wrap gap-1.5">{APPLICATION_RUBRIC.map((c) => { const s = app.readiness!.scores.find((x) => x.criterion === c.n); return s ? <li key={c.n}><RubricChip criterion={c.name} level={s.level} standard={c.standard} gated={[1, 4, 8].includes(c.n)} /></li> : null; })}</ul>
                {app.readiness.organizer_eyes && <p className="t-compact text-[var(--text-secondary)]"><strong>Through an organizer's eyes:</strong> {app.readiness.organizer_eyes}</p>}
                {app.readiness.linter?.flags?.map((fl, i) => <LinterFlag key={i} flag={fl} onApplyFix={(fix) => { const key = fields.find((f) => (drafts[f.key] ?? "").includes(fl.quote))?.key; if (key) { const nv = drafts[key].replace(fl.quote, fix); setDrafts({ ...drafts, [key]: nv }); run("Edit", () => saveAnswer(app.id, key, nv)); } }} />)}
                {app.readiness.rewrites?.length > 0 && !aiOff && (
                  <details className="t-compact"><summary className="cursor-pointer">Suggested rewrites ({app.readiness.rewrites.length})</summary>
                    <ul className="mt-2 flex flex-col gap-2">{app.readiness.rewrites.map((rw, i) => <li key={i} className="rounded-[var(--radius)] bg-[var(--ai-bg)] p-2"><span className="t-metadata text-[var(--ai-text)]">{rw.field}</span><p className="whitespace-pre-wrap">{rw.text}</p><Button size="sm" variant="ghost" onClick={() => run("Accept", () => acceptVariantField(app.id, rw.field, rw.text), () => setDrafts((d) => ({ ...d, [rw.field]: rw.text })))}>Use this</Button></li>)}</ul></details>
                )}
                <details className="t-compact"><summary className="cursor-pointer">Why these scores</summary><ul className="mt-1 flex flex-col gap-1">{app.readiness.scores.map((s) => <li key={s.criterion}><strong>{APPLICATION_RUBRIC[s.criterion - 1]?.name}</strong> L{s.level}: {s.reason}</li>)}</ul></details>
              </>
            ) : <p className="t-compact text-[var(--text-secondary)]">Eight criteria from the application rubric. Ready needs Level 3 on idea statement, why you and compliance.</p>}
            <Button size="sm" variant="secondary" loading={pending} disabled={!hasMemberAccess} onClick={() => run("Readiness Review", () => checkReadiness(app.id))}>Check readiness</Button>
            {!hasMemberAccess && <p className="t-metadata text-[var(--text-muted)]">The Readiness Review is a member tool.</p>}
            {!sent && app.readiness_passed && app.status !== "ready" && <Button size="sm" onClick={() => run("Ready", () => moveStatus(app.id, "ready"))}>Mark ready</Button>}
          </Card>

          <Card className="flex flex-col gap-2 t-compact">
            <h2 className="t-section">Dates</h2>
            <label>Applied on<input type="date" className={input} defaultValue={app.applied_at ?? ""} onBlur={(e) => run("Dates", () => updateDates(app.id, { appliedAt: e.target.value }))} /></label>
            <label>Follow-up on<input type="date" className={input} defaultValue={app.follow_up_at ?? ""} onBlur={(e) => run("Dates", () => updateDates(app.id, { followUpAt: e.target.value }))} /></label>
            <label>Organizer's decision date (if stated)<input type="date" className={input} defaultValue={app.decision_date ?? ""} onBlur={(e) => run("Dates", () => updateDates(app.id, { decisionDate: e.target.value }))} /></label>
            <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" defaultChecked={app.no_enquiries} onChange={(e) => run("Dates", () => updateDates(app.id, { noEnquiries: e.target.checked }))} /> Their page says not to enquire</label>
            <label>Event date<input type="date" className={input} defaultValue={app.event_date ?? ""} onBlur={(e) => run("Dates", () => updateDates(app.id, { eventDate: e.target.value }))} /></label>
            <label>Notes<textarea rows={3} className={input} defaultValue={app.notes ?? ""} onBlur={(e) => run("Dates", () => updateDates(app.id, { notes: e.target.value }))} /></label>
          </Card>

          <Card className="flex flex-col gap-2 t-compact">
            <h2 className="t-section">Follow-up</h2>
            <p className="text-[var(--text-secondary)]">{FOLLOW_UP_REASONS[fu]}</p>
            {fu === "OK" && !followUp && <Button size="sm" variant="secondary" loading={pending} onClick={() => run("Follow-up", () => draftFollowUp(app.id), (d) => setFollowUp(d))}>Draft the follow-up</Button>}
            {followUp && fu !== "ALREADY_SENT" && (
              <div className="flex flex-col gap-2">
                <p className="font-medium">{followUp.subject}</p>
                <pre className="whitespace-pre-wrap rounded-[var(--radius)] bg-[var(--surface-2)] p-2 font-[inherit]">{followUp.body}</pre>
                <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(`${followUp.subject}\n\n${followUp.body}`)}>Copy</Button><Button size="sm" onClick={() => run("Follow-up", () => markFollowUpSent(app.id))}>I sent it</Button></div>
                <p className="t-metadata text-[var(--text-muted)]">You send it from your own email. The app never contacts an organizer.</p>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2 t-compact">
            <h2 className="t-section">Outcome</h2>
            {app.outcome ? <p>{app.outcome} on {app.outcome_at}{app.outcome_reason ? `: ${app.outcome_reason}` : ""}</p> : sent ? (outcomeOpen ? (
              <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run("Outcome", () => logOutcome(app.id, String(f.get("outcome")) as any, String(f.get("date")), String(f.get("reason") ?? ""), String(f.get("eventDate") ?? "") || null, f.get("reapply") === "on"), (d) => { setOutcomeOpen(false); if (d?.feedbackDraft) setFeedback(d.feedbackDraft); }); }}>
                <select name="outcome" className={input} defaultValue="accepted" aria-label="Outcome"><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="withdrawn">Withdrawn</option></select>
                <label>Date<input name="date" type="date" className={input} defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                <label>Event date (if accepted)<input name="eventDate" type="date" className={input} defaultValue={app.event_date ?? ""} /></label>
                <label>Reason, if they gave one<input name="reason" className={input} /></label>
                <label className="flex items-center gap-2"><input name="reapply" type="checkbox" className="h-5 w-5" defaultChecked /> Remind me to re-apply next cycle (if declined)</label>
                <div className="flex gap-2"><Button size="sm" type="submit" loading={pending}>Log outcome</Button><Button size="sm" type="button" variant="ghost" onClick={() => setOutcomeOpen(false)}>Cancel</Button></div>
              </form>
            ) : <div><Button size="sm" variant="secondary" onClick={() => setOutcomeOpen(true)}>Log an outcome</Button></div>) : <p className="text-[var(--text-secondary)]">Once sent, log accepted, declined or withdrawn here.</p>}
            {feedback && !app.feedback_requested_at && (
              <div className="flex flex-col gap-2 rounded-[var(--radius)] bg-[var(--surface-2)] p-2">
                <p>Some organizers welcome a one-line feedback request; others do not reply. Your call.</p>
                <p className="font-medium">{feedback.subject}</p><pre className="whitespace-pre-wrap font-[inherit]">{feedback.body}</pre>
                <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(`${feedback.subject}\n\n${feedback.body}`)}>Copy</Button><Button size="sm" variant="ghost" onClick={() => run("Feedback", () => markFeedbackRequested(app.id), () => setFeedback(null))}>I sent it</Button><Button size="sm" variant="ghost" onClick={() => setFeedback(null)}>Skip</Button></div>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-2 t-compact">
            <h2 className="t-section">Authorship</h2>
            <p className="text-[var(--text-secondary)]">For organizers who ask whether AI was used. Counted from what you typed versus AI text you kept.</p>
            {note ? <pre className="whitespace-pre-wrap rounded-[var(--radius)] bg-[var(--surface-2)] p-2 font-[inherit]">{note}</pre> : <div><Button size="sm" variant="ghost" onClick={() => run("Authorship", () => authorshipNoteFor(app.id), (d) => setNote(d.note))}>Show the authorship note</Button></div>}
            <a className="underline" href={`/api/export/application/${app.id}.txt`}>Export this record (text)</a>
          </Card>
        </aside>
      </div>
    </div>
  );
}
const PRODUCT_NOTE = "The app never submits for you and never sends anything to an organizer.";
