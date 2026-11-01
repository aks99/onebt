"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@onebigtalk/ui";
import { acceptHighConfidence, acceptTags, decide, keepBoth, mergeEvents, requestRemoval, resolveReport, saveSheetSource, suggestTags, syncNow, uploadCsv, verifyEvent } from "@/app/(app)/curate/actions";

const input = "h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-body";
type Msg = { ok: boolean; text: string } | null;

function useRun() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; data?: unknown }>, okText: (d: any) => string) =>
    start(async () => { const r = await fn(); setMsg(r.ok ? { ok: true, text: okText(r.data) } : { ok: false, text: r.message ?? "That didn't work." }); if (r.ok) router.refresh(); });
  return { pending, msg, run };
}
function Note({ msg }: { msg: Msg }) { return msg ? <p role={msg.ok ? "status" : "alert"} className={`t-compact ${msg.ok ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"}`}>{msg.text}</p> : null; }

// Sources tab (S8.3 v1.1): the Google Sheet the app syncs from, the service account, Sync now, CSV fallback.
export function SourcesPanel({ source, serviceAccountEmail }: { source: { id: string; label: string; google_sheet_id: string | null; events_tab: string; organizers_tab: string; calls_tab: string; last_synced_at: string | null; last_status: string | null; schedule_cron: string | null } | null; serviceAccountEmail: string | null }) {
  const [v, setV] = useState({ sheetUrlOrId: source?.google_sheet_id ?? "", eventsTab: source?.events_tab ?? "events", organizersTab: source?.organizers_tab ?? "organizers", callsTab: source?.calls_tab ?? "application_calls", label: source?.label ?? "Owner sheet" });
  const { pending, msg, run } = useRun();
  const fileForm = useRef<HTMLFormElement>(null);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="flex flex-col gap-3">
        <h2 className="t-section">Google Sheet</h2>
        <p className="t-compact text-[var(--text-secondary)]">The app reads this sheet every week (Monday 06:00 UTC) and whenever you press Sync now. Rows marked <code>curator_verified = yes</code> publish to members; the rest go to the Verify queue. A row removed from the sheet is expired, never deleted.</p>
        <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); run(() => saveSheetSource(v), () => "Source saved."); }}>
          <label className="t-compact">Sheet link or id<input className={input} value={v.sheetUrlOrId} onChange={(e) => setV({ ...v, sheetUrlOrId: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/..." /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="t-compact">Events tab<input className={input} value={v.eventsTab} onChange={(e) => setV({ ...v, eventsTab: e.target.value })} /></label>
            <label className="t-compact">Organizers tab<input className={input} value={v.organizersTab} onChange={(e) => setV({ ...v, organizersTab: e.target.value })} /></label>
            <label className="t-compact">Calls tab<input className={input} value={v.callsTab} onChange={(e) => setV({ ...v, callsTab: e.target.value })} /></label>
          </div>
          <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" loading={pending}>Save source</Button>{source && <Button type="button" size="sm" variant="milestone" loading={pending} onClick={() => run(() => syncNow(source.id), (d) => `Synced: ${d.summary.new} new, ${d.summary.changed} changed, ${d.summary.expired} expired, ${d.pending} waiting for review.`)}>Sync now</Button>}</div>
        </form>
        <dl className="grid grid-cols-[120px_1fr] gap-y-1 t-compact">
          <dt className="text-[var(--text-muted)]">Share with</dt><dd className="break-all">{serviceAccountEmail ?? "Service account not configured (GOOGLE_SERVICE_ACCOUNT_JSON)."}</dd>
          <dt className="text-[var(--text-muted)]">Last synced</dt><dd>{source?.last_synced_at ? new Date(source.last_synced_at).toLocaleString("en-GB") : "never"}</dd>
          <dt className="text-[var(--text-muted)]">Status</dt><dd>{source?.last_status ?? "not yet run"}</dd>
          <dt className="text-[var(--text-muted)]">Schedule</dt><dd>weekly ({source?.schedule_cron ?? "0 6 * * 1"})</dd>
        </dl>
        <Note msg={msg} />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="t-section">CSV upload (fallback)</h2>
        <p className="t-compact text-[var(--text-secondary)]">The three files from one crawler run folder. Same diff, dedup and verify pipeline.</p>
        <form ref={fileForm} className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); run(() => uploadCsv(fd), (d) => `Imported: ${d.summary.new} new, ${d.summary.changed} changed, ${d.pending} waiting for review, ${d.problems} row problems.`); }}>
          <label className="t-compact">Run label<input name="label" className={input} placeholder="2026-11-02 incremental" /></label>
          <label className="t-compact">events.csv<input name="events" type="file" accept=".csv,text/csv" className="block w-full t-compact" /></label>
          <label className="t-compact">organizers.csv<input name="organizers" type="file" accept=".csv,text/csv" className="block w-full t-compact" /></label>
          <label className="t-compact">application_calls.csv<input name="calls" type="file" accept=".csv,text/csv" className="block w-full t-compact" /></label>
          <div><Button type="submit" size="sm" variant="secondary" loading={pending}>Import files</Button></div>
        </form>
      </Card>
    </div>
  );
}

export interface DiffRow { id: number; entity: string; record_key: string; field: string; before: unknown; after: unknown; confidence: number | null; status: string; name?: string | null }
export function DiffPanel({ runId, rows }: { runId: string | null; rows: DiffRow[] }) {
  const { pending, msg, run } = useRun();
  const fmt = (v: unknown) => v === null || v === undefined ? "(none)" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-section">Pending changes {rows.length ? `(${rows.length})` : ""}</h2>
        {runId && rows.length > 0 && <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => acceptHighConfidence(runId), (d) => `Accepted ${d.accepted} high-confidence changes.`)}>Accept all high-confidence</Button>}
      </div>
      <Note msg={msg} />
      {rows.length === 0 ? <p className="t-compact text-[var(--text-secondary)]">Nothing waiting. Verified rows and high-confidence changes were applied on import.</p> : (
        <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 t-compact">
                <span className="font-medium">{r.name ?? r.record_key}</span> <span className="text-[var(--text-muted)]">{r.entity}</span><br />
                {r.field === "*" ? <span>NEW record{r.confidence != null ? ` · confidence ${r.confidence}` : ""}</span> : <span><span className="text-[var(--text-muted)]">{r.field}</span> {fmt(r.before)} → <strong>{fmt(r.after)}</strong>{r.confidence != null ? <span className="text-[var(--text-muted)]"> · {r.confidence}</span> : null}</span>}
              </div>
              <div className="flex shrink-0 gap-2"><Button size="sm" onClick={() => run(() => decide(r.id, true), () => "Accepted.")} aria-label={`Accept ${r.field} for ${r.record_key}`}>Accept</Button><Button size="sm" variant="ghost" onClick={() => run(() => decide(r.id, false), () => "Rejected.")} aria-label={`Reject ${r.field} for ${r.record_key}`}>Reject</Button></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export interface VerifyRow { id: string; name: string; city: string | null; country_code: string | null; event_date: string | null; application_status: string; application_deadline: string | null; curator_verified: boolean; needs_review: boolean; confidence: number | null; last_verified_at: string | null; interest: number; stale_days: number; event_url: string | null; form_url: string | null; status_source_url: string | null }
const STATUSES = ["open", "announced", "rolling", "closed", "nomination", "invitation_only", "stale", "unknown"];
export function VerifyPanel({ rows }: { rows: VerifyRow[] }) {
  const { pending, msg, run } = useRun();
  const [edit, setEdit] = useState<Record<string, { status: string; deadline: string; note: string }>>({});
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="t-section">Verify queue ({rows.length})</h2>
      <p className="t-compact text-[var(--text-secondary)]">Sorted by staleness and member interest. Open the organizer's page, then confirm the status and deadline you saw. A status is a fact with a source; a model never sets one.</p>
      <Note msg={msg} />
      <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
        {rows.map((r) => { const e = edit[r.id] ?? { status: r.application_status, deadline: r.application_deadline ?? "", note: "" }; return (
          <li key={r.id} className="flex flex-col gap-2 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 t-compact">
              <span><strong>{r.name}</strong> · {r.city}{r.country_code ? `, ${r.country_code}` : ""} · {r.event_date ?? "date unknown"}</span>
              <span className="text-[var(--text-muted)]">{r.curator_verified ? "verified" : "unverified"} · {r.stale_days} d since check · interest {r.interest}{r.confidence != null ? ` · confidence ${r.confidence}` : ""}</span>
            </div>
            <div className="flex flex-wrap gap-2 t-compact">
              {r.event_url && <a className="underline" href={r.event_url} target="_blank" rel="noreferrer">event page</a>}
              {r.form_url && <a className="underline" href={r.form_url} target="_blank" rel="noreferrer">application form</a>}
              {r.status_source_url && <a className="underline" href={r.status_source_url} target="_blank" rel="noreferrer">status source</a>}
            </div>
            <div className="grid gap-2 sm:grid-cols-[160px_160px_1fr_auto]">
              <select className={input} value={e.status} onChange={(ev) => setEdit({ ...edit, [r.id]: { ...e, status: ev.target.value } })} aria-label="Call status">{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
              <input type="date" className={input} value={e.deadline} onChange={(ev) => setEdit({ ...edit, [r.id]: { ...e, deadline: ev.target.value } })} aria-label="Deadline" />
              <input className={input} value={e.note} onChange={(ev) => setEdit({ ...edit, [r.id]: { ...e, note: ev.target.value } })} placeholder="what you checked (kept in the audit log)" aria-label="Note" />
              <Button size="sm" loading={pending} onClick={() => run(() => verifyEvent(r.id, e.status, e.deadline || null, e.note), () => `${r.name} verified.`)}>Verified</Button>
            </div>
          </li>
        ); })}
      </ul>
    </Card>
  );
}

export interface DedupRow { id: string; name: string; city: string | null; event_date: string | null; candidate_id: string; candidate_name: string; candidate_city: string | null; candidate_date: string | null; similarity: number; km: number | null; days_apart: number | null }
export function DedupPanel({ rows }: { rows: DedupRow[] }) {
  const { pending, msg, run } = useRun();
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="t-section">Possible duplicates ({rows.length})</h2>
      <p className="t-compact text-[var(--text-secondary)]">Similar normalized name, same area, dates within 60 days. Merging moves watches, targets and applications to the kept event and expires the other.</p>
      <Note msg={msg} />
      <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
        {rows.map((r) => (
          <li key={`${r.id}-${r.candidate_id}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between t-compact">
            <div><strong>{r.name}</strong> ({r.city}, {r.event_date ?? "?"}) and <strong>{r.candidate_name}</strong> ({r.candidate_city}, {r.candidate_date ?? "?"})<br /><span className="text-[var(--text-muted)]">name similarity {Math.round(r.similarity * 100)}%{r.km != null ? ` · ${Math.round(r.km)} km apart` : ""}{r.days_apart != null ? ` · ${r.days_apart} days apart` : ""}</span></div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" loading={pending} onClick={() => run(() => mergeEvents(r.id, r.candidate_id), () => "Merged.")}>Keep first, merge second</Button>
              <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => mergeEvents(r.candidate_id, r.id), () => "Merged.")}>Keep second</Button>
              <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => keepBoth(r.candidate_id), () => "Kept both.")}>Keep both</Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export interface OrganizerRow { id: string; name: string; website_domain: string | null; city: string | null; country_code: string | null; removal_requested_at: string | null; removal_due_at: string | null; contact: { public_contact_email: string | null; public_contact_role: string | null; contact_source_url: string; contact_seen_at: string; lawful_basis_note: string } | null; events: number }
export function OrganizersPanel({ rows }: { rows: OrganizerRow[] }) {
  const { pending, msg, run } = useRun();
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="t-section">Organizers ({rows.length})</h2>
      <p className="t-compact text-[var(--text-secondary)]">Contact details are stored only when the organizer posted them publicly, with the source and the date. Members never see this table. A removal request is honoured within 7 days; the contact row is deleted at once.</p>
      <Note msg={msg} />
      <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
        {rows.map((o) => (
          <li key={o.id} className="flex flex-col gap-1 py-3 t-compact sm:flex-row sm:items-start sm:justify-between">
            <div>
              <strong>{o.name}</strong> {o.website_domain && <a className="underline" href={`https://${o.website_domain}`} target="_blank" rel="noreferrer">{o.website_domain}</a>} <span className="text-[var(--text-muted)]">· {o.city ?? ""}{o.country_code ? `, ${o.country_code}` : ""} · {o.events} event{o.events === 1 ? "" : "s"}</span><br />
              {o.contact ? <span>{o.contact.public_contact_email ?? "form only"}{o.contact.public_contact_role ? ` (${o.contact.public_contact_role})` : ""} · <a className="underline" href={o.contact.contact_source_url} target="_blank" rel="noreferrer">source</a> · seen {new Date(o.contact.contact_seen_at).toLocaleDateString("en-GB")} · {o.contact.lawful_basis_note}</span> : <span className="text-[var(--text-muted)]">no public contact stored</span>}
              {o.removal_requested_at && <span className="block text-[var(--warning-text)]">Removal requested {new Date(o.removal_requested_at).toLocaleDateString("en-GB")}; due {o.removal_due_at ? new Date(o.removal_due_at).toLocaleDateString("en-GB") : ""}.</span>}
            </div>
            <div className="shrink-0">{o.removal_requested_at ? <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => requestRemoval(o.id, false), () => "Request cleared.")}>Clear request</Button> : <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => requestRemoval(o.id, true), () => "Removal recorded; contact deleted.")}>Organizer asked to be removed</Button>}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export interface TicketRow { id: string; kind: string; url: string | null; note: string | null; created_at: string; event_name: string | null; event_id: string | null }
export function TicketsPanel({ rows }: { rows: TicketRow[] }) {
  const { pending, msg, run } = useRun();
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="t-section">Tickets ({rows.length})</h2>
      <p className="t-compact text-[var(--text-secondary)]">Member reports (outdated, tip, pay-to-play). Resolve after you have checked the organizer's page; the member's tip is credited in their activity.</p>
      <Note msg={msg} />
      <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
        {rows.map((t) => (
          <li key={t.id} className="flex flex-col gap-1 py-3 t-compact sm:flex-row sm:items-start sm:justify-between">
            <div><strong>{t.kind.replace("_", " ")}</strong> · {t.event_name ?? "no event"} · {new Date(t.created_at).toLocaleDateString("en-GB")}<br />{t.note}{t.url && <> · <a className="underline" href={t.url} target="_blank" rel="noreferrer">link</a></>}</div>
            <div className="flex shrink-0 gap-2"><Button size="sm" loading={pending} onClick={() => run(() => resolveReport(t.id, "resolved"), () => "Resolved.")}>Resolved</Button><Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => resolveReport(t.id, "dismissed"), () => "Dismissed.")}>Dismiss</Button></div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export interface TagRow { event_id: string; name: string; theme: string | null; tags: { tag: string; accepted: boolean }[] }
export function TagsPanel({ rows }: { rows: TagRow[] }) {
  const { pending, msg, run } = useRun();
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="t-section">Theme tags</h2><Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => suggestTags(20), (d) => `Suggested tags for ${d.tagged} events.`)}>Suggest for 20 untagged events</Button></div>
      <p className="t-compact text-[var(--text-secondary)]">Haiku suggests from a controlled vocabulary; you accept. Tags feed the match ranking. Suggestions never change a status or a deadline.</p>
      <Note msg={msg} />
      <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
        {rows.map((r) => { const sel = picked[r.event_id] ?? new Set(r.tags.map((t) => t.tag)); return (
          <li key={r.event_id} className="flex flex-col gap-2 py-3 t-compact">
            <div><strong>{r.name}</strong> <span className="text-[var(--text-muted)]">theme: {r.theme ?? "none"}</span></div>
            <div className="flex flex-wrap gap-2">
              {r.tags.map((t) => <button key={t.tag} type="button" aria-pressed={sel.has(t.tag)} onClick={() => { const n = new Set(sel); if (n.has(t.tag)) n.delete(t.tag); else n.add(t.tag); setPicked({ ...picked, [r.event_id]: n }); }}
                className={`h-9 rounded-full border px-3 ${sel.has(t.tag) ? "border-[var(--accent-outline)] bg-[var(--surface-2)]" : "border-[var(--border-subtle)] text-[var(--text-muted)]"}`}>{t.tag}</button>)}
              <Button size="sm" loading={pending} onClick={() => run(() => acceptTags(r.event_id, Array.from(sel)), () => "Tags accepted.")}>Accept selected</Button>
            </div>
          </li>
        ); })}
      </ul>
    </Card>
  );
}
