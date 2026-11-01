import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { IdeaCardDetail, type Expansion, type IdeaDetail } from "@/components/idea-lab/IdeaCardDetail";

export const dynamic = "force-dynamic";

export default async function IdeaCardPage({ params }: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/find/idea-lab/${ideaId}`);
  const sb = await supabaseServer();
  const [{ data: idea }, { data: expansion }, { data: allowance }] = await Promise.all([
    sb.from("ideas").select("*").eq("id", ideaId).maybeSingle(),
    sb.from("idea_expansions").select("*").eq("idea_id", ideaId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("allowances").select("fair_use_scorecards_used").eq("user_id", user.id).order("period_start", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!idea) notFound();
  const { data: locked } = await sb.from("ideas").select("id").eq("talk_id", idea.talk_id).eq("status", "locked").maybeSingle();
  const canLock = !locked || locked.id === idea.id;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/find/idea-lab" className="t-compact text-[var(--text-secondary)]">← Idea Lab</Link>
      <IdeaCardDetail idea={idea as IdeaDetail} expansion={(expansion as Expansion) ?? null} canLock={canLock} scorecardsLeft={allowance ? Math.max(0, 60 - allowance.fair_use_scorecards_used) : null} />
    </div>
  );
}
