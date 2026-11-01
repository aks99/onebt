import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { PitchStudio, type PackRow } from "@/components/pipeline/PitchStudio";

export const dynamic = "force-dynamic";

export default async function PitchPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/find/pitch");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const [{ data: pack }, { data: idea }, { count: samples }, { data: access }] = await Promise.all([
    sb.from("pitch_packs").select("*").eq("talk_id", talk.id).order("version", { ascending: false }).limit(1).maybeSingle(),
    sb.from("ideas").select("id").eq("talk_id", talk.id).eq("status", "locked").maybeSingle(),
    sb.from("writing_samples").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    sb.rpc("has_member_access", { p_user: user.id }),
  ]);
  return <PitchStudio pack={(pack as PackRow) ?? null} hasLockedIdea={!!idea} hasSample={(samples ?? 0) > 0} packsLeft={access ? null : pack ? 0 : 1} />;
}
