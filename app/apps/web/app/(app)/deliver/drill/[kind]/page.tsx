import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { loadDeliver } from "@/lib/deliver/load";
import { DRILLS, type DrillKind } from "@/lib/deliver/rules";
import { DrillRunner } from "@/components/deliver/DrillRunner";
import { SampleDrill } from "@/components/deliver/SampleDrill";

export const dynamic = "force-dynamic";

export default async function DrillPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ due?: string; sample?: string }> }) {
  const { kind } = await params; const sp = await searchParams;
  if (!DRILLS.some((d) => d.key === kind)) notFound();
  const user = await currentUser();
  if (!user) redirect(`/login?next=/deliver/drill/${kind}`);
  const ctx = await loadDeliver(user.id, sp.sample === "1");
  if (!ctx) redirect("/onboarding");
  if (ctx.sample) return <SampleDrill kind={kind as DrillKind} onlyDue={sp.due === "1"} talkId={ctx.talk.id} />;
  return <DrillRunner kind={kind as DrillKind} rows={ctx.rows} onlyDue={sp.due === "1"} sample={false} talkId={ctx.talk.id} />;
}
