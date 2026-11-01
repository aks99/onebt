import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@onebigtalk/ui";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { FactcheckPanel, type ClaimItem } from "@/components/write/FactcheckPanel";
import { numbersIn, type ScriptDoc } from "@/lib/write/rules";

export const dynamic = "force-dynamic";

// S4.4 Fact-check panel. The slides checklist is V2 (owner decision); the page carries the claims only.
export default async function FactcheckPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/write/factcheck");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const { data: script } = await sb.from("scripts").select("id, locked_version_id").eq("talk_id", talk.id).limit(1).maybeSingle();
  if (!script) return <Card><p className="t-body text-[var(--text-secondary)]">Write a script first. <Link href="/write/script" className="underline">Open Script Studio</Link>.</p></Card>;
  const { data: v } = script.locked_version_id ? await sb.from("script_versions").select("id, version, doc").eq("id", script.locked_version_id).maybeSingle() : await sb.from("script_versions").select("id, version, doc").eq("script_id", script.id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!v) return <Card><p className="t-body text-[var(--text-secondary)]">No draft yet. <Link href="/write/script" className="underline">Write the first draft</Link>.</p></Card>;
  const { data: claims } = await sb.from("claims").select("*").eq("script_version_id", v.id).order("created_at");
  const doc = v.doc as ScriptDoc;
  const numbers = numbersIn(doc.sections.map((s) => s.text).join(" "));
  return <FactcheckPanel versionId={v.id} version={v.version} claims={(claims ?? []) as ClaimItem[]} sections={doc.sections.map((s) => ({ id: s.id, title: s.title }))} numbersInScript={numbers} />;
}
