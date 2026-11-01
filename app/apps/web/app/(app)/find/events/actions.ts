"use server";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// Event Finder member actions (6.2): save to targets, track (creates a planned application), watch, report.
// The database enforces the 50-target cap, the trial's three events and own-row access.

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}
function bump() { revalidatePath("/find/events"); revalidatePath("/find/targets"); revalidatePath("/today"); revalidatePath("/journey"); }

async function trialAllows(sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string) {
  const { data } = await sb.rpc("trial_limit_check", { p_user: userId, p_kind: "track_event" });
  return data !== false;
}

export async function saveTarget(eventId: string, priority = 2, note = ""): Promise<ActionResult> {
  const { user, sb } = await me();
  const talk = await currentTalk(user.id);
  if (!(await trialAllows(sb, user.id))) return { ok: false, code: "TRIAL_LIMIT", message: "Your trial covers three events. Become a member to save more." };
  const { error } = await sb.from("target_list").upsert({ user_id: user.id, event_id: eventId, talk_id: talk?.id ?? null, priority, note: note || null }, { onConflict: "user_id,event_id" });
  if (error) return { ok: false, code: "SAVE_FAILED", message: /TARGET_LIMIT/.test(error.message) ? "Your target list holds 50 events. Remove one first." : "Could not save. Try again." };
  bump();
  return { ok: true };
}

export async function removeTarget(eventId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  await sb.from("target_list").delete().eq("user_id", user.id).eq("event_id", eventId);
  bump();
  return { ok: true };
}

export async function updateTarget(eventId: string, patch: { priority?: number; note?: string }): Promise<ActionResult> {
  const { user, sb } = await me();
  const { error } = await sb.from("target_list").update({ ...(patch.priority ? { priority: patch.priority } : {}), ...(patch.note !== undefined ? { note: patch.note || null } : {}) }).eq("user_id", user.id).eq("event_id", eventId);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save." };
  bump();
  return { ok: true };
}

// Track = a planned application record (F1.2.5). One per event per cycle.
export async function trackEvent(eventId: string): Promise<ActionResult<{ applicationId: string }>> {
  const { user, sb } = await me();
  const talk = await currentTalk(user.id);
  if (!talk) return { ok: false, code: "NO_TALK", message: "Finish onboarding first." };
  if (!(await trialAllows(sb, user.id))) return { ok: false, code: "TRIAL_LIMIT", message: "Your trial covers three events. Become a member to track more." };
  const { data: ev } = await sb.from("events").select("application_status, event_date").eq("id", eventId).maybeSingle();
  if (ev?.application_status === "invitation_only" || ev?.application_status === "nomination") return { ok: false, code: "NOT_OPEN_CALL", message: "This event does not take applications. You can watch it instead." };
  const { data, error } = await sb.from("applications").insert({ user_id: user.id, talk_id: talk.id, event_id: eventId, status: "planned", event_date: ev?.event_date ?? null }).select("id").single();
  if (error || !data) return { ok: false, code: "SAVE_FAILED", message: /one_per_cycle/.test(error?.message ?? "") ? "You already have an application for this event this year." : "Could not track it. Try again." };
  await sb.from("target_list").upsert({ user_id: user.id, event_id: eventId, talk_id: talk.id }, { onConflict: "user_id,event_id" });
  bump();
  return { ok: true, data: { applicationId: data.id } };
}

export async function watchEvent(eventId: string, on: boolean): Promise<ActionResult> {
  const { user, sb } = await me();
  const q = on ? sb.from("event_watches").upsert({ user_id: user.id, event_id: eventId }, { onConflict: "user_id,event_id" }) : sb.from("event_watches").delete().eq("user_id", user.id).eq("event_id", eventId);
  const { error } = await q;
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not change the watch." };
  bump();
  return { ok: true };
}

export async function reportEvent(eventId: string, kind: "outdated" | "tip" | "pay_to_play", url: string, note: string): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("report_event", { p_event: eventId, p_kind: kind, p_url: url || null, p_note: note || null });
  if (error) return { ok: false, code: "REPORT_FAILED", message: "Could not send the report." };
  return { ok: true };
}

export async function calendarUrl(): Promise<ActionResult<{ url: string }>> {
  const { sb } = await me();
  const { data, error } = await sb.rpc("my_calendar_token");
  if (error || !data) return { ok: false, code: "TOKEN_FAILED", message: "Could not create your calendar link." };
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return { ok: true, data: { url: `${site}/api/calendar/${data}.ics` } };
}
