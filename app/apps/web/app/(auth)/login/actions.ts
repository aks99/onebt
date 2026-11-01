"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

// Sends the magic link. Supabase rate-limits link requests (configured to 5 per hour per address in
// the project settings, blueprint 12.8). The response is the same whether or not the address exists.
export async function sendMagicLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = String(form.get("next") ?? "");
  if (!email) redirect("/login?error=1");
  const sb = await supabaseServer();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(next || "/today")}` } });
  if (error && !/rate/i.test(error.message)) redirect("/login?error=1");
  redirect(`/login?sent=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}
