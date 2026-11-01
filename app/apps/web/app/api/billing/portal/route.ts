import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createPortalSession } from "@/lib/billing/checkout";

// Change period, update card, cancel in two clicks: Stripe's Customer Portal, configured with no retention offers.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  const { data } = await supabaseAdmin().from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return NextResponse.json({ error: "NO_SUBSCRIPTION" }, { status: 404 });
  return NextResponse.json({ url: await createPortalSession(data.stripe_customer_id, new URL(req.url).origin) });
}
