import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { outlinePdf } from "@/lib/write/exporters";
import type { OutlineDoc } from "@/lib/write/rules";
import { DISCLAIMER, PRODUCT_NAME } from "@/lib/product";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = file.match(/^([0-9a-f-]{36})\.pdf$/i);
  if (!m) return new Response("Not found.", { status: 404 });
  const user = await currentUser();
  if (!user) return new Response("Log in first.", { status: 401 });
  const sb = await supabaseServer();
  const { data: v } = await sb.from("outline_versions").select("version, doc, outlines(talks(title))").eq("id", m[1]).maybeSingle();
  if (!v) return new Response("Not found.", { status: 404 });
  const title = (v as any).outlines?.talks?.title ?? "Talk";
  return new Response(new Uint8Array(await outlinePdf(title, v.doc as OutlineDoc, `${PRODUCT_NAME} · ${DISCLAIMER.slice(0, 120)}`)), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="outline-v${v.version}.pdf"` } });
}
