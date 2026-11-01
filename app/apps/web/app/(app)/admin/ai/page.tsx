import { supabaseServer } from "@/lib/supabase/server";
import { AiSettings } from "@/components/admin/AiSettings";
import { registry } from "@onebigtalk/prompts";

export const dynamic = "force-dynamic";

// A5 AI settings: prompt versions per action, model routing and credit prices (from the registry the code runs),
// feature flags, eval results and the cost caps. Activation and flags write through audited functions.
export default async function AiPage() {
  const sb = await supabaseServer();
  const { data } = await sb.rpc("admin_ai_settings");
  const v = (data ?? {}) as any;
  const actions = Object.entries(registry.actions).map(([key, spec]: [string, any]) => ({ key, model: String(spec.model), credits: Number(spec.credits), plan: String(spec.plan), gates: (spec.gates ?? []) as string[], lint: !!spec.lint, version: String(spec.version), fairUse: spec.fairUse ? `${spec.fairUse.key} cap ${spec.fairUse.cap}` : null, flag: (spec.flag as string | undefined) ?? null }));
  const models = registry.models as Record<string, { id: string; inputPerMTok: number; outputPerMTok: number }>;
  return <AiSettings actions={actions} flags={v.flags ?? []} promptVersions={v.prompt_versions ?? []} evalRuns={v.eval_runs ?? []} costByModel={v.cost_by_model_30d ?? []} models={models} />;
}
