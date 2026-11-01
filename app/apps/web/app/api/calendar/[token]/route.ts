import { supabaseAdmin } from "@/lib/supabase/admin";
import { icsCalendar } from "@/lib/catalogue/ics";

// Per-member calendar feed (F1.2.4): subscribe once, every tracked deadline appears with 14/7/3/1-day alarms.
// The token is the only key; the database checks it and the member's access.
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/i, "");
  const db = supabaseAdmin();
  const { data } = await db.rpc("calendar_feed", { p_token: clean });
  const rows = (data ?? []) as { event_id: string; event_name: string; deadline: string; city: string | null; country_code: string | null; event_url: string | null }[];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://onebigtalk.com";
  const body = icsCalendar(rows.map((r) => ({
    uid: `${r.event_id}-${r.deadline}@onebigtalk`, date: r.deadline, summary: `${r.event_name}: application deadline`,
    description: `Application deadline for ${r.event_name}${r.city ? ` (${r.city}${r.country_code ? `, ${r.country_code}` : ""})` : ""}. Check the organizer's page for the time of day and timezone.`,
    url: `${site}/find/events/${r.event_id}`,
  })));
  return new Response(body, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300", "content-disposition": `inline; filename="onebigtalk-deadlines.ics"` } });
}
