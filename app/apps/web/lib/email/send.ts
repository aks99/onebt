import type { SupabaseClient } from "@supabase/supabase-js";
import { DISCLAIMER, PRODUCT_NAME } from "@/lib/product";

// Transactional email through Resend's HTTP API (12.1). Plain text first, a minimal HTML twin. Every send
// is logged in email_log. Without RESEND_API_KEY the message is logged as "skipped" so nothing is lost
// in development and tests. House style: plain, warm, no exclamation marks.

export interface Mail { to: string; subject: string; text: string; kind: string; userId?: string | null }

export async function sendMail(db: SupabaseClient, m: Mail, fetchFn: typeof fetch = fetch): Promise<{ ok: boolean; id?: string; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${PRODUCT_NAME} <hello@onebigtalk.com>`;
  const footer = `\n\n${PRODUCT_NAME}\n${DISCLAIMER}\nYou can change your notification settings under Me.`;
  const text = m.text + footer;
  const html = `<div style="font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.5;color:#1b1b1f;max-width:560px">${text.split("\n\n").map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
  if (!key) {
    await db.from("email_log").insert({ user_id: m.userId ?? null, to_email: m.to, template: m.kind, subject: m.subject, status: "skipped" });
    return { ok: true, skipped: true };
  }
  const res = await fetchFn("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [m.to], subject: m.subject, text, html }) });
  const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  await db.from("email_log").insert({ user_id: m.userId ?? null, to_email: m.to, template: m.kind, subject: m.subject, status: res.ok ? "sent" : `failed: ${(j.message ?? `HTTP ${res.status}`).slice(0, 120)}`, provider_message_id: j.id ?? null, sent_at: res.ok ? new Date().toISOString() : null });
  return res.ok ? { ok: true, id: j.id } : { ok: false, error: j.message ?? `HTTP ${res.status}` };
}

function escapeHtml(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// Deadline reminder copy (5.6, F1.2.4). One event per message. Facts only; no urgency theatre.
export function deadlineReminderText(eventName: string, deadline: string, days: number, siteUrl: string) {
  const when = days === 1 ? "tomorrow" : `in ${days} days`;
  const date = new Date(deadline + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return {
    subject: `${eventName}: application deadline ${when}`,
    text: `The application deadline for ${eventName} is ${when}, on ${date}.\n\nIf your application is ready, submit it on the organizer's form and mark it as applied in your pipeline. If it is not ready, the Readiness Review will show you what is missing.\n\nOpen your applications: ${siteUrl}/find/applications\n\nWe show the deadline as the organizer published it. Check the organizer's page for the time of day and the timezone.`,
  };
}
