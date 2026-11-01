import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deadlineReminderText, sendMail } from "@/lib/email/send";

// Daily deadline reminders at 14, 7, 3 and 1 days (F1.2.4, 5.6). Once per interval per member per event,
// never when the member switched them off. The database decides who is due; this route sends and logs.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "NOT_AUTHORIZED" }, { status: 401 });
  const db = supabaseAdmin();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://onebigtalk.com";
  const { data: due, error } = await db.rpc("deadline_reminders_due");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0, failed = 0;
  for (const d of (due ?? []) as { user_id: string; event_id: string; event_name: string; deadline: string; days_before: number }[]) {
    const { data: u } = await db.schema("auth").from("users").select("email").eq("id", d.user_id).maybeSingle();
    if (!u?.email) continue;
    const copy = deadlineReminderText(d.event_name, d.deadline, d.days_before, site);
    const r = await sendMail(db, { to: u.email, subject: copy.subject, text: copy.text, kind: `deadline_${d.days_before}d`, userId: d.user_id });
    if (r.ok) { sent++; await db.from("reminder_log").insert({ user_id: d.user_id, event_id: d.event_id, days_before: d.days_before, deadline: d.deadline }); } else failed++;
  }
  return NextResponse.json({ due: (due ?? []).length, sent, failed });
}
