"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, StatusBadge, type PipelineStatus } from "@onebigtalk/ui";
import { removeTarget, trackEvent, updateTarget } from "@/app/(app)/find/events/actions";

export interface TargetData { eventId: string; priority: number; note: string | null; name: string; city: string | null; country_code: string | null; event_date: string | null; application_status: string; application_deadline: string | null; expired: boolean; appStatus: string | null }

export function TargetRow({ t, showDeadline }: { t: TargetData; showDeadline: boolean }) {
  const [note, setNote] = useState(t.note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => { const r = await fn(); setMsg(r.ok ? null : r.message ?? "That didn't work."); if (r.ok) router.refresh(); });
  const days = t.application_deadline ? Math.ceil((new Date(t.application_deadline + "T00:00:00Z").getTime() - Date.now()) / 86400000) : null;
  return (
    <Card className="flex flex-col gap-2" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={`/find/events/${t.eventId}`} className="t-section">{t.name}</Link>
        <span className="t-compact text-[var(--text-secondary)]">{[t.city, t.country_code].filter(Boolean).join(", ")}{t.event_date ? ` · ${t.event_date}` : ""}{t.expired ? " · event cancelled or past" : ""}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 t-compact">
        <label className="flex items-center gap-1">Priority
          <select value={t.priority} onChange={(e) => run(() => updateTarget(t.eventId, { priority: Number(e.target.value) }))} className="h-9 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2" aria-label={`Priority for ${t.name}`}><option value={1}>1 apply first</option><option value={2}>2 soon</option><option value={3}>3 maybe</option></select>
        </label>
        <span>call {t.application_status.replace("_", " ")}</span>
        {days !== null && <span className="tabular">{days >= 0 ? `${days} d to deadline` : "deadline passed"}{showDeadline ? ` (${t.application_deadline})` : ""}</span>}
        {t.appStatus && <StatusBadge status={t.appStatus as PipelineStatus} />}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => { if (note !== (t.note ?? "")) run(() => updateTarget(t.eventId, { note })); }} placeholder="Private note" className="h-11 flex-1 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-compact" aria-label={`Note for ${t.name}`} />
        <div className="flex gap-2">
          {!t.appStatus && !t.expired && !["invitation_only", "nomination", "closed"].includes(t.application_status) && <Button size="sm" loading={pending} onClick={() => run(() => trackEvent(t.eventId))}>Track</Button>}
          <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => removeTarget(t.eventId))}>Remove</Button>
        </div>
      </div>
      {msg && <p role="alert" className="t-compact text-[var(--danger-text)]">{msg}</p>}
    </Card>
  );
}
