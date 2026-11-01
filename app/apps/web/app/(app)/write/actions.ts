"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { currentTalk } from "@/lib/talks";
import { runActionForUser, profileText } from "@/lib/ai/server";
import { BRIEF_MIN, briefChars, coverage, cutPercent, defaultSections, estimateSeconds, jargon, quirks, readability, renderBrief, scriptWords, wordBudget, type OutlineDoc, type ScriptDoc, type ScriptRubric, type ScriptSection } from "@/lib/write/rules";
import type { ActionResult } from "@/app/(app)/find/idea-lab/actions";

// WRITE actions (Section 7). The two-step rule is enforced three times: here, in runAiAction's gates and in
// the database (brief minimum, final outline before any script). The AI drafts; the speaker owns.

async function me() {
  const user = await currentUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { user, sb: await supabaseServer() };
}
function bump() { for (const p of ["/write/brief", "/write/outline", "/write/script", "/write/factcheck", "/today", "/journey"]) revalidatePath(p); }

// --- Idea Brief (F2.0) ------------------------------------------------------------------------
// Autosave keeps a draft row (may be short). Save makes it a real brief (500+ characters, database rule).
export async function saveBrief(talkId: string, answers: Record<string, string>, finalSave: boolean): Promise<ActionResult<{ chars: number; saved: boolean }>> {
  const { user, sb } = await me();
  const clean = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, String(v ?? "").slice(0, 12000)]));
  const chars = briefChars(clean);
  if (finalSave && chars < BRIEF_MIN) return { ok: false, code: "BRIEF_TOO_SHORT", message: `${chars} of ${BRIEF_MIN} characters. The brief is what the outline is written from; a little more, please.` };
  const { data: latest } = await sb.from("idea_briefs").select("id, version, is_draft").eq("talk_id", talkId).eq("user_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle();
  let error;
  if (latest && (latest.is_draft || !finalSave)) {
    // keep editing the latest row; a saved brief that is edited again becomes a draft until saved again
    ({ error } = await sb.from("idea_briefs").update({ answers: clean, is_draft: !finalSave }).eq("id", latest.id));
  } else {
    ({ error } = await sb.from("idea_briefs").insert({ user_id: user.id, talk_id: talkId, version: (latest?.version ?? 0) + 1, answers: clean, is_draft: !finalSave }));
  }
  if (error) return { ok: false, code: "SAVE_FAILED", message: /idea_brief_minimum/.test(error.message) ? `${chars} of ${BRIEF_MIN} characters.` : "Could not save. Your text is still in the form." };
  if (finalSave) await sb.rpc("log_activity", { p_kind: "brief_saved", p_talk: talkId });
  bump();
  return { ok: true, data: { chars, saved: finalSave } };
}

export async function briefCompleteness(briefId: string): Promise<ActionResult<{ answers: { key: string; present: boolean; strength: string; ask: string }[]; ready_for_outline: boolean; note: string }>> {
  const { user, sb } = await me();
  const { data: b } = await sb.from("idea_briefs").select("*").eq("id", briefId).eq("user_id", user.id).maybeSingle();
  if (!b) return { ok: false, code: "NOT_FOUND", message: "That brief is not here." };
  const r = await runActionForUser<{ answers: { key: string; present: boolean; strength: string; ask: string }[]; ready_for_outline: boolean; note: string }>("brief_completeness", { talkId: b.talk_id, briefId, idempotencyKey: randomUUID(), vars: { char_count: String(b.char_count), brief_json: JSON.stringify(b.answers) } });
  if (!r.ok) return r;
  await sb.from("idea_briefs").update({ completeness: r.result.output }).eq("id", briefId);
  bump();
  return { ok: true, data: r.result.output };
}

// --- Talk length (F2.1) and structure (F2.2) ------------------------------------------------
export async function setTalkLength(talkId: string, slotMinutes: number, targetWpm: number): Promise<ActionResult> {
  const { user, sb } = await me();
  const { error } = await sb.from("talks").update({ slot_minutes: Math.max(3, Math.min(18, Math.round(slotMinutes))), target_wpm: Math.max(110, Math.min(190, Math.round(targetWpm))) }).eq("id", talkId).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save." };
  bump();
  return { ok: true };
}

export async function setStructure(talkId: string, template: string): Promise<ActionResult<{ outlineId: string }>> {
  const { user, sb } = await me();
  const { data: brief } = await sb.from("idea_briefs").select("id").eq("talk_id", talkId).eq("is_draft", false).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: existing } = await sb.from("outlines").select("id").eq("talk_id", talkId).eq("user_id", user.id).limit(1).maybeSingle();
  const q = existing ? sb.from("outlines").update({ structure_template: template, brief_id: brief?.id ?? null }).eq("id", existing.id).select("id").single() : sb.from("outlines").insert({ user_id: user.id, talk_id: talkId, structure_template: template, brief_id: brief?.id ?? null }).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, code: "SAVE_FAILED", message: "Could not save the structure." };
  bump();
  return { ok: true, data: { outlineId: data.id } };
}

// --- Outline Builder (F2.3) ----------------------------------------------------------------------
export async function generateOutline(talkId: string): Promise<ActionResult<{ versionId: string; version: number }>> {
  const { user, sb } = await me();
  const [talk, { data: brief }, { data: idea }, { data: profile }, { data: outline }] = await Promise.all([
    currentTalk(user.id, talkId),
    sb.from("idea_briefs").select("*").eq("talk_id", talkId).eq("is_draft", false).order("version", { ascending: false }).limit(1).maybeSingle(),
    sb.from("ideas").select("*").eq("talk_id", talkId).eq("status", "locked").maybeSingle(),
    sb.from("profiles").select("display_name, expertise_line, city, country_code").eq("user_id", user.id).maybeSingle(),
    sb.from("outlines").select("*").eq("talk_id", talkId).limit(1).maybeSingle(),
  ]);
  if (!talk) return { ok: false, code: "NOT_FOUND", message: "Talk not found." };
  if (!brief) return { ok: false, code: "BRIEF_TOO_SHORT", message: "Save your Idea Brief first (500 characters at least). The outline is written only from it." };
  if (!idea) return { ok: false, code: "IDEA_NOT_LOCKED", message: "Lock your idea in the Idea Lab first." };
  let outlineId = outline?.id as string | undefined; const template = outline?.structure_template ?? "ted_four_beat";
  if (!outlineId) { const r = await setStructure(talkId, template); if (!r.ok || !r.data) return r as any; outlineId = r.data.outlineId; }
  const { data: expansion } = await sb.from("idea_expansions").select("*").eq("idea_id", idea.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const budget = wordBudget(talk.slot_minutes, (talk as any).target_wpm ?? 150);
  const r = await runActionForUser<OutlineDoc>("outline", {
    talkId, briefId: brief.id, idempotencyKey: randomUUID(),
    vars: { slot_minutes: String(talk.slot_minutes), target_wpm: String((talk as any).target_wpm ?? 150), word_budget: String(budget.target), structure_template: template,
      idea_brief: renderBrief(brief.answers as Record<string, string>), idea_json: JSON.stringify({ title_working: idea.title_working, throughline: idea.throughline, belief_challenged: idea.belief_challenged, antagonist: idea.antagonist, evidence_notes: idea.evidence_notes, audience_action: idea.audience_action, why_this_speaker: idea.why_this_speaker }),
      expansion_json: expansion ? JSON.stringify({ thesis: expansion.thesis, why_it_matters: expansion.why_it_matters, key_points: expansion.key_points, story_candidates: expansion.story_candidates, contrast: expansion.contrast }) : "none", profile: profileText(profile) },
  });
  if (!r.ok) return r;
  // Fill any missing time budgets from the template so every section carries one (7.1 principle 3).
  const defaults = defaultSections(template, talk.slot_minutes, (talk as any).target_wpm ?? 150);
  const doc: OutlineDoc = { sections: r.result.output.sections.map((s, i) => ({ ...s, id: s.id || `s${i + 1}`, target_seconds: s.target_seconds || defaults[Math.min(i, defaults.length - 1)].target_seconds, target_words: s.target_words || defaults[Math.min(i, defaults.length - 1)].target_words, ending_point: !!s.ending_point, talking_points: (s.talking_points ?? []).map((p, j) => ({ ...p, id: p.id || `${s.id || `s${i + 1}`}-p${j + 1}` })) })) };
  const { data: vnum } = await sb.rpc("next_outline_version", { p_outline: outlineId });
  const { data: v, error } = await sb.from("outline_versions").insert({ user_id: user.id, outline_id: outlineId, version: Number(vnum ?? 1), doc, status: "draft", source: "llm" }).select("id, version").single();
  if (error || !v) return { ok: false, code: "SAVE_FAILED", message: "Generated but not saved. Try again; you were charged once." };
  bump();
  return { ok: true, data: { versionId: v.id, version: v.version } };
}

// The member edits the outline: a new user-sourced version (history survives; restore is a copy).
export async function saveOutline(versionId: string, doc: OutlineDoc): Promise<ActionResult<{ versionId: string; version: number }>> {
  const { user, sb } = await me();
  const { data: v } = await sb.from("outline_versions").select("outline_id, status, doc").eq("id", versionId).eq("user_id", user.id).maybeSingle();
  if (!v) return { ok: false, code: "NOT_FOUND", message: "That outline is not here." };
  if (JSON.stringify(v.doc) === JSON.stringify(doc)) return { ok: true, data: { versionId, version: 0 } };
  const { data: vnum } = await sb.rpc("next_outline_version", { p_outline: v.outline_id });
  const { data: nv, error } = await sb.from("outline_versions").insert({ user_id: user.id, outline_id: v.outline_id, version: Number(vnum ?? 1), doc, status: "draft", source: "user" }).select("id, version").single();
  if (error || !nv) return { ok: false, code: "SAVE_FAILED", message: "Could not save the edit." };
  bump();
  return { ok: true, data: { versionId: nv.id, version: nv.version } };
}

export async function finalizeOutline(versionId: string): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("finalize_outline", { p_version: versionId });
  if (error) return { ok: false, code: "FINALIZE_FAILED", message: "Could not finalize. Try again." };
  bump();
  return { ok: true };
}
export async function reopenOutline(versionId: string): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("reopen_outline", { p_version: versionId });
  if (error) return { ok: false, code: "REOPEN_FAILED", message: "Could not reopen." };
  bump();
  return { ok: true };
}

// --- Script Studio (F2.4): one call per section, in order, from the final outline only --------------------------
async function scriptFor(sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string, talkId: string) {
  const { data: finalV } = await sb.from("outline_versions").select("id, doc, outlines!inner(talk_id)").eq("status", "final").eq("outlines.talk_id", talkId).maybeSingle();
  if (!finalV) return { script: null, finalV: null };
  const { data: script } = await sb.from("scripts").select("*").eq("talk_id", talkId).eq("user_id", userId).limit(1).maybeSingle();
  return { script, finalV };
}

export async function startScript(talkId: string): Promise<ActionResult<{ scriptId: string }>> {
  const { user, sb } = await me();
  const talk = await currentTalk(user.id, talkId);
  const { script, finalV } = await scriptFor(sb, user.id, talkId);
  if (!finalV) return { ok: false, code: "OUTLINE_NOT_FINAL", message: "Finalize your outline first. The script is written only from it." };
  if (script) {
    if (script.outline_version_id !== finalV.id) await sb.from("scripts").update({ outline_version_id: finalV.id }).eq("id", script.id);
    return { ok: true, data: { scriptId: script.id } };
  }
  const { data, error } = await sb.from("scripts").insert({ user_id: user.id, talk_id: talkId, outline_version_id: finalV.id, slot_minutes: talk?.slot_minutes ?? 10, target_wpm: (talk as any)?.target_wpm ?? 150 }).select("id").single();
  if (error || !data) return { ok: false, code: "SAVE_FAILED", message: /OUTLINE_NOT_FINAL/.test(error?.message ?? "") ? "Finalize your outline first." : "Could not start the script." };
  bump();
  return { ok: true, data: { scriptId: data.id } };
}

// Writes the next unwritten section; the client calls this repeatedly to "stream" section by section.
export async function writeNextSection(scriptId: string, draftDoc: ScriptDoc | null): Promise<ActionResult<{ doc: ScriptDoc; done: boolean; sectionId: string | null }>> {
  const { user, sb } = await me();
  const { data: script } = await sb.from("scripts").select("*, outline_versions(doc, status)").eq("id", scriptId).eq("user_id", user.id).maybeSingle();
  if (!script) return { ok: false, code: "NOT_FOUND", message: "Script not found." };
  const ov = (script as any).outline_versions;
  if (ov?.status !== "final") return { ok: false, code: "OUTLINE_NOT_FINAL", message: "The outline is no longer final. Finalize it again before writing." };
  const outline = ov.doc as OutlineDoc;
  const doc: ScriptDoc = draftDoc ?? { sections: outline.sections.map((s) => ({ id: s.id, kind: s.kind, title: titleFor(s.kind, s.purpose), text: "", target_seconds: s.target_seconds, ending_point: s.ending_point, covered_point_ids: [], uncovered: [] })) };
  const next = doc.sections.find((s) => !s.text.trim());
  if (!next) return { ok: true, data: { doc, done: true, sectionId: null } };
  const os = outline.sections.find((s) => s.id === next.id)!;
  const [{ data: profile }, { data: sample }, { data: brief }] = await Promise.all([
    sb.from("profiles").select("display_name, expertise_line, city, country_code").eq("user_id", user.id).maybeSingle(),
    sb.from("writing_samples").select("text").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("idea_briefs").select("answers").eq("talk_id", script.talk_id).eq("is_draft", false).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const voice = [sample?.text?.slice(0, 2000), brief ? renderBrief(brief.answers as Record<string, string>).slice(0, 2000) : ""].filter(Boolean).join("\n\n") || "none provided";
  const prior = doc.sections.filter((s) => s.text.trim()).map((s) => `[${s.title}]\n${s.text}`).join("\n\n") || "none yet";
  const r = await runActionForUser<{ text: string; word_count: number; covered_point_ids: string[]; uncovered: { id: string; why: string }[]; claims: string[] }>("script_section", {
    talkId: script.talk_id, outlineVersionId: script.outline_version_id, scriptId, idempotencyKey: randomUUID(),
    vars: { section_id: os.id, kind: os.kind, target_words: String(os.target_words), writing_sample: voice, outline_json: JSON.stringify(outline), prior_text: prior, profile: profileText(profile) },
  });
  if (!r.ok) return r;
  const o = r.result.output;
  const updated: ScriptDoc = { sections: doc.sections.map((s) => s.id === next.id ? { ...s, text: o.text, covered_point_ids: o.covered_point_ids ?? [], uncovered: o.uncovered ?? [] } : s) };
  const done = updated.sections.every((s) => s.text.trim());
  if (done) await saveVersionInternal(sb, user.id, script, updated, "llm", null);
  bump();
  return { ok: true, data: { doc: updated, done, sectionId: next.id } };
}

function titleFor(kind: string, purpose: string) { return purpose?.length && purpose.length <= 60 ? purpose : ({ hook: "Opening", care: "Why it matters", idea: "The idea", evidence: "Evidence", implication: "What changes", cta: "The ask", close: "Close" } as Record<string, string>)[kind] ?? kind; }

async function saveVersionInternal(sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string, script: any, doc: ScriptDoc, source: "llm" | "user", passKey: string | null, parent?: string | null) {
  const words = scriptWords(doc);
  const text = doc.sections.map((s) => s.text).join("\n\n");
  const { data: vnum } = await sb.rpc("next_script_version", { p_script: script.id });
  const cov = coverage(((script as any).outline_versions?.doc as OutlineDoc) ?? { sections: [] }, doc);
  const { data, error } = await sb.from("script_versions").insert({ user_id: userId, script_id: script.id, version: Number(vnum ?? 1), doc, source, pass_key: passKey, parent_version_id: parent ?? null, word_count: words, est_seconds: estimateSeconds(words, script.target_wpm ?? 150), coverage: { covered_point_ids: doc.sections.flatMap((s) => s.covered_point_ids), uncovered: doc.sections.flatMap((s) => s.uncovered), missing: cov.missing }, readability: readability(text), quirks: quirks(text), created_by: userId }).select("id, version").single();
  if (error) throw new Error(error.message);
  await sb.rpc("log_activity", { p_kind: "script_section", p_talk: script.talk_id });
  return data as { id: string; version: number };
}

export async function saveScriptEdit(scriptId: string, doc: ScriptDoc): Promise<ActionResult<{ versionId: string; version: number }>> {
  const { user, sb } = await me();
  const { data: script } = await sb.from("scripts").select("*, outline_versions(doc)").eq("id", scriptId).eq("user_id", user.id).maybeSingle();
  if (!script) return { ok: false, code: "NOT_FOUND", message: "Script not found." };
  const { data: latest } = await sb.from("script_versions").select("id, doc").eq("script_id", scriptId).order("version", { ascending: false }).limit(1).maybeSingle();
  if (latest && JSON.stringify(latest.doc) === JSON.stringify(doc)) return { ok: true, data: { versionId: latest.id, version: 0 } };
  try { const v = await saveVersionInternal(sb, user.id, script, doc, "user", null, latest?.id); bump(); return { ok: true, data: { versionId: v.id, version: v.version } }; }
  catch { return { ok: false, code: "SAVE_FAILED", message: "Could not save the edit." }; }
}

export async function restoreVersion(scriptId: string, versionId: string): Promise<ActionResult> {
  const { user, sb } = await me();
  const [{ data: script }, { data: v }] = await Promise.all([sb.from("scripts").select("*, outline_versions(doc)").eq("id", scriptId).eq("user_id", user.id).maybeSingle(), sb.from("script_versions").select("doc").eq("id", versionId).eq("script_id", scriptId).maybeSingle()]);
  if (!script || !v) return { ok: false, code: "NOT_FOUND", message: "Version not found." };
  try { await saveVersionInternal(sb, user.id, script, v.doc as ScriptDoc, "user", "restore", versionId); bump(); return { ok: true }; } catch { return { ok: false, code: "SAVE_FAILED", message: "Could not restore." }; }
}

// --- Editing passes (F2.5): a new version with a diff; the member accepts or keeps the previous ---------------------
export async function runPass(scriptId: string, passKey: string, percent?: number): Promise<ActionResult<{ versionId: string; version: number; notes: string[]; removed: string[]; changed: string[] }>> {
  const { user, sb } = await me();
  const { data: script } = await sb.from("scripts").select("*, outline_versions(doc)").eq("id", scriptId).eq("user_id", user.id).maybeSingle();
  if (!script) return { ok: false, code: "NOT_FOUND", message: "Script not found." };
  const { data: latest } = await sb.from("script_versions").select("id, doc, word_count").eq("script_id", scriptId).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!latest) return { ok: false, code: "NO_DRAFT", message: "Write the first draft before running a pass." };
  const doc = latest.doc as ScriptDoc;
  const [{ data: brief }, { data: sample }] = await Promise.all([
    sb.from("idea_briefs").select("answers").eq("talk_id", script.talk_id).eq("is_draft", false).order("version", { ascending: false }).limit(1).maybeSingle(),
    sb.from("writing_samples").select("text").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const pct = passKey === "cut_to_time" ? (percent ?? cutPercent(latest.word_count, script.slot_minutes, script.target_wpm)) : 0;
  const r = await runActionForUser<{ sections: { id: string; text: string }[]; notes: string[]; removed: string[] }>("editing_pass", {
    talkId: script.talk_id, scriptId, idempotencyKey: randomUUID(),
    vars: { pass_key: passKey, percent: String(pct), sections_json: JSON.stringify(doc.sections.map((s) => ({ id: s.id, kind: s.kind, title: s.title, text: s.text }))), voice_material: [brief ? renderBrief(brief.answers as Record<string, string>) : "", sample?.text ?? ""].filter(Boolean).join("\n\n").slice(0, 6000) || "none", word_budget: String(wordBudget(script.slot_minutes, script.target_wpm).target) },
  });
  if (!r.ok) return r;
  const patch = new Map(r.result.output.sections.map((s) => [s.id, s.text]));
  const nd: ScriptDoc = { sections: doc.sections.map((s) => patch.has(s.id) ? { ...s, text: patch.get(s.id)! } : s) };
  try {
    const v = await saveVersionInternal(sb, user.id, script, nd, "llm", passKey, latest.id);
    bump();
    return { ok: true, data: { versionId: v.id, version: v.version, notes: r.result.output.notes ?? [], removed: r.result.output.removed ?? [], changed: Array.from(patch.keys()) } };
  } catch { return { ok: false, code: "SAVE_FAILED", message: "The pass ran but could not be saved." }; }
}

// --- Script rubric (7.4) and lock (F2.10) --------------------------------------------------------------------
export async function scoreScript(versionId: string): Promise<ActionResult<ScriptRubric>> {
  const { user, sb } = await me();
  const { data: v } = await sb.from("script_versions").select("*, scripts(talk_id, slot_minutes, target_wpm)").eq("id", versionId).eq("user_id", user.id).maybeSingle();
  if (!v) return { ok: false, code: "NOT_FOUND", message: "Version not found." };
  const s = (v as any).scripts;
  const r = await runActionForUser<ScriptRubric>("script_rubric", { talkId: s.talk_id, idempotencyKey: randomUUID(), vars: { slot_minutes: String(s.slot_minutes), target_wpm: String(s.target_wpm), word_count: String(v.word_count), script_json: JSON.stringify((v.doc as ScriptDoc).sections.map((x) => ({ id: x.id, title: x.title, text: x.text }))) } });
  if (!r.ok) return r;
  await sb.from("script_versions").update({ rubric: r.result.output }).eq("id", versionId);
  bump();
  return { ok: true, data: r.result.output };
}

export async function lockScript(versionId: string, overrideReason?: string): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("lock_script", { p_version: versionId, p_override: overrideReason?.trim() || null });
  if (error) { const code = error.message.split(":")[0].trim(); return { ok: false, code, message: code === "SCRIPT_NOT_SCORED" ? "Score the script first." : code.startsWith("SCRIPT_NEEDS_WORK") ? "Below Level 3 on a locking criterion. Fix it, or write why you are locking anyway (20 characters at least)." : "Could not lock." }; }
  bump();
  return { ok: true };
}
export async function unlockScript(scriptId: string, reason: string): Promise<ActionResult> {
  const { sb } = await me();
  const { error } = await sb.rpc("unlock_script", { p_script: scriptId, p_reason: reason });
  if (error) return { ok: false, code: error.message.split(":")[0].trim(), message: /REASON_REQUIRED/.test(error.message) ? "Say in a few words why." : "Could not unlock." };
  bump();
  return { ok: true };
}
export async function setScriptDeadline(scriptId: string, date: string | null): Promise<ActionResult> {
  const { user, sb } = await me();
  const { error } = await sb.from("scripts").update({ organizer_script_deadline: date || null }).eq("id", scriptId).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save." };
  bump();
  return { ok: true };
}

// --- Fact-check Flagger (F2.8) -------------------------------------------------------------------------
export async function runFactcheck(versionId: string): Promise<ActionResult<{ count: number }>> {
  const { user, sb } = await me();
  const { data: v } = await sb.from("script_versions").select("doc, scripts(talk_id)").eq("id", versionId).eq("user_id", user.id).maybeSingle();
  if (!v) return { ok: false, code: "NOT_FOUND", message: "Version not found." };
  const r = await runActionForUser<{ claims: { text: string; section_id: string; type: string; risk: string; fact_checker_asks: string; r5_flag: boolean; overclaim_flag: boolean }[]; note: string }>("factcheck", { talkId: (v as any).scripts.talk_id, idempotencyKey: randomUUID(), vars: { script_json: JSON.stringify((v.doc as ScriptDoc).sections.map((s) => ({ id: s.id, text: s.text }))) } });
  if (!r.ok) return r;
  // Keep member decisions on claims already reviewed (match by text).
  const { data: existing } = await sb.from("claims").select("text, status, source_url, note").eq("script_version_id", versionId);
  const prev = new Map((existing ?? []).map((c) => [c.text, c]));
  await sb.from("claims").delete().eq("script_version_id", versionId);
  const rows = r.result.output.claims.map((c) => ({ user_id: user.id, script_version_id: versionId, section_id: c.section_id, text: c.text, claim_type: c.type, risk: c.risk, status: prev.get(c.text)?.status ?? (c.type === "firsthand" ? "firsthand_account" : "needs_source"), source_url: prev.get(c.text)?.source_url ?? null, note: prev.get(c.text)?.note ?? c.fact_checker_asks, r5_flag: c.r5_flag, overclaim_flag: c.overclaim_flag }));
  if (rows.length) await sb.from("claims").insert(rows);
  bump();
  return { ok: true, data: { count: rows.length } };
}
export async function updateClaim(claimId: string, patch: { status?: string; source_url?: string | null; note?: string | null }): Promise<ActionResult> {
  const { user, sb } = await me();
  const { error } = await sb.from("claims").update(patch).eq("id", claimId).eq("user_id", user.id);
  if (error) return { ok: false, code: "SAVE_FAILED", message: "Could not save." };
  bump();
  return { ok: true };
}

export async function jargonReport(text: string) { return { readability: readability(text), jargon: jargon(text), quirks: quirks(text) }; }
