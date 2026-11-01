import type { SupabaseClient } from "@supabase/supabase-js";
import type { GateContext, Member } from "./runAiAction";

// Builds the Member and the GateContext for an action from what the database says, never from what the
// client claims. The client sends ids; the server reads the facts the gates need.

export async function loadMember(db: SupabaseClient, userId: string): Promise<Member> {
  const [{ data: role }, { data: m }, { data: p }, { data: access }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    db.from("memberships").select("plan").eq("user_id", userId).maybeSingle(),
    db.from("profiles").select("ai_enabled").eq("user_id", userId).maybeSingle(),
    db.rpc("has_member_access", { p_user: userId }),
  ]);
  return { id: userId, role: (role?.role ?? "member") as Member["role"], plan: (m?.plan ?? "spark") as Member["plan"], hasMemberAccess: !!access, aiEnabled: p?.ai_enabled ?? true };
}

export interface ActionRequest {
  talkId?: string; briefId?: string; outlineVersionId?: string; applicationId?: string; scriptId?: string; dossierId?: string;
  vars: Record<string, unknown>;
  idempotencyKey?: string;
}

export async function loadGateContext(db: SupabaseClient, userId: string, req: ActionRequest): Promise<GateContext> {
  const ctx: GateContext = { talkId: req.talkId };
  const tasks: Promise<void>[] = [];
  if (req.talkId) tasks.push((async () => {
    const { data } = await db.from("ideas").select("id").eq("talk_id", req.talkId!).eq("user_id", userId).eq("status", "locked").maybeSingle();
    ctx.ideaLocked = !!data;
  })());
  if (req.briefId) tasks.push((async () => {
    const { data } = await db.from("idea_briefs").select("char_count, is_draft").eq("id", req.briefId!).eq("user_id", userId).maybeSingle();
    ctx.briefCharCount = data && !data.is_draft ? data.char_count : 0;
  })());
  if (req.outlineVersionId) tasks.push((async () => {
    const { data } = await db.from("outline_versions").select("status").eq("id", req.outlineVersionId!).eq("user_id", userId).maybeSingle();
    ctx.outlineStatus = (data?.status as GateContext["outlineStatus"]) ?? "draft";
  })());
  if (req.applicationId) tasks.push((async () => {
    const { data } = await db.from("applications").select("research_answers, event_id").eq("id", req.applicationId!).eq("user_id", userId).maybeSingle();
    const ra = data?.research_answers as Record<string, string> | null;
    ctx.researchComplete = !!ra && ["theme_in_own_words", "past_talk_watched", "why_this_audience"].every((k) => (ra[k] ?? "").trim().length >= 20);
    if (data?.event_id) {
      const { data: ev } = await db.from("events").select("ai_policy").eq("id", data.event_id).maybeSingle();
      ctx.eventAiPolicy = (ev?.ai_policy as GateContext["eventAiPolicy"]) ?? "unknown";
    }
  })());
  if (req.scriptId) tasks.push((async () => {
    const { data } = await db.from("scripts").select("locked_version_id").eq("id", req.scriptId!).eq("user_id", userId).maybeSingle();
    ctx.scriptLocked = !!data?.locked_version_id;
  })());
  if (req.dossierId) tasks.push((async () => {
    const { data } = await db.from("idea_dossiers").select("answers, pasted_material").eq("id", req.dossierId!).eq("user_id", userId).maybeSingle();
    const answers = Object.values((data?.answers as Record<string, string>) ?? {}).join("");
    ctx.dossierCharCount = answers.length + (data?.pasted_material?.length ?? 0);
  })());
  await Promise.all(tasks);
  return ctx;
}
