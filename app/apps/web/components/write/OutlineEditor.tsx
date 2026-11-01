"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, cx } from "@onebigtalk/ui";
import { finalizeOutline, generateOutline, reopenOutline, saveOutline } from "@/app/(app)/write/actions";
import { formatClock, storyConsentProblems, type OutlineDoc, type OutlineSection, type TalkingPoint } from "@/lib/write/rules";
import { Gate, gateFor } from "@/components/Gate";

export interface OutlineVersionRow { id: string; version: number; status: "draft" | "final"; source: string; created_at: string; finalized_at: string | null }

const KINDS = ["hook", "care", "idea", "evidence", "implication", "cta", "close"] as const;
const POINT_KINDS = ["claim", "example", "number", "story", "to_find"] as const;
const CONSENT = [["not_a_story", "not a story"], ["named_with_permission", "named, with permission"], ["pseudonymized", "pseudonymized"], ["composite", "composite, said so on stage"]] as const;

// S4.2 Outline Builder: every line editable in place, reorder, add or delete points, running time total,
// story consent chips, Finalize. Editing saves a new user version; history is kept.
export function OutlineEditor({ talkId, versionId, doc: initial, status, versions, slotMinutes, hasBrief, outlinesLeft, hasScript }: { talkId: string; versionId: string | null; doc: OutlineDoc | null; status: "draft" | "final" | null; versions: OutlineVersionRow[]; slotMinutes: number; hasBrief: boolean; outlinesLeft: number | null; hasScript: boolean }) {
  const [doc, setDoc] = useState<OutlineDoc | null>(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ code: string; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const final = status === "final";
  const total = doc?.sections.reduce((n, s) => n + (s.target_seconds || 0), 0) ?? 0;
  const slot = slotMinutes * 60;
  const consentIssues = doc ? storyConsentProblems(doc) : [];

  const run = (fn: () => Promise<{ ok: boolean; code?: string; message?: string }>) => { setMsg(null); start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work." }); else { setDirty(false); router.refresh(); } }); };
  const update = (fn: (d: OutlineDoc) => OutlineDoc) => { if (!doc || final) return; setDoc(fn(doc)); setDirty(true); };
  const setSection = (i: number, patch: Partial<OutlineSection>) => update((d) => ({ sections: d.sections.map((s, k) => k === i ? { ...s, ...patch } : s) }));
  const setPoint = (i: number, j: number, patch: Partial<TalkingPoint>) => update((d) => ({ sections: d.sections.map((s, k) => k === i ? { ...s, talking_points: s.talking_points.map((p, m) => m === j ? { ...p, ...patch } : p) } : s) }));
  const move = (i: number, dir: -1 | 1) => update((d) => { const a = [...d.sections]; const j = i + dir; if (j < 0 || j >= a.length) return d; [a[i], a[j]] = [a[j], a[i]]; return { sections: a }; });
  const addPoint = (i: number) => update((d) => ({ sections: d.sections.map((s, k) => k === i ? { ...s, talking_points: [...s.talking_points, { id: `${s.id}-p${s.talking_points.length + 1}-${Date.now().toString(36)}`, kind: "claim", text: "", source: "brief", consent: "not_a_story" }] } : s) }));
  const delPoint = (i: number, j: number) => update((d) => ({ sections: d.sections.map((s, k) => k === i ? { ...s, talking_points: s.talking_points.filter((_, m) => m !== j) } : s) }));
  const addSection = () => update((d) => ({ sections: [...d.sections, { id: `s${d.sections.length + 1}-${Date.now().toString(36)}`, kind: "evidence", purpose: "", talking_points: [], story_slot: false, target_seconds: 60, target_words: 150, ending_point: false }] }));
  const delSection = (i: number) => update((d) => ({ sections: d.sections.filter((_, k) => k !== i) }));
  const input = "w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 py-1 t-compact disabled:bg-transparent disabled:border-transparent";

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="t-page-title">Outline Builder</h1><p className="t-compact text-[var(--text-secondary)]">Talking points, not prose. Edit every line, then finalize. The script is written only from the finalized outline.</p></div>
        <div className="flex flex-wrap gap-2">
          {!final && <Button variant={doc ? "secondary" : "milestone"} disabled={!hasBrief} loading={pending} loadingLabel="Building the outline" onClick={() => run(() => generateOutline(talkId))}>{doc ? "Regenerate from the brief" : "Build the outline from my brief"}{outlinesLeft !== null ? ` (${outlinesLeft} left)` : ""}</Button>}
          {doc && !final && <Button disabled={!dirty} loading={pending} onClick={() => run(() => saveOutline(versionId!, doc))}>Save edits</Button>}
          {doc && !final && versionId && <Button variant="milestone" disabled={dirty || consentIssues.length > 0} loading={pending} onClick={() => run(() => finalizeOutline(versionId))}>Finalize outline</Button>}
          {final && versionId && <Button variant="ghost" loading={pending} onClick={() => run(() => reopenOutline(versionId))}>Reopen to edit</Button>}
          {final && <Link href="/write/script" className="inline-flex h-10 items-center rounded-[var(--radius)] bg-[var(--primary)] px-4 t-compact font-medium text-[var(--primary-foreground)]">Next: write the script</Link>}
        </div>
      </div>
      {!hasBrief && <Card><p className="t-body text-[var(--text-secondary)]">Save your <Link href="/write/brief" className="underline">Idea Brief</Link> first (500 characters at least). The outline is written only from it.</p></Card>}
      {final && <div role="status" className="rounded-[var(--radius)] border border-[var(--accent-outline)] bg-[var(--surface-2)] p-3 t-compact">Finalized. {hasScript ? "A script exists for this outline; reopening and changing it marks the script as written from an earlier outline." : "Write the script whenever you are ready."}</div>}
      {dirty && <p className="t-compact text-[var(--warning-text)]">Unsaved edits. Save before finalizing.</p>}
      {consentIssues.length > 0 && <div role="alert" className="rounded-[var(--radius)] border border-[var(--warning-text)] p-3 t-compact">Each story needs a consent chip before finalizing: named with permission, pseudonymized, or composite (said so on stage). {consentIssues.length} to set.</div>}
      {msg && (gateFor(msg.code, msg.message, "Outlines") ? <Gate {...gateFor(msg.code, msg.message, "Outlines")!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="t-compact text-[var(--danger-text)]">{msg.message}</p>)}

      {doc && (
        <>
          <div className={cx("flex flex-wrap items-center gap-3 rounded-[var(--radius)] border p-3 t-compact", total > slot ? "border-[var(--warning-text)]" : "border-[var(--border-subtle)]")}>
            <span>Running total <strong className="tabular">{formatClock(total)}</strong> of a {slotMinutes}:00 slot{total > slot ? `, ${formatClock(total - slot)} over` : ` (${formatClock(slot - total)} buffer)`}</span>
            <span className="text-[var(--text-muted)]">{doc.sections.filter((s) => s.ending_point).length} ending point{doc.sections.filter((s) => s.ending_point).length === 1 ? "" : "s"} planned (two is the aim)</span>
          </div>
          <ol className="flex flex-col gap-3">
            {doc.sections.map((s, i) => (
              <li key={s.id}><Card className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="t-label text-[var(--text-muted)]">{i + 1}</span>
                  <select disabled={final} value={s.kind} onChange={(e) => setSection(i, { kind: e.target.value as any })} className="h-9 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 t-compact" aria-label="Section kind">{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
                  <input disabled={final} value={s.purpose} onChange={(e) => setSection(i, { purpose: e.target.value })} placeholder="Purpose of this section, one line" className={cx(input, "min-w-[200px] flex-1")} aria-label="Purpose" />
                  <label className="flex items-center gap-1 t-compact tabular">sec<input disabled={final} type="number" min={10} value={s.target_seconds} onChange={(e) => setSection(i, { target_seconds: Number(e.target.value), target_words: Math.round(Number(e.target.value) / 60 * 150) })} className="h-9 w-20 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2" aria-label="Target seconds" /></label>
                  <label className="flex items-center gap-1 t-compact"><input disabled={final} type="checkbox" className="h-5 w-5" checked={s.ending_point} onChange={(e) => setSection(i, { ending_point: e.target.checked })} />ending point</label>
                  {!final && <span className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => move(i, -1)} aria-label="Move up">↑</Button><Button size="sm" variant="ghost" onClick={() => move(i, 1)} aria-label="Move down">↓</Button><Button size="sm" variant="ghost" onClick={() => delSection(i)}>Delete</Button></span>}
                </div>
                <ul className="flex flex-col gap-1 pl-4">
                  {s.talking_points.map((p, j) => (
                    <li key={p.id} className="flex flex-wrap items-start gap-2">
                      <select disabled={final} value={p.kind} onChange={(e) => setPoint(i, j, { kind: e.target.value as any })} className="h-9 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 t-metadata" aria-label="Point kind">{POINT_KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select>
                      <textarea disabled={final} value={p.text} onChange={(e) => setPoint(i, j, { text: e.target.value })} rows={2} className={cx(input, "min-w-[220px] flex-1")} aria-label="Talking point" />
                      {p.kind === "story" && <select disabled={final} value={p.consent} onChange={(e) => setPoint(i, j, { consent: e.target.value as any })} className={cx("h-9 rounded-[var(--radius)] border px-2 t-metadata", p.consent === "not_a_story" ? "border-[var(--warning-text)]" : "border-[var(--input)] bg-[var(--surface)]")} aria-label="Story consent">{CONSENT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
                      <span className="t-metadata text-[var(--text-muted)]">{p.source === "to_find" ? "you supply this" : `from ${p.source.replace("_", " ")}`}</span>
                      {!final && <Button size="sm" variant="ghost" onClick={() => delPoint(i, j)} aria-label="Delete point">×</Button>}
                    </li>
                  ))}
                  {!final && <li><Button size="sm" variant="ghost" onClick={() => addPoint(i)}>Add a talking point</Button></li>}
                </ul>
              </Card></li>
            ))}
          </ol>
          {!final && <div><Button size="sm" variant="secondary" onClick={addSection}>Add a section</Button></div>}
        </>
      )}
      {versions.length > 1 && (
        <details className="t-compact"><summary className="cursor-pointer">Versions ({versions.length})</summary>
          <ul className="mt-1 flex flex-col gap-1">{versions.map((v) => <li key={v.id}>v{v.version} · {v.source === "llm" ? "AI draft" : "your edit"} · {new Date(v.created_at).toLocaleString("en-GB")}{v.status === "final" ? " · final" : ""}{v.id !== versionId && !final ? <> · <Link className="underline" href={`/write/outline?v=${v.id}`}>open</Link></> : null}</li>)}</ul></details>
      )}
    </div>
  );
}
