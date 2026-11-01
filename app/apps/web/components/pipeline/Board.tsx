"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, StatusBadge, type PipelineStatus } from "@onebigtalk/ui";
import { moveStatus } from "@/app/(app)/find/applications/actions";

export interface BoardCard { id: string; status: PipelineStatus; name: string; city: string | null; deadline: string | null; appliedAt: string | null; followUpAt: string | null; followUpSent: boolean; outcomeAt: string | null; eventDate: string | null; readinessLevel: number | null; readinessPassed: boolean; counts: boolean; stale: boolean; expired: boolean }

const COLUMNS: { key: PipelineStatus; label: string }[] = [
  { key: "planned", label: "Planned" }, { key: "researching", label: "Researching" }, { key: "drafting", label: "Drafting" }, { key: "ready", label: "Ready" },
  { key: "applied", label: "Applied" }, { key: "follow_up_due", label: "Follow-up" }, { key: "interview", label: "Interview" }, { key: "accepted", label: "Accepted" }, { key: "declined", label: "Declined" },
];
const MOVES: Partial<Record<PipelineStatus, PipelineStatus[]>> = { planned: ["researching", "drafting"], researching: ["drafting"], drafting: ["ready", "applied"], ready: ["applied", "drafting"], applied: ["interview"], follow_up_due: ["interview"], interview: ["accepted", "declined"] };

// Kanban with move buttons (keyboard-friendly; no drag needed). On phones the columns become stacked groups.
export function Board({ cards }: { cards: BoardCard[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; to: PipelineStatus; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const days = (iso: string) => Math.ceil((new Date(iso + "T00:00:00Z").getTime() - Date.now()) / 86400000);
  const fmt = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  function move(id: string, to: PipelineStatus, confirmed = false) {
    setMsg(null);
    start(async () => { const r = await moveStatus(id, to, { confirmed }); if (!r.ok) setMsg(r.message); else if (r.data?.confirm) setConfirm({ id, to, text: r.data.confirm }); else { setConfirm(null); router.refresh(); } });
  }
  const visible = COLUMNS.filter((c) => cards.some((k) => k.status === c.key) || ["planned", "drafting", "applied"].includes(c.key));
  return (
    <div className="flex flex-col gap-3" aria-busy={pending || undefined}>
      {msg && <p role="alert" className="t-compact text-[var(--danger-text)]">{msg}</p>}
      {confirm && (
        <div role="dialog" aria-label="Confirm" className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] p-3 t-compact">
          <span>{confirm.text}</span><Button size="sm" onClick={() => move(confirm.id, confirm.to, true)}>Yes</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Not yet</Button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:grid md:auto-cols-[minmax(220px,1fr)] md:grid-flow-col md:overflow-x-auto md:pb-2">
        {visible.map((col) => {
          const items = cards.filter((k) => k.status === col.key);
          return (
            <section key={col.key} aria-label={col.label} className="flex min-w-0 flex-col gap-2">
              <h2 className="t-label text-[var(--text-muted)]">{col.label.toUpperCase()} ({items.length})</h2>
              {items.length === 0 && <p className="t-metadata text-[var(--text-muted)]">none</p>}
              {items.map((k) => (
                <Card key={k.id} className="flex flex-col gap-1">
                  <Link href={`/find/applications/${k.id}`} className="t-body font-medium">{k.name}</Link>
                  <div className="flex flex-wrap items-center gap-x-2 t-metadata text-[var(--text-secondary)]">
                    {k.city && <span>{k.city}</span>}
                    {k.expired && <span className="text-[var(--warning-text)]">event cancelled or past</span>}
                    {k.stale && <span className="text-[var(--warning-text)]">may be outdated</span>}
                    {k.deadline && ["planned", "researching", "drafting", "ready"].includes(k.status) && <span className="tabular">{days(k.deadline) >= 0 ? `${days(k.deadline)} d` : "deadline passed"}</span>}
                    {k.readinessLevel != null && ["drafting", "ready"].includes(k.status) && <span className="tabular">L{k.readinessLevel}</span>}
                    {k.appliedAt && <span>applied {fmt(k.appliedAt)}</span>}
                    {k.followUpAt && k.status === "applied" && !k.followUpSent && <span>follow-up {fmt(k.followUpAt)}</span>}
                    {k.outcomeAt && <span>{fmt(k.outcomeAt)}</span>}
                    {k.counts && <span className="text-[var(--accent-text)]">counts</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(MOVES[k.status] ?? []).map((to) => <Button key={to} size="sm" variant="ghost" onClick={() => move(k.id, to)}>{labelFor(to)}</Button>)}
                  </div>
                </Card>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
function labelFor(s: PipelineStatus) { return ({ researching: "Research", drafting: "Draft", ready: "Mark ready", applied: "Mark applied", interview: "Interview", accepted: "Accepted", declined: "Declined" } as Record<string, string>)[s] ?? s; }
