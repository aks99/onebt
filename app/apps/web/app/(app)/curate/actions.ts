"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assertCurator } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/catalogue/csv";
import { runImport, decideDiff } from "@/lib/catalogue/import";
import { syncSource } from "@/lib/catalogue/sync";
import { loadServiceAccount, sheetIdFrom } from "@/lib/catalogue/sheets";
import { runActionForUser } from "@/lib/ai/server";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// Curator Console actions (S8.3). Every action checks the role; the database checks it again.

export async function saveSheetSource(input: { sheetUrlOrId: string; eventsTab: string; organizersTab: string; callsTab: string; label: string }): Promise<ActionResult<{ id: string; serviceAccountEmail: string | null }>> {
  const { userId } = await assertCurator();
  const sheetId = sheetIdFrom(input.sheetUrlOrId);
  if (!sheetId || sheetId.length < 10) return { ok: false, code: "INVALID", message: "Paste the Google Sheet link or its id." };
  const sa = loadServiceAccount();
  const db = supabaseAdmin();
  const { data: existing } = await db.from("import_sources").select("id").eq("kind", "google_sheet").limit(1).maybeSingle();
  const row = { kind: "google_sheet", label: input.label.trim() || "Owner sheet", google_sheet_id: sheetId, events_tab: input.eventsTab.trim() || "events", organizers_tab: input.organizersTab.trim() || "organizers", calls_tab: input.callsTab.trim() || "application_calls", service_account_email: sa?.client_email ?? null, enabled: true, created_by: userId };
  const q = existing ? db.from("import_sources").update(row).eq("id", existing.id).select("id").single() : db.from("import_sources").insert(row).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, code: "SAVE_FAILED", message: "Could not save the source." };
  revalidatePath("/curate");
  return { ok: true, data: { id: data.id, serviceAccountEmail: sa?.client_email ?? null } };
}

export async function syncNow(sourceId: string): Promise<ActionResult<{ runId: string; summary: Record<string, number>; pending: number }>> {
  const { userId } = await assertCurator();
  const r = await syncSource(supabaseAdmin(), sourceId, userId);
  revalidatePath("/curate");
  if (!r.ok) return { ok: false, code: "SYNC_FAILED", message: r.message };
  return { ok: true, data: { runId: r.result.runId, summary: r.result.summary as unknown as Record<string, number>, pending: r.result.pending } };
}

// CSV fallback: up to three files from one crawler run folder.
export async function uploadCsv(form: FormData): Promise<ActionResult<{ runId: string; summary: Record<string, number>; pending: number; problems: number }>> {
  const { userId } = await assertCurator();
  const read = async (name: string) => { const f = form.get(name); return f instanceof File && f.size > 0 ? parseCsv(await f.text()) : null; };
  const [events, organizers, calls] = await Promise.all([read("events"), read("organizers"), read("calls")]);
  if (!events && !organizers && !calls) return { ok: false, code: "NO_FILES", message: "Choose at least one of events.csv, organizers.csv or application_calls.csv." };
  const label = String(form.get("label") ?? "").trim() || `upload ${new Date().toISOString().slice(0, 10)}`;
  const result = await runImport(supabaseAdmin(), { events, organizers, calls }, { kind: "csv_upload", sourceId: null, label, actorId: userId });
  revalidatePath("/curate");
  return { ok: true, data: { runId: result.runId, summary: result.summary as unknown as Record<string, number>, pending: result.pending, problems: result.problems.length } };
}

export async function decide(diffId: number, accept: boolean): Promise<ActionResult> {
  const { userId } = await assertCurator();
  const r = await decideDiff(supabaseAdmin(), diffId, accept, userId);
  revalidatePath("/curate");
  return r.ok ? { ok: true } : { ok: false, code: "DECIDED", message: r.message ?? "Already decided." };
}

export async function acceptHighConfidence(runId: string): Promise<ActionResult<{ accepted: number }>> {
  const { userId } = await assertCurator();
  const db = supabaseAdmin();
  const { data } = await db.from("import_diffs").select("id").eq("run_id", runId).eq("status", "pending").gte("confidence", 0.8).not("field", "in", '("call_status","deadline")');
  let n = 0;
  for (const d of data ?? []) { const r = await decideDiff(db, d.id, true, userId); if (r.ok) n++; }
  revalidatePath("/curate");
  return { ok: true, data: { accepted: n } };
}

export async function verifyEvent(eventId: string, status: string | null, deadline: string | null, note: string): Promise<ActionResult> {
  await assertCurator();
  const sb = await supabaseServer();
  const { error } = await sb.rpc("verify_event", { p_event: eventId, p_status: status || null, p_deadline: deadline || null, p_note: note || null });
  if (error) return { ok: false, code: "VERIFY_FAILED", message: error.message };
  revalidatePath("/curate");
  return { ok: true };
}

export async function mergeEvents(keepId: string, dupId: string): Promise<ActionResult> {
  await assertCurator();
  const sb = await supabaseServer();
  const { error } = await sb.rpc("merge_events", { p_keep: keepId, p_dup: dupId });
  if (error) return { ok: false, code: "MERGE_FAILED", message: error.message };
  revalidatePath("/curate");
  return { ok: true };
}

export async function keepBoth(eventId: string): Promise<ActionResult> {
  await assertCurator();
  const db = supabaseAdmin();
  await db.from("events").update({ needs_review: false }).eq("id", eventId);
  revalidatePath("/curate");
  return { ok: true };
}

export async function resolveReport(reportId: string, action: "resolved" | "dismissed"): Promise<ActionResult> {
  const { userId } = await assertCurator();
  const db = supabaseAdmin();
  await db.from("event_reports").update({ status: action, resolved_by: userId, resolved_at: new Date().toISOString() }).eq("id", reportId);
  revalidatePath("/curate");
  return { ok: true };
}

export async function requestRemoval(organizerId: string, requested: boolean): Promise<ActionResult> {
  await assertCurator();
  const db = supabaseAdmin();
  await db.from("organizers").update({ removal_requested_at: requested ? new Date().toISOString() : null }).eq("id", organizerId);
  if (!requested) { /* nothing else */ } else { await db.from("organizer_contacts").delete().eq("organizer_id", organizerId); }
  revalidatePath("/curate");
  return { ok: true };
}

// Controlled vocabulary for theme tags (13.14). Curators can extend it in AI settings later.
const TAXONOMY = ["health", "medicine", "mental health", "education", "science", "technology", "ai", "climate", "environment", "business", "leadership", "work", "creativity", "arts", "design", "community", "identity", "justice", "equity", "family", "ageing", "youth", "money", "cities", "food", "sport", "language", "history", "philosophy", "faith", "resilience", "disability", "migration", "democracy", "media"];

// Theme tagging (13.14): Haiku suggests tags for events without accepted tags; a curator accepts them.
export async function suggestTags(limit = 20): Promise<ActionResult<{ tagged: number }>> {
  await assertCurator();
  const db = supabaseAdmin();
  const { data: events } = await db.from("events").select("id, name, theme, theme_history, city, country_code").eq("expired", false).not("theme", "is", null).limit(200);
  const { data: tagged } = await db.from("event_topics").select("event_id");
  const has = new Set((tagged ?? []).map((t) => t.event_id));
  const todo = (events ?? []).filter((e) => !has.has(e.id)).slice(0, limit);
  let n = 0;
  for (const e of todo) {
    const themeText = [e.theme, ...((e.theme_history as { theme?: string }[] | null) ?? []).map((t) => t.theme)].filter(Boolean).join("; ");
    const r = await runActionForUser<{ tags: string[] }>("event_tagging", { idempotencyKey: randomUUID(), vars: { taxonomy: TAXONOMY.join(", "), theme_text: themeText || e.name, past_titles: "none provided" } });
    if (!r.ok) continue;
    const rows = (r.result.output.tags ?? []).slice(0, 8).map((t) => ({ event_id: e.id, tag: t.toLowerCase().slice(0, 40), suggested_by: "haiku", accepted: false }));
    if (rows.length) { await db.from("event_topics").upsert(rows, { onConflict: "event_id,tag", ignoreDuplicates: true }); n++; }
  }
  revalidatePath("/curate");
  return { ok: true, data: { tagged: n } };
}

export async function acceptTags(eventId: string, tags: string[]): Promise<ActionResult> {
  await assertCurator();
  const db = supabaseAdmin();
  await db.from("event_topics").update({ accepted: true }).eq("event_id", eventId).in("tag", tags);
  await db.from("event_topics").delete().eq("event_id", eventId).eq("accepted", false);
  revalidatePath("/curate");
  return { ok: true };
}
