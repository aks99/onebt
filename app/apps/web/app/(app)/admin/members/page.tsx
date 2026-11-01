import { supabaseServer } from "@/lib/supabase/server";
import { MembersTable, type MemberRow } from "@/components/admin/MembersTable";

export const dynamic = "force-dynamic";

// A2 Access and A3 Members in one screen: roles and access, plan assignment, the Talk Record timeline,
// allowance usage, prior-stages count and the 100-applications counter per member.
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; u?: string }> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("admin_members", { p_query: sp.q ?? null, p_limit: 200 });
  const rows = (data ?? []) as MemberRow[];
  let timeline: { at: string; kind: string; label: string }[] = []; let allowances: Record<string, number> = {};
  if (sp.u) {
    const [{ data: t }, { data: a }] = await Promise.all([sb.rpc("admin_member_timeline", { p_user: sp.u }), sb.rpc("admin_member_allowances", { p_user: sp.u })]);
    timeline = (t ?? []) as any[]; allowances = (a ?? {}) as Record<string, number>;
  }
  return <MembersTable rows={rows} query={sp.q ?? ""} selected={sp.u ?? null} timeline={timeline} allowances={allowances} />;
}
