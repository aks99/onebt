import type { SupabaseClient } from "@supabase/supabase-js";
import { accessToken, loadServiceAccount, readTab } from "./sheets";
import { rowsFromValues } from "./csv";
import { runImport, type ImportResult } from "./import";

// Weekly Google Sheet sync (F1.2.16): one source row, three tabs, one import run. Called by the cron route
// every week and by "Sync now" in the Curator Console.

export type SyncOutcome = { ok: true; result: ImportResult } | { ok: false; message: string };

export async function syncSource(db: SupabaseClient, sourceId: string, actorId: string | null, fetchFn: typeof fetch = fetch): Promise<SyncOutcome> {
  const { data: src } = await db.from("import_sources").select("*").eq("id", sourceId).maybeSingle();
  if (!src) return { ok: false, message: "Source not found." };
  if (src.kind !== "google_sheet" || !src.google_sheet_id) return { ok: false, message: "This source is not a Google Sheet." };
  const sa = loadServiceAccount();
  if (!sa) return { ok: false, message: "GOOGLE_SERVICE_ACCOUNT_JSON is not set. Add the service account and share the sheet with its email." };
  try {
    const token = await accessToken(sa, fetchFn);
    const [events, organizers, calls] = await Promise.all([
      readTab(src.google_sheet_id, src.events_tab ?? "events", token, fetchFn),
      readTab(src.google_sheet_id, src.organizers_tab ?? "organizers", token, fetchFn),
      readTab(src.google_sheet_id, src.calls_tab ?? "application_calls", token, fetchFn),
    ]);
    if (!events.length) { await db.from("import_sources").update({ last_status: "events tab empty or missing" }).eq("id", sourceId); return { ok: false, message: `The "${src.events_tab ?? "events"}" tab is empty or missing.` }; }
    const result = await runImport(db, {
      events: rowsFromValues(events), organizers: organizers.length ? rowsFromValues(organizers) : null, calls: calls.length ? rowsFromValues(calls) : null,
    }, { kind: "google_sheet", sourceId, label: `sheet ${new Date().toISOString().slice(0, 10)}`, actorId });
    return { ok: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    await db.from("import_sources").update({ last_status: `error: ${message.slice(0, 200)}` }).eq("id", sourceId);
    return { ok: false, message };
  }
}

export async function syncAllEnabled(db: SupabaseClient) {
  const { data: sources } = await db.from("import_sources").select("id").eq("enabled", true).eq("kind", "google_sheet");
  const out: Record<string, SyncOutcome> = {};
  for (const s of sources ?? []) out[s.id] = await syncSource(db, s.id, null);
  return out;
}
