import { supabaseAdmin } from "@/lib/supabase/admin";
import { priceIdFor, stripe } from "./deps";
import type { Period, Tier } from "./webhook";

// Creates a Stripe Checkout Session for a plan. The founding seat is claimed atomically here (so the
// price the member sees is the price they pay) and released by the checkout.session.expired webhook
// if they abandon. Decision logged in Appendix C (v1.8). USD only. Stripe Tax on.
export async function createPlanCheckout(userId: string, email: string, period: Period, origin: string) {
  const db = supabaseAdmin();
  const { data: tierData, error } = await db.rpc("claim_founding_seat", { p_user: userId });
  if (error) throw error;
  const tier = (tierData as Tier) ?? "regular";
  // Regular members only have a monthly price until the owner sets six- and twelve-month regular prices [NEEDS CONFIRMATION]
  const effectivePeriod: Period = tier === "regular" ? "monthly" : period;
  const priceId = priceIdFor(tier, effectivePeriod);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    automatic_tax: { enabled: true },
    allow_promotion_codes: false,
    subscription_data: { metadata: { user_id: userId, tier, period: effectivePeriod } },
    metadata: { user_id: userId, price_id: priceId, tier, period: effectivePeriod },
    success_url: `${origin}/me/plan?purchased=1`,
    cancel_url: `${origin}/pricing?canceled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
  await db.from("founding_seat_reservations").insert({ checkout_session_id: session.id, user_id: userId, claimed_tier: tier });
  return { url: String(session.url), tier, period: effectivePeriod };
}

export async function createAddonCheckout(userId: string, email: string, kind: "application_review" | "script_review", origin: string) {
  const priceId = process.env[kind === "application_review" ? "STRIPE_PRICE_ADDON_APPLICATION_REVIEW" : "STRIPE_PRICE_ADDON_SCRIPT_REVIEW"];
  if (!priceId) throw new Error("add-on price not configured");
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    automatic_tax: { enabled: true },
    metadata: { user_id: userId, price_id: priceId, kind },
    success_url: `${origin}/me/plan?addon=1`,
    cancel_url: `${origin}/me/plan`,
  });
  return { url: String(session.url) };
}

export async function createPortalSession(stripeCustomerId: string, origin: string) {
  const s = await stripe().billingPortal.sessions.create({ customer: stripeCustomerId, return_url: `${origin}/me/plan` });
  return s.url;
}
