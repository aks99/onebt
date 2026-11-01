import Link from "next/link";
import { redirect } from "next/navigation";
import { AllowanceMeter, Card } from "@onebigtalk/ui";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { readAllowances } from "@/lib/allowances";
import { IdeaSpark } from "@/components/idea-lab/IdeaSpark";
import { IdeaGrid, type IdeaRow } from "@/components/idea-lab/IdeaGrid";
import { interviewProgress } from "@/lib/find/interview";

export const dynamic = "force-dynamic";

// S3.1 Idea Lab home: ideas for this talk, generate more, lock one, compare two.
export default async function IdeaLabPage({ searchParams }: { searchParams: Promise<{ compare?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/find/idea-lab");
  const talk = await currentTalk(user.id);
  if (!talk) redirect("/onboarding");
  const sb = await supabaseServer();
  const sp = await searchParams;
  const [{ data: ideas }, { data: dossier }, { rows, resetsOn }] = await Promise.all([
    sb.from("ideas").select("id, talk_id, status, title_working, throughline, score, source, created_at, batch_id").eq("talk_id", talk.id).neq("status", "archived").order("created_at", { ascending: false }),
    sb.from("idea_dossiers").select("answers, pasted_material").eq("talk_id", talk.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    readAllowances(user.id),
  ]);
  const batch = rows.find((r) => r.key === "idea_batch");
  const left = batch ? Math.max(0, batch.allowed - batch.used) : null;
  const progress = interviewProgress((dossier?.answers as Record<string, string>) ?? {});
  const list = (ideas ?? []) as IdeaRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-page-title">Idea Lab</h1>
          <p className="t-compact text-[var(--text-secondary)]">One idea that passes the tests organizers apply, before any event is touched.</p>
        </div>
        {batch && <div className="w-full sm:w-64"><AllowanceMeter label="Idea batches" used={batch.used} allowed={batch.allowed} resetsOn={resetsOn} /></div>}
      </div>

      {list.length === 0 ? (
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="t-title">Give the Idea Lab something to work with</h2>
            <p className="t-body text-[var(--text-secondary)]">Paste a bio or a book summary, or answer eight written prompts. The Idea Lab returns five candidate ideas with scores. Nothing is recorded; text only.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/find/idea-lab/interview" className="inline-flex h-11 items-center rounded-[var(--radius)] border border-[var(--border-strong)] px-4 t-body">Start the Idea Interview <span className="ml-2 t-metadata text-[var(--text-muted)]">8 prompts, about 6 min</span></Link>
          </div>
          <IdeaSpark talkId={talk.id} initialText={dossier?.pasted_material ?? ""} allowanceLeft={left} interviewHref="/find/idea-lab/interview" />
        </Card>
      ) : (
        <>
          <IdeaGrid ideas={list} compare={sp.compare !== "0"} />
          <Card className="flex flex-col gap-3">
            <h2 className="t-section">New batch</h2>
            <p className="t-compact text-[var(--text-secondary)]">
              {progress.complete ? "Your interview is complete; a new batch reads it." : `Interview ${progress.answered} of ${progress.total} answered.`} <Link href="/find/idea-lab/interview" className="underline">Open the interview</Link>.
            </p>
            <IdeaSpark talkId={talk.id} initialText={dossier?.pasted_material ?? ""} allowanceLeft={left} interviewHref="/find/idea-lab/interview" />
          </Card>
        </>
      )}
    </div>
  );
}
