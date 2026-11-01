import * as React from "react";

// Shared helpers and the smallest components: Button, Card, StatusBadge, RubricChip, LinterFlag,
// ProgressRing, WeekDots. Blueprint v1.6 Section 11.5 and 11.6. All colours come from the tokens in
// dist/tokens.css; nothing here hard-codes a colour.

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------
// Button: primary ink, secondary outline, gold "milestone", ghost, danger (errors only)
// ---------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "milestone" | "ghost" | "danger";
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingLabel?: string;
}
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors " +
  "disabled:opacity-60 disabled:cursor-not-allowed min-h-[24px] min-w-[24px] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
  secondary: "border border-[var(--border-strong)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]",
  milestone: "bg-[var(--accent-solid)] text-[var(--accent-foreground)] hover:opacity-90",
  ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--danger-solid)] text-[var(--danger-foreground)] hover:opacity-90",
};
const buttonSizes = { sm: "h-8 px-3 text-[14px]", md: "h-10 px-4 text-[16px]", lg: "h-12 px-5 text-[16px]" };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, loadingLabel = "Working", className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={cx(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span aria-live="polite">{loadingLabel}</span> : children}
    </button>
  );
});

// ---------------------------------------------------------------
// Card
// ---------------------------------------------------------------
export function Card({ className, milestone = false, ...rest }: React.HTMLAttributes<HTMLDivElement> & { milestone?: boolean }) {
  return (
    <div className={cx(
      "rounded-[var(--radius-card)] border bg-[var(--surface)] p-4",
      milestone ? "border-[var(--accent-outline)] bg-[color-mix(in_oklch,var(--accent-solid)_12%,var(--surface))]" : "border-[var(--border-subtle)]",
      className)} {...rest} />
  );
}

// ---------------------------------------------------------------
// StatusBadge: pipeline statuses. Colour never carries the meaning alone: every badge has a label
// and a glyph (blueprint 11.3 "always with a non-color cue").
// ---------------------------------------------------------------
export type PipelineStatus =
  | "planned" | "researching" | "drafting" | "ready" | "applied" | "follow_up_due" | "interview"
  | "accepted" | "declined" | "withdrawn" | "reapply";
const statusMeta: Record<PipelineStatus, { label: string; glyph: string; tone: "neutral" | "accent" | "success" | "danger" | "ai" }> = {
  planned: { label: "Planned", glyph: "○", tone: "neutral" },
  researching: { label: "Researching", glyph: "◔", tone: "neutral" },
  drafting: { label: "Drafting", glyph: "◑", tone: "neutral" },
  ready: { label: "Ready", glyph: "◕", tone: "accent" },
  applied: { label: "Applied", glyph: "●", tone: "accent" },
  follow_up_due: { label: "Follow-up due", glyph: "↻", tone: "accent" },
  interview: { label: "Interview", glyph: "◆", tone: "accent" },
  accepted: { label: "Accepted", glyph: "✓", tone: "success" },
  declined: { label: "Declined", glyph: "×", tone: "neutral" },
  withdrawn: { label: "Withdrawn", glyph: "–", tone: "neutral" },
  reapply: { label: "Reapply next cycle", glyph: "↺", tone: "neutral" },
};
const toneClass = {
  neutral: "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
  accent: "bg-[var(--accent-solid)] text-[var(--accent-foreground)] border-transparent",
  success: "text-[var(--success-text)] border-[var(--success-text)] bg-transparent",
  danger: "text-[var(--danger-text)] border-[var(--danger-text)] bg-transparent",
  ai: "bg-[var(--ai-bg)] text-[var(--ai-text)] border-transparent",
};
export function StatusBadge({ status, className }: { status: PipelineStatus; className?: string }) {
  const m = statusMeta[status];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] leading-[18px] font-medium", toneClass[m.tone], className)}>
      <span aria-hidden="true">{m.glyph}</span>
      {m.label}
    </span>
  );
}

// ---------------------------------------------------------------
// RubricChip: Level 1 to 4 with the quoted standard on hover and as accessible text
// ---------------------------------------------------------------
export function RubricChip({ criterion, level, standard, gated = false }: { criterion: string; level: 1 | 2 | 3 | 4; standard: string; gated?: boolean }) {
  const meets = level >= 3;
  return (
    <span title={standard}
      className={cx("inline-flex items-center gap-2 rounded-[var(--radius)] border px-2 py-1 text-[13px] leading-[18px]",
        meets ? "border-[var(--success-text)] text-[var(--text)]" : "border-[var(--warning-text)] text-[var(--text)]")}>
      <span className="font-medium">{criterion}</span>
      <span className="tabular">L{level}</span>
      {!meets && <span aria-hidden="true">!</span>}
      <span className="sr-only">{meets ? "meets the standard" : "below the standard"}{gated ? ", required before locking" : ""}. Standard: {standard}</span>
    </span>
  );
}

// ---------------------------------------------------------------
// LinterFlag: quotes the rule, the offending words, why, and the fix (blueprint 6.1, 13.2)
// ---------------------------------------------------------------
export interface LinterFlagData { rule: string; quote: string; why: string; fix: string; blocking?: boolean }
export function LinterFlag({ flag, onApplyFix }: { flag: LinterFlagData; onApplyFix?: (fix: string) => void }) {
  return (
    <div role="note" className={cx("rounded-[var(--radius)] border-l-4 bg-[var(--surface-2)] p-3 text-[14px] leading-[20px]",
      flag.blocking ? "border-[var(--danger-text)]" : "border-[var(--warning-text)]")}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="t-label uppercase text-[var(--text-muted)]">{flag.rule}</span>
        <q className="text-[var(--text)]">{flag.quote}</q>
      </div>
      <p className="mt-1 text-[var(--text-secondary)]">{flag.why}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-[var(--text)]">Try: {flag.fix}</span>
        {onApplyFix && <Button size="sm" variant="secondary" onClick={() => onApplyFix(flag.fix)}>Use this</Button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// ProgressRing: per-pillar completion. Never a global percent hero (5.7).
// ---------------------------------------------------------------
export function ProgressRing({ value, label, size = 40 }: { value: number; label: string; size?: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`${label}: ${Math.round(v * 100)} percent complete`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-solid)" strokeWidth="4"
          strokeDasharray={`${c * v} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="t-label text-[var(--text-secondary)]">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------
// WeekDots: the weekly commitment unit. Weeks are celebrated, not days (5.3).
// ---------------------------------------------------------------
export function WeekDots({ completed, target, paused = false, onPause, onResume }:
  { completed: number; target: number; paused?: boolean; onPause?: () => void; onResume?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1.5" role="img" aria-label={`${completed} of ${target} blocks this week`}>
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} aria-hidden="true" className={cx("block h-3 w-3 rounded-full",
            i < completed ? "bg-[var(--accent-solid)]" : "border border-[var(--border)] bg-transparent")} />
        ))}
      </div>
      <span className="t-compact text-[var(--text-secondary)] tabular">{completed} of {target} blocks</span>
      {paused
        ? <Button size="sm" variant="ghost" onClick={onResume}>Resume week</Button>
        : <Button size="sm" variant="ghost" onClick={onPause}>Pause week</Button>}
    </div>
  );
}
