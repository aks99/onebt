import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import registryJson from "../registry.json" with { type: "json" };

// Loads a versioned prompt: the shared preamble (13.1, rules R1 to R11) plus the action body with
// its placeholders filled. Missing placeholders are an error, never silently empty.

const here = dirname(fileURLToPath(import.meta.url));
export type ModelKey = "sonnet" | "haiku";
export interface ActionSpec {
  model: ModelKey; credits: number; plan: "public" | "spark" | "member" | "curator";
  allowance?: string; allowanceOncePer?: string; fairUse?: { key: string; cap: number }; flag?: string;
  gates: string[]; lint: boolean; version: string; maxTokens: number;
}
export const registry = registryJson as unknown as { actions: Record<string, ActionSpec>; models: Record<ModelKey, { id: string; inputPerMTok: number; outputPerMTok: number; cacheReadPerMTok: number }> };

export function actionSpec(key: string): ActionSpec {
  const s = registry.actions[key];
  if (!s) throw new Error(`UNKNOWN_ACTION: ${key}`);
  return s;
}
export function preamble(): string { return readFileSync(join(here, "../preamble.md"), "utf8"); }
export function promptBody(key: string, version = actionSpec(key).version): string {
  return readFileSync(join(here, `../actions/${key}/${version}.md`), "utf8");
}
export function outputSchema(key: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(here, `../actions/${key}/schema.json`), "utf8"));
}
export function render(template: string, vars: Record<string, unknown>): string {
  const missing: string[] = [];
  const out = template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    if (!(k in vars)) { missing.push(k); return ""; }
    const v = vars[k];
    return typeof v === "string" ? v : v === undefined || v === null ? "" : JSON.stringify(v, null, 1);
  });
  if (missing.length) throw new Error(`MISSING_PLACEHOLDERS: ${missing.join(", ")}`);
  return out;
}
export function buildPrompt(key: string, vars: Record<string, unknown>): { system: string; user: string; version: string } {
  const spec = actionSpec(key);
  return { system: preamble(), user: render(promptBody(key, spec.version), vars), version: `${key}.${spec.version}` };
}
export function estimateCostUsd(model: ModelKey, inputTokens: number, outputTokens: number, cacheReadTokens = 0): number {
  const m = registry.models[model];
  return (inputTokens * m.inputPerMTok + outputTokens * m.outputPerMTok + cacheReadTokens * m.cacheReadPerMTok) / 1_000_000;
}
