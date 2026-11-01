import type { SupabaseClient } from "@supabase/supabase-js";
import { checkColumns, remap, toCall, toEvent, toOrganizer, type CallRecord, type EventRecord, type OrganizerRecord, type RowProblem } from "./normalize";
import { CALL_FIELDS, EVENT_FIELDS, ORGANIZER_FIELDS, diffRecords, missingKeys, summarize, type DiffItem, type RunSummary } from "./diff";

// The import pipeline (6.2 F1.2.16, 12.5, S8.3). One function runs for a Google Sheet sync or a CSV upload:
// parse, check columns, diff against the catalogue, apply what is allowed to apply, queue the rest, expire
// what the sheet no longer lists, write the run row and the field-level diff items. The caller has already
// checked that the actor is a curator; the client runs with the service role.

export interface ImportInput {
  events: { headers: string[]; rows: Record<string, string>[] } | null;
  organizers: { headers: string[]; rows: Record<string, string>[] } | null;
  calls: { headers: string[]; rows: Record<string, string>[] } | null;
}
export interface ImportResult {
  runId: string; summary: RunSummary; problems: RowProblem[]; columnProblems: string[];
  pending: number; auto: number; expired: number;
}

export async function runImport(db: SupabaseClient, input: ImportInput, opts: { kind: "google_sheet" | "csv_upload"; sourceId: string | null; label: string; actorId: string | null; now?: Date }): Promise<ImportResult> {
  const now = opts.now ?? new Date();
  const problems: RowProblem[] = [];
  const columnProblems: string[] = [];
  const { data: run, error: runErr } = await db.from("crawler_runs").insert({ source_id: opts.sourceId, kind: opts.kind, run_label: opts.label, triggered_by: opts.actorId }).select("id").single();
  if (runErr || !run) throw new Error(`could not start the run: ${runErr?.message}`);
  const runId = run.id as string;

  // --- parse -----------------------------------------------------------
  const events: EventRecord[] = [], organizers: OrganizerRecord[] = [], calls: CallRecord[] = [];
  if (input.events) {
    const c = checkColumns(input.events.headers, "events");
    if (!c.ok) columnProblems.push(`events tab: missing ${c.missingRequired.join(", ")}`);
    else input.events.rows.forEach((r, i) => { const e = toEvent(remap(r, c.mapped), i + 2, problems); if (e) events.push(e); });
    if (c.unknown.length) columnProblems.push(`events tab: ignored columns ${c.unknown.join(", ")}`);
  }
  if (input.organizers) {
    const c = checkColumns(input.organizers.headers, "organizers");
    if (!c.ok) columnProblems.push(`organizers tab: missing ${c.missingRequired.join(", ")}`);
    else input.organizers.rows.forEach((r, i) => { const o = toOrganizer(remap(r, c.mapped), i + 2, problems); if (o) organizers.push(o); });
  }
  if (input.calls) {
    const c = checkColumns(input.calls.headers, "calls");
    if (!c.ok) columnProblems.push(`application_calls tab: missing ${c.missingRequired.join(", ")}`);
    else input.calls.rows.forEach((r, i) => { const k = toCall(remap(r, c.mapped), i + 2, problems); if (k) calls.push(k); });
  }
  // Calls folded into the events tab (deadline, call_status columns present on events rows) are accepted too.
  if (input.events && !input.calls) {
    const c = checkColumns(input.events.headers, "calls");
    const hasCallCols = Object.values(c.mapped).some((k) => ["call_status", "deadline", "application_form_url"].includes(k));
    if (hasCallCols) input.events.rows.forEach((r, i) => { const m = remap(r, c.mapped); if (m.call_status || m.deadline) { const k = toCall(m, i + 2, problems); if (k) calls.push(k); } });
  }

  // --- current state --------------------------------------------------------
  const eventKeys = events.map((e) => e.tedx_event_id);
  const [{ data: curEvents }, { data: curOrgs }, { data: curCalls }] = await Promise.all([
    eventKeys.length ? db.from("events").select("*").in("tedx_event_id", eventKeys) : Promise.resolve({ data: [] as any[] }),
    organizers.length ? db.from("organizers").select("*").in("external_id", organizers.map((o) => o.external_id)) : Promise.resolve({ data: [] as any[] }),
    calls.length ? db.from("application_calls").select("*").in("call_id", calls.map((k) => k.call_id)) : Promise.resolve({ data: [] as any[] }),
  ]);
  const curEventBy = new Map(((curEvents ?? []) as any[]).map((e) => [e.tedx_event_id, e]));
  const curOrgBy = new Map(((curOrgs ?? []) as any[]).map((o) => [o.external_id, o]));
  const curCallBy = new Map(((curCalls ?? []) as any[]).map((k) => [k.call_id, k]));

  // --- diff -------------------------------------------------------------------
  const items: DiffItem[] = [];
  for (const e of events) items.push(...diffRecords("event", e.tedx_event_id, e as any, (curEventBy.get(e.tedx_event_id) as any) ?? null, EVENT_FIELDS as any, e.curator_verified));
  for (const o of organizers) items.push(...diffRecords("organizer", o.external_id, o as any, (curOrgBy.get(o.external_id) as any) ?? null, ORGANIZER_FIELDS as any, true));   // organizer facts carry no member-facing status; apply them
  for (const k of calls) items.push(...diffRecords("call", k.call_id, k as any, (curCallBy.get(k.call_id) as any) ?? null, CALL_FIELDS as any, k.curator_verified));

  // --- apply ------------------------------------------------------------------
  // Organizers first so events can link to them.
  const orgIdByExternal = new Map<string, string>();
  for (const o of organizers) {
    const row = { external_id: o.external_id, name: o.name, name_key: o.name_key, website_domain: o.website_domain, website_url: o.website_url, city: o.city, country_code: o.country_code,
      instagram: o.instagram, linkedin_page: o.linkedin_page, facebook_page: o.facebook_page, x_handle: o.x_handle, youtube_channel: o.youtube_channel, licensee_name: o.licensee_name,
      confidence: o.confidence, needs_review: o.needs_review, removal_requested_at: o.removal_requested_at };
    const { data, error } = await db.from("organizers").upsert(row, { onConflict: "external_id" }).select("id").single();
    if (error || !data) { problems.push({ row: 0, key: o.external_id, problem: `organizer not saved: ${error?.message}` }); continue; }
    orgIdByExternal.set(o.external_id, data.id);
    if (o.contact) {
      await db.from("organizer_contacts").upsert({ organizer_id: data.id, public_contact_email: o.contact.email, public_contact_role: o.contact.role, public_contact_name: o.contact.name, contact_form_url: o.contact.form_url,
        contact_source_url: o.contact.source_url ?? "", contact_seen_at: o.contact.seen_at ?? now.toISOString(), lawful_basis_note: "publicly posted for contact" }, { onConflict: "organizer_id" });
    }
  }

  let auto = 0, pending = 0;
  const autoByKey = new Map<string, Set<string>>();
  for (const it of items) { if (it.auto) { auto++; const s = autoByKey.get(`${it.entity}:${it.key}`) ?? new Set(); s.add(it.field); autoByKey.set(`${it.entity}:${it.key}`, s); } else pending++; }

  for (const e of events) {
    const cur = curEventBy.get(e.tedx_event_id) as any;
    const allowed = autoByKey.get(`event:${e.tedx_event_id}`);
    const isNew = !cur;
    if (isNew && !allowed?.has("*")) {
      // New, unverified, low confidence: stored for the queue but not published to members.
      await db.from("events").insert({ ...eventRow(e, orgIdByExternal, runId, now), curator_verified: false, needs_review: true });
      continue;
    }
    if (isNew) { await db.from("events").insert({ ...eventRow(e, orgIdByExternal, runId, now), curator_verified: e.curator_verified, needs_review: !e.curator_verified, last_verified_at: e.curator_verified ? now.toISOString() : null, verified_by: e.curator_verified ? opts.actorId : null }); continue; }
    const patch: Record<string, unknown> = { last_seen_at: now.toISOString(), crawler_run_id: runId };
    const full = eventRow(e, orgIdByExternal, runId, now);
    for (const f of allowed ?? []) if (f !== "*" && f in full) patch[f] = (full as any)[f];
    if (e.curator_verified) { patch.curator_verified = true; patch.needs_review = false; patch.last_verified_at = now.toISOString(); patch.verified_by = opts.actorId; }
    else if ((allowed?.size ?? 0) < (items.filter((i) => i.entity === "event" && i.key === e.tedx_event_id).length)) patch.needs_review = true;
    await db.from("events").update(patch).eq("id", cur.id);
  }

  // Calls: a call carries the member-facing status and deadline onto the event (events.application_status and
  // events.application_deadline are what members see); a status never comes from a model, only from the sheet.
  for (const k of calls) {
    const { data: ev } = await db.from("events").select("id").eq("tedx_event_id", k.tedx_event_id).maybeSingle();
    if (!ev) { problems.push({ row: 0, key: k.call_id, problem: "call refers to an event that is not in the catalogue" }); continue; }
    const cur = curCallBy.get(k.call_id) as any;
    const allowed = autoByKey.get(`call:${k.call_id}`);
    const row = callRow(k, ev.id, runId);
    if (!cur) { await db.from("application_calls").insert(row); }
    else if (allowed?.size) { const patch: Record<string, unknown> = {}; for (const f of allowed) if (f in row) patch[f] = (row as any)[f]; await db.from("application_calls").update(patch).eq("id", cur.id); }
    const statusAllowed = !cur || allowed?.has("call_status") || k.curator_verified;
    const deadlineAllowed = !cur || allowed?.has("deadline") || k.curator_verified;
    const evPatch: Record<string, unknown> = {};
    if (statusAllowed) { evPatch.application_status = k.call_status; evPatch.status_evidence = k.status_evidence; evPatch.status_source_url = k.status_source_url; evPatch.status_seen_at = k.status_seen_at ?? now.toISOString(); evPatch.call_opens_on = k.call_opens_on; }
    if (deadlineAllowed) { evPatch.application_deadline = k.deadline; evPatch.deadline_timezone = k.deadline_timezone; evPatch.deadline_timezone_status = k.deadline_timezone_status; evPatch.deadline_raw = k.deadline_raw; }
    evPatch.form_url = k.application_form_url; evPatch.form_type = k.form_type; evPatch.pitch_video_required = k.video_required; evPatch.talk_length_target = k.slot_lengths; evPatch.criteria_snippet = k.criteria_snippet;
    evPatch.ai_policy = k.ai_policy; evPatch.ai_policy_snippet = k.ai_policy_snippet; evPatch.ai_policy_source_url = k.ai_policy_source_url; evPatch.past_speakers_url = k.past_speakers_url;
    if (k.curator_verified) { evPatch.curator_verified = true; evPatch.needs_review = false; evPatch.last_verified_at = now.toISOString(); }
    await db.from("events").update(evPatch).eq("id", ev.id);
  }

  // --- expire rows the sheet no longer lists (sheet syncs only) ----------------------------
  let expired = 0;
  if (opts.kind === "google_sheet" && opts.sourceId && input.events && events.length > 0) {
    const { data: n } = await db.rpc("expire_events_missing", { p_run: runId, p_source: opts.sourceId, p_present_keys: eventKeys });
    expired = Number(n ?? 0);
  }
  await db.rpc("expire_past_events");
  await db.rpc("mark_stale_calls");

  // --- diff items and the run row --------------------------------------------------
  if (items.length) {
    const rows = items.map((i) => ({ run_id: runId, entity: i.entity, record_key: i.key, field: i.field, before: i.before === undefined ? null : i.before, after: i.after === undefined ? null : i.after, confidence: i.confidence, status: i.auto ? "auto" : "pending", decided_at: i.auto ? now.toISOString() : null }));
    for (let i = 0; i < rows.length; i += 500) await db.from("import_diffs").insert(rows.slice(i, i + 500));
  }
  const { data: curKeys } = opts.kind === "google_sheet" && opts.sourceId ? await db.from("events").select("tedx_event_id").eq("source", "google_sheet").eq("expired", false) : { data: [] as any[] };
  const summary = summarize(items, [...eventKeys, ...organizers.map((o) => o.external_id), ...calls.map((k) => k.call_id)], expired ? missingKeys(((curKeys ?? []) as any[]).map((x) => x.tedx_event_id), eventKeys) : [], problems.length);
  summary.expired = expired;
  await db.from("crawler_runs").update({ finished_at: now.toISOString(), rows_total: summary.total, rows_new: summary.new, rows_changed: summary.changed, rows_unchanged: summary.unchanged, rows_expired: expired, rows_error: problems.length,
    report: { problems: problems.slice(0, 200), columnProblems, pending, auto } }).eq("id", runId);
  if (opts.sourceId) await db.from("import_sources").update({ last_synced_at: now.toISOString(), last_status: columnProblems.length ? "synced with column problems" : "synced" }).eq("id", opts.sourceId);
  return { runId, summary, problems, columnProblems, pending, auto, expired };
}

function eventRow(e: EventRecord, orgs: Map<string, string>, runId: string, now: Date) {
  return {
    tedx_event_id: e.tedx_event_id, name: e.name, name_key: e.name_key, event_url: e.event_url, event_type: e.event_type, status_label: e.status_label,
    event_date: e.event_date, end_date: e.end_date, raw_date: e.raw_date, timezone: e.timezone, city: e.city, region: e.region, country_code: e.country_code, venue: e.venue,
    lat: e.lat, lng: e.lng, theme: e.theme, organizer_id: e.organizer_external_id ? orgs.get(e.organizer_external_id) ?? null : null, organizer_website_url: e.organizer_website_url,
    social_links: e.social_links, source_urls: e.source_urls, confidence: e.confidence, needs_review: e.needs_review, expired: e.expired,
    source: "google_sheet", crawler_run_id: runId, last_seen_at: now.toISOString(),
  };
}
function callRow(k: CallRecord, eventId: string, runId: string) {
  return {
    call_id: k.call_id, event_id: eventId, edition_year: k.edition_year, call_status: k.call_status, call_opens_on: k.call_opens_on, status_evidence: k.status_evidence, status_source_url: k.status_source_url, status_seen_at: k.status_seen_at,
    application_form_url: k.application_form_url, form_type: k.form_type, deadline: k.deadline, deadline_timezone: k.deadline_timezone, deadline_raw: k.deadline_raw, criteria_snippet: k.criteria_snippet, slot_lengths: k.slot_lengths,
    video_required: k.video_required, requirements_notes: k.requirements_notes, past_speakers_url: k.past_speakers_url, ai_policy: k.ai_policy, ai_policy_snippet: k.ai_policy_snippet, ai_policy_source_url: k.ai_policy_source_url,
    confidence: k.confidence, needs_review: k.needs_review, crawler_run_id: runId,
  };
}

// Accept or reject one pending diff item (S8.3 Diff tab). Accepting applies that one field now.
export async function decideDiff(db: SupabaseClient, diffId: number, accept: boolean, actorId: string) {
  const { data: d } = await db.from("import_diffs").select("*").eq("id", diffId).maybeSingle();
  if (!d || d.status !== "pending") return { ok: false, message: "That change was already decided." };
  if (accept) {
    if (d.entity === "event" && d.field !== "*") {
      const map: Record<string, string> = { call_status: "application_status", deadline: "application_deadline" };
      await db.from("events").update({ [map[d.field] ?? d.field]: d.after, last_seen_at: new Date().toISOString() }).eq("tedx_event_id", d.record_key);
    } else if (d.entity === "event" && d.field === "*") {
      await db.from("events").update({ needs_review: false }).eq("tedx_event_id", d.record_key);
    } else if (d.entity === "call") {
      const { data: call } = await db.from("application_calls").select("id, event_id").eq("call_id", d.record_key).maybeSingle();
      if (call) {
        if (d.field !== "*") await db.from("application_calls").update({ [d.field]: d.after }).eq("id", call.id);
        if (d.field === "call_status") await db.from("events").update({ application_status: d.after, status_seen_at: new Date().toISOString() }).eq("id", call.event_id);
        if (d.field === "deadline") await db.from("events").update({ application_deadline: d.after }).eq("id", call.event_id);
      }
    } else if (d.entity === "organizer" && d.field !== "*") {
      await db.from("organizers").update({ [d.field]: d.after }).eq("external_id", d.record_key);
    }
  }
  await db.from("import_diffs").update({ status: accept ? "accepted" : "rejected", decided_by: actorId, decided_at: new Date().toISOString() }).eq("id", diffId);
  return { ok: true };
}
