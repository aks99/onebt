"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { validateExistingApplication, validateThreeQuestions, statusForOutcome, type ExistingApplication, type OnboardingPath, type ThreeQuestions } from "@/lib/onboarding/validate";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// Onboarding (5.4): pick a path, three questions, idea spark, pick one and see matches, expectation screen.

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}

// S1.1 + S1.2 in one write: the Talk Record with its path, and the three profile answers.
export async function startTalk(path: OnboardingPath, q: ThreeQuestions): Promise<ActionResult<{ talkId: string }>> {
  const errors = validateThreeQuestions(path, q);
  if (Object.keys(errors).length) return { ok: false, code: "INVALID", message: Object.values(errors)[0], detail: errors };
  const { user, sb } = await me();
  const { error: pe } = await sb.from("profiles").update({
    expertise_line: q.expertise.trim(), city: q.city.trim(), country_code: q.countryCode,
    target_talk_month: q.targetMonth ? `${q.targetMonth}-01` : null,
  }).eq("user_id", user.id);
  if (pe) return { ok: false, code: "SAVE_FAILED", message: "Could not save your answers. Try again." };
  const { data: existing } = await sb.from("talks").select("id").eq("user_id", user.id).is("archived_at", null).limit(1).maybeSingle();
  let talkId = existing?.id as string | undefined;
  if (!talkId) {
    const { data, error } = await sb.from("talks").insert({
      user_id: user.id, path, stage: path === "published" ? "amplify" : path === "invited" ? "write" : "position",
      slot_minutes: path === "invited" && q.slotMinutes ? q.slotMinutes : 10,
      event_date: path === "invited" ? q.eventDate ?? null : null,
      published_url: path === "published" ? q.publishedUrl ?? null : null,
      publication: path === "published" ? "published" : "not_delivered",
    }).select("id").single();
    if (error || !data) return { ok: false, code: "SAVE_FAILED", message: "Could not create your Talk Record. Try again." };
    talkId = data.id;
    if (path === "invited" && q.eventName) {
      await sb.from("applications").insert({ user_id: user.id, talk_id: talkId, event_name_manual: q.eventName.trim(), status: "accepted", outcome: "accepted", event_date: q.eventDate ?? null, applied_at: null });
    }
  }
  revalidatePath("/onboarding");
  return { ok: true, data: { talkId: String(talkId) } };
}

// S1.4 "Already applied somewhere?": logs an application the member sent outside the app. It never counts
// toward the 100-ready-applications promise (that needs a ready application sent through the app).
export async function logExistingApplication(talkId: string, a: ExistingApplication): Promise<ActionResult<{ id: string }>> {
  const errors = validateExistingApplication(a);
  if (Object.keys(errors).length) return { ok: false, code: "INVALID", message: Object.values(errors)[0], detail: errors };
  const { user, sb } = await me();
  if (a.eventId) {
    const { data: allowed } = await sb.rpc("trial_limit_check", { p_user: user.id, p_kind: "track_event" });
    if (allowed === false) return { ok: false, code: "TRIAL_LIMIT", message: "Your trial covers three events. Become a member to track more." };
  }
  const status = statusForOutcome(a.outcome);
  const { data, error } = await sb.from("applications").insert({
    user_id: user.id, talk_id: talkId, event_id: a.eventId ?? null, event_name_manual: a.eventId ? null : a.eventName.trim(),
    status, applied_at: a.appliedAt, follow_up_at: a.followUpAt || null,
    outcome: a.outcome === "accepted" || a.outcome === "declined" ? a.outcome : null, event_date: a.eventDate || null,
    cycle_year: Number(a.appliedAt.slice(0, 4)),
  }).select("id").single();
  if (error || !data) return { ok: false, code: "SAVE_FAILED", message: /one_per_cycle/.test(error?.message ?? "") ? "You already logged an application to this event for that year." : "Could not log it. Try again." };
  await sb.rpc("log_activity", { p_kind: "application_logged", p_talk: talkId });
  if (a.outcome === "accepted") await sb.from("talks").update({ event_id: a.eventId ?? null, event_date: a.eventDate || null }).eq("id", talkId).eq("user_id", user.id);
  revalidatePath("/onboarding"); revalidatePath("/today"); revalidatePath("/journey");
  return { ok: true, data: { id: data.id } };
}

// Track an event from the match list (creates a planned application record).
export async function trackEvent(talkId: string, eventId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const { data: allowed } = await sb.rpc("trial_limit_check", { p_user: user.id, p_kind: "track_event" });
  if (allowed === false) return { ok: false, code: "TRIAL_LIMIT", message: "Your trial covers three events. Become a member to track more." };
  const { error } = await sb.from("target_list").upsert({ user_id: user.id, event_id: eventId, talk_id: talkId }, { onConflict: "user_id,event_id" });
  if (error) return { ok: false, code: "SAVE_FAILED", message: /50/.test(error.message) ? "Your target list holds 50 events. Remove one first." : "Could not track it. Try again." };
  revalidatePath("/onboarding"); revalidatePath("/today");
  return { ok: true };
}

// S1.5 Expectation screen, acknowledged once per account.
export async function acknowledgeExpectations() {
  const { user, sb } = await me();
  await sb.from("profiles").update({ expectation_acknowledged_at: new Date().toISOString() }).eq("user_id", user.id);
  redirect("/journey");
}
