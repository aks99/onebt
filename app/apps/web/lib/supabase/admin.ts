import { createClient } from "@supabase/supabase-js";

// Service-role client. Server only. Bypasses RLS, so it is used only inside code that has already
// checked who is asking (webhooks, runAiAction, billing). Never import this from a client component.
export function supabaseAdmin() {
  if (typeof window !== "undefined") throw new Error("supabaseAdmin must never run in the browser");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
