import Link from "next/link";
import { Card } from "@onebigtalk/ui";

// Placeholder for screens that arrive in later runbook steps (6 to 10). Keeps navigation honest instead of a 404.
const STEP: Record<string, string> = { events: "6", applications: "7", pitch: "7", brief: "8", outline: "8", script: "8", factcheck: "8", memorize: "9", timer: "9", "event-day": "9", launch: "10" };

export default async function LaterPage({ params }: { params: Promise<{ later: string[] }> }) {
  const { later } = await params;
  const leaf = later[later.length - 1] ?? "";
  const step = STEP[leaf];
  return (
    <Card className="flex flex-col gap-2">
      <h1 className="t-title">Not built yet</h1>
      <p className="t-body text-[var(--text-secondary)]">This screen arrives in build step {step ?? "6 or later"}. Your Idea Lab, Prior Stages, Today and Journey are ready now.</p>
      <Link href="/today" className="t-compact underline">Back to Today</Link>
    </Card>
  );
}
