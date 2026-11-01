import { describe, it, expect } from "vitest";
import { runAiAction, AiActionError, collectText, validate, type AiDeps, type Member } from "@/lib/ai/runAiAction";
import { buildPrompt, registry, outputSchema } from "@onebigtalk/prompts";

const member: Member = { id: "u1", role: "member", plan: "founding", hasMemberAccess: true, aiEnabled: true };
const free: Member = { id: "u2", role: "member", plan: "spark", hasMemberAccess: false, aiEnabled: true };

// A fake world: counts every call so the tests can assert the credit flow precisely.
function fake(opts: { flags?: Record<string, boolean>; allowanceFails?: boolean; modelFails?: boolean; badOutput?: boolean; lintBlocking?: boolean; settled?: number } = {}) {
  const state = { reserved: [] as any[], settled: [] as any[], released: [] as any[], logs: [] as any[], allowances: [] as string[], fairUse: [] as string[], calls: 0, cache: new Map<string, any>() };
  const okOutputs: Record<string, unknown> = {
    outline: { sections: [{ id: "s1", kind: "hook", purpose: "care", talking_points: [{ id: "p1", kind: "story", text: "the 3 am shift", source: "brief", consent: "pseudonymized" }], story_slot: true, target_seconds: 90, target_words: 220, ending_point: false, claims_needing_sources: [] }], total_words: 220, notes: [] },
    script_section: { text: "It is three in the morning and the checklist has just been read aloud.", word_count: 14, covered_point_ids: ["p1"], uncovered: [], claims: [] },
    personalization: { fields: [{ key: "why_this", text: "Thresholds is the theme this year." }], what_changed: [], cautions: ["No local connection on file; none was invented."], theme_phrases_used: ["Thresholds"] },
    idea_scorecard: { scores: [{ criterion: 1, level: 1, reason: "be your authentic self is a platitude" }], gate_passed: false, fixes: ["name the belief it challenges"], similar_talks_to_check: [] },
    idea_test: { idea_or_topic: "topic", idea_or_pitch: "no", who_disagrees: "nobody yet", evidence_needed: "a number", open_questions: ["what changes", "for whom"] },
    beat_map: { beats: [{ order: 1, section_id: "s1", text: "It is three", first_words: "It is three", purpose: "care", target_seconds: 28 }] },
    linter: opts.lintBlocking
      ? { flags: [{ rule: "R2", quote: "my book", why: "selling", fix: "the research" }], self_promotion_score: 2, blocking: true }
      : { flags: [], self_promotion_score: 0, blocking: false },
  };
  const deps: AiDeps = {
    flagEnabled: async (k) => opts.flags?.[k] ?? false,
    consumeAllowance: async (_u, key) => { if (opts.allowanceFails) throw new Error("ALLOWANCE_EXHAUSTED: you have used this month's 3 script drafts. Resets 01 Dec."); state.allowances.push(key); },
    consumeFairUse: async (_u, key) => { state.fairUse.push(key); },
    reserveCredits: async (u, a, c, k) => { const r = { id: state.reserved.length + 1, status: "reserved", u, a, c, k }; state.reserved.push(r); return r; },
    settleCredits: async (id, llm) => { state.settled.push({ id, llm }); },
    releaseCredits: async (id, note) => { state.released.push({ id, note }); },
    creditsSettledThisMonth: async () => opts.settled ?? 0,
    callModel: async (model, _system, _user, schema) => {
      state.calls++;
      if (opts.modelFails && state.calls === 1) throw new Error("boom");
      const key = Object.entries(okOutputs).find(([k]) => JSON.stringify(outputSchema(k)) === JSON.stringify(schema))?.[0] ?? "linter";
      const out = opts.badOutput && key !== "linter" ? { nonsense: true } : okOutputs[key];
      return { text: JSON.stringify(out), inputTokens: 1000, outputTokens: 300, cacheReadTokens: 800, latencyMs: 900 };
    },
    logCall: async (row) => { state.logs.push(row); return `llm_${state.logs.length}`; },
    getCachedResult: async (u, k) => state.cache.get(`${u}:${k}`) ?? null,
    putCachedResult: async (u, k, r) => { state.cache.set(`${u}:${k}`, r); },
  };
  return { deps, state };
}

const outlineVars = { slot_minutes: 10, target_wpm: 150, word_budget: 1450, structure_template: "ted_four_beat", idea_brief: {}, idea_json: {}, expansion_json: {}, profile: {} };

describe("runAiAction gates", () => {
  it("refuses an outline from a brief under 500 characters, with nothing charged", async () => {
    const { deps, state } = fake();
    await expect(runAiAction("outline", outlineVars, member, { briefCharCount: 499, ideaLocked: true }, "k1", deps)).rejects.toMatchObject({ code: "BRIEF_TOO_SHORT" });
    expect(state.reserved).toHaveLength(0); expect(state.allowances).toHaveLength(0); expect(state.calls).toBe(0);
  });
  it("accepts an outline at exactly 500 characters", async () => {
    const { deps, state } = fake();
    const r = await runAiAction("outline", outlineVars, member, { briefCharCount: 500, ideaLocked: true }, "k2", deps);
    expect(r.creditsCharged).toBe(20); expect(state.allowances).toEqual(["outline"]); expect(state.settled).toHaveLength(1);
  });
  it("refuses a script section until the outline is final", async () => {
    const { deps, state } = fake();
    await expect(runAiAction("script_section", { section_id: "s1", kind: "hook", target_words: 200, writing_sample: "", outline_json: {}, prior_text: "", profile: {} }, member, { outlineStatus: "draft" }, "k3", deps)).rejects.toMatchObject({ code: "OUTLINE_NOT_FINAL" });
    expect(state.calls).toBe(0);
  });
  it("refuses personalization before the research step", async () => {
    const { deps } = fake();
    await expect(runAiAction("personalization", { pitch_pack: {}, event_json: {}, form_fields: [], profile: {} }, member, { researchComplete: false }, "k4", deps)).rejects.toMatchObject({ code: "RESEARCH_STEP_INCOMPLETE" });
  });
  it("respects an organizer AI prohibition only when the flag is on (deferred feature)", async () => {
    const vars = { pitch_pack: {}, event_json: {}, form_fields: [], profile: {} };
    const off = fake();
    const r = await runAiAction("personalization", vars, member, { researchComplete: true, eventAiPolicy: "prohibited" }, "k5", off.deps);
    expect(r.output).toBeTruthy();
    const on = fake({ flags: { organizer_ai_policy_gate: true } });
    await expect(runAiAction("personalization", vars, member, { researchComplete: true, eventAiPolicy: "prohibited" }, "k6", on.deps)).rejects.toMatchObject({ code: "AI_PROHIBITED_BY_ORGANIZER" });
  });
  it("requires a member plan for member actions and lets a free member score an idea", async () => {
    const { deps } = fake();
    await expect(runAiAction("outline", outlineVars, free, { briefCharCount: 900, ideaLocked: true }, "k7", deps)).rejects.toMatchObject({ code: "PLAN_REQUIRED" });
    const r = await runAiAction("idea_scorecard", { idea_json: {} }, free, {}, "k8", deps);
    expect((r.output as any).gate_passed).toBe(false);
  });
  it("allows the public Idea Test with no member and charges nothing", async () => {
    const { deps, state } = fake();
    const r = await runAiAction("idea_test", { sentence: "Be your authentic self" }, null, {}, "k9", deps);
    expect(r.creditsCharged).toBe(0); expect(state.reserved).toHaveLength(0); expect(state.logs[0].userId).toBe("public");
  });
  it("blocks when the member has switched AI off", async () => {
    const { deps } = fake();
    await expect(runAiAction("idea_scorecard", { idea_json: {} }, { ...member, aiEnabled: false }, {}, "k10", deps)).rejects.toMatchObject({ code: "AI_DISABLED" });
  });
  it("requires a locked script for the beat map", async () => {
    const { deps } = fake();
    await expect(runAiAction("beat_map", { script_json: {}, target_wpm: 150 }, member, { scriptLocked: false }, "k11", deps)).rejects.toMatchObject({ code: "SCRIPT_NOT_LOCKED" });
  });
});

describe("runAiAction credits and allowances", () => {
  it("translates an exhausted allowance into plain words and charges nothing", async () => {
    const { deps, state } = fake({ allowanceFails: true });
    await expect(runAiAction("outline", outlineVars, member, { briefCharCount: 900, ideaLocked: true }, "k12", deps)).rejects.toMatchObject({ code: "ALLOWANCE_EXHAUSTED", message: "You have used this month's 3 script drafts. Resets 01 Dec." });
    expect(state.reserved).toHaveLength(0);
  });
  it("releases the reservation when the model fails and logs the failure", async () => {
    const { deps, state } = fake({ modelFails: true });
    await expect(runAiAction("outline", outlineVars, member, { briefCharCount: 900, ideaLocked: true }, "k13", deps)).rejects.toMatchObject({ code: "MODEL_FAILED", message: "That didn't work. You weren't charged a credit. Try again." });
    expect(state.released).toHaveLength(1); expect(state.settled).toHaveLength(0); expect(state.logs[0].status).toBe("error");
  });
  it("releases the reservation when the output fails the schema", async () => {
    const { deps, state } = fake({ badOutput: true });
    await expect(runAiAction("outline", outlineVars, member, { briefCharCount: 900, ideaLocked: true }, "k14", deps)).rejects.toMatchObject({ code: "BAD_OUTPUT" });
    expect(state.released).toHaveLength(1);
  });
  it("a retry with the same idempotency key returns the cached result and charges once", async () => {
    const { deps, state } = fake();
    const a = await runAiAction("outline", outlineVars, member, { briefCharCount: 900, ideaLocked: true }, "k15", deps);
    const b = await runAiAction("outline", outlineVars, member, { briefCharCount: 900, ideaLocked: true }, "k15", deps);
    expect(a.llmCallId).toBe(b.llmCallId); expect(state.reserved).toHaveLength(1); expect(state.allowances).toHaveLength(1);
  });
  it("stops at the monthly credit cap", async () => {
    const { deps } = fake({ settled: 1190 });
    await expect(runAiAction("outline", outlineVars, member, { briefCharCount: 900, ideaLocked: true }, "k16", deps)).rejects.toMatchObject({ code: "COST_CAP_REACHED" });
  });
  it("logs cost from token counts including cache reads", async () => {
    const { deps, state } = fake();
    await runAiAction("outline", outlineVars, member, { briefCharCount: 900, ideaLocked: true }, "k17", deps);
    const main = state.logs.find((l) => l.actionKey === "outline");
    // sonnet: 1000 in at $2/M + 300 out at $10/M + 800 cache at $0.10/M
    expect(main.costUsd).toBeCloseTo((1000 * 2 + 300 * 10 + 800 * 0.1) / 1e6, 9);
    expect(main.promptVersion).toBe("outline.v1");
  });
});

describe("runAiAction linter", () => {
  it("returns blocking flags with the output and marks the call blocked_by_linter", async () => {
    const { deps, state } = fake({ lintBlocking: true });
    const r = await runAiAction("outline", outlineVars, member, { briefCharCount: 900, ideaLocked: true }, "k18", deps);
    expect(r.blocking).toBe(true); expect(r.flags[0].rule).toBe("R2");
    expect(state.logs.find((l) => l.actionKey === "outline").status).toBe("blocked_by_linter");
    expect(state.logs.some((l) => l.actionKey === "linter")).toBe(true);
  });
  it("does not lint scoring actions", async () => {
    const { deps, state } = fake();
    await runAiAction("idea_scorecard", { idea_json: {} }, member, {}, "k19", deps);
    expect(state.calls).toBe(1);
  });
});

describe("prompt library", () => {
  it("every prompt starts with the shared preamble carrying R10 and R11", () => {
    for (const key of Object.keys(registry.actions)) {
      const p = buildPrompt(key, new Proxy({}, { get: () => "x", has: () => true }) as any);
      expect(p.system).toContain("R10 Fresh idea, experienced speaker");
      expect(p.system).toContain("R11 Write only from what the speaker wrote");
      expect(p.system).not.toContain(String.fromCharCode(0x2014));
    }
  });
  it("rendering fails loudly on a missing placeholder", () => {
    expect(() => buildPrompt("outline", { slot_minutes: 10 })).toThrow(/MISSING_PLACEHOLDERS/);
  });
  it("routes drafts to Sonnet and scoring to Haiku", () => {
    expect(registry.actions.outline.model).toBe("sonnet");
    expect(registry.actions.script_section.model).toBe("sonnet");
    expect(registry.actions.idea_scorecard.model).toBe("haiku");
    expect(registry.actions.linter.model).toBe("haiku");
    expect(registry.actions.readiness_review.model).toBe("haiku");
  });
  it("the validator rejects unexpected keys and out-of-range levels", () => {
    expect(() => validate({ scores: [{ criterion: 1, level: 5, reason: "x" }], gate_passed: true, fixes: [], similar_talks_to_check: [] }, outputSchema("idea_scorecard"))).toThrow(/above maximum/);
    expect(() => validate({ extra: 1 }, outputSchema("idea_test"))).toThrow(/missing|unexpected/);
  });
  it("collectText gathers every string for the linter", () => {
    expect(collectText({ a: "one", b: ["two", { c: "three" }], d: 4 })).toBe("one\ntwo\nthree");
  });
});
