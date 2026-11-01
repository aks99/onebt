import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { businessDaysFrom, type BillingDeps, type Period, type Tier } from "./webhook";

// Real implementations of BillingDeps against Supabase (service role) and the Stripe price map in env.

export function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion });
}

export const PRICE_ENV: Record<string, { tier?: Tier; period?: Period; addon?: "application_review" | "script_review"; amountCents: number }> = {
  STRIPE_PRICE_FOUNDING_MONTHLY: { tier: "founding", period: "monthly", amountCents: 1700 },
  STRIPE_PRICE_FOUNDING_SIX_MONTH: { tier: "founding", period: "six_month", amountCents: 7700 },
  STRIPE_PRICE_FOUNDING_TWELVE_MONTH: { tier: "founding", period: "twelve_month", amountCents: 14700 },
  STRIPE_PRICE_REGULAR_MONTHLY: { tier: "regular", period: "monthly", amountCents: 9700 },
  STRIPE_PRICE_ADDON_APPLICATION_REVIEW: { addon: "application_review", amountCents: 49700 },
  STRIPE_PRICE_ADDON_SCRIPT_REVIEW: { addon: "script_review", amountCents: 49700 },
};

export function priceToPlan(priceId: string): ReturnType<BillingDeps["priceToPlan"]> {
  for (const [envKey, meta] of Object.entries(PRICE_ENV)) {
    if (process.env[envKey] && process.env[envKey] === priceId) {
      if (meta.addon) return { addon: meta.addon, amountCents: meta.amountCents };
      return { tier: meta.tier!, period: meta.period!, amountCents: meta.amountCents };
    }
  }
  return null;
}

export function priceIdFor(tier: Tier, period: Period): string {
  const key = tier === "regular" ? "STRIPE_PRICE_REGULAR_MONTHLY" : `STRIPE_PRICE_FOUNDING_${period.toUpperCase()}`;
  const id = process.env[key];
  if (!id) throw new Error(`Missing ${key}`);
  return id;
}

export function realDeps(): BillingDeps {
  const db = supabaseAdmin();
  return {
    async hasProcessedEvent(id) { const { data } = await db.from("stripe_events").select("id").eq("id", id).maybeSingle(); return !!data; },
    async markProcessed(id, type, created) { await db.from("stripe_events").insert({ id, type, created: created.toISOString() }); },
    priceToPlan,
    async findReservation(id) { const { data } = await db.from("founding_seat_reservations").select("user_id, claimed_tier, resolution").eq("checkout_session_id", id).maybeSingle(); return data as any; },
    async resolveReservation(id, resolution) { await db.from("founding_seat_reservations").update({ resolution, resolved_at: new Date().toISOString() }).eq("checkout_session_id", id); },
    async releaseFoundingSeat() { await db.rpc("release_founding_seat"); },
    async getSubscription(id) { const { data } = await db.from("subscriptions").select("*").eq("id", id).maybeSingle(); return data as any; },
    async upsertSubscription(s) { await db.from("subscriptions").upsert(s, { onConflict: "id" }); },
    async getMembership(userId) { const { data } = await db.from("memberships").select("plan, founding_price, plan_ends_at").eq("user_id", userId).maybeSingle(); return data as any; },
    async applyPaidPlan(userId, tier, period, founding, periodEnd) {
      await db.rpc("apply_paid_plan", { p_user: userId, p_plan: tier, p_period: period, p_founding: founding, p_period_end: periodEnd.toISOString() });
    },
    async lapsePlan(userId, keepFounding) { await db.rpc("lapse_plan", { p_user: userId, p_keep_founding: keepFounding }); },
    async upsertInvoice(inv) { await db.from("invoices").upsert({ ...inv, paid_at: inv.paid_at?.toISOString() ?? null }, { onConflict: "id" }); },
    async recordAddon(userId, kind, paymentIntentId, amountCents, dueOn) {
      const { data: purchase } = await db.from("addon_purchases").upsert({ user_id: userId, kind, amount_cents: amountCents, stripe_payment_intent_id: paymentIntentId }, { onConflict: "stripe_payment_intent_id" }).select("id").single();
      if (purchase) await db.from("reviews").insert({ user_id: userId, purchase_id: purchase.id, kind, due_at: dueOn.toISOString().slice(0, 10) });
    },
    businessDaysFrom,
    async log(action, details) { await db.from("audit_log").insert({ action, resource_type: "billing", details }); },
  };
}
