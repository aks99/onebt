import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { scriptDocx, scriptPdf } from "@/lib/write/exporters";
import { prompterText, type ScriptDoc } from "@/lib/write/rules";
import { DISCLAIMER, PRODUCT_NAME } from "@/lib/product";

// F2.11 script exports: PDF (large type, section headers, cue marks), DOCX, plain text for prompter apps.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = file.match(/^([0-9a-f-]{36})\.(pdf|docx|txt)$/i);
  if (!m) return new Response("Not found.", { status: 404 });
  const user = await currentUser();
  if (!user) return new Response("Log in first.", { status: 401 });
  const sb = await supabaseServer();
  const { data: v } = await sb.from("script_versions").select("version, doc, scripts(slot_minutes, target_wpm, locked_version_id, talks(title))").eq("id", m[1]).maybeSingle();
  if (!v) return new Response("Not found.", { status: 404 });
  const s = (v as any).scripts; const title = s?.talks?.title ?? "Talk script"; const doc = v.doc as ScriptDoc;
  const footer = `${PRODUCT_NAME} · ${DISCLAIMER.slice(0, 120)}`;
  const name = `script-v${v.version}`;
  if (m[2] === "txt") return new Response(prompterText(doc), { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="${name}.txt"` } });
  if (m[2] === "docx") return new Response(new Uint8Array(await scriptDocx(title, doc, { version: v.version, locked: s?.locked_version_id === m[1] })), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": `attachment; filename="${name}.docx"` } });
  return new Response(new Uint8Array(await scriptPdf(title, doc, { slotMinutes: s?.slot_minutes ?? 10, wpm: s?.target_wpm ?? 150, version: v.version, locked: s?.locked_version_id === m[1] }, footer)), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"` } });
}
