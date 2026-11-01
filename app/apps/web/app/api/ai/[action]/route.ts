import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { realAiDeps } from "@/lib/ai/deps";
import { loadGateContext, loadMember, type ActionRequest } from "@/lib/ai/context";
import { AiActionError, runAiAction } from "@/lib/ai/runAiAction";
import { actionSpec } from "@onebigtalk/prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/ai/<action> with { vars, talkId?, briefId?, outlineVersionId?, applicationId?, scriptId?, dossierId?, idempotencyKey? }
// Every AI action in the product passes through here and through runAiAction. Nothing else calls the model.
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  let spec; try { spec = actionSpec(action); } catch { return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 404 }); }
  const body = (await req.json().catch(() => ({}))) as ActionRequest;
  const user = spec.plan === "public" ? null : await currentUser();
  if (spec.plan !== "public" && !user) return NextResponse.json({ error: "NOT_AUTHENTICATED", message: "Log in to use this." }, { status: 401 });
  const db = supabaseAdmin();
  const member = user ? await loadMember(db, user.id) : null;
  const ctx = user ? await loadGateContext(db, user.id, body) : {};
  const key = body.idempotencyKey ?? randomUUID();
  try {
    const result = await runAiAction(action, body.vars ?? {}, member, ctx, key, realAiDeps());
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AiActionError) {
      const status = e.code === "NOT_AUTHENTICATED" ? 401 : e.code === "PLAN_REQUIRED" || e.code === "FEATURE_OFF" || e.code === "AI_DISABLED" ? 403
        : ["BRIEF_TOO_SHORT", "OUTLINE_NOT_FINAL", "RESEARCH_STEP_INCOMPLETE", "AI_PROHIBITED_BY_ORGANIZER", "IDEA_NOT_LOCKED", "SCRIPT_NOT_LOCKED", "DOSSIER_TOO_SHORT"].includes(e.code) ? 409
        : ["ALLOWANCE_EXHAUSTED", "FAIR_USE_REACHED", "COST_CAP_REACHED", "TRIAL_LIMIT"].includes(e.code) ? 429 : 502;
      return NextResponse.json({ error: e.code, message: e.message, detail: e.detail ?? null }, { status });
    }
    return NextResponse.json({ error: "MODEL_FAILED", message: "That didn't work. You weren't charged a credit. Try again." }, { status: 502 });
  }
}
