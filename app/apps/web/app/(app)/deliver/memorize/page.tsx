import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { loadDeliver } from "@/lib/deliver/load";
import { Memorize } from "@/components/deliver/Memorize";

export const dynamic = "force-dynamic";

export default async function MemorizePage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/deliver/memorize");
  const sp = await searchParams;
  const ctx = await loadDeliver(user.id, sp.sample === "1");
  if (!ctx) redirect("/onboarding");
  return <Memorize talkId={ctx.talk.id} rows={ctx.rows} scriptLocked={ctx.scriptLocked} lockedVersion={ctx.lockedVersion} sample={ctx.sample} slotMinutes={ctx.slotMinutes} title={ctx.title} />;
}
