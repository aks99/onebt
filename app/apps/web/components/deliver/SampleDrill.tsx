"use client";
import { useEffect, useState } from "react";
import { DrillRunner } from "@/components/deliver/DrillRunner";
import { loadSampleProgress, SAMPLE_BEATS } from "@/components/deliver/sample-progress";
import type { BeatRow, DrillKind } from "@/lib/deliver/rules";

// The sample drill reads its progress from this browser after mount (the server cannot see localStorage).
export function SampleDrill({ kind, onlyDue, talkId }: { kind: DrillKind; onlyDue: boolean; talkId: string }) {
  const [rows, setRows] = useState<BeatRow[] | null>(null);
  useEffect(() => { setRows(loadSampleProgress(SAMPLE_BEATS)); }, []);
  if (!rows) return <p className="t-compact text-[var(--text-secondary)]">Loading the sample beats.</p>;
  return <DrillRunner kind={kind} rows={rows} onlyDue={onlyDue} sample talkId={talkId} />;
}
