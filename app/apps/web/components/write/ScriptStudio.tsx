"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, RubricChip, cx } from "@onebigtalk/ui";
import { lockScript, restoreVersion, runPass, saveScriptEdit, scoreScript, setScriptDeadline, startScript, unlockScript, writeNextSection } from "@/app/(app)/write/actions";
import { LOCK_CRITERIA, SCRIPT_RUBRIC, coverage, cutPercent, formatClock, jargon, lockCheck, paceLine, quirks, readability, scriptWords, wordBudget, wordsIn, type OutlineDoc, type ScriptDoc, type ScriptRubric } from "@/lib/write/rules";
import { Gate, gateFor } from "@/components/Gate";

export interface VersionRow { id: string; version: number; source: string; pass_key: string | null; word_count: number; est_seconds: number; post_lock: boolean; created_at: string; rubric: ScriptRubric | null }
export interface StudioProps { talkId: string; scriptId: string | null; outline: OutlineDoc | null; outlineFinal: boolean; outlineChangedAfterScript: boolean; doc: ScriptDoc | null; versionId: string | null; versions: VersionRow[]; lockedVersionId: string | null; slotMinutes: number; targetWpm: number; measuredWpm: number | null; rubric: ScriptRubric | null; deadline: string | null; hasMemberAccess: boolean; draftsLeft: number | null; passesLeft: number | null }

const PASSES: { key: string; label: string; hint: string }[] = [
  { key: "cut_to_time", label: "Cut to time", hint: "Removes the lowest-value content, whole beats first; never the idea, the strongest story or the ask." },
  { key: "stronger_opening", label: "Stronger opening", hint: "Five alternative first paragraphs; the strongest replaces the hook." },
  { key: "kill_the_jargon", label: "Kill the jargon", hint: "Every term a non-specialist would not know, replaced or explained." },
  { key: "add_contrast", label: "Add contrast", hint: "A what-could-be beat after each what-is." },
  { key: "sounds_like_me", label: "Sounds like me", hint: "Your rhythm from your brief and writing samples. Every fact kept." },
  { key: "sharpen_the_close", label: "Sharpen the close", hint: "The picture of the world with the idea adopted, one winnable action, a second ending point." },
  { key: "de_pitch", label: "De-pitch", hint: "Removes anything that reads as promotion." },
  { key: "simplify", label: "Simplify", hint: "Grade 7 to 8 reading level without losing precision." },
];

// S4.3 Script Studio: write section by section from the final outline, edit, passes with versions, rubric,
// lock, exports, and the reading-level, jargon and quirk meters. The AI drafts; the speaker owns.
export function ScriptStudio(p: StudioProps) {
  const [doc, setDoc] = useState<ScriptDoc | null>(p.doc);
  const [dirty, setDirty] = useState(false);
  const [writing, setWriting] = useState<string | null>(null);
  const [passNote, setPassNote] = useState<{ pass: string; notes: string[]; removed: string[]; changed: string[]; prevVersionId: string | null } | null>(null);
  const [override, setOverride] = useState("");
  const [msg, setMsg] = useState<{ code: string; message: string; what: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const locked = !!p.lockedVersionId;
  const isLockedVersion = locked && p.lockedVersionId === p.versionId;
  const wpm = p.measuredWpm ?? p.targetWpm;
  const words = doc ? scriptWords(doc) : 0;
  const budget = wordBudget(p.slotMinutes, wpm);
  const pace = paceLine(words, p.slotMinutes, wpm, p.measuredWpm != null);
  const cov = p.outline && doc ? coverage(p.outline, doc) : null;
  const text = doc ? doc.sections.map((s) => s.text).join("\n\n") : "";
  const read = text ? readability(text) : null;
  const jarg = text ? jargon(text).slice(0, 8) : [];
  const qk = text ? quirks(text) : [];
  const lock = lockCheck(p.rubric, override);

  const run = (what: string, fn: () => Promise<{ ok: boolean; code?: string; message?: string; data?: any }>, after?: (d: any) => void) => { setMsg(null); start(async () => { const r = await fn(); if (!r.ok) setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work.", what }); else { after?.(r.data); router.refresh(); } }); };

  // Section-by-section writing: each call writes one section and returns; the UI shows which one is being written.
  function writeAll(startDoc: ScriptDoc | null) {
    start(async () => {
      let current = startDoc; let scriptId = p.scriptId;
      if (!scriptId) { const s = await startScript(p.talkId); if (!s.ok) { setMsg({ code: s.code, message: s.message, what: "Script draft" }); return; } if (!s.data) { setMsg({ code: "ERROR", message: "Could not start.", what: "Script draft" }); return; } scriptId = s.data.scriptId; }
      for (let i = 0; i < 12; i++) {
        const r = await writeNextSection(scriptId, current);
        if (!r.ok) { setMsg({ code: r.code ?? "ERROR", message: r.message ?? "That didn't work.", what: "Script draft" }); break; }
        current = r.data!.doc; setDoc(current); setWriting(r.data!.sectionId);
        if (r.data!.done) break;
      }
      setWriting(null); router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="t-page-title">Script Studio</h1><p className="t-compact text-[var(--text-secondary)]">Written from your finalized outline, section by section. Every talking point is covered or listed as uncovered. You own every word.</p></div>
        <div className="flex flex-wrap gap-2">
          {!doc && <Button variant="milestone" disabled={!p.outlineFinal || !p.hasMemberAccess} loading={pending} loadingLabel={writing ? `Writing ${writing}` : "Starting"} onClick={() => writeAll(null)}>Write the script from my finalized outline{p.draftsLeft !== null ? ` (${p.draftsLeft} left)` : ""}</Button>}
          {doc && !locked && <Button disabled={!dirty} loading={pending} onClick={() => run("Save", () => saveScriptEdit(p.scriptId!, doc))}>Save edits</Button>}
          {doc && p.versionId && <a href={`/api/export/script/${p.versionId}.pdf`} className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">PDF</a>}
          {doc && p.versionId && <a href={`/api/export/script/${p.versionId}.docx`} className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">DOCX</a>}
          {doc && p.versionId && <a href={`/api/export/script/${p.versionId}.txt`} className="inline-flex h-10 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-3 t-compact">Prompter text</a>}
        </div>
      </div>
      {!p.outlineFinal && <Card><p className="t-body text-[var(--text-secondary)]">"Write the script" opens once an outline is final. <Link href="/write/outline" className="underline">Open the Outline Builder</Link>.</p></Card>}
      {!p.hasMemberAccess && p.outlineFinal && !doc && <Gate what="Script drafts" reason="Members get 3 full drafts a month and 30 editing passes." />}
      {p.outlineChangedAfterScript && <div role="status" className="rounded-[var(--radius)] border border-[var(--warning-text)] bg-[var(--surface-2)] p-3 t-compact">The outline was finalized again after this script was written. Re-read the sections or write a fresh draft.</div>}
      {locked && <div role="status" className="rounded-[var(--radius)] border border-[var(--accent-outline)] bg-[var(--surface-2)] p-3 t-compact">Script locked{isLockedVersion ? "" : ` (version ${p.versions.find((v) => v.id === p.lockedVersionId)?.version ?? ""} is the locked one; you are viewing another)`}. This is the rehearsal baseline. Edits need an unlock and are marked post-lock.</div>}
      {msg && (gateFor(msg.code, msg.message, msg.what) ? <Gate {...gateFor(msg.code, msg.message, msg.what)!} onNotNow={() => setMsg(null)} /> : <p role="alert" className="rounded-[var(--radius)] border border-[var(--danger-text)] p-3 t-compact">{msg.message}</p>)}
      {writing && <p role="status" className="t-compact text-[var(--ai-text)]">Writing section {writing}. Each section cites the talking points it covers.</p>}

      {doc && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-3">
            <div className={cx("flex flex-wrap items-center gap-3 rounded-[var(--radius)] border p-3 t-compact", pace.over ? "border-[var(--warning-text)]" : "border-[var(--border-subtle)]")}>
              <span className="tabular"><strong>{words.toLocaleString()}</strong> words · budget {budget.low.toLocaleString()} to {budget.high.toLocaleString()}</span>
              <span>{pace.text}</span>
              {pace.over && !locked && <Button size="sm" variant="secondary" loading={pending} onClick={() => run("Cut to time", () => runPass(p.scriptId!, "cut_to_time", cutPercent(words, p.slotMinutes, wpm)), (d) => setPassNote({ pass: "cut_to_time", ...d, prevVersionId: p.versionId }))}>Cut {cutPercent(words, p.slotMinutes, wpm)}% to time</Button>}
            </div>
            {doc.sections.map((s, i) => {
              const os = p.outline?.sections.find((x) => x.id === s.id);
              const secWords = wordsIn(s.text);
              return (
                <Card key={s.id} className={cx("flex flex-col gap-2", writing === s.id && "border-[var(--ai-text)]")}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="t-section">{i + 1}. {s.title}</h2>
                    <span className="t-metadata tabular text-[var(--text-muted)]">{secWords} words · {formatClock(Math.round((secWords / wpm) * 60))} of {formatClock(s.target_seconds)}{s.ending_point ? " · ending point" : ""}</span>
                  </div>
                  <textarea value={s.text} disabled={locked} rows={Math.max(6, Math.ceil(secWords / 14))} onChange={(e) => { setDoc({ sections: doc.sections.map((x) => x.id === s.id ? { ...x, text: e.target.value } : x) }); setDirty(true); }} className="w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-3 t-editor-body disabled:opacity-80" aria-label={`Section ${i + 1} text`} placeholder={writing ? "Writing..." : "Not written yet."} />
                  {os && (
                    <details className="t-metadata text-[var(--text-muted)]"><summary className="cursor-pointer">Covers {s.covered_point_ids.length} of {os.talking_points.length} talking points{s.uncovered.length ? `, ${s.uncovered.length} uncovered` : ""}</summary>
                      <ul className="mt-1 list-disc pl-5">{os.talking_points.map((tp) => <li key={tp.id} className={s.covered_point_ids.includes(tp.id) ? "" : "text-[var(--warning-text)]"}>{tp.text}{s.uncovered.find((u) => u.id === tp.id) ? ` (uncovered: ${s.uncovered.find((u) => u.id === tp.id)!.why})` : ""}</li>)}</ul></details>
                  )}
                </Card>
              );
            })}
            {passNote && (
              <Card className="flex flex-col gap-2 t-compact">
                <h2 className="t-section">After "{PASSES.find((x) => x.key === passNote.pass)?.label ?? passNote.pass}"</h2>
                <p>Changed sections: {passNote.changed.join(", ") || "none"}. This is a new version; the previous one is in history.</p>
                {passNote.notes.length > 0 && <ul className="list-disc pl-5">{passNote.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
                {passNote.removed.length > 0 && <p><strong>Removed:</strong> {passNote.removed.join("; ")}</p>}
                <div className="flex gap-2"><Button size="sm" onClick={() => setPassNote(null)}>Keep this version</Button>{passNote.prevVersionId && <Button size="sm" variant="ghost" onClick={() => run("Restore", () => restoreVersion(p.scriptId!, passNote.prevVersionId!), () => setPassNote(null))}>Go back to the previous version</Button>}</div>
              </Card>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <Card className="flex flex-col gap-2">
              <h2 className="t-section">Editing passes</h2>
              <div className="flex flex-wrap gap-1">{PASSES.map((ps) => <Button key={ps.key} size="sm" variant="secondary" disabled={locked || dirty} loading={pending} title={ps.hint} onClick={() => run(ps.label, () => runPass(p.scriptId!, ps.key), (d) => setPassNote({ pass: ps.key, ...d, prevVersionId: p.versionId }))}>{ps.label}</Button>)}</div>
              <p className="t-metadata text-[var(--text-muted)]">{p.passesLeft !== null ? `${p.passesLeft} passes left this month. ` : ""}Each pass is a new version with what changed listed; nothing is rewritten silently.{dirty ? " Save your edits first." : ""}</p>
            </Card>

            <Card className="flex flex-col gap-2">
              <div className="flex items-center justify-between"><h2 className="t-section">Script rubric</h2>{p.rubric && <span className={`t-compact ${lock.ok ? "text-[var(--success-text)]" : "text-[var(--warning-text)]"}`}>{p.rubric.lock_gate_passed ? "lock gate passes" : "not ready to lock"}</span>}</div>
              {p.rubric ? (
                <>
                  <ul className="flex flex-wrap gap-1.5">{SCRIPT_RUBRIC.map((c) => { const s = p.rubric!.scores.find((x) => x.criterion === c.n); return s ? <li key={c.n}><RubricChip criterion={c.name} level={s.level} standard={c.standard} gated={LOCK_CRITERIA.includes(c.n)} /></li> : null; })}</ul>
                  <p className="t-compact"><strong>Strongest line:</strong> {p.rubric.strongest_line}</p>
                  <p className="t-compact"><strong>Weakest line:</strong> {p.rubric.weakest_line}</p>
                  <p className="t-compact text-[var(--text-secondary)]">{p.rubric.next_step}</p>
                  <details className="t-compact"><summary className="cursor-pointer">Why these scores</summary><ul className="mt-1 flex flex-col gap-1">{p.rubric.scores.map((s) => <li key={s.criterion}><strong>{SCRIPT_RUBRIC[s.criterion - 1]?.name}</strong> L{s.level}: {s.reason}</li>)}</ul></details>
                </>
              ) : <p className="t-compact text-[var(--text-secondary)]">Eleven criteria. Locking needs Level 3 on structure, one idea, ending and compliance.</p>}
              <Button size="sm" variant="secondary" disabled={!p.versionId || dirty} loading={pending} onClick={() => run("Script rubric", () => scoreScript(p.versionId!))}>Score this version</Button>
            </Card>

            <Card className="flex flex-col gap-2 t-compact">
              <h2 className="t-section">Lock</h2>
              {locked ? (
                <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run("Unlock", () => unlockScript(p.scriptId!, String(f.get("reason") ?? ""))); }}>
                  <p>Locked on {p.versions.find((v) => v.id === p.lockedVersionId) ? `version ${p.versions.find((v) => v.id === p.lockedVersionId)!.version}` : "this version"}. Unlocking keeps it in history; later versions are marked post-lock.</p>
                  <input name="reason" required minLength={10} placeholder="Why unlock (10 characters at least)" className="h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3" />
                  <div><Button size="sm" type="submit" variant="ghost" loading={pending}>Unlock</Button></div>
                </form>
              ) : (
                <>
                  <p className={lock.ok ? "text-[var(--text-secondary)]" : "text-[var(--warning-text)]"}>{lock.reason}</p>
                  {!lock.ok && lock.overridable && <textarea value={override} onChange={(e) => setOverride(e.target.value)} rows={2} placeholder="Why lock it anyway (20 characters at least); this is logged" className="w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-2" />}
                  <Button variant="milestone" disabled={!p.versionId || dirty || !lock.ok} loading={pending} onClick={() => run("Lock", () => lockScript(p.versionId!, override || undefined))}>Lock this version as the rehearsal baseline</Button>
                </>
              )}
              <label>Organizer's script deadline (reminder a week before)<input type="date" defaultValue={p.deadline ?? ""} onBlur={(e) => run("Deadline", () => setScriptDeadline(p.scriptId!, e.target.value || null))} className="mt-1 h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3" /></label>
            </Card>

            <Card className="flex flex-col gap-2 t-compact">
              <h2 className="t-section">Reading level and quirks</h2>
              {read && <p>Grade level <strong className="tabular">{read.gradeLevel}</strong> · average sentence <strong className="tabular">{read.avgSentenceLength}</strong> words · {read.sentences} sentences</p>}
              {jarg.length > 0 && <p><strong>Jargon:</strong> {jarg.map((j) => `${j.word}${j.plain ? ` (try "${j.plain}")` : ""}`).join(", ")}</p>}
              {qk.length > 0 ? <ul className="flex flex-col gap-1">{qk.map((q) => <li key={q.key}><strong>{q.name}:</strong> "{q.quote}" <span className="text-[var(--text-secondary)]">{q.fix}</span></li>)}</ul> : <p className="text-[var(--text-secondary)]">No quirks from TED's list found.</p>}
              {cov && <p>Coverage: {cov.covered} of {cov.total} talking points covered{cov.uncovered.length ? `, ${cov.uncovered.length} listed as uncovered` : ""}{cov.missing.length ? `, ${cov.missing.length} unaccounted` : ""}.</p>}
              <Link href="/write/factcheck" className="underline">Fact-check the claims</Link>
            </Card>

            {p.versions.length > 0 && (
              <Card className="t-compact"><details><summary className="cursor-pointer">Versions ({p.versions.length})</summary>
                <ul className="mt-1 flex flex-col gap-1">{p.versions.map((v) => <li key={v.id} className="flex flex-wrap items-center gap-2"><span>v{v.version} · {v.source === "llm" ? (v.pass_key ? v.pass_key.replace(/_/g, " ") : "AI draft") : v.pass_key === "restore" ? "restored" : "your edit"} · {v.word_count} words{v.post_lock ? " · post-lock" : ""}{v.id === p.lockedVersionId ? " · locked" : ""}</span>{v.id !== p.versionId && <Link className="underline" href={`/write/script?v=${v.id}`}>open</Link>}{v.id !== p.versionId && !locked && <Button size="sm" variant="ghost" onClick={() => run("Restore", () => restoreVersion(p.scriptId!, v.id))}>Restore</Button>}</li>)}</ul></details></Card>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
