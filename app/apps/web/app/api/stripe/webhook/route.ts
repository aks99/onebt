import { NextResponse } from "next/server";
import { realDeps, stripe } from "@/lib/billing/deps";
import { handleStripeEvent } from "@/lib/billing/webhook";

export const runtime = "nodejs";

// Verifies the Stripe signature, then applies the event once. Duplicate deliveries return 200 and change nothing.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const raw = await req.text();
  let event;
  try { event = stripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!); }
  catch { return NextResponse.json({ error: "bad signature" }, { status: 400 }); }
  const result = await handleStripeEvent(event as any, realDeps());
  return NextResponse.json(result);
}
