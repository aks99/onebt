"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@onebigtalk/ui";
import { runFactcheck, updateClaim } from "@/app/(app)/write/actions";
import { CLAIM_STATUS_LABEL } from "@/lib/write/rules";
import { Gate, gateFor } from "@/components/Gate";

export interface ClaimItem { id: string; section_id: string | null; text: string; claim_type: string | null; risk: string | null; status: string; source_url: string | null; note: string | null; r5_flag: boolean; overclaim_flag: boolean }

// F2.8 Fact-check Flagger: every checkable claim with a status the member sets; exports for organizers.
export function FactcheckPanel({ versionId, version, claims, sections, numbersInScript }: { versionId: string; version: number; claims: ClaimItem[]; sections: { id: string; title: string }[]; numbersInScript: string[] }) {
  const [msg, setMsg] = useState<{ code: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; code?: string; message?: string }>) => { setMsg(null); start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work." }); else router.refresh(); }); };
  const title = (id: string | null) => sections.find((s) => s.id === id)?.title ?? "Other";
  const covered = numbersInScript.filter((n) => claims.some((c) => c.text.includes(n)));
  const input = "h-10 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 t-compact";
  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="t-page-title">Fact-check</h1><p className="t-compact text-[var(--text-secondary)]">Version {version}. Every number, study, named person, historical fact, causal claim and health statement, with a status you set. The flagger does not verify; you do. Fact-checking takes 2 to 12 hours. "Cure" and "heal" must become "reduce the risk of".</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={pending} onClick={() => run(() => runFactcheck(versionId))}>{claims.length ? "Re-run the flagger" : "Find the claims"}</Button>
          {claims.length > 0 && <><a href={`/api/export/factcheck/${versionId}.pdf`} className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">Annotated PDF</a><a href={`/api/export/factcheck/${versionId}.txt`} className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">Text</a></>}
        </div>
      </div>
      {msg && (gateFor(msg.code, msg.message, "Fact-check") ? <Gate {...gateFor(msg.code, msg.message, "Fact-check")!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="t-compact text-[var(--danger-text)]">{msg.message}</p>)}
      {numbersInScript.length > 0 && <p className="t-compact text-[var(--text-secondary)]">{numbersInScript.length} number{numbersInScript.length === 1 ? "" : "s"} in the script, {covered.length} in the claim list{covered.length < numbersInScript.length ? `; check: ${numbersInScript.filter((n) => !covered.includes(n)).slice(0, 8).join(", ")}` : ""}.</p>}
      {claims.length === 0 ? <Card><p className="t-body text-[var(--text-secondary)]">No claims listed yet.</p></Card> : (
        <ul className="flex flex-col gap-2">
          {claims.map((c) => (
            <li key={c.id}><Card className="flex flex-col gap-2 t-compact">
              <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="t-body">{c.text}</span><span className="text-[var(--text-muted)]">{title(c.section_id)} · {c.claim_type ?? "claim"}{c.risk ? ` · ${c.risk} risk` : ""}</span></div>
              <div className="flex flex-wrap gap-2">{c.r5_flag && <span className="rounded-full border border-[var(--danger-text)] px-2 text-[var(--danger-text)]">R5 health wording: change "cure" or "heal" to "reduce the risk of"</span>}{c.overclaim_flag && <span className="rounded-full border border-[var(--warning-text)] px-2 text-[var(--warning-text)]">overclaim word: narrow it</span>}</div>
              <div className="grid gap-2 sm:grid-cols-[200px_1fr_1fr]">
                <select value={c.status} onChange={(e) => run(() => updateClaim(c.id, { status: e.target.value }))} className={input} aria-label="Claim status">{Object.entries(CLAIM_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <input defaultValue={c.source_url ?? ""} placeholder="Source link" inputMode="url" onBlur={(e) => { if ((e.target.value || null) !== c.source_url) run(() => updateClaim(c.id, { source_url: e.target.value || null, ...(e.target.value && c.status === "needs_source" ? { status: "source_added" } : {}) })); }} className={input} aria-label="Source" />
                <input defaultValue={c.note ?? ""} placeholder="What a fact-checker would ask, or your note" onBlur={(e) => { if ((e.target.value || null) !== c.note) run(() => updateClaim(c.id, { note: e.target.value || null })); }} className={input} aria-label="Note" />
              </div>
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}
