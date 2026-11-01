"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@onebigtalk/ui";
import { grantExtension, setPlan, setRole } from "@/app/(app)/admin/actions";
import { Table, td, when, whenTime } from "@/components/admin/ui";

export interface MemberRow { user_id: string; email: string; display_name: string | null; role: string | null; access: string | null; plan: string | null; billing_period: string | null; founding_price: boolean | null; trial_ends_at: string | null; plan_ends_at: string | null; extension_active: boolean | null; region: string | null; stage: string | null; path: string | null; ideas_locked: number; prior_stages: number; applications_sent: number; ready_applications: number; credits_this_month: number; last_activity_at: string | null; created_at: string }

const sel = "h-10 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 t-compact";

export function MembersTable({ rows, query, selected, timeline, allowances }: { rows: MemberRow[]; query: string; selected: string | null; timeline: { at: string; kind: string; label: string }[]; allowances: Record<string, number> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => { setMsg(null); start(async () => { const r = await fn(); if (!r.ok) setMsg(r.message ?? "That didn't work."); else router.refresh(); }); };
  const member = rows.find((r) => r.user_id === selected) ?? null;
  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <form className="flex flex-wrap items-end gap-2" action="/admin/members" method="get">
        <label className="flex flex-col t-metadata">Search by email or name<input name="q" defaultValue={query} className={`${sel} w-64`} /></label>
        <Button size="sm" type="submit" variant="secondary">Search</Button>
        <span className="t-metadata text-[var(--text-muted)]">{rows.length} member{rows.length === 1 ? "" : "s"} shown (newest first)</span>
      </form>
      {msg && <p role="alert" className="t-compact text-[var(--danger-text)]">{msg}</p>}
      <Table head={["Member", "Role", "Plan", "Stage", "Ideas", "Prior stages", "Applications", "Toward 100", "Credits", "Last active", ""]} label="Members">
        {rows.map((r) => (
          <tr key={r.user_id} className={r.user_id === selected ? "bg-[var(--surface-2)]" : undefined}>
            <td className={td}><div>{r.display_name ?? "(no name)"}</div><div className="t-metadata text-[var(--text-muted)]">{r.email}{r.region ? ` · ${r.region}` : ""}</div></td>
            <td className={td}>{r.role ?? "member"}{r.access && r.access !== "active" ? ` (${r.access})` : ""}</td>
            <td className={td}>{r.plan ?? "spark"}{r.billing_period ? ` · ${r.billing_period.replace("_", " ")}` : ""}{r.founding_price ? " · founding" : ""}{r.extension_active ? " · extension" : ""}{r.plan === "spark" && r.trial_ends_at && new Date(r.trial_ends_at) > new Date() ? ` · trial to ${when(r.trial_ends_at)}` : ""}</td>
            <td className={td}>{r.stage ?? ""}{r.path && r.path !== "apply" ? ` (${r.path})` : ""}</td>
            <td className={`${td} tabular`}>{r.ideas_locked}</td>
            <td className={`${td} tabular`}>{r.prior_stages}</td>
            <td className={`${td} tabular`}>{r.applications_sent}</td>
            <td className={`${td} tabular`}>{r.ready_applications} / 100</td>
            <td className={`${td} tabular`}>{r.credits_this_month}</td>
            <td className={td}>{when(r.last_activity_at) || "never"}</td>
            <td className={td}><Link href={`/admin/members?q=${encodeURIComponent(query)}&u=${r.user_id}`} className="underline">Open</Link></td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td className={td} colSpan={11}>No members match.</td></tr>}
      </Table>

      {member && (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="t-section">{member.display_name ?? member.email}</h2><Link href={`/admin/members?q=${encodeURIComponent(query)}`} className="t-compact underline">Close</Link></div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => setRole(member.user_id, String(f.get("role")) as any, String(f.get("access")) as any)); }}>
              <h3 className="t-label text-[var(--text-muted)]">Role and access (A2)</h3>
              <select name="role" defaultValue={member.role ?? "member"} className={sel} aria-label="Role">{["member", "coach", "curator", "admin"].map((x) => <option key={x}>{x}</option>)}</select>
              <select name="access" defaultValue={member.access ?? "active"} className={sel} aria-label="Access">{["invited", "active", "paused", "removed"].map((x) => <option key={x}>{x}</option>)}</select>
              <div><Button size="sm" type="submit" loading={pending}>Save role</Button></div>
            </form>
            <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => setPlan(member.user_id, String(f.get("plan")) as any, (String(f.get("period")) || null) as any, f.get("founding") === "on", String(f.get("ends") || "") || null, String(f.get("note") ?? ""))); }}>
              <h3 className="t-label text-[var(--text-muted)]">Plan assignment (A2)</h3>
              <select name="plan" defaultValue={member.plan ?? "spark"} className={sel} aria-label="Plan">{["spark", "founding", "regular"].map((x) => <option key={x}>{x}</option>)}</select>
              <select name="period" defaultValue={member.billing_period ?? ""} className={sel} aria-label="Billing period"><option value="">no period</option>{["monthly", "six_month", "twelve_month"].map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</select>
              <label className="flex items-center gap-2 t-compact"><input type="checkbox" name="founding" defaultChecked={!!member.founding_price} /> founding price kept for life</label>
              <label className="flex flex-col t-metadata">Ends (optional)<input type="date" name="ends" className={sel} /></label>
              <input name="note" placeholder="Why (goes to the audit log)" className={sel} aria-label="Note" />
              <div><Button size="sm" type="submit" loading={pending}>Save plan</Button></div>
            </form>
            <div className="flex flex-col gap-2">
              <h3 className="t-label text-[var(--text-muted)]">100-applications extension (B4)</h3>
              <p className="t-compact">{member.ready_applications} ready applications sent through the app{member.extension_active ? "; extension active" : ""}.</p>
              <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => grantExtension(member.user_id, String(f.get("until")))); }}>
                <label className="flex flex-col t-metadata">Extend access until<input type="date" name="until" required className={sel} /></label>
                <Button size="sm" type="submit" variant="secondary" loading={pending} disabled={member.ready_applications < 100}>Grant</Button>
              </form>
              {member.ready_applications < 100 && <p className="t-metadata text-[var(--text-muted)]">Grant opens at 100. The count comes from applications marked Ready and sent through the app.</p>}
              <h3 className="t-label text-[var(--text-muted)]">Allowances this month</h3>
              <ul className="t-metadata">{Object.entries(allowances).filter(([k]) => k.endsWith("_used")).map(([k, v]) => <li key={k} className="tabular">{k.replace(/_used$/, "").replace(/_/g, " ")}: {v}{allowances[k.replace(/_used$/, "_allowed")] !== undefined ? ` of ${allowances[k.replace(/_used$/, "_allowed")]}` : ""}</li>)}{Object.keys(allowances).length === 0 && <li>No allowance row yet this month.</li>}</ul>
            </div>
          </div>
          <h3 className="t-label text-[var(--text-muted)]">Talk Record timeline (A3): milestones and activity, no content</h3>
          <ol className="flex max-h-72 flex-col gap-1 overflow-y-auto t-compact">
            {timeline.map((t, i) => <li key={i} className="flex gap-3"><span className="w-32 shrink-0 tabular text-[var(--text-muted)]">{whenTime(t.at)}</span><span className={t.kind === "milestone" ? "font-medium" : ""}>{t.label.replace(/_/g, " ")}</span></li>)}
            {timeline.length === 0 && <li>No activity yet.</li>}
          </ol>
        </Card>
      )}
    </div>
  );
}
