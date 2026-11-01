// Form Mapper (F1.3.2): maps an organizer's form fields onto the member's Pitch Pack so each answer is
// pre-filled from the right source and trimmed to the field's limit. Works with the curator's per-event
// `form_fields` ([{key,label,limit_type,limit,required}]) or a sensible default set when none is known.

export interface FormField { key: string; label: string; limit_type?: "chars" | "words" | null; limit?: number | null; required?: boolean }
export interface PitchFields { titles?: string[]; one_sentence?: string; idea_statement?: string; why_now?: string; why_you?: string; accomplishment?: string; bio_150?: string; bio_250?: string; youtube_bio?: string; pitch_video_script_90s?: string; links?: string; experience_summary?: string }
export type Source = keyof PitchFields | "member" | "video_link";

export const DEFAULT_FORM_FIELDS: FormField[] = [
  { key: "one_sentence", label: "Your idea in one sentence", limit_type: "words", limit: 15, required: true },
  { key: "idea_statement", label: "Describe your talk idea", limit_type: "words", limit: 250, required: true },
  { key: "why_this_event", label: "Why this event and this audience", limit_type: "words", limit: 150, required: true },
  { key: "why_you", label: "Why are you the person to give this talk", limit_type: "words", limit: 150, required: true },
  { key: "bio", label: "Short bio", limit_type: "words", limit: 150, required: true },
  { key: "past_speaking", label: "Previous speaking experience (optional)", limit_type: "words", limit: 100, required: false },
  { key: "links", label: "Links (website, LinkedIn, videos)", limit_type: null, limit: null, required: false },
  { key: "video_link", label: "Pitch video link (if the form asks for one)", limit_type: null, limit: null, required: false },
];

// Decides which Pitch Pack field feeds a form field, from its key and label.
export function sourceFor(f: FormField): Source {
  const k = `${f.key} ${f.label}`.toLowerCase();
  if (/video/.test(k)) return "video_link";
  if (/link|url|website|linkedin|social/.test(k)) return "links";
  if (/title/.test(k)) return "titles";
  if (/one.?sentence|one.?line|in a sentence|summar|tagline|idea statement in one/.test(k) && !/describe|statement$/.test(k)) return "one_sentence";
  if (/why (this|our|the) (event|audience|city|stage)|why now|theme|audience|relevan/.test(k)) return "why_now";
  if (/why (you|are you|should we|do you)|about you|qualif|expertise|credib|authority/.test(k)) return "why_you";
  if (/accomplish|achievement|proud/.test(k)) return "accomplishment";
  if (/experience|spoken|speaking|previous talk|prior/.test(k)) return "experience_summary";
  if (/bio/.test(k)) return f.limit_type === "words" && (f.limit ?? 999) <= 160 ? "bio_150" : f.limit_type === "chars" && (f.limit ?? 9999) <= 1000 ? "bio_150" : "bio_250";
  if (/idea|talk|describe|abstract|proposal|pitch|statement|what/.test(k)) return "idea_statement";
  return "member";
}

export function trimToLimit(text: string, f: FormField) {
  const t = (text ?? "").trim();
  if (!f.limit || !f.limit_type) return t;
  if (f.limit_type === "words") { const words = t.split(/\s+/).filter(Boolean); return words.length <= f.limit ? t : words.slice(0, f.limit).join(" "); }
  return t.length <= f.limit ? t : t.slice(0, f.limit).replace(/\s+\S*$/, "");
}

export function countFor(text: string, f: FormField) {
  const t = (text ?? "").trim();
  return f.limit_type === "words" ? t.split(/\s+/).filter(Boolean).length : t.length;
}

export function overLimit(text: string, f: FormField) {
  return !!f.limit && !!f.limit_type && countFor(text, f) > f.limit;
}

// Pre-fills every form field from the pack. Fields with no source stay empty for the member.
export function prefill(fields: FormField[], pack: PitchFields): { answers: Record<string, string>; sources: Record<string, "llm" | "user" | "empty">; mapping: Record<string, Source> } {
  const answers: Record<string, string> = {}, sources: Record<string, "llm" | "user" | "empty"> = {}, mapping: Record<string, Source> = {};
  for (const f of fields) {
    const src = sourceFor(f); mapping[f.key] = src;
    let text = "";
    if (src === "titles") text = (pack.titles ?? [])[0] ?? "";
    else if (src !== "member" && src !== "video_link") text = (pack[src] as string | undefined) ?? "";
    answers[f.key] = trimToLimit(text, f);
    sources[f.key] = answers[f.key] ? "llm" : "empty";
  }
  return { answers, sources, mapping };
}

export function fieldsForEvent(formFields: unknown): FormField[] {
  const arr = Array.isArray(formFields) ? (formFields as FormField[]).filter((f) => f && f.key) : [];
  return arr.length ? arr.map((f) => ({ key: String(f.key), label: f.label ?? String(f.key), limit_type: f.limit_type ?? null, limit: f.limit ?? null, required: f.required ?? false })) : DEFAULT_FORM_FIELDS;
}
