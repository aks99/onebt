import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { realAiDeps } from "./deps";
import { loadGateContext, loadMember, type ActionRequest } from "./context";
import { AiActionError, runAiAction, type AiResult } from "./runAiAction";

// Server actions call the AI through here. Same door as /api/ai/<action>: member and gate facts are read from
// the database, never trusted from the client. Returns either the result or a plain-language error.

export type AiOutcome<T> = { ok: true; result: AiResult<T> } | { ok: false; code: string; message: string; detail?: unknown };

export async function runActionForUser<T = unknown>(action: string, req: ActionRequest): Promise<AiOutcome<T>> {
  const user = await currentUser();
  if (!user) return { ok: false, code: "NOT_AUTHENTICATED", message: "Log in to use this." };
  const db = supabaseAdmin();
  const member = await loadMember(db, user.id);
  const ctx = await loadGateContext(db, user.id, req);
  try {
    const result = await runAiAction<T>(action, req.vars ?? {}, member, ctx, req.idempotencyKey ?? randomUUID(), realAiDeps());
    return { ok: true, result };
  } catch (e) {
    if (e instanceof AiActionError) return { ok: false, code: e.code, message: e.message, detail: e.detail };
    return { ok: false, code: "MODEL_FAILED", message: "That didn't work. You weren't charged a credit. Try again." };
  }
}

// Profile text the idea prompts read ({{profile}}): plain lines, nothing the member did not type.
export function profileText(p: { expertise_line?: string | null; city?: string | null; country_code?: string | null; segment?: string | null; display_name?: string | null } | null) {
  if (!p) return "";
  return [
    p.display_name ? `Name: ${p.display_name}` : null,
    p.expertise_line ? `Expertise: ${p.expertise_line}` : null,
    p.city || p.country_code ? `Based in: ${[p.city, p.country_code].filter(Boolean).join(", ")}` : null,
  ].filter(Boolean).join("\n");
}
