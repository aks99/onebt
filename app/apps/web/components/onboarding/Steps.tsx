"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, cx } from "@onebigtalk/ui";
import { startTalk, logExistingApplication, trackEvent } from "@/app/onboarding/actions";
import { pickIdea } from "@/app/(app)/find/idea-lab/actions";
import { validateThreeQuestions, validateExistingApplication, todayIso, type OnboardingPath, type ThreeQuestions, type ExistingApplication } from "@/lib/onboarding/validate";
import { totalScore, type Scorecard } from "@/lib/find/ideaRules";
import { Gate, gateFor } from "@/components/Gate";

const input = "h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-body";

// S1.1 + S1.2: pick a path, then three questions (plus the invited or published extras).
export function PathAndQuestions({ initialPath }: { initialPath?: OnboardingPath }) {
  const [path, setPath] = useState<OnboardingPath | null>(initialPath ?? null);
  const [q, setQ] = useState<ThreeQuestions>({ expertise: "", city: "", countryCode: "", targetMonth: null });
  const [notSure, setNotSure] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof ThreeQuestions>(k: K, v: ThreeQuestions[K]) => setQ((x) => ({ ...x, [k]: v }));

  if (!path) {
    const options: { key: OnboardingPath; title: string; sub: string }[] = [
      { key: "apply", title: "I want to apply for a stage", sub: "The full journey: one idea, the right events, applications tracked to outcome." },
      { key: "invited", title: "I've been invited to speak", sub: "Fast track to writing: event name, date, slot length." },
      { key: "published", title: "My talk is published", sub: "Launch mode: turn the published talk into assets and reach." },
    ];
    return (
      <div className="flex flex-col gap-4">
        <h1 className="t-page-title">What brings you here?</h1>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((o) => (
            <button key={o.key} onClick={() => setPath(o.key)} className="flex min-h-[120px] flex-col items-start gap-1 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-left hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]">
              <span className="t-section">{o.title}</span><span className="t-compact text-[var(--text-secondary)]">{o.sub}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault(); const errs = validateThreeQuestions(path, q); setErrors(errs); if (Object.keys(errs).length) return;
      start(async () => { const r = await startTalk(path, q); if (!r.ok) { setMsg(r.message); if (r.detail) setErrors(r.detail as Record<string, string>); } else router.refresh(); });
    }}>
      <div><button type="button" className="t-compact text-[var(--text-secondary)] underline" onClick={() => setPath(null)}>← Change path</button></div>
      <h1 className="t-page-title">Three questions</h1>
      <p className="t-compact text-[var(--text-secondary)]">Everything else is asked when it is needed.</p>
      <Field label="Your expertise in one line" error={errors.expertise}><input className={input} value={q.expertise} maxLength={120} onChange={(e) => set("expertise", e.target.value)} placeholder="for example: patient safety in surgical teams" autoFocus /></Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label="City" error={errors.city}><input className={input} value={q.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Country" error={errors.countryCode}><input className={input} value={q.countryCode} maxLength={2} placeholder="two letters, e.g. US" onChange={(e) => set("countryCode", e.target.value.toUpperCase())} /></Field>
      </div>
      <Field label="When would you like to give the talk?" error={errors.targetMonth}>
        <div className="flex flex-wrap items-center gap-3">
          <input type="month" className={cx(input, "sm:w-56")} disabled={notSure} value={q.targetMonth ?? ""} onChange={(e) => set("targetMonth", e.target.value || null)} />
          <label className="flex items-center gap-2 t-compact"><input type="checkbox" checked={notSure} onChange={(e) => { setNotSure(e.target.checked); if (e.target.checked) set("targetMonth", null); }} className="h-5 w-5" /> Not sure yet</label>
        </div>
      </Field>
      {path === "invited" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Event name" error={errors.eventName}><input className={input} value={q.eventName ?? ""} onChange={(e) => set("eventName", e.target.value)} /></Field>
          <Field label="Event date" error={errors.eventDate}><input type="date" className={input} value={q.eventDate ?? ""} onChange={(e) => set("eventDate", e.target.value)} /></Field>
          <Field label="Slot length (minutes)" error={errors.slotMinutes}><input type="number" min={3} max={18} className={input} value={q.slotMinutes ?? ""} onChange={(e) => set("slotMinutes", Number(e.target.value))} /></Field>
        </div>
      )}
      {path === "published" && <Field label="Link to the published talk" error={errors.publishedUrl}><input className={input} inputMode="url" value={q.publishedUrl ?? ""} onChange={(e) => set("publishedUrl", e.target.value)} placeholder="https://" /></Field>}
      {msg && <p role="alert" className="t-compact text-[var(--danger-text)]">{msg}</p>}
      <div><Button type="submit" loading={pending}>Continue</Button></div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 t-compact">{label}{children}{error && <span role="alert" className="text-[var(--danger-text)]">{error}</span>}</label>;
}

export interface MatchRow { id: string; name: string; city: string | null; country_code: string | null; theme: string | null; application_deadline: string | null; event_date: string | null; reasons: string[]; tracked: boolean }
export interface OnboardingIdea { id: string; title_working: string | null; throughline: string | null; score: Scorecard | null }

// S1.4: pick one idea (no lock yet), see three matches, track, log applications already sent.
export function PickAndMatch({ talkId, ideas, matches, showDeadlines, path }: { talkId: string; ideas: OnboardingIdea[]; matches: MatchRow[]; showDeadlines: boolean; path: OnboardingPath }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ code: string; message: string } | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const days = (iso: string) => Math.ceil((new Date(iso + "T00:00:00Z").getTime() - Date.now()) / 86400000);
  return (
    <div className="flex flex-col gap-6" aria-busy={pending || undefined}>
      <section className="flex flex-col gap-3">
        <h1 className="t-page-title">Five ideas, scored. Pick the one you would fight for.</h1>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ideas.map((i) => { const t = totalScore(i.score); const sel = picked === i.id; return (
            <li key={i.id}><Card className={cx("flex h-full flex-col gap-2", sel && "border-[var(--accent-outline)]")}>
              <div className="flex items-center justify-between"><span className="t-metadata text-[var(--ai-text)]">AI draft</span>{t && <span className="t-compact tabular">Score {t.total}/{t.max}</span>}</div>
              <h2 className="t-section">{i.title_working}</h2><p className="t-compact text-[var(--text-secondary)]">{i.throughline}</p>
              <div className="mt-auto flex gap-2 pt-2">
                <Button size="sm" variant={sel ? "milestone" : "secondary"} onClick={() => start(async () => { const r = await pickIdea(i.id); if (r.ok) setPicked(i.id); else setMsg(r); })}>{sel ? "Picked" : "Pick this"}</Button>
                <a href={`/find/idea-lab/${i.id}`} className="inline-flex h-9 items-center px-2 t-compact underline-offset-2 hover:underline">Why this</a>
              </div>
            </Card></li>); })}
        </ul>
        <p className="t-metadata text-[var(--text-muted)]">Picking marks your preference. Locking happens in the Idea Lab once the scorecard says it is ready.</p>
      </section>

      {path === "apply" && (
        <section className="flex flex-col gap-3">
          <h2 className="t-title">Three events that match</h2>
          {matches.length === 0 ? <Card><p className="t-compact text-[var(--text-secondary)]">No open calls in the catalogue right now. New events arrive every week; the Event Finder will show them.</p></Card> : (
            <ul className="flex flex-col gap-2">
              {matches.map((m) => (
                <li key={m.id}><Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="t-section">{m.name} <span className="t-compact text-[var(--text-secondary)]">{[m.city, m.country_code].filter(Boolean).join(", ")}</span></span>
                    <span className="t-compact text-[var(--text-secondary)]">Why: {m.reasons.join("; ")}</span>
                    {m.application_deadline && <span className="t-compact tabular">{showDeadlines ? `Deadline ${new Date(m.application_deadline + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} (${days(m.application_deadline)} days)` : `Deadline in ${days(m.application_deadline)} days (members see the date)`}</span>}
                  </div>
                  <Button size="sm" variant={m.tracked ? "ghost" : "secondary"} disabled={m.tracked} onClick={() => start(async () => { const r = await trackEvent(talkId, m.id); if (!r.ok) setMsg(r); else router.refresh(); })}>{m.tracked ? "Tracked" : "Track"}</Button>
                </Card></li>
              ))}
            </ul>
          )}
          {msg && (gateFor(msg.code, msg.message, "Tracking events") ? <Gate {...gateFor(msg.code, msg.message, "Tracking events")!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="t-compact text-[var(--danger-text)]">{msg.message}</p>)}
          <Card className="flex flex-col gap-2">
            <h3 className="t-section">Already applied somewhere?</h3>
            <p className="t-compact text-[var(--text-secondary)]">Log each one in under a minute so your path and pipeline are right from day one.</p>
            {logOpen ? <ExistingApplicationForm talkId={talkId} onDone={() => { setLogOpen(false); router.refresh(); }} /> : <div><Button size="sm" variant="secondary" onClick={() => setLogOpen(true)}>Log an application I sent</Button></div>}
          </Card>
        </section>
      )}

      <div><a href="/onboarding?step=expect" className="inline-flex h-11 items-center rounded-[var(--radius)] bg-[var(--primary)] px-5 font-medium text-[var(--primary-foreground)]">Continue</a></div>
    </div>
  );
}

export function ExistingApplicationForm({ talkId, onDone }: { talkId: string; onDone: () => void }) {
  const [a, setA] = useState<ExistingApplication>({ eventName: "", appliedAt: todayIso(), followUpAt: "", outcome: "waiting", eventDate: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ExistingApplication>(k: K, v: ExistingApplication[K]) => setA((x) => ({ ...x, [k]: v }));
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const errs = validateExistingApplication(a); setErrors(errs); if (Object.keys(errs).length) return;
      start(async () => { const r = await logExistingApplication(talkId, a); if (!r.ok) { setMsg(r.message); if (r.detail) setErrors(r.detail as Record<string, string>); } else onDone(); }); }}>
      <Field label="Event" error={errors.eventName}><input className={input} value={a.eventName} onChange={(e) => set("eventName", e.target.value)} placeholder="TEDx event name" /></Field>
      <Field label="Applied on" error={errors.appliedAt}><input type="date" className={input} value={a.appliedAt} max={todayIso()} onChange={(e) => set("appliedAt", e.target.value)} /></Field>
      <Field label="Follow-up date (optional)" error={errors.followUpAt}><input type="date" className={input} value={a.followUpAt ?? ""} onChange={(e) => set("followUpAt", e.target.value)} /></Field>
      <Field label="Outcome so far"><select className={input} value={a.outcome} onChange={(e) => set("outcome", e.target.value as ExistingApplication["outcome"])}><option value="waiting">Waiting to hear</option><option value="interview">Interview</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></Field>
      <Field label="Event date (optional)" error={errors.eventDate}><input type="date" className={input} value={a.eventDate ?? ""} onChange={(e) => set("eventDate", e.target.value)} /></Field>
      {msg && <p role="alert" className="t-compact text-[var(--danger-text)] sm:col-span-2">{msg}</p>}
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" size="sm" loading={pending}>Save</Button><Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
    </form>
  );
}
