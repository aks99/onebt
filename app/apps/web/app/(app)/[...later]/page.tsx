import Link from "next/link";
import { Card } from "@onebigtalk/ui";

// Placeholder for screens that arrive in a later runbook step or after launch. Keeps navigation honest instead of a 404.
const STEP: Record<string, string> = { launch: "10" };
const DEFERRED = new Set(["prompter", "runs", "plan", "event-day", "nerves", "readiness", "audiences"]);

export default async function LaterPage({ params }: { params: Promise<{ later: string[] }> }) {
  const { later } = await params;
  const leaf = later[later.length - 1] ?? "";
  const step = STEP[leaf];
  if (DEFERRED.has(leaf)) return (
    <Card className="flex flex-col gap-2">
      <h1 className="t-title">After launch</h1>
      <p className="t-body text-[var(--text-secondary)]">The prompter, run log, rehearsal plan, event-day kit and nerves kit arrive after launch. Memorize and the practice timer are ready now.</p>
      <Link href="/deliver/memorize" className="t-compact underline">Go to Memorize</Link>
    </Card>
  );
  return (
    <Card className="flex flex-col gap-2">
      <h1 className="t-title">Not built yet</h1>
      <p className="t-body text-[var(--text-secondary)]">This screen arrives in build step {step ?? "10 or later"}. Everything from Idea Lab to the practice timer is ready now.</p>
      <Link href="/today" className="t-compact underline">Back to Today</Link>
    </Card>
  );
}
