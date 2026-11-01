import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { BriefForm } from "@/components/write/BriefForm";

export const dynamic = "force-dynamic";

export default async function BriefPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/write/brief");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const [{ data: brief }, { data: outline }] = await Promise.all([
    sb.from("idea_briefs").select("*").eq("talk_id", talk.id).order("version", { ascending: false }).limit(1).maybeSingle(),
    sb.from("outlines").select("structure_template").eq("talk_id", talk.id).limit(1).maybeSingle(),
  ]);
  return <BriefForm talkId={talk.id} briefId={brief?.id ?? null} initial={(brief?.answers as Record<string, string>) ?? {}} isDraft={brief?.is_draft ?? true} completeness={(brief?.completeness as any) ?? null} slotMinutes={talk.slot_minutes} targetWpm={(talk as any).target_wpm ?? 150} measuredWpm={(talk as any).measured_wpm ?? null} template={outline?.structure_template ?? "ted_four_beat"} />;
}
