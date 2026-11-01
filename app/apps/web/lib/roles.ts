import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

// Role checks for server components and actions (5.5). The database enforces the same with RLS and
// security-definer functions; this only decides what to render and which calls to attempt.
export async function currentRole(): Promise<{ userId: string; role: "member" | "coach" | "curator" | "admin" } | null> {
  const user = await currentUser();
  if (!user) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from("user_roles").select("role, access").eq("user_id", user.id).maybeSingle();
  if (!data || data.access !== "active") return null;
  return { userId: user.id, role: data.role };
}

export async function requireCurator() {
  const r = await currentRole();
  if (!r) redirect("/login?next=/curate");
  if (r.role !== "curator" && r.role !== "admin") redirect("/today");
  return r;
}

export async function assertCurator() {
  const r = await currentRole();
  if (!r || (r.role !== "curator" && r.role !== "admin")) throw new Error("permission denied");
  return r;
}
