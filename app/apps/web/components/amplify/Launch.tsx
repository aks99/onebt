"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, cx } from "@onebigtalk/ui";
import { datePlanFromLaunch, generateCopyKit, generatePlan, generateUploadPack, saveCopyKit, savePlan, saveUploadPack, setItemDone, setPublication, updateBio, useStandardPlan } from "@/app/(app)/amplify/actions";
import { KIT_BLOCKS, PHASE_LABEL, PUBLICATION, SECOND_TALK_GUARD, bioLine, complianceFlags, dueNow, isOfficialUrl, isRelative, kitText, nextMondayOrTuesday, planProgress, uploadPackChecks, uploadPackText, type CopyKit, type PlanItem, type PublicationState, type UploadPack } from "@/lib/amplify/rules";
import { Gate, gateFor } from "@/components/Gate";

// S6.1 Launch plan and copy kit, with the publication tracker on top and the bio updater at #bio.
// Every block the member edits is checked against the TEDx rules before it is saved; blocking flags refuse the save.

export interface LaunchProps {
  talkId: string; publication: PublicationState; publishedUrl: string | null; publishedAt: string | null; eventName: string; eventDate: string | null; year: number;
  organizerTimeline: string | null; windowStart: string | null; windowEnd: string | null;
  plan: PlanItem[]; kit: CopyKit; pack: UploadPack; displayName: string; hasMemberAccess: boolean; ideaLocked: boolean; publishedTalks: number; todayIso: string;
}
type Msg = { code: string; message: string } | null;

function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard unavailable; the text is on screen */ } }}>{done ? "Copied" : label}</Button>;
}

export function Launch(p: LaunchProps) {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; code?: string; message?: string }>, after?: () => void) => { setMsg(null); start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work." }); else { after?.(); router.refresh(); } }); };
  const gate = msg ? gateFor(msg.code, msg.message, "Launch tools") : null;

  // --- Publication tracker ---
  const [state, setState] = useState<PublicationState>(p.publication);
  const [url, setUrl] = useState(p.publishedUrl ?? "");
  const [timeline, setTimeline] = useState(p.organizerTimeline ?? "");
  const [ws, setWs] = useState(p.windowStart ?? ""); const [we, setWe] = useState(p.windowEnd ?? "");
  const [eventName, setEventName] = useState(p.eventName === "the TEDx event" ? "" : p.eventName);
  const stateCopy = PUBLICATION.find((s) => s.key === state)!;
  const published = p.publication === "published";

  // --- Plan ---
  const [plan, setPlan] = useState<PlanItem[]>(p.plan);
  const [editingPlan, setEditingPlan] = useState(false);
  const progress = planProgress(p.plan);
  const due = dueNow(p.plan, p.todayIso);
  const relative = p.plan.some((i) => isRelative(i.when));
  const [launchDate, setLaunchDate] = useState(nextMondayOrTuesday(new Date(p.todayIso + "T00:00:00Z")));
  const byPhase = useMemo(() => { const m = new Map<string, { item: PlanItem; index: number }[]>(); p.plan.forEach((item, index) => { const k = item.phase; if (!m.has(k)) m.set(k, []); m.get(k)!.push({ item, index }); }); return m; }, [p.plan]);

  // --- Copy kit ---
  const [kit, setKit] = useState<CopyKit>(p.kit);
  const [kitDirty, setKitDirty] = useState(false);
  const kitFlags = useMemo(() => complianceFlags(kitText(kit), { requirePhrase: true }), [kit]);

  // --- Upload pack ---
  const [pack, setPack] = useState<UploadPack>(p.pack);
  const [packDirty, setPackDirty] = useState(false);
  const packChecks = useMemo(() => uploadPackChecks(pack, p.displayName, eventName || p.eventName), [pack, p.displayName, eventName, p.eventName]);

  // --- Bio updater ---
  const [bioIn, setBioIn] = useState({ linkedin_about: "", website_bio: "", signature_line: "" });
  const [bioOut, setBioOut] = useState(p.kit.bio_updates ?? null);

  const ta = "w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-2 t-body";
  const input = "h-10 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 t-compact";

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div>
        <h1 className="t-page-title">Launch</h1>
        <p className="t-compact text-[var(--text-secondary)]">The video is a credibility asset, not a view-count game. Compliance is the feature: official link only, no re-uploads, no logo, and always "an independently organized TEDx event".</p>
      </div>
      {gate ? <Gate {...gate} onNotNow={() => setMsg(null)} /> : msg && <p role="alert" className="t-compact text-[var(--danger-text)]">{msg.message}</p>}

      {/* F4.1 Publication tracker */}
      <Card className="flex flex-col gap-3">
        <h2 className="t-section">Publication</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Publication state">
          {PUBLICATION.map((s) => <button key={s.key} role="radio" aria-checked={state === s.key} onClick={() => setState(s.key)} className={cx("min-h-11 rounded-[var(--radius)] border px-3 t-compact", state === s.key ? "border-[var(--accent-solid)] bg-[var(--surface-2)] font-medium" : "border-[var(--border)]")}>{s.label}</button>)}
        </div>
        <p className="t-compact text-[var(--text-secondary)]">{stateCopy.copy}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col t-metadata">Event name<input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="TEDxYourCity" className={input} /></label>
          <label className="flex flex-col t-metadata">What the organizer said about timing<input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. four to six weeks after the event" className={input} /></label>
          <label className="flex flex-col t-metadata">Expected upload window, from<input type="date" value={ws} onChange={(e) => setWs(e.target.value)} className={input} /></label>
          <label className="flex flex-col t-metadata">to<input type="date" value={we} onChange={(e) => setWe(e.target.value)} className={input} /></label>
          <label className="flex flex-col t-metadata sm:col-span-2">Official link (YouTube or TED){state === "published" && <span className="text-[var(--warning-text)]"> required</span>}<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className={cx(input, url && !isOfficialUrl(url) && "border-[var(--warning-text)]")} inputMode="url" /></label>
        </div>
        {url && !isOfficialUrl(url) && <p className="t-metadata text-[var(--warning-text)]">Only the official upload counts: a youtube.com, youtu.be or ted.com link.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button loading={pending} disabled={state === "published" && !isOfficialUrl(url)} onClick={() => run(() => setPublication(p.talkId, { state, url: url || null, organizerTimeline: timeline || null, windowStart: ws || null, windowEnd: we || null, eventName: eventName || null }))}>Save publication</Button>
          {p.publishedAt && <span className="t-metadata text-[var(--text-muted)]">Link logged {new Date(p.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. The plan and the copy kit carry it.</span>}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* F4.3 Launch plan */}
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="t-section">Launch plan {p.plan.length > 0 && <span className="t-metadata text-[var(--text-muted)]">{progress.done} of {progress.total} done</span>}</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={p.plan.length ? "ghost" : "secondary"} loading={pending} onClick={() => { if (p.plan.length && !confirm("Replace the current plan with the standard plan?")) return; run(() => useStandardPlan(p.talkId)); }}>Standard plan (no credits)</Button>
              <Button size="sm" variant={p.plan.length ? "ghost" : "milestone"} loading={pending} disabled={!p.ideaLocked} onClick={() => { if (p.plan.length && !confirm("Replace the current plan with a personalized one?")) return; run(() => generatePlan(p.talkId)); }}>Personalize (5 credits)</Button>
            </div>
          </div>
          {p.plan.length === 0 && <p className="t-compact text-[var(--text-secondary)]">{published ? "Your talk is published; the first two weeks matter most. Start with the standard plan." : "Log your event date and expected upload window above, then start the plan. Dates stay relative until the official link arrives."}</p>}
          {p.plan.length > 0 && (
            <>
              <div className="h-2 w-full rounded-full bg-[var(--surface-2)]" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Launch plan progress"><div className="h-2 rounded-full bg-[var(--accent-solid)]" style={{ width: `${progress.percent}%` }} /></div>
              {due.length > 0 && <p className="t-compact text-[var(--accent-text)]">{due.length} item{due.length === 1 ? "" : "s"} due now.</p>}
              {relative && (
                <form className="flex flex-wrap items-end gap-2 t-compact" onSubmit={(e) => { e.preventDefault(); run(() => datePlanFromLaunch(p.talkId, launchDate)); }}>
                  <label className="flex flex-col t-metadata">Launch day (a Monday or Tuesday on or after the link)<input type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} className={input} /></label>
                  <Button size="sm" type="submit" variant="secondary" loading={pending} disabled={!published}>Date the plan</Button>
                  {!published && <span className="t-metadata text-[var(--text-muted)]">Dates are set only once the official link is logged.</span>}
                </form>
              )}
              {Array.from(byPhase.entries()).map(([phase, rows]) => (
                <section key={phase} aria-label={PHASE_LABEL[phase as keyof typeof PHASE_LABEL]}>
                  <h3 className="t-label text-[var(--text-muted)]">{PHASE_LABEL[phase as keyof typeof PHASE_LABEL] ?? phase}</h3>
                  <ul className="flex flex-col gap-1">
                    {rows.map(({ item, index }) => (
                      <li key={index} className={cx("flex items-start gap-2 py-1", item.done && "opacity-70")}>
                        <input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0" checked={!!item.done} onChange={(e) => run(() => setItemDone(p.talkId, index, e.target.checked))} aria-label={`Done: ${item.text}`} />
                        <div className="min-w-0">
                          <span className={cx("t-metadata tabular", !item.done && !isRelative(item.when) && item.when <= p.todayIso ? "text-[var(--accent-text)]" : "text-[var(--text-muted)]")}>{isRelative(item.when) ? item.when : new Date(item.when + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</span>
                          {editingPlan ? <textarea value={plan[index]?.text ?? item.text} onChange={(e) => setPlan((pl) => pl.map((x, k) => k === index ? { ...x, text: e.target.value } : x))} rows={2} className={ta} aria-label="Plan item" /> : <p className={cx("t-compact", item.done && "line-through")}>{item.text}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <div className="flex flex-wrap gap-2">
                {!editingPlan ? <Button size="sm" variant="ghost" onClick={() => { setPlan(p.plan); setEditingPlan(true); }}>Edit the wording</Button> : <><Button size="sm" loading={pending} onClick={() => run(() => savePlan(p.talkId, plan), () => setEditingPlan(false))}>Save plan</Button><Button size="sm" variant="ghost" onClick={() => setEditingPlan(false)}>Cancel</Button></>}
              </div>
            </>
          )}
        </Card>

        {/* F4.4 Copy kit */}
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="t-section">Copy kit</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={Object.keys(p.kit).filter((k) => k !== "bio_updates").length ? "ghost" : "milestone"} loading={pending} disabled={!p.ideaLocked} onClick={() => { if (kitDirty && !confirm("Regenerate and lose unsaved edits?")) return; run(() => generateCopyKit(p.talkId), () => setKitDirty(false)); }}>{Object.keys(p.kit).filter((k) => k !== "bio_updates").length ? "Regenerate (15 credits)" : "Write the kit (15 credits)"}</Button>
              {kitDirty && <Button size="sm" loading={pending} disabled={kitFlags.some((f) => f.blocking)} onClick={() => run(() => saveCopyKit(p.talkId, kit), () => setKitDirty(false))}>Save edits</Button>}
              {Object.keys(kit).length > 0 && <Copy text={kitText(kit)} label="Copy all" />}
            </div>
          </div>
          {!p.ideaLocked && <p className="t-compact text-[var(--text-secondary)]">The kit is written from your locked idea. <Link href="/find/idea-lab" className="underline">Lock an idea</Link> first.</p>}
          {kitFlags.length > 0 && (
            <ul role="alert" className="flex flex-col gap-1 rounded-[var(--radius)] border border-[var(--warning-text)] p-2 t-compact">
              {kitFlags.map((f, i) => <li key={i}><strong>{f.rule}</strong>{f.quote ? <>: "{f.quote}"</> : null}. {f.fix}{f.blocking ? " (fix before saving)" : ""}</li>)}
            </ul>
          )}
          {KIT_BLOCKS.map((b) => {
            const v = kit[b.key]; if (v === undefined) return null;
            const text = Array.isArray(v) ? v.join("\n") : typeof v === "string" ? v : "";
            return (
              <div key={b.key} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="t-compact font-medium">{b.label}</span><span className="flex items-center gap-2"><span className="t-metadata text-[var(--text-muted)]">{b.hint}</span><Copy text={text} /></span></div>
                <textarea value={text} rows={Array.isArray(v) ? Math.min(12, v.length + 1) : Math.min(10, Math.max(2, Math.ceil(text.length / 90)))} onChange={(e) => { setKit((k) => ({ ...k, [b.key]: Array.isArray(v) ? e.target.value.split("\n") : e.target.value })); setKitDirty(true); }} className={ta} aria-label={b.label} />
              </div>
            );
          })}
          {Object.keys(kit).filter((k) => k !== "bio_updates").length === 0 && p.ideaLocked && <p className="t-compact text-[var(--text-secondary)]">Email, LinkedIn post, newsletter block, signature line, ten angles, three outreach notes and a bio line, each with the right phrasing and the official link once it exists.</p>}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* F4.2 Upload pack */}
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="t-section">Upload pack for the organizer</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={pack.titles?.length ? "ghost" : "milestone"} loading={pending} disabled={!p.ideaLocked} onClick={() => run(() => generateUploadPack(p.talkId), () => setPackDirty(false))}>{pack.titles?.length ? "Regenerate (5 credits)" : "Write the pack (5 credits)"}</Button>
              {packDirty && <Button size="sm" loading={pending} onClick={() => run(() => saveUploadPack(p.talkId, pack), () => setPackDirty(false))}>Save edits</Button>}
              {pack.titles?.length ? <Copy text={uploadPackText(pack)} label="Copy all" /> : null}
            </div>
          </div>
          <p className="t-compact text-[var(--text-secondary)]">Organizers set the title, description and tags at upload. Send them yours before the event so the talk is named for its idea, not by someone in a hurry.</p>
          {pack.titles?.length ? (
            <>
              {packChecks.length > 0 && <ul className="t-metadata text-[var(--warning-text)]">{packChecks.map((c, i) => <li key={i}>{c}</li>)}</ul>}
              <label className="flex flex-col gap-1 t-compact">Three title options (one per line, 100 characters each at most)<textarea value={(pack.titles ?? []).join("\n")} rows={3} onChange={(e) => { setPack((x) => ({ ...x, titles: e.target.value.split("\n") })); setPackDirty(true); }} className={ta} /></label>
              <label className="flex flex-col gap-1 t-compact">Description (2 to 3 sentences with a hook)<textarea value={pack.description ?? ""} rows={3} onChange={(e) => { setPack((x) => ({ ...x, description: e.target.value })); setPackDirty(true); }} className={ta} /></label>
              <label className="flex flex-col gap-1 t-compact">Bio (4 to 7 sentences)<textarea value={pack.bio ?? ""} rows={5} onChange={(e) => { setPack((x) => ({ ...x, bio: e.target.value })); setPackDirty(true); }} className={ta} /></label>
              <label className="flex flex-col gap-1 t-compact">Five tags (comma separated)<input value={(pack.tags ?? []).join(", ")} onChange={(e) => { setPack((x) => ({ ...x, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })); setPackDirty(true); }} className={input} /></label>
            </>
          ) : null}
        </Card>

        {/* F4.11 Bio updater */}
        <Card id="bio" className="flex flex-col gap-3 scroll-mt-20">
          <h2 className="t-section">Bio updater</h2>
          <p className="t-compact text-[var(--text-secondary)]">Paste what you have now; you get it back with the talk added in the exact phrasing. The line itself: <em>{bioLine(eventName || p.eventName, p.year)}</em> <Copy text={bioLine(eventName || p.eventName, p.year)} /></p>
          <label className="flex flex-col gap-1 t-compact">LinkedIn About (current)<textarea value={bioIn.linkedin_about} rows={4} onChange={(e) => setBioIn((b) => ({ ...b, linkedin_about: e.target.value }))} className={ta} /></label>
          <label className="flex flex-col gap-1 t-compact">Website bio (current)<textarea value={bioIn.website_bio} rows={3} onChange={(e) => setBioIn((b) => ({ ...b, website_bio: e.target.value }))} className={ta} /></label>
          <label className="flex flex-col gap-1 t-compact">Email signature line (current)<input value={bioIn.signature_line} onChange={(e) => setBioIn((b) => ({ ...b, signature_line: e.target.value }))} className={input} /></label>
          <div><Button size="sm" variant="secondary" loading={pending} disabled={!bioIn.linkedin_about && !bioIn.website_bio && !bioIn.signature_line} onClick={() => run(async () => { const r = await updateBio(p.talkId, bioIn); if (r.ok) setBioOut(r.data!); return r; })}>Rewrite with the talk (3 credits{p.hasMemberAccess ? "" : ", one use on the free plan"})</Button></div>
          {bioOut && (["linkedin_about", "website_bio", "signature_line"] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <div className="flex items-center justify-between"><span className="t-compact font-medium">{k === "linkedin_about" ? "LinkedIn About" : k === "website_bio" ? "Website bio" : "Signature line"}</span><Copy text={bioOut[k] ?? ""} /></div>
              <p className="t-body whitespace-pre-wrap rounded-[var(--radius)] bg-[var(--surface-2)] p-2">{bioOut[k]}</p>
            </div>
          ))}
        </Card>
      </div>

      {/* F4.12 Second-talk guard */}
      {p.publishedTalks > 0 && (
        <Card className="flex flex-col gap-2">
          <h2 className="t-section">{SECOND_TALK_GUARD.title}</h2>
          <p className="t-body text-[var(--text-secondary)]">{SECOND_TALK_GUARD.body}</p>
          <div><Link href="/find/idea-lab" className="inline-flex min-h-11 items-center rounded-[var(--radius)] border border-[var(--border)] px-4 t-compact">{SECOND_TALK_GUARD.cta}</Link></div>
        </Card>
      )}
      <p className="t-metadata text-[var(--text-muted)]">Clip plans, quote cards, the press kit, talk stats and outcome capture arrive after launch. Nothing here edits video; you cut any clip with your own tools, 60 seconds at most, tagged to the event's TEDx account.</p>
    </div>
  );
}
