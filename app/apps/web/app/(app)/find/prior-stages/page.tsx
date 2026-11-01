import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { PriorStages, type StageRow } from "@/components/prior-stages/PriorStages";

export const dynamic = "force-dynamic";

// S3.9. The overlap check runs server-side for every entry against the talk's locked idea.
export default async function PriorStagesPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/find/prior-stages");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const [{ data: stages }, { data: idea }, { data: access }] = await Promise.all([
    sb.from("prior_stages").select("*").eq("user_id", user.id).order("year", { ascending: false, nullsFirst: false }).order("month", { ascending: false, nullsFirst: false }),
    sb.from("ideas").select("title_working, throughline, belief_challenged").eq("talk_id", talk.id).eq("status", "locked").maybeSingle(),
    sb.rpc("has_member_access", { p_user: user.id }),
  ]);
  const rows = (stages ?? []) as StageRow[];
  const overlaps: Record<string, { score: number; isOverlap: boolean; sharedWords: string[] }> = {};
  if (idea) {
    await Promise.all(rows.map(async (s) => {
      const { data } = await sb.rpc("prior_stage_overlap", { p_stage: s.id, p_talk: talk.id });
      const row = Array.isArray(data) ? data[0] : data;
      if (row) overlaps[s.id] = { score: Number(row.score), isOverlap: !!row.is_overlap, sharedWords: row.shared_words ?? [] };
    }));
  }
  const lockedText = idea ? [idea.title_working, idea.throughline, idea.belief_challenged].filter(Boolean).join(" ") : null;
  return <PriorStages talkId={talk.id} stages={rows} lockedIdeaText={lockedText} hasMemberAccess={!!access} overlaps={overlaps} />;
}
