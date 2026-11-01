"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

// Weekly commitment controls (5.3 item 2). Pausing is always allowed and never shown as failure.
export async function pauseWeek(paused: boolean) {
  const sb = await supabaseServer();
  const { error } = await sb.rpc("set_week_paused", { p_paused: paused });
  if (error) return { ok: false, message: "Could not change the week. Try again." };
  revalidatePath("/today");
  return { ok: true };
}

export async function setWeekTarget(target: number) {
  const t = Math.max(1, Math.min(14, Math.round(target)));
  const sb = await supabaseServer();
  const { error } = await sb.rpc("set_week_target", { p_target: t });
  if (error) return { ok: false, message: "Could not set the target. Try again." };
  revalidatePath("/today");
  return { ok: true };
}

// A member marks a block done (practice, an application step). Counts toward this week.
export async function logBlock(kind: "practice_block" | "application_sent" | "launch_step", talkId?: string) {
  const sb = await supabaseServer();
  const { error } = await sb.rpc("log_activity", { p_kind: kind, p_talk: talkId ?? null });
  if (error) return { ok: false, message: "Could not log that. Try again." };
  revalidatePath("/today"); revalidatePath("/journey");
  return { ok: true };
}
