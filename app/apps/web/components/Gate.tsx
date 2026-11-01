"use client";
import * as React from "react";
import { GateNotice } from "@onebigtalk/ui";

// The one upgrade sheet (S7.4), inline and never a wall. Seats are read once from /api/public-counts.
// The trial starts at sign-up (3 days, no card), so there is never a "start trial" button here.
export function Gate({ what, reason, onNotNow, exhausted }: { what: string; reason: string; onNotNow?: () => void; exhausted?: { used: number; allowed: number; resetsOn: string } }) {
  const [seats, setSeats] = React.useState<number>(0);
  React.useEffect(() => {
    fetch("/api/public-counts").then((r) => r.json()).then((j) => setSeats(Number(j.founding_seats_remaining ?? 0))).catch(() => setSeats(0));
  }, []);
  async function choose(period: "monthly" | "six_month" | "twelve_month" | "regular_monthly") {
    const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ period: period === "regular_monthly" ? "monthly" : period }) });
    const j = await r.json(); if (j.url) window.location.href = j.url;
  }
  return <GateNotice what={what} reason={reason} seatsRemaining={seats} trialAvailable={false} onChoosePlan={choose} onNotNow={onNotNow} exhausted={exhausted} />;
}

// Maps an AI action error to the gate copy the screen shows (10.3 plain-language allowances).
export function gateFor(code: string, message: string, what: string) {
  if (code === "ALLOWANCE_EXHAUSTED") {
    const m = message.match(/used this month's (\d+)/);
    const reset = message.match(/Resets (.+?)\./);
    return { what, reason: message, exhausted: { used: Number(m?.[1] ?? 0), allowed: Number(m?.[1] ?? 0), resetsOn: reset?.[1] ?? "next month" } };
  }
  if (code === "PLAN_REQUIRED") return { what, reason: message || "This is a member tool." };
  if (code === "TRIAL_LIMIT") return { what, reason: message || "Your trial covers one idea and three events." };
  if (code === "FAIR_USE_REACHED" || code === "COST_CAP_REACHED") return { what, reason: message };
  return null;
}
