"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, DeadlineChip, cx } from "@onebigtalk/ui";
import { removeTarget, reportEvent, saveTarget, trackEvent, watchEvent } from "@/app/(app)/find/events/actions";
import { Gate, gateFor } from "@/components/Gate";
import type { MatchResult } from "@/lib/catalogue/matching";

export interface EventCardData {
  id: string; name: string; city: string | null; country_code: string | null; event_date: string | null; event_type: string; theme: string | null;
  application_status: string; application_deadline: string | null; deadline_time: string | null; deadline_timezone: string | null; deadline_timezone_status: "stated" | "inferred" | "unknown";
  last_verified_at: string | null; source: string; curator_verified: boolean; expired: boolean;
}
export interface MemberState { targeted: boolean; tracked: boolean; watched: boolean }

const STATUS_LABEL: Record<string, string> = { open: "OPEN", announced: "OPENS SOON", rolling: "ROLLING", closed: "CLOSED", nomination: "BY NOMINATION", invitation_only: "INVITATION ONLY", stale: "NOT RE-VERIFIED", unknown: "STATUS UNKNOWN" };

// S3.4 event row: name, place, date, status, deadline chip, match, three "why" lines, one caution, actions.
// Colour never carries a meaning alone; the status is always a word.
export function EventCard({ ev, match, state, showDeadline }: { ev: EventCardData; match: MatchResult | null; state: MemberState; showDeadline: boolean }) {
  const [msg, setMsg] = useState<{ code: string; message: string } | null>(null);
  const [report, setReport] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; code?: string; message?: string }>) => start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work." }); else { setMsg(null); router.refresh(); } });
  const noApply = ["invitation_only", "nomination", "closed"].includes(ev.application_status) || ev.expired;
  const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const verifiedDays = ev.last_verified_at ? Math.floor((Date.now() - new Date(ev.last_verified_at).getTime()) / 86400000) : null;
  return (
    <Card className={cx("flex flex-col gap-2", ev.expired && "opacity-70")} aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Link href={`/find/events/${ev.id}`} className="t-section">{ev.name}</Link>
        <span className="t-compact text-[var(--text-secondary)]">{[ev.city, ev.country_code].filter(Boolean).join(", ")}{ev.event_date ? ` · ${fmt(ev.event_date)}` : ""} · {ev.event_type}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 t-compact">
        <span className={cx("rounded-full border px-2 py-0.5 font-medium", ev.application_status === "open" ? "border-[var(--accent-outline)]" : "border-[var(--border-subtle)] text-[var(--text-secondary)]")}>{ev.expired ? "EVENT CANCELLED OR PAST" : STATUS_LABEL[ev.application_status] ?? ev.application_status}</span>
        {ev.application_deadline && !ev.expired && <DeadlineChip deadline={ev.application_deadline} deadlineTime={ev.deadline_time} organizerTimezone={ev.deadline_timezone} timezoneStatus={ev.deadline_timezone_status} verifiedAt={ev.last_verified_at ?? new Date().toISOString()} sourceType={ev.source === "google_sheet" ? "google_sheet" : "curator"} hidden={!showDeadline} />}
        {verifiedDays !== null && verifiedDays > 60 && <span className="rounded-full border border-[var(--warning-text)] px-2 py-0.5 text-[var(--warning-text)]">verify: last checked {verifiedDays} d ago</span>}
      </div>
      {match && (
        <div className="t-compact">
          <span className="font-medium tabular">Match {Math.min(1, Math.round((match.score / 11.5) * 100) / 100).toFixed(2)}</span>
          <span className="text-[var(--text-secondary)]"> · Why: {match.why.join("; ")}</span>
          {match.caution && <span className="block text-[var(--warning-text)]">Caution: {match.caution}</span>}
        </div>
      )}
      {msg && (gateFor(msg.code, msg.message, "Tracking events") ? <Gate {...gateFor(msg.code, msg.message, "Tracking events")!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="t-compact text-[var(--danger-text)]">{msg.message}</p>)}
      <div className="flex flex-wrap gap-2">
        {!noApply && (state.tracked ? <Link href="/find/applications" className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">Tracked: open application</Link> : <Button size="sm" loading={pending} onClick={() => run(() => trackEvent(ev.id))}>Track</Button>)}
        {state.targeted ? <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => removeTarget(ev.id))}>Saved, remove</Button> : <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => saveTarget(ev.id))}>Save</Button>}
        <Button size="sm" variant="ghost" aria-pressed={state.watched} loading={pending} onClick={() => run(() => watchEvent(ev.id, !state.watched))}>{state.watched ? "Watching" : "Watch"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setReport((v) => !v)}>Report outdated</Button>
      </div>
      {report && (
        <form className="flex flex-col gap-2 rounded-[var(--radius)] bg-[var(--surface-2)] p-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(async () => { const r = await reportEvent(ev.id, String(f.get("kind")) as any, String(f.get("url") ?? ""), String(f.get("note") ?? "")); if (r.ok) setReport(false); return r; }); }}>
          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <select name="kind" className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-compact" aria-label="What is this about"><option value="outdated">Listing is outdated</option><option value="tip">I have a tip or a link</option><option value="pay_to_play">Event asks speakers to pay</option></select>
            <input name="url" inputMode="url" placeholder="Link that shows it (optional)" className="h-11 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-compact" />
          </div>
          <textarea name="note" rows={2} placeholder="What did you see?" className="rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-2 t-compact" />
          <div className="flex gap-2"><Button size="sm" type="submit" loading={pending}>Send to the curators</Button><Button size="sm" type="button" variant="ghost" onClick={() => setReport(false)}>Cancel</Button></div>
        </form>
      )}
    </Card>
  );
}
