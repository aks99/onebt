import * as React from "react";
import { Button, Card, cx } from "./primitives";

// The global patterns the screen inventory says the designer delivers once (Section 10 there):
// AIDraftBlock, GateNotice, AllowanceMeter, CharCountField, EmptyState, DeadlineChip.

// ---------------------------------------------------------------
// DeadlineChip: a deadline always carries its verified date and its source type; when the
// organizer stated no timezone it is a date only, never an hour (blueprint 6.2, 11.8, v1.4).
// ---------------------------------------------------------------
export type TimezoneStatus = "stated" | "inferred" | "unknown";
export interface DeadlineChipProps {
  deadline: string;                 // ISO date, e.g. 2026-12-09
  deadlineTime?: string | null;     // HH:MM in the organizer's timezone
  organizerTimezone?: string | null;
  timezoneStatus: TimezoneStatus;
  verifiedAt: string;               // ISO datetime
  sourceType: "organizer_site" | "ted_directory" | "curator" | "google_sheet" | "member_tip";
  memberTimezone?: string;
  hidden?: boolean;                 // Free plan: "in 9 days (upgrade to see the date)"
  now?: Date;
}
const sourceLabel = { organizer_site: "organizer's page", ted_directory: "event directory", curator: "curator", google_sheet: "catalogue sheet", member_tip: "member tip" };

export function daysUntil(iso: string, now = new Date()) {
  const d = new Date(iso + "T00:00:00Z");
  return Math.ceil((d.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000);
}
export function daysSince(iso: string, now = new Date()) {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
}

export function DeadlineChip(p: DeadlineChipProps) {
  const now = p.now ?? new Date();
  const days = daysUntil(p.deadline, now);
  const verifiedDays = daysSince(p.verifiedAt, now);
  const urgent = days <= 7;
  const dateText = p.hidden ? "date shown to members" : new Date(p.deadline + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const timeText = !p.hidden && p.timezoneStatus === "stated" && p.deadlineTime && p.organizerTimezone
    ? ` ${p.deadlineTime} ${p.organizerTimezone}` : "";
  return (
    <span className={cx("inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[var(--radius)] border px-2 py-1 text-[13px] leading-[18px]",
      urgent ? "border-[var(--warning-text)]" : "border-[var(--border-subtle)]", "bg-[var(--surface)]")}>
      <span className="font-medium tabular">{days >= 0 ? `${days} d left` : "closed"}</span>
      <span className="text-[var(--text-secondary)]">{dateText}{timeText}</span>
      {!p.hidden && p.timezoneStatus === "unknown" && <span className="text-[var(--text-muted)]">timezone not stated by the organizer</span>}
      <span className="text-[var(--text-muted)]">verified {verifiedDays === 0 ? "today" : `${verifiedDays} d ago`}, {sourceLabel[p.sourceType]}</span>
    </span>
  );
}

// ---------------------------------------------------------------
// AIDraftBlock: label next to the content (never only a footer), edit in place, regenerate with a
// steer keeps the previous version, Why this, versions, Stop while streaming, thumbs down (11.6).
// ---------------------------------------------------------------
export type DraftLabel = "ai_draft" | "ai_assisted" | "your_words";
export interface AIDraftBlockProps {
  label: DraftLabel;
  title?: string;
  children: React.ReactNode;
  steers?: string[];                 // "shorter", "more personal", "stronger opening", "less jargon"
  onRegenerate?: (steer?: string) => void;
  whyThis?: string;                  // tied to the member's own inputs
  versions?: { id: string; label: string }[];
  onRestoreVersion?: (id: string) => void;
  streaming?: "thinking" | "writing" | null;
  onStop?: () => void;
  onNotRight?: (reason: string) => void;
  allowanceNote?: string;            // "7 of 15 left this month"
}
const labelText: Record<DraftLabel, string> = { ai_draft: "AI draft", ai_assisted: "AI-assisted", your_words: "Your words" };

export function AIDraftBlock(p: AIDraftBlockProps) {
  const [why, setWhy] = React.useState(false);
  const [notRight, setNotRight] = React.useState(false);
  const isAi = p.label !== "your_words";
  return (
    <section className={cx("rounded-[var(--radius-card)] border p-4", isAi ? "border-transparent bg-[var(--ai-bg)]" : "border-[var(--border-subtle)] bg-[var(--surface)]")}
      aria-label={p.title ? `${p.title}, ${labelText[p.label]}` : labelText[p.label]}>
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span className={cx("t-label rounded-full px-2 py-0.5", isAi ? "bg-[var(--surface)] text-[var(--ai-text)]" : "bg-[var(--surface-2)] text-[var(--text-secondary)]")}>{labelText[p.label]}</span>
        {p.title && <span className="t-section">{p.title}</span>}
        {p.allowanceNote && <span className="t-metadata text-[var(--text-muted)] tabular">{p.allowanceNote}</span>}
        <span className="ml-auto flex items-center gap-2">
          {p.whyThis && <Button size="sm" variant="ghost" aria-expanded={why} onClick={() => setWhy((v) => !v)}>Why this</Button>}
          {p.versions && p.versions.length > 1 && (
            <label className="t-compact text-[var(--text-secondary)]">Versions
              <select className="ml-1 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-1 py-0.5" onChange={(e) => p.onRestoreVersion?.(e.target.value)} defaultValue={p.versions[p.versions.length - 1].id}>
                {p.versions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </label>
          )}
        </span>
      </header>
      {why && p.whyThis && <p className="mb-2 rounded-[var(--radius)] bg-[var(--surface)] p-2 t-compact text-[var(--text-secondary)]">{p.whyThis}</p>}
      <div className="t-editor-body" aria-live={p.streaming ? "polite" : undefined}>{p.children}</div>
      {p.streaming && (
        <div className="mt-2 flex items-center gap-3 t-compact text-[var(--ai-text)]" role="status">
          <span>{p.streaming === "thinking" ? "Reading what you wrote" : "Writing"}</span>
          {p.onStop && <Button size="sm" variant="secondary" onClick={p.onStop}>Stop</Button>}
        </div>
      )}
      {isAi && !p.streaming && (
        <footer className="mt-3 flex flex-wrap items-center gap-2">
          {p.onRegenerate && (
            <>
              <Button size="sm" variant="secondary" onClick={() => p.onRegenerate?.()}>Regenerate</Button>
              {(p.steers ?? []).map((s) => (
                <Button key={s} size="sm" variant="ghost" onClick={() => p.onRegenerate?.(s)}>{s}</Button>
              ))}
            </>
          )}
          {p.onNotRight && (
            <span className="ml-auto">
              {notRight ? (
                <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); p.onNotRight?.(String(f.get("reason") ?? "")); setNotRight(false); }} className="flex items-center gap-2">
                  <input name="reason" placeholder="What is not right" className="rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-2 py-1 t-compact" />
                  <Button size="sm" type="submit">Send</Button>
                </form>
              ) : <Button size="sm" variant="ghost" onClick={() => setNotRight(true)}>Not right</Button>}
            </span>
          )}
        </footer>
      )}
    </section>
  );
}

// ---------------------------------------------------------------
// GateNotice: inline, never a wall. One line of reason, the price, Not now (screen inventory 0.1).
// ---------------------------------------------------------------
export interface GateNoticeProps {
  what: string;                      // "Write the script from your finalized outline"
  reason: string;                    // "Members get 3 full drafts a month"
  seatsRemaining: number;            // founding seats left; 0 switches to the regular price
  trialAvailable: boolean;
  onStartTrial?: () => void;
  onChoosePlan?: (period: "monthly" | "six_month" | "twelve_month" | "regular_monthly") => void;
  onNotNow?: () => void;
  exhausted?: { used: number; allowed: number; resetsOn: string };   // the allowance-exhausted variant
}
export function GateNotice(p: GateNoticeProps) {
  if (p.exhausted) {
    return (
      <div role="status" className="rounded-[var(--radius)] border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 t-compact text-[var(--text-secondary)]">
        You have used this month's {p.exhausted.allowed} {p.what.toLowerCase()}. Resets {p.exhausted.resetsOn}.
      </div>
    );
  }
  const founding = p.seatsRemaining > 0;
  return (
    <div role="region" aria-label="Member feature" className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      <div className="flex items-start gap-2">
        <span aria-hidden="true">🔒</span>
        <div>
          <p className="t-section">{p.what}</p>
          <p className="t-compact text-[var(--text-secondary)]">{p.reason}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {founding ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => p.onChoosePlan?.("monthly")}>$17 a month</Button>
            <Button size="sm" variant="secondary" onClick={() => p.onChoosePlan?.("six_month")}>$77 for six months</Button>
            <Button size="sm" variant="secondary" onClick={() => p.onChoosePlan?.("twelve_month")}>$147 for twelve months</Button>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => p.onChoosePlan?.("regular_monthly")}>$97 a month</Button>
        )}
      </div>
      {founding && <p className="mt-2 t-metadata text-[var(--text-muted)] tabular">{p.seatsRemaining} of 30 founding seats left. Price kept for life while active.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {p.trialAvailable && <Button size="sm" variant="milestone" onClick={p.onStartTrial}>Start 3-day free trial</Button>}
        <Button size="sm" variant="ghost" onClick={p.onNotNow}>Not now</Button>
      </div>
      <p className="mt-2 t-metadata text-[var(--text-muted)]">We do not guarantee a stage. One promise: 100 ready applications and no yes, and your access is extended free while you keep applying.</p>
    </div>
  );
}

// ---------------------------------------------------------------
// AllowanceMeter: used and allowed, reset date, courtesy at 80%, exhausted (10.3). Never credits.
// ---------------------------------------------------------------
export function AllowanceMeter({ label, used, allowed, resetsOn }: { label: string; used: number; allowed: number; resetsOn: string }) {
  const ratio = allowed === 0 ? 1 : Math.min(1, used / allowed);
  const left = Math.max(0, allowed - used);
  const state = left === 0 ? "exhausted" : ratio >= 0.8 ? "courtesy" : "ok";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="t-compact">{label}</span>
        <span className="t-compact tabular text-[var(--text-secondary)]">{left} of {allowed} left</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]" role="progressbar" aria-valuemin={0} aria-valuemax={allowed} aria-valuenow={used} aria-label={`${label}: ${used} of ${allowed} used`}>
        <div className={cx("h-full rounded-full", state === "exhausted" ? "bg-[var(--text-muted)]" : "bg-[var(--accent-solid)]")} style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="t-metadata text-[var(--text-muted)]">
        {state === "exhausted" ? `Used up. Resets ${resetsOn}.` : state === "courtesy" ? `Nearly there. Resets ${resetsOn}.` : `Resets ${resetsOn}.`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------
// CharCountField: live counter with a minimum; explains why Save is disabled (screen inventory 0.3)
// ---------------------------------------------------------------
export interface CharCountFieldProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  minChars?: number;
  maxChars?: number;
  hint?: string;
  strength?: "thin" | "adequate" | "strong";   // completeness advice (13.3b)
}
export function CharCountField({ label, value, onChange, minChars = 0, maxChars, hint, strength, id, className, ...rest }: CharCountFieldProps) {
  const fieldId = id ?? React.useId();
  const n = value.length;
  const short = minChars > 0 && n < minChars;
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={fieldId} className="t-label flex items-center gap-2">
        {label}
        {strength === "thin" && <span className="rounded-full bg-[var(--surface-2)] px-2 text-[var(--warning-text)]">thin</span>}
      </label>
      {hint && <p className="t-compact text-[var(--text-muted)]">{hint}</p>}
      <textarea id={fieldId} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxChars}
        aria-describedby={`${fieldId}-count`}
        className="t-editor-body min-h-[120px] w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] p-3 text-[var(--text)]" {...rest} />
      <p id={`${fieldId}-count`} className={cx("t-metadata tabular", short ? "text-[var(--warning-text)]" : "text-[var(--text-muted)]")} aria-live="polite">
        {minChars > 0 ? `${n} / ${minChars} minimum${short ? `, ${minChars - n} more characters needed` : ""}` : `${n} characters`}
        {maxChars ? ` (max ${maxChars})` : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------
// EmptyState: path strip with the first node unlocked and one two-minute action (11.10)
// ---------------------------------------------------------------
export function EmptyState({ title, description, actionLabel, onAction, minutes = 2, stages }:
  { title: string; description?: string; actionLabel: string; onAction?: () => void; minutes?: number; stages?: string[] }) {
  const path = stages ?? ["Position", "Discover", "Apply", "Write", "Rehearse", "Perform", "Amplify"];
  return (
    <Card className="flex flex-col items-start gap-3">
      <ol className="flex flex-wrap items-center gap-2 t-metadata text-[var(--text-muted)]" aria-label="Your path">
        {path.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-hidden="true" className={cx("inline-block h-2.5 w-2.5 rounded-full", i === 0 ? "bg-[var(--accent-solid)]" : "border border-[var(--border)]")} />
            <span className={i === 0 ? "text-[var(--text)]" : undefined}>{s}</span>
          </li>
        ))}
      </ol>
      <h3 className="t-title">{title}</h3>
      {description && <p className="t-body text-[var(--text-secondary)]">{description}</p>}
      <Button onClick={onAction}>{actionLabel} <span className="t-metadata opacity-80 tabular">{minutes} min</span></Button>
    </Card>
  );
}
