"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@onebigtalk/ui";
import { activatePrompt, setFlag } from "@/app/(app)/admin/actions";
import { Table, money, td, whenTime } from "@/components/admin/ui";

export interface ActionRow { key: string; model: string; credits: number; plan: string; gates: string[]; lint: boolean; version: string; fairUse: string | null; flag: string | null }
export function AiSettings({ actions, flags, promptVersions, evalRuns, costByModel, models }: { actions: ActionRow[]; flags: { key: string; enabled: boolean; note: string | null; updated_at: string }[]; promptVersions: { action_key: string; version: string; model: string; active: boolean; eval_pass_rate: number | null; activated_at: string | null }[]; evalRuns: { action_key: string; prompt_version: string; suite: string; passed: number; failed: number; ran_at: string; git_sha: string | null }[]; costByModel: { model: string; calls: number; cost_usd: number }[]; models: Record<string, { id: string; inputPerMTok: number; outputPerMTok: number }> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => { setMsg(null); start(async () => { const r = await fn(); if (!r.ok) setMsg(r.message ?? "That didn't work."); else router.refresh(); }); };
  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      {msg && <p role="alert" className="t-compact text-[var(--danger-text)]">{msg}</p>}
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Model routing and credit prices (12.4, 10.3)</h2>
        <p className="t-compact text-[var(--text-secondary)]">Read from the registry the server runs. Sonnet 5.5 drafts, Haiku 5.5 scores and lints; a change is a commit to `packages/prompts/registry.json`, never a live edit. Models: {Object.entries(models).map(([k, m]) => `${k} = ${m.id} ($${m.inputPerMTok} in, $${m.outputPerMTok} out per million tokens)`).join("; ")}.</p>
        <Table head={["Action", "Model", "Credits", "Min plan", "Gates", "Linter", "Fair use", "Flag", "Active prompt"]} label="Actions">
          {actions.map((a) => <tr key={a.key}><td className={td}>{a.key}</td><td className={td}>{a.model}</td><td className={`${td} tabular`}>{a.credits}</td><td className={td}>{a.plan}</td><td className={td}>{a.gates.join(", ")}</td><td className={td}>{a.lint ? "yes" : ""}</td><td className={td}>{a.fairUse ?? ""}</td><td className={td}>{a.flag ?? ""}</td><td className={td}>{a.version}</td></tr>)}
        </Table>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Feature flags</h2>
        <p className="t-compact text-[var(--text-secondary)]">Deferred features ship dark (owner decision 1 Nov 2026). Turning one on is audited and takes effect on the next request.</p>
        <Table head={["Flag", "Note", "State", "Changed", ""]} label="Feature flags">
          {flags.map((f) => <tr key={f.key}><td className={td}>{f.key}</td><td className={td}>{f.note}</td><td className={td}>{f.enabled ? "on" : "off"}</td><td className={td}>{whenTime(f.updated_at)}</td><td className={td}><Button size="sm" variant={f.enabled ? "ghost" : "secondary"} loading={pending} onClick={() => { if (!f.enabled && !confirm(`Turn on ${f.key}? Members see it on their next request.`)) return; run(() => setFlag(f.key, !f.enabled)); }}>{f.enabled ? "Turn off" : "Turn on"}</Button></td></tr>)}
        </Table>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Prompt versions and evals (13.15)</h2>
        <p className="t-compact text-[var(--text-secondary)]">A version is activated only after its eval suite passes. Rows arrive from the eval workflow; until the first run with the API key this table is empty.</p>
        <Table head={["Action", "Version", "Model", "Eval pass rate", "Active", "Activated", ""]} label="Prompt versions">
          {promptVersions.map((p) => <tr key={`${p.action_key}.${p.version}`}><td className={td}>{p.action_key}</td><td className={td}>{p.version}</td><td className={td}>{p.model}</td><td className={`${td} tabular`}>{p.eval_pass_rate ?? ""}</td><td className={td}>{p.active ? "active" : ""}</td><td className={td}>{whenTime(p.activated_at)}</td><td className={td}>{!p.active && <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => activatePrompt(p.action_key, p.version))}>Activate</Button>}</td></tr>)}
          {promptVersions.length === 0 && <tr><td className={td} colSpan={7}>No prompt versions recorded yet. The library on disk is the active set (25 actions, v1).</td></tr>}
        </Table>
        <Table head={["Ran", "Action", "Version", "Suite", "Passed", "Failed", "Commit"]} label="Eval runs">
          {evalRuns.map((e, i) => <tr key={i}><td className={td}>{whenTime(e.ran_at)}</td><td className={td}>{e.action_key}</td><td className={td}>{e.prompt_version}</td><td className={td}>{e.suite}</td><td className={`${td} tabular`}>{e.passed}</td><td className={`${td} tabular`}>{e.failed}</td><td className={td}>{e.git_sha?.slice(0, 7) ?? ""}</td></tr>)}
          {evalRuns.length === 0 && <tr><td className={td} colSpan={7}>No eval runs yet. The structure check passes (9 suites, 240 fixtures); the model run needs the API key in the repository secrets.</td></tr>}
        </Table>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="t-section">Cost caps and cost by model, last 30 days</h2>
        <p className="t-compact text-[var(--text-secondary)]">Per member: the monthly credit cap in `runAiAction` (COST_CAP_REACHED), the fair-use caps (60 scorecards, 60 readiness runs, 20 framing checks) and the plan allowances. Per account: the alert at 80 percent of budget is an owner setting once the email sender is live.</p>
        <Table head={["Model", "Calls", "Cost"]} label="Cost by model">
          {costByModel.map((c) => <tr key={c.model}><td className={td}>{c.model}</td><td className={`${td} tabular`}>{c.calls}</td><td className={`${td} tabular`}>{money(Math.round(c.cost_usd * 100))}</td></tr>)}
          {costByModel.length === 0 && <tr><td className={td} colSpan={3}>No model calls in the last 30 days.</td></tr>}
        </Table>
      </section>
    </div>
  );
}
