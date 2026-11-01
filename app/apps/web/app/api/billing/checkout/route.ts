import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { createAddonCheckout, createPlanCheckout } from "@/lib/billing/checkout";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.email) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const origin = new URL(req.url).origin;
  try {
    if (body.kind === "application_review" || body.kind === "script_review") {
      return NextResponse.json(await createAddonCheckout(user.id, user.email, body.kind, origin));
    }
    const period = ["monthly", "six_month", "twelve_month"].includes(body.period) ? body.period : "monthly";
    return NextResponse.json(await createPlanCheckout(user.id, user.email, period, origin));
  } catch (e) {
    return NextResponse.json({ error: "CHECKOUT_FAILED", message: "That did not work. Nothing was charged. Try again." }, { status: 500 });
  }
}
