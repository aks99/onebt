import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AiDeps, AiResult, ModelResult } from "./runAiAction";

// Real dependencies: Supabase (service role, after the caller has verified the member) and the Claude API
// with structured output through a single forced tool whose input schema is the action's output schema.

export function anthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function callClaude(modelId: string, system: string, user: string, schema: Record<string, unknown>, maxTokens: number): Promise<ModelResult> {
  const t0 = Date.now();
  const client = anthropic();
  const msg = await client.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    tools: [{ name: "return_result", description: "Return the result in the required structure.", input_schema: schema as any }],
    tool_choice: { type: "tool", name: "return_result" },
  });
  const tool = msg.content.find((c) => c.type === "tool_use") as { input: unknown } | undefined;
  if (!tool) throw new Error("no structured output");
  const usage: any = msg.usage;
  return {
    text: JSON.stringify(tool.input),
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    latencyMs: Date.now() - t0,
  };
}

export function realAiDeps(): AiDeps {
  const db = supabaseAdmin();
  const cache = new Map<string, AiResult>();   // per-process; the ledger's idempotency key is the durable guard
  return {
    async flagEnabled(key) { const { data } = await db.from("feature_flags").select("enabled").eq("key", key).maybeSingle(); return !!data?.enabled; },
    async consumeAllowance(userId, key) { const { error } = await db.rpc("consume_allowance", { p_user: userId, p_key: key }); if (error) throw new Error(error.message); },
    async consumeFairUse(userId, key, cap) { const { error } = await db.rpc("consume_fair_use", { p_user: userId, p_key: key, p_cap: cap }); if (error) throw new Error(error.message); },
    async reserveCredits(userId, action, credits, idempotencyKey, talkId) {
      const { data, error } = await db.rpc("reserve_credits", { p_user: userId, p_action: action, p_credits: credits, p_idempotency_key: idempotencyKey, p_talk: talkId ?? null });
      if (error) throw new Error(error.message);
      return data as { id: number; status: string };
    },
    async settleCredits(id, llmCallId) { await db.rpc("settle_credits", { p_ledger_id: id, p_llm_call: llmCallId }); },
    async releaseCredits(id, note) { await db.rpc("release_credits", { p_ledger_id: id, p_note: note }); },
    async creditsSettledThisMonth(userId) { const { data } = await db.rpc("credits_settled_this_month", { p_user: userId }); return Number(data ?? 0); },
    callModel: callClaude,
    async logCall(row) {
      const { data } = await db.from("llm_calls").insert({
        user_id: row.userId === "public" ? null : row.userId, talk_id: row.talkId ?? null, action_key: row.actionKey, model: row.model, prompt_version: row.promptVersion,
        input_tokens: row.inputTokens, output_tokens: row.outputTokens, cache_read_tokens: row.cacheReadTokens, cost_usd: row.costUsd, latency_ms: row.latencyMs,
        credits_charged: row.creditsCharged, status: row.status, error_code: row.errorCode ?? null,
      }).select("id").single();
      return data?.id ?? "";
    },
    async getCachedResult(userId, key) { return cache.get(`${userId}:${key}`) ?? null; },
    async putCachedResult(userId, key, result) { cache.set(`${userId}:${key}`, result); },
  };
}
