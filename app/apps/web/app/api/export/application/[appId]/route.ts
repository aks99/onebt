import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { fieldsForEvent } from "@/lib/pipeline/formMapper";
import { authorship, authorshipNote } from "@/lib/pipeline/rules";
import { PRODUCT_NAME } from "@/lib/product";

// F1.3.12 one application record as plain text (PDF and DOCX share the exporter built in step 8).
export async function GET(_req: Request, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const id = appId.replace(/\.txt$/i, "");
  const user = await currentUser();
  if (!user) return new Response("Log in first.", { status: 401 });
  const sb = await supabaseServer();
  const { data: app } = await sb.from("applications").select("*, events(name, city, country_code, theme, form_fields, application_deadline)").eq("id", id).maybeSingle();
  if (!app) return new Response("Not found.", { status: 404 });
  const e = (app as any).events ?? {};
  const fields = fieldsForEvent(e.form_fields);
  const a = authorship(app.answers ?? {}, app.answer_sources ?? {}, app.ai_originals ?? {});
  const lines = [`${e.name ?? app.event_name_manual ?? "Application"}${e.city ? ` (${e.city}${e.country_code ? `, ${e.country_code}` : ""})` : ""}`, `Status: ${app.status}${app.applied_at ? `. Applied ${app.applied_at}` : ""}${app.outcome ? `. Outcome ${app.outcome} ${app.outcome_at ?? ""}` : ""}`, e.theme ? `Theme: ${e.theme}` : "", e.application_deadline ? `Deadline: ${e.application_deadline}` : "", ""];
  for (const f of fields) { const v = (app.answers ?? {})[f.key]; if (v?.trim()) lines.push(f.label.toUpperCase(), v.trim(), ""); }
  if (app.notes) lines.push("NOTES", app.notes, "");
  lines.push(authorshipNote(a, PRODUCT_NAME), "", `Exported from ${PRODUCT_NAME} on ${new Date().toISOString().slice(0, 10)}.`);
  return new Response(lines.filter((l) => l !== undefined).join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="application-${id.slice(0, 8)}.txt"` } });
}
