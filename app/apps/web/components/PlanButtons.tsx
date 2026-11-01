"use client";
import * as React from "react";
import { Button } from "@onebigtalk/ui";

// Starts a Stripe Checkout for a plan or an add-on. Shows the fixed error text if anything fails.
export function PlanButtons({ seatsRemaining, signedIn }: { seatsRemaining: number; signedIn: boolean }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  async function go(body: Record<string, string>, key: string) {
    if (!signedIn) { window.location.href = `/login?next=${encodeURIComponent("/pricing")}`; return; }
    setBusy(key); setError(null);
    const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.url) window.location.href = j.url; else { setError(j.message ?? "That did not work. Nothing was charged. Try again."); setBusy(null); }
  }
  const founding = seatsRemaining > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {founding ? (
          <>
            <Button onClick={() => go({ period: "monthly" }, "m")} loading={busy === "m"}>$17 a month</Button>
            <Button onClick={() => go({ period: "six_month" }, "6")} loading={busy === "6"} variant="secondary">$77 for six months</Button>
            <Button onClick={() => go({ period: "twelve_month" }, "12")} loading={busy === "12"} variant="secondary">$147 for twelve months</Button>
          </>
        ) : (
          <Button onClick={() => go({ period: "monthly" }, "r")} loading={busy === "r"}>$97 a month</Button>
        )}
      </div>
      {error && <p role="alert" className="t-compact text-[var(--danger-text)]">{error}</p>}
    </div>
  );
}

export function AddonButtons() {
  const [busy, setBusy] = React.useState<string | null>(null);
  async function go(kind: string) {
    setBusy(kind);
    const r = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) });
    const j = await r.json(); if (j.url) window.location.href = j.url; else setBusy(null);
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" loading={busy === "application_review"} onClick={() => go("application_review")}>Application review, $497</Button>
      <Button variant="secondary" size="sm" loading={busy === "script_review"} onClick={() => go("script_review")}>Script review, $497</Button>
    </div>
  );
}

export function PortalButton({ label, variant = "secondary" }: { label: string; variant?: "secondary" | "ghost" }) {
  const [busy, setBusy] = React.useState(false);
  return <Button variant={variant} size="sm" loading={busy} onClick={async () => { setBusy(true); const r = await fetch("/api/billing/portal", { method: "POST" }); const j = await r.json(); if (j.url) window.location.href = j.url; else setBusy(false); }}>{label}</Button>;
}
