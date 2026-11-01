import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Stores one address with its consent text (anon insert allowed by RLS). Duplicates are fine (same answer).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; source?: string; consentText?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const source = String(body.source ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !["open_calls", "idea_test", "landing", "pricing"].includes(source)) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  const sb = await supabaseServer();
  const { error } = await sb.from("email_captures").insert({ email, source, consent_text: String(body.consentText ?? "").slice(0, 500) || "Weekly list" });
  if (error && !/duplicate/i.test(error.message)) return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
