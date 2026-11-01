import { supabaseServer } from "@/lib/supabase/server";
import { Table, td, whenTime } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// Audit: every admin write, newest first. Details never hold draft content or secrets (12.3).
export default async function AuditPage() {
  const sb = await supabaseServer();
  const { data } = await sb.rpc("admin_audit", { p_limit: 200 });
  const rows = (data ?? []) as { id: number; at: string; actor_email: string | null; actor_role: string | null; action: string; resource_type: string; resource_id: string | null; details: Record<string, unknown> }[];
  return (
    <Table head={["When", "Who", "Action", "Resource", "Details"]} label="Audit log">
      {rows.map((r) => <tr key={r.id}><td className={td}>{whenTime(r.at)}</td><td className={td}>{r.actor_email ?? "system"}{r.actor_role ? ` (${r.actor_role})` : ""}</td><td className={td}>{r.action}</td><td className={td}>{r.resource_type}{r.resource_id ? ` ${r.resource_id}` : ""}</td><td className={`${td} font-mono text-[12px]`}>{JSON.stringify(r.details)}</td></tr>)}
      {rows.length === 0 && <tr><td className={td} colSpan={5}>Nothing audited yet.</td></tr>}
    </Table>
  );
}
