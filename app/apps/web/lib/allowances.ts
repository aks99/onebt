import { supabaseServer } from "@/lib/supabase/server";

// Member-facing allowances in plain words (blueprint 10.3). Credits are never shown.
export interface AllowanceView { key: string; label: string; used: number; allowed: number }
export async function readAllowances(userId: string) {
  const sb = await supabaseServer();
  const ps = new Date(); const periodStart = `${ps.getUTCFullYear()}-${String(ps.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const { data } = await sb.from("allowances").select("*").eq("user_id", userId).eq("period_start", periodStart).maybeSingle();
  const resetsOn = data?.resets_at ? new Date(data.resets_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  const rows: AllowanceView[] = data ? [
    { key: "idea_batch", label: "Idea batches", used: data.idea_batches_used, allowed: data.idea_batches_allowed },
    { key: "tailored_application", label: "Tailored applications", used: data.tailored_applications_used, allowed: data.tailored_applications_allowed },
    { key: "outline", label: "Outlines", used: data.outlines_used, allowed: data.outlines_allowed },
    { key: "script_draft", label: "Script drafts", used: data.script_drafts_used, allowed: data.script_drafts_allowed },
    { key: "editing_pass", label: "Editing passes", used: data.editing_passes_used, allowed: data.editing_passes_allowed },
  ] : [];
  return { rows, resetsOn };
}
