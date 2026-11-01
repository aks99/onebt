import { actionSpec, buildPrompt, estimateCostUsd, outputSchema, registry, type ActionSpec, type ModelKey } from "@onebigtalk/prompts";

// The one door every AI action goes through (blueprint 12.10, 12.4):
//   plan and flag checks -> gates -> allowance or fair use -> credit reservation -> prompt (preamble +
//   versioned body) -> model with a structured output -> schema validation -> linter -> llm_calls log
//   -> settle (or release) credits -> structured result.
// The database and the model are injected so every rule below is unit-tested without either.

export type ErrorCode =
  | "NOT_AUTHENTICATED" | "PLAN_REQUIRED" | "FEATURE_OFF" | "BRIEF_TOO_SHORT" | "OUTLINE_NOT_FINAL"
  | "RESEARCH_STEP_INCOMPLETE" | "AI_PROHIBITED_BY_ORGANIZER" | "IDEA_NOT_LOCKED" | "SCRIPT_NOT_LOCKED"
  | "DOSSIER_TOO_SHORT" | "ALLOWANCE_EXHAUSTED" | "FAIR_USE_REACHED" | "TRIAL_LIMIT" | "COST_CAP_REACHED"
  | "MODEL_FAILED" | "BAD_OUTPUT" | "AI_DISABLED";

export class AiActionError extends Error {
  constructor(public code: ErrorCode, message: string, public detail?: Record<string, unknown>) { super(message); }
}

export interface Member {
  id: string;
  role: "member" | "coach" | "curator" | "admin";
  plan: "spark" | "founding" | "regular";
  hasMemberAccess: boolean;      // paid, trialing or extended (has_member_access)
  aiEnabled: boolean;            // Me -> AI global switch
}

export interface GateContext {
  talkId?: string;
  briefCharCount?: number;         // brief_minimum
  outlineStatus?: "draft" | "final"; // outline_final
  researchComplete?: boolean;      // research_step_complete
  eventAiPolicy?: "allowed" | "restricted" | "prohibited" | "unknown"; // organizer_ai_policy
  ideaLocked?: boolean;            // idea_locked
  scriptLocked?: boolean;          // script_locked
  dossierCharCount?: number;       // dossier_min_300
}

export interface ModelResult { text: string; inputTokens: number; outputTokens: number; cacheReadTokens?: number; latencyMs: number }

export interface AiDeps {
  flagEnabled(key: string): Promise<boolean>;
  consumeAllowance(userId: string, key: string): Promise<void>;                 // throws ALLOWANCE_EXHAUSTED: ...
  consumeFairUse(userId: string, key: string, cap: number): Promise<void>;      // throws FAIR_USE_REACHED: ...
  reserveCredits(userId: string, action: string, credits: number, idempotencyKey: string, talkId?: string): Promise<{ id: number; status: string }>;
  settleCredits(id: number, llmCallId: string): Promise<void>;
  releaseCredits(id: number, note: string): Promise<void>;
  creditsSettledThisMonth(userId: string): Promise<number>;
  callModel(modelId: string, system: string, user: string, schema: Record<string, unknown>, maxTokens: number): Promise<ModelResult>;
  logCall(row: { userId: string; talkId?: string; actionKey: string; model: string; promptVersion: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number; latencyMs: number; creditsCharged: number; status: string; errorCode?: string }): Promise<string>;
  getCachedResult?(userId: string, idempotencyKey: string): Promise<AiResult | null>;
  putCachedResult?(userId: string, idempotencyKey: string, result: AiResult): Promise<void>;
}

export interface AiResult<T = unknown> {
  output: T;
  flags: Array<{ rule: string; quote: string; why: string; fix: string }>;
  blocking: boolean;
  llmCallId: string;
  promptVersion: string;
  model: string;
  creditsCharged: number;
}

export const MONTHLY_CREDIT_CAP = 1200;   // per member; about $3.50 of AI at list prices (10.3)

export async function runAiAction<T = unknown>(
  actionKey: string, vars: Record<string, unknown>, member: Member | null, ctx: GateContext, idempotencyKey: string, deps: AiDeps,
): Promise<AiResult<T>> {
  const spec = actionSpec(actionKey);

  // 1. Who may call this
  if (spec.plan !== "public") {
    if (!member) throw new AiActionError("NOT_AUTHENTICATED", "Log in to use this.");
    if (!member.aiEnabled) throw new AiActionError("AI_DISABLED", "AI features are switched off in your settings.");
    if (spec.plan === "curator" && !(member.role === "curator" || member.role === "admin")) throw new AiActionError("PLAN_REQUIRED", "Curators only.");
    if (spec.plan === "member" && !member.hasMemberAccess) throw new AiActionError("PLAN_REQUIRED", "This is a member feature.");
  }
  if (spec.flag && !(await deps.flagEnabled(spec.flag))) throw new AiActionError("FEATURE_OFF", "This feature is not available yet.");

  // 2. Gates (12.4): the two-step writing rules and the pipeline rules, enforced before any model call
  for (const gate of spec.gates) {
    switch (gate) {
      case "brief_minimum":
        if ((ctx.briefCharCount ?? 0) < 500) throw new AiActionError("BRIEF_TOO_SHORT", "Your Idea Brief needs at least 500 characters before an outline can be built.", { charCount: ctx.briefCharCount ?? 0 });
        break;
      case "outline_final":
        if (ctx.outlineStatus !== "final") throw new AiActionError("OUTLINE_NOT_FINAL", "Finalize your outline before writing the script.");
        break;
      case "research_step_complete":
        if (!ctx.researchComplete) throw new AiActionError("RESEARCH_STEP_INCOMPLETE", "Answer the three research questions about this event first.");
        break;
      case "organizer_ai_policy":
        if (ctx.eventAiPolicy === "prohibited" && (await deps.flagEnabled("organizer_ai_policy_gate")))
          throw new AiActionError("AI_PROHIBITED_BY_ORGANIZER", "This organizer has published an AI-content restriction. The answers must be written by you; the linter and the readiness review still work.");
        break;
      case "idea_locked":
        if (!ctx.ideaLocked) throw new AiActionError("IDEA_NOT_LOCKED", "Lock one idea first.");
        break;
      case "script_locked":
        if (!ctx.scriptLocked) throw new AiActionError("SCRIPT_NOT_LOCKED", "Lock your script first; the beat map is built from the locked version.");
        break;
      case "dossier_min_300":
        if ((ctx.dossierCharCount ?? 0) < 300) throw new AiActionError("DOSSIER_TOO_SHORT", "Give the Idea Lab at least 300 characters to work with.", { charCount: ctx.dossierCharCount ?? 0 });
        break;
      default:
        throw new Error(`UNKNOWN_GATE: ${gate}`);
    }
  }

  // 3. Idempotency: a retry returns the finished result without a second charge
  const userId = member?.id ?? "public";
  if (deps.getCachedResult) {
    const cached = await deps.getCachedResult(userId, idempotencyKey);
    if (cached) return cached as AiResult<T>;
  }

  // 4. Allowance, fair use, cost cap
  if (member) {
    if (spec.allowance) await translateDbError(() => deps.consumeAllowance(member.id, spec.allowance!));
    if (spec.fairUse) await translateDbError(() => deps.consumeFairUse(member.id, spec.fairUse!.key, spec.fairUse!.cap));
    if (spec.credits > 0 && (await deps.creditsSettledThisMonth(member.id)) + spec.credits > MONTHLY_CREDIT_CAP)
      throw new AiActionError("COST_CAP_REACHED", "You have reached this month's limit. It resets on the first of next month.");
  }

  // 5. Reserve credits, then call the model
  const reservation = member && spec.credits > 0 ? await deps.reserveCredits(member.id, actionKey, spec.credits, idempotencyKey, ctx.talkId) : null;
  const { system, user, version } = buildPrompt(actionKey, vars);
  const schema = outputSchema(actionKey);
  const model = registry.models[spec.model as ModelKey];
  let res: ModelResult;
  try {
    res = await deps.callModel(model.id, system, user, schema, spec.maxTokens);
  } catch (e) {
    if (reservation) await deps.releaseCredits(reservation.id, "model failed");
    await deps.logCall({ userId, talkId: ctx.talkId, actionKey, model: model.id, promptVersion: version, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUsd: 0, latencyMs: 0, creditsCharged: 0, status: "error", errorCode: "MODEL_FAILED" });
    throw new AiActionError("MODEL_FAILED", "That didn't work. You weren't charged a credit. Try again.");
  }

  // 6. Validate the structured output
  let output: T;
  try { output = validate<T>(JSON.parse(res.text), schema); }
  catch (e) {
    if (reservation) await deps.releaseCredits(reservation.id, "bad output");
    await deps.logCall({ userId, talkId: ctx.talkId, actionKey, model: model.id, promptVersion: version, inputTokens: res.inputTokens, outputTokens: res.outputTokens, cacheReadTokens: res.cacheReadTokens ?? 0, costUsd: estimateCostUsd(spec.model, res.inputTokens, res.outputTokens, res.cacheReadTokens), latencyMs: res.latencyMs, creditsCharged: 0, status: "error", errorCode: "BAD_OUTPUT" });
    throw new AiActionError("BAD_OUTPUT", "That didn't work. You weren't charged a credit. Try again.");
  }

  // 7. Linter on generated text (13.2): flags are returned with the output, never hidden
  let flags: AiResult["flags"] = [];
  let blocking = false;
  if (spec.lint) {
    const text = collectText(output);
    if (text.trim()) {
      const lintSpec = actionSpec("linter");
      const lp = buildPrompt("linter", { text, context: lintContext(actionKey) });
      try {
        const lr = await deps.callModel(registry.models[lintSpec.model].id, lp.system, lp.user, outputSchema("linter"), lintSpec.maxTokens);
        const parsed = JSON.parse(lr.text) as { flags: AiResult["flags"]; blocking: boolean };
        flags = parsed.flags ?? []; blocking = !!parsed.blocking;
        await deps.logCall({ userId, talkId: ctx.talkId, actionKey: "linter", model: registry.models[lintSpec.model].id, promptVersion: lp.version, inputTokens: lr.inputTokens, outputTokens: lr.outputTokens, cacheReadTokens: lr.cacheReadTokens ?? 0, costUsd: estimateCostUsd(lintSpec.model, lr.inputTokens, lr.outputTokens, lr.cacheReadTokens), latencyMs: lr.latencyMs, creditsCharged: 0, status: "ok" });
      } catch { /* the linter failing never blocks the member's own work; the UI shows "linter unavailable" */ }
    }
  }

  // 8. Log, settle, return
  const llmCallId = await deps.logCall({ userId, talkId: ctx.talkId, actionKey, model: model.id, promptVersion: version, inputTokens: res.inputTokens, outputTokens: res.outputTokens, cacheReadTokens: res.cacheReadTokens ?? 0, costUsd: estimateCostUsd(spec.model, res.inputTokens, res.outputTokens, res.cacheReadTokens), latencyMs: res.latencyMs, creditsCharged: reservation ? spec.credits : 0, status: blocking ? "blocked_by_linter" : "ok" });
  if (reservation) await deps.settleCredits(reservation.id, llmCallId);
  const result: AiResult<T> = { output, flags, blocking, llmCallId, promptVersion: version, model: model.id, creditsCharged: reservation ? spec.credits : 0 };
  if (deps.putCachedResult) await deps.putCachedResult(userId, idempotencyKey, result);
  return result;
}

async function translateDbError(fn: () => Promise<void>) {
  try { await fn(); }
  catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.startsWith("ALLOWANCE_EXHAUSTED")) throw new AiActionError("ALLOWANCE_EXHAUSTED", msg.replace(/^ALLOWANCE_EXHAUSTED:\s*/, "").replace(/^\w/, (c) => c.toUpperCase()));
    if (msg.startsWith("FAIR_USE_REACHED")) throw new AiActionError("FAIR_USE_REACHED", msg.replace(/^FAIR_USE_REACHED:\s*/, "").replace(/^\w/, (c) => c.toUpperCase()));
    throw e;
  }
}

function lintContext(actionKey: string): string {
  if (actionKey === "pitch_pack") return "pitch_video_script";
  if (["personalization", "prior_stages_framing", "experience_summary", "readiness_review"].includes(actionKey)) return "application";
  if (["script_section", "editing_pass", "outline"].includes(actionKey)) return "script";
  if (["launch_copy", "upload_pack", "bio_updater", "clip_plan"].includes(actionKey)) return "launch_copy";
  return "idea";
}

// Gathers every string in a structured output so the linter sees all generated prose at once.
export function collectText(v: unknown, acc: string[] = []): string {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectText(x, acc));
  else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach((x) => collectText(x, acc));
  return acc.join("\n");
}

// A small JSON-schema validator for the closed object schemas the library uses (type, enum, min/max,
// required, additionalProperties false, arrays, nested objects). Throws on the first problem.
export function validate<T>(value: unknown, schema: any, path = "$"): T {
  const t = schema.type;
  if (t === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected object`);
    const obj = value as Record<string, unknown>;
    for (const k of schema.required ?? []) if (!(k in obj)) throw new Error(`${path}.${k}: missing`);
    if (schema.additionalProperties === false) for (const k of Object.keys(obj)) if (!(k in (schema.properties ?? {}))) throw new Error(`${path}.${k}: unexpected`);
    for (const [k, sub] of Object.entries(schema.properties ?? {})) if (k in obj) validate(obj[k], sub, `${path}.${k}`);
    return value as T;
  }
  if (t === "array") {
    if (!Array.isArray(value)) throw new Error(`${path}: expected array`);
    value.forEach((x, i) => validate(x, schema.items, `${path}[${i}]`));
    return value as T;
  }
  if (t === "string") {
    if (typeof value !== "string") throw new Error(`${path}: expected string`);
    if (schema.enum && !schema.enum.includes(value)) throw new Error(`${path}: ${value} not in enum`);
    return value as T;
  }
  if (t === "integer" || t === "number") {
    if (typeof value !== "number" || (t === "integer" && !Number.isInteger(value))) throw new Error(`${path}: expected ${t}`);
    if (schema.minimum !== undefined && value < schema.minimum) throw new Error(`${path}: below minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) throw new Error(`${path}: above maximum`);
    return value as T;
  }
  if (t === "boolean") { if (typeof value !== "boolean") throw new Error(`${path}: expected boolean`); return value as T; }
  return value as T;
}

export type { ActionSpec };
