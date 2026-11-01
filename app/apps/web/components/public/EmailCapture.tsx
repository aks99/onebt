"use client";
import { useState } from "react";
import { Button } from "@onebigtalk/ui";

// Public email capture (F1.2.9, F1.2.14). Posts to /api/public/email-capture; the consent text is stored with the row.
export function EmailCapture({ source, consentText }: { source: "open_calls" | "idea_test" | "landing" | "pricing"; consentText: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState("busy");
    const r = await fetch("/api/public/email-capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, source, consentText }) });
    setState(r.ok ? "done" : "error");
  }
  if (state === "done") return <p role="status" className="t-compact">Thank you. The first list arrives on Monday.</p>;
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email address" className="h-11 flex-1 rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 t-body" />
      <Button type="submit" loading={state === "busy"}>Send me the list</Button>
      {state === "error" && <p role="alert" className="t-compact text-[var(--danger-text)]">That didn't work. Check the address and try again.</p>}
    </form>
  );
}
