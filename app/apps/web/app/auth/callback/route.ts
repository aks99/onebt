import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Exchanges the magic-link code for a session, then sends the member on. New accounts land in onboarding.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/today";
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await sb.auth.getUser();
      const { data: profile } = await sb.from("profiles").select("expectation_acknowledged_at").eq("user_id", data.user?.id ?? "").maybeSingle();
      return NextResponse.redirect(new URL(profile?.expectation_acknowledged_at ? next : "/onboarding", url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=expired", url.origin));
}
