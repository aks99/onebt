import { notFound, redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { ApplicationDetail, type AppDetail, type AppEvent } from "@/components/pipeline/ApplicationDetail";
import { fieldsForEvent } from "@/lib/pipeline/formMapper";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/find/applications/${appId}`);
  const sb = await supabaseServer();
  const { data: app } = await sb.from("applications").select("*, events(*)").eq("id", appId).maybeSingle();
  if (!app) notFound();
  const [{ data: pack }, { data: allowance }, { data: access }] = await Promise.all([
    sb.from("pitch_packs").select("id").eq("talk_id", app.talk_id).limit(1).maybeSingle(),
    sb.from("allowances").select("tailored_applications_allowed, tailored_applications_used").eq("user_id", user.id).order("period_start", { ascending: false }).limit(1).maybeSingle(),
    sb.rpc("has_member_access", { p_user: user.id }),
  ]);
  const e = (app as any).events ?? {};
  const ev: AppEvent = { id: e.id ?? null, name: e.name ?? app.event_name_manual ?? "Event", city: e.city ?? null, country_code: e.country_code ?? null, theme: e.theme ?? null, form_url: e.form_url ?? null, application_deadline: e.application_deadline ?? null, ai_policy: e.ai_policy ?? "unknown", ai_policy_snippet: e.ai_policy_snippet ?? null, talk_length_target: e.talk_length_target ?? null, local_connection_required: e.local_connection_required ?? null, pitch_video_required: e.pitch_video_required ?? null, expired: !!e.expired };
  return <ApplicationDetail app={app as unknown as AppDetail} ev={ev} fields={fieldsForEvent(e.form_fields)} hasPack={!!pack} tailoredLeft={allowance ? Math.max(0, allowance.tailored_applications_allowed - allowance.tailored_applications_used) : null} hasMemberAccess={!!access} />;
}
