import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { loadDeliver } from "@/lib/deliver/load";
import { formatClock } from "@/lib/write/rules";

export const dynamic = "force-dynamic";

// Printables (11.7): the beat map and the cue cards, black on white, 12pt minimum, through the browser's print dialog.
// The cue cards are the organizer-approved backup card: the first three words of each beat, nothing more.
export default async function PrintPage({ params, searchParams }: { params: Promise<{ what: string }>; searchParams: Promise<{ sample?: string }> }) {
  const { what } = await params; const sp = await searchParams;
  if (what !== "beat-map" && what !== "cue-cards") notFound();
  const user = await currentUser();
  if (!user) redirect("/login?next=/deliver/memorize");
  const ctx = await loadDeliver(user.id, sp.sample === "1");
  if (!ctx) redirect("/onboarding");
  const cards = what === "cue-cards";
  return (
    <div className="print-sheet mx-auto max-w-3xl">
      <style>{`@media print { nav, header, aside, .no-print { display: none !important; } body { background: #fff; color: #000; } .print-sheet { font-size: 12pt; line-height: 1.4; color: #000; } .print-card { break-inside: avoid; border: 1px solid #000; padding: 10pt; margin-bottom: 8pt; } }`}</style>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href="/deliver/memorize" className="t-compact underline">Back to Memorize</Link>
        <p className="t-compact text-[var(--text-secondary)]">Use your browser's print dialog (Ctrl or Cmd and P).</p>
      </div>
      <h1 className="t-title">{ctx.title}: {cards ? "cue cards" : "beat map"}</h1>
      <p className="t-compact text-[var(--text-secondary)]">{ctx.slotMinutes}-minute slot · {ctx.beats.length} beats{ctx.sample ? " · sample script" : ""}</p>
      {ctx.beats.length === 0 && <p className="t-body mt-4">No beats yet. Build the beat map first.</p>}
      {cards ? (
        <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ctx.beats.map((b) => <li key={b.id} className="print-card rounded-[var(--radius)] border border-[var(--border)] p-3"><span className="t-metadata text-[var(--text-muted)]">{b.order}</span><p className="t-lede">{b.first_words} ...</p>{b.stage_note && <p className="t-compact">{b.stage_note}</p>}</li>)}
        </ol>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {ctx.beats.map((b) => <li key={b.id} className="print-card"><p className="t-compact"><strong>{b.order}. "{b.first_words} ..."</strong> · {b.purpose} · {formatClock(b.target_seconds)}{b.stage_note ? ` · ${b.stage_note}` : ""}</p><p className="t-body">{b.text}</p></li>)}
        </ol>
      )}
    </div>
  );
}
