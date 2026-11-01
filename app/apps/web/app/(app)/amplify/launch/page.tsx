import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { Launch } from "@/components/amplify/Launch";
import type { CopyKit, PlanItem, PublicationState, UploadPack } from "@/lib/amplify/rules";

export const dynamic = "force-dynamic";

export default async function LaunchPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/amplify/launch");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const [{ data: t }, { data: lp }, { data: profile }, { data: idea }, { data: access }, { data: publishedTalks }] = await Promise.all([
    sb.from("talks").select("publication, published_url, published_at, event_date, event_name_manual, events(name)").eq("id", talk.id).maybeSingle(),
    sb.from("launch_plans").select("plan, copy_kit, upload_pack, organizer_timeline, expected_upload_window").eq("talk_id", talk.id).maybeSingle(),
    sb.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    sb.from("ideas").select("id").eq("talk_id", talk.id).eq("status", "locked").maybeSingle(),
    sb.rpc("has_member_access", { p_user: user.id }),
    sb.rpc("published_talk_count"),
  ]);
  const window = (lp?.expected_upload_window as string | null)?.match(/\d{4}-\d{2}-\d{2}/g) ?? null;
  const eventName = ((t as any)?.events?.name as string | undefined) ?? (t as any)?.event_name_manual ?? "the TEDx event";
  const year = t?.event_date ? new Date(t.event_date).getUTCFullYear() : new Date().getUTCFullYear();
  return <Launch talkId={talk.id} publication={(t?.publication as PublicationState) ?? "not_delivered"} publishedUrl={t?.published_url ?? null} publishedAt={t?.published_at ?? null} eventName={eventName} eventDate={t?.event_date ?? null} year={year}
    organizerTimeline={lp?.organizer_timeline ?? null} windowStart={window?.[0] ?? null} windowEnd={window?.[1] ?? window?.[0] ?? null}
    plan={((lp?.plan as PlanItem[] | null) ?? [])} kit={((lp?.copy_kit as CopyKit | null) ?? {})} pack={((lp?.upload_pack as UploadPack | null) ?? {})}
    displayName={profile?.display_name ?? ""} hasMemberAccess={!!access} ideaLocked={!!idea} publishedTalks={Number(publishedTalks ?? 0)} todayIso={new Date().toISOString().slice(0, 10)} />;
}
