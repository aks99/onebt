import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { pipelineCsv } from "@/lib/pipeline/rules";

// F1.3.12 pipeline export as CSV (the member's own rows, RLS on).
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Log in first.", { status: 401 });
  const sb = await supabaseServer();
  const { data } = await sb.from("applications").select("status, applied_at, follow_up_at, follow_up_sent_at, outcome, outcome_at, event_date, readiness_passed, counts_toward_100, notes, event_name_manual, events(name, city, application_deadline)").eq("user_id", user.id).order("created_at");
  const rows = ((data ?? []) as any[]).map((a) => ({ event: a.events?.name ?? a.event_name_manual ?? "", city: a.events?.city ?? "", status: a.status, applied_at: a.applied_at ?? "", follow_up_at: a.follow_up_at ?? "", follow_up_sent: a.follow_up_sent_at ? "yes" : "", outcome: a.outcome ?? "", outcome_at: a.outcome_at ?? "", event_date: a.event_date ?? "", deadline: a.events?.application_deadline ?? "", readiness: a.readiness_passed ? "passed" : "", counts_toward_100: a.counts_toward_100 ? "yes" : "", notes: a.notes ?? "" }));
  return new Response(pipelineCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="onebigtalk-applications.csv"' } });
}
