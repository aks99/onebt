// Stripe webhook handling as a pure function over an injected data layer, so it is unit-tested
// without Stripe or a database. Blueprint v1.7 Sections 10.2, 10.6, 10.10, 12.10.
//
// Rules enforced here:
//  * every event is applied once (stripe_events), a duplicate delivery changes nothing;
//  * an older event never overrides a newer subscription state;
//  * the 31st founding checkout is charged regular (the seat was decided at checkout creation);
//  * an expired or abandoned checkout gives its founding seat back;
//  * a lapse of more than 30 days loses the founding price (10.10);
//  * an add-on purchase creates a review with a due date 5 business days out.

export type Period = "monthly" | "six_month" | "twelve_month";
export type Tier = "founding" | "regular";

export interface SubscriptionMirror {
  id: string; user_id: string; stripe_customer_id: string; status: string; plan: Tier; billing_period: Period;
  founding_price: boolean; price_id: string; amount_cents: number; current_period_end: string | null;
  cancel_at: string | null; canceled_at: string | null; last_event_created: string | null;
}

export interface BillingDeps {
  // idempotency
  hasProcessedEvent(id: string): Promise<boolean>;
  markProcessed(id: string, type: string, created: Date): Promise<void>;
  // lookups
  priceToPlan(priceId: string): { tier: Tier; period: Period; amountCents: number } | { addon: "application_review" | "script_review"; amountCents: number } | null;
  findReservation(checkoutSessionId: string): Promise<{ user_id: string; claimed_tier: Tier; resolution: string | null } | null>;
  resolveReservation(checkoutSessionId: string, resolution: "paid" | "expired"): Promise<void>;
  releaseFoundingSeat(): Promise<void>;
  getSubscription(id: string): Promise<SubscriptionMirror | null>;
  upsertSubscription(s: SubscriptionMirror): Promise<void>;
  getMembership(userId: string): Promise<{ plan: string; founding_price: boolean; plan_ends_at: string | null } | null>;
  applyPaidPlan(userId: string, tier: Tier, period: Period, founding: boolean, periodEnd: Date): Promise<void>;
  lapsePlan(userId: string, keepFounding: boolean): Promise<void>;
  upsertInvoice(inv: { id: string; user_id: string; subscription_id: string | null; amount_paid_cents: number; tax_cents: number; status: string; hosted_invoice_url: string | null; paid_at: Date | null }): Promise<void>;
  recordAddon(userId: string, kind: "application_review" | "script_review", paymentIntentId: string, amountCents: number, dueOn: Date): Promise<void>;
  businessDaysFrom(start: Date, n: number): Date;
  log(action: string, details: Record<string, unknown>): Promise<void>;
}

// A minimal shape of the Stripe events we read. Kept narrow on purpose.
export interface StripeEventLike {
  id: string;
  type: string;
  created: number;                       // unix seconds
  data: { object: Record<string, any> };
}

export const periodMonths: Record<Period, number> = { monthly: 1, six_month: 6, twelve_month: 12 };

export async function handleStripeEvent(ev: StripeEventLike, d: BillingDeps): Promise<{ handled: boolean; note: string }> {
  if (await d.hasProcessedEvent(ev.id)) return { handled: false, note: "duplicate event ignored" };
  const created = new Date(ev.created * 1000);
  const o = ev.data.object;
  let note = "ignored";

  switch (ev.type) {
    case "checkout.session.completed": {
      const userId: string | undefined = o.metadata?.user_id ?? o.client_reference_id;
      if (!userId) { note = "no user on session"; break; }
      if (o.mode === "payment") {
        // Add-on purchase ($497 review). Due in 5 business days (owner decision 1 Nov 2026).
        const priceId: string | undefined = o.metadata?.price_id;
        const info = priceId ? d.priceToPlan(priceId) : null;
        if (info && "addon" in info) {
          await d.recordAddon(userId, info.addon, String(o.payment_intent), info.amountCents, d.businessDaysFrom(created, 5));
          note = `addon ${info.addon} recorded`;
        } else note = "payment without a known add-on price";
        break;
      }
      // Subscription checkout: the tier was decided when the seat was claimed at checkout creation.
      const res = await d.findReservation(o.id);
      const priceId: string | undefined = o.metadata?.price_id;
      const info = priceId ? d.priceToPlan(priceId) : null;
      if (!info || "addon" in info) { note = "subscription checkout without a known price"; break; }
      const tier: Tier = res?.claimed_tier ?? info.tier;
      const founding = tier === "founding";
      const months = periodMonths[info.period];
      const periodEnd = new Date(created); periodEnd.setUTCMonth(periodEnd.getUTCMonth() + months);
      await d.applyPaidPlan(userId, tier, info.period, founding, periodEnd);
      if (res && !res.resolution) await d.resolveReservation(o.id, "paid");
      await d.log("plan_purchased", { userId, tier, period: info.period, founding });
      note = `plan applied: ${tier} ${info.period}`;
      break;
    }
    case "checkout.session.expired": {
      const res = await d.findReservation(o.id);
      if (res && !res.resolution) {
        if (res.claimed_tier === "founding") await d.releaseFoundingSeat();
        await d.resolveReservation(o.id, "expired");
        note = "reservation expired; seat released";
      } else note = "no open reservation";
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const existing = await d.getSubscription(o.id);
      if (existing?.last_event_created && new Date(existing.last_event_created) > created) { note = "older event ignored"; break; }
      const item = o.items?.data?.[0];
      const priceId: string = item?.price?.id ?? existing?.price_id ?? "";
      const info = d.priceToPlan(priceId);
      if (!info || "addon" in info) { note = "subscription with unknown price"; break; }
      const userId: string = o.metadata?.user_id ?? existing?.user_id;
      if (!userId) { note = "subscription without user"; break; }
      const founding = existing?.founding_price ?? info.tier === "founding";
      const mirror: SubscriptionMirror = {
        id: o.id, user_id: userId, stripe_customer_id: String(o.customer), status: String(o.status), plan: founding ? "founding" : "regular",
        billing_period: info.period, founding_price: founding, price_id: priceId, amount_cents: info.amountCents,
        current_period_end: o.current_period_end ? new Date(o.current_period_end * 1000).toISOString() : existing?.current_period_end ?? null,
        cancel_at: o.cancel_at ? new Date(o.cancel_at * 1000).toISOString() : null,
        canceled_at: o.canceled_at ? new Date(o.canceled_at * 1000).toISOString() : null,
        last_event_created: created.toISOString(),
      };
      await d.upsertSubscription(mirror);
      if (ev.type === "customer.subscription.deleted" || o.status === "canceled" || o.status === "unpaid") {
        // Founding price survives a lapse of 30 days or less (10.10). The grace is judged from the period end.
        const end = mirror.current_period_end ? new Date(mirror.current_period_end) : created;
        const daysLapsed = Math.max(0, (created.getTime() - end.getTime()) / 86400000);
        await d.lapsePlan(userId, daysLapsed <= 30);
        note = `lapsed; founding ${daysLapsed <= 30 ? "kept for 30 days" : "lost"}`;
      } else if (o.status === "active" || o.status === "trialing") {
        await d.applyPaidPlan(userId, mirror.plan, info.period, founding, new Date(mirror.current_period_end ?? created));
        note = `subscription ${o.status} mirrored`;
      } else {
        note = `subscription ${o.status} mirrored (dunning banner shows while past_due)`;
      }
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const userId: string | undefined = o.metadata?.user_id ?? o.subscription_details?.metadata?.user_id ?? o.parent?.subscription_details?.metadata?.user_id;
      const subId: string | null = typeof o.subscription === "string" ? o.subscription : o.parent?.subscription_details?.subscription ?? null;
      const resolvedUser = userId ?? (subId ? (await d.getSubscription(subId))?.user_id : undefined);
      if (!resolvedUser) { note = "invoice without user"; break; }
      await d.upsertInvoice({
        id: o.id, user_id: resolvedUser, subscription_id: subId, amount_paid_cents: Number(o.amount_paid ?? 0), tax_cents: Number(o.total_taxes?.[0]?.amount ?? o.tax ?? 0),
        status: String(o.status ?? (ev.type === "invoice.paid" ? "paid" : "open")), hosted_invoice_url: o.hosted_invoice_url ?? null,
        paid_at: ev.type === "invoice.paid" ? created : null,
      });
      note = ev.type === "invoice.paid" ? "invoice recorded" : "payment failed recorded";
      break;
    }
    default:
      note = `unhandled type ${ev.type}`;
  }
  await d.markProcessed(ev.id, ev.type, created);
  return { handled: note !== "ignored", note };
}

// Business days helper shared with the SQL function business_days_from (0006).
export function businessDaysFrom(start: Date, n: number): Date {
  const d = new Date(start); let added = 0;
  while (added < n) { d.setUTCDate(d.getUTCDate() + 1); const dow = d.getUTCDay(); if (dow !== 0 && dow !== 6) added++; }
  return d;
}
