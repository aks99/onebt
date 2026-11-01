import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { factcheckPdf } from "@/lib/write/exporters";
import { factcheckText, type ClaimRow, type ScriptDoc } from "@/lib/write/rules";
import { DISCLAIMER, PRODUCT_NAME } from "@/lib/product";

// The annotated fact-check organizers ask for (F2.8): PDF or text.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = file.match(/^([0-9a-f-]{36})\.(pdf|txt)$/i);
  if (!m) return new Response("Not found.", { status: 404 });
  const user = await currentUser();
  if (!user) return new Response("Log in first.", { status: 401 });
  const sb = await supabaseServer();
  const [{ data: v }, { data: claims }] = await Promise.all([sb.from("script_versions").select("version, doc, scripts(talks(title))").eq("id", m[1]).maybeSingle(), sb.from("claims").select("*").eq("script_version_id", m[1]).order("created_at")]);
  if (!v) return new Response("Not found.", { status: 404 });
  const title = (v as any).scripts?.talks?.title ?? "Talk"; const doc = v.doc as ScriptDoc; const rows = (claims ?? []) as ClaimRow[];
  if (m[2] === "txt") return new Response(factcheckText(doc, rows, title), { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="factcheck-v${v.version}.txt"` } });
  return new Response(new Uint8Array(await factcheckPdf(title, doc, rows, `${PRODUCT_NAME} · ${DISCLAIMER.slice(0, 120)}`)), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="factcheck-v${v.version}.pdf"` } });
}
