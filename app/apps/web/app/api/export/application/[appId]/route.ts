import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { fieldsForEvent } from "@/lib/pipeline/formMapper";
import { authorship, authorshipNote } from "@/lib/pipeline/rules";
import { DISCLAIMER, PRODUCT_NAME } from "@/lib/product";
import { recordDocx, recordPdf } from "@/lib/write/exporters";

// F1.3.12 one application record as text, PDF or DOCX (shared exporter).
export async function GET(_req: Request, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const ext = (appId.match(/\.(txt|pdf|docx)$/i)?.[1] ?? "txt").toLowerCase();
  const id = appId.replace(/\.(txt|pdf|docx)$/i, "");
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
  const title = `${e.name ?? app.event_name_manual ?? "Application"}: application`;
  const blocks = fields.filter((f) => (app.answers ?? {})[f.key]?.trim()).map((f) => ({ label: f.label, text: (app.answers ?? {})[f.key].trim() }));
  blocks.push({ label: "Authorship", text: authorshipNote(a, PRODUCT_NAME) });
  if (ext === "pdf") return new Response(new Uint8Array(await recordPdf(title, blocks, `${PRODUCT_NAME} · ${DISCLAIMER.slice(0, 120)}`)), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="application-${id.slice(0, 8)}.pdf"` } });
  if (ext === "docx") return new Response(new Uint8Array(await recordDocx(title, blocks)), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": `attachment; filename="application-${id.slice(0, 8)}.docx"` } });
  return new Response(lines.filter((l) => l !== undefined).join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="application-${id.slice(0, 8)}.txt"` } });
}
