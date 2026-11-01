import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { OutlineEditor, type OutlineVersionRow } from "@/components/write/OutlineEditor";
import type { OutlineDoc } from "@/lib/write/rules";

export const dynamic = "force-dynamic";

export default async function OutlinePage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/write/outline");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: brief }, { data: outline }, { data: allowance }] = await Promise.all([
    sb.from("idea_briefs").select("id").eq("talk_id", talk.id).eq("is_draft", false).order("version", { ascending: false }).limit(1).maybeSingle(),
    sb.from("outlines").select("id").eq("talk_id", talk.id).limit(1).maybeSingle(),
    sb.from("allowances").select("outlines_allowed, outlines_used").eq("user_id", user.id).order("period_start", { ascending: false }).limit(1).maybeSingle(),
  ]);
  let versions: OutlineVersionRow[] = []; let current: any = null; let hasScript = false;
  if (outline) {
    const { data: vs } = await sb.from("outline_versions").select("id, version, status, source, created_at, finalized_at, doc").eq("outline_id", outline.id).order("version", { ascending: false });
    versions = (vs ?? []).map(({ doc, ...r }) => r as OutlineVersionRow);
    current = (vs ?? []).find((v) => v.id === sp.v) ?? (vs ?? []).find((v) => v.status === "final") ?? (vs ?? [])[0] ?? null;
    const { count } = await sb.from("scripts").select("id", { count: "exact", head: true }).eq("talk_id", talk.id);
    hasScript = (count ?? 0) > 0;
  }
  return <OutlineEditor talkId={talk.id} versionId={current?.id ?? null} doc={(current?.doc as OutlineDoc) ?? null} status={current?.status ?? null} versions={versions} slotMinutes={talk.slot_minutes} hasBrief={!!brief} outlinesLeft={allowance ? Math.max(0, allowance.outlines_allowed - allowance.outlines_used) : null} hasScript={hasScript} />;
}
