"use client";
import { useTransition } from "react";
import { WeekDots } from "@onebigtalk/ui";
import { pauseWeek, setWeekTarget } from "@/app/(app)/today/actions";

export function WeekControls({ completed, target, paused, message }: { completed: number; target: number; paused: boolean; message: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2" aria-busy={pending || undefined}>
      <WeekDots completed={completed} target={target} paused={paused}
        onPause={() => start(async () => { await pauseWeek(true); })}
        onResume={() => start(async () => { await pauseWeek(false); })} />
      <div className="flex flex-wrap items-center gap-3">
        <p className="t-compact text-[var(--text-secondary)]">{message}</p>
        <label className="t-metadata flex items-center gap-2 text-[var(--text-muted)]">Target
          <select className="h-9 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-2 t-compact" defaultValue={target}
            onChange={(e) => start(async () => { await setWeekTarget(Number(e.target.value)); })} aria-label="Weekly target">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} a week</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
