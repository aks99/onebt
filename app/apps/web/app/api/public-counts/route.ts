import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Public counts (open calls, founding seats left). Readable by anyone; cached for a minute.
export const revalidate = 60;
export async function GET() {
  const sb = await supabaseServer();
  const { data } = await sb.from("public_counts").select("*").maybeSingle();
  return NextResponse.json({ open_calls: data?.open_calls ?? 0, founding_seats_remaining: data?.founding_seats_remaining ?? 0 });
}
