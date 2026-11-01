import { Card } from "@onebigtalk/ui";

// Small shared pieces for the admin tables: a stat tile, a scrolling table wrapper, money and date formatting.
export const money = (cents: number | null | undefined, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format((cents ?? 0) / 100);
export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
export const whenTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <Card className="flex flex-col gap-1"><span className="t-label text-[var(--text-muted)]">{label}</span><span className="t-title tabular">{value}</span>{note && <span className="t-metadata text-[var(--text-secondary)]">{note}</span>}</Card>;
}
export function Table({ head, children, label }: { head: string[]; children: React.ReactNode; label: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
      <table className="w-full min-w-[640px] border-collapse t-compact" aria-label={label}>
        <thead><tr className="bg-[var(--surface-2)] text-left">{head.map((h) => <th key={h} scope="col" className="px-3 py-2 t-label text-[var(--text-muted)]">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export const td = "px-3 py-2 align-top border-t border-[var(--border-subtle)]";
