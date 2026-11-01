"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/roles";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// Admin writes (9.5). The database checks the admin role again and audits every call.
const codeOf = (msg: string) => msg.split(":")[0].trim();
function bump() { for (const p of ["/admin", "/admin/members", "/admin/ai", "/admin/billing", "/admin/audit"]) revalidatePath(p); }
async function call(fn: string, args: Record<string, unknown>): Promise<ActionResult> {
  await assertAdmin();
  const sb = await supabaseServer();
  const { error } = await sb.rpc(fn, args);
  if (error) { const code = codeOf(error.message); return { ok: false, code, message: code === "CANNOT_DEMOTE_SELF" ? "You cannot remove your own admin role." : code === "NOT_FOUND" ? "Not found." : "Could not save." }; }
  bump();
  return { ok: true };
}
export async function setRole(userId: string, role: "member" | "coach" | "curator" | "admin", access: "invited" | "active" | "paused" | "removed") { return call("admin_set_role", { p_user: userId, p_role: role, p_access: access }); }
export async function setPlan(userId: string, plan: "spark" | "founding" | "regular", period: "monthly" | "six_month" | "twelve_month" | null, founding: boolean | null, endsAt: string | null, note: string) { return call("admin_set_plan", { p_user: userId, p_plan: plan, p_period: period, p_founding: founding, p_ends_at: endsAt, p_note: note }); }
export async function grantExtension(userId: string, until: string) { return call("admin_grant_extension", { p_user: userId, p_until: until }); }
export async function setFlag(key: string, enabled: boolean) { return call("admin_set_flag", { p_key: key, p_enabled: enabled }); }
export async function activatePrompt(action: string, version: string) { return call("admin_activate_prompt", { p_action: action, p_version: version }); }
