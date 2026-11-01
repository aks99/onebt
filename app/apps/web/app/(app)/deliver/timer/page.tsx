import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { loadDeliver } from "@/lib/deliver/load";
import { TimerScreen, type RunRow } from "@/components/deliver/TimerScreen";

export const dynamic = "force-dynamic";

export default async function TimerPage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/deliver/timer");
  const sp = await searchParams;
  const ctx = await loadDeliver(user.id, sp.sample === "1");
  if (!ctx) redirect("/onboarding");
  const sb = await supabaseServer();
  const { data: runs } = ctx.sample ? { data: [] as RunRow[] } : await sb.rpc("recent_runs", { p_talk: ctx.talk.id, p_limit: 10 });
  return <TimerScreen talkId={ctx.talk.id} beats={ctx.beats} doc={ctx.doc} slotMinutes={ctx.slotMinutes} targetWpm={ctx.talk.target_wpm ?? 150} measuredWpm={ctx.sample ? null : ctx.talk.measured_wpm} wordCount={ctx.wordCount} runs={(runs ?? []) as RunRow[]} sample={ctx.sample} />;
}
