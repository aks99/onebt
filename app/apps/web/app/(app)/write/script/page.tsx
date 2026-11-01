import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { ScriptStudio, type VersionRow } from "@/components/write/ScriptStudio";
import type { OutlineDoc, ScriptDoc, ScriptRubric } from "@/lib/write/rules";

export const dynamic = "force-dynamic";

export default async function ScriptPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/write/script");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: finalV }, { data: script }, { data: allowance }, { data: access }] = await Promise.all([
    sb.from("outline_versions").select("id, doc, finalized_at, outlines!inner(talk_id)").eq("status", "final").eq("outlines.talk_id", talk.id).maybeSingle(),
    sb.from("scripts").select("*").eq("talk_id", talk.id).limit(1).maybeSingle(),
    sb.from("allowances").select("script_drafts_allowed, script_drafts_used, editing_passes_allowed, editing_passes_used").eq("user_id", user.id).order("period_start", { ascending: false }).limit(1).maybeSingle(),
    sb.rpc("has_member_access", { p_user: user.id }),
  ]);
  let versions: VersionRow[] = []; let current: any = null; let outlineChanged = false;
  if (script) {
    const { data: vs } = await sb.from("script_versions").select("id, version, source, pass_key, word_count, est_seconds, post_lock, created_at, rubric, doc").eq("script_id", script.id).order("version", { ascending: false });
    versions = (vs ?? []).map(({ doc, ...r }) => r as VersionRow);
    current = (vs ?? []).find((v) => v.id === sp.v) ?? (vs ?? []).find((v) => v.id === script.locked_version_id) ?? (vs ?? [])[0] ?? null;
    outlineChanged = !!finalV?.finalized_at && !!current && new Date(finalV.finalized_at) > new Date(current.created_at) && finalV.id !== script.outline_version_id;
  }
  return <ScriptStudio talkId={talk.id} scriptId={script?.id ?? null} outline={(finalV?.doc as OutlineDoc) ?? null} outlineFinal={!!finalV} outlineChangedAfterScript={outlineChanged} doc={(current?.doc as ScriptDoc) ?? null} versionId={current?.id ?? null} versions={versions} lockedVersionId={script?.locked_version_id ?? null} slotMinutes={script?.slot_minutes ?? talk.slot_minutes} targetWpm={script?.target_wpm ?? (talk as any).target_wpm ?? 150} measuredWpm={(talk as any).measured_wpm ?? null} rubric={(current?.rubric as ScriptRubric) ?? null} deadline={script?.organizer_script_deadline ?? null} hasMemberAccess={!!access} draftsLeft={allowance ? Math.max(0, allowance.script_drafts_allowed - allowance.script_drafts_used) : null} passesLeft={allowance ? Math.max(0, allowance.editing_passes_allowed - allowance.editing_passes_used) : null} />;
}
