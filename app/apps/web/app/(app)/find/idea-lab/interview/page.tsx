import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { InterviewForm } from "@/components/idea-lab/InterviewForm";

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/find/idea-lab/interview");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const { data } = await sb.from("idea_dossiers").select("answers").eq("talk_id", talk.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return (
    <div className="mx-auto w-full max-w-2xl">
      <InterviewForm talkId={talk.id} initial={(data?.answers as Record<string, string>) ?? {}} />
      <p className="mt-4 t-metadata text-[var(--text-muted)]">Written answers only. Nothing is recorded. Your answers stay private and are read by the Idea Lab to write ideas in your words.</p>
    </div>
  );
}
