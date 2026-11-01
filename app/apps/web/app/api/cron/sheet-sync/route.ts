import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncAllEnabled } from "@/lib/catalogue/sync";

// Weekly Google Sheet sync (F1.2.16). Scheduled by the host's cron (Vercel Cron, weekly, Monday 06:00 UTC by
// default; blueprint Appendix C). Guarded by CRON_SECRET. Also expires past events and marks stale calls.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "NOT_AUTHORIZED" }, { status: 401 });
  const db = supabaseAdmin();
  const out = await syncAllEnabled(db);
  return NextResponse.json({ sources: Object.fromEntries(Object.entries(out).map(([id, o]) => [id, o.ok ? { ok: true, summary: o.result.summary, pending: o.result.pending } : { ok: false, message: o.message }])) });
}
