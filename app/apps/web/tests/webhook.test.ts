import { describe, it, expect } from "vitest";
import { handleStripeEvent, businessDaysFrom, type BillingDeps, type StripeEventLike } from "@/lib/billing/webhook";

// A fake data layer that records everything the handler does.
function fakeDeps(seed: Partial<{ seatsRemaining: number; reservations: Record<string, any>; subs: Record<string, any> }> = {}) {
  const state = {
    processed: new Set<string>(),
    seatsRemaining: seed.seatsRemaining ?? 30,
    reservations: seed.reservations ?? {} as Record<string, any>,
    subs: seed.subs ?? {} as Record<string, any>,
    plans: {} as Record<string, any>,
    lapses: [] as any[],
    invoices: [] as any[],
    addons: [] as any[],
    logs: [] as any[],
  };
  const prices: Record<string, any> = {
    price_f_m: { tier: "founding", period: "monthly", amountCents: 1700 },
    price_f_6: { tier: "founding", period: "six_month", amountCents: 7700 },
    price_f_12: { tier: "founding", period: "twelve_month", amountCents: 14700 },
    price_r_m: { tier: "regular", period: "monthly", amountCents: 9700 },
    price_addon_app: { addon: "application_review", amountCents: 49700 },
  };
  const deps: BillingDeps = {
    hasProcessedEvent: async (id) => state.processed.has(id),
    markProcessed: async (id) => { state.processed.add(id); },
    priceToPlan: (id) => prices[id] ?? null,
    findReservation: async (id) => state.reservations[id] ?? null,
    resolveReservation: async (id, r) => { state.reservations[id].resolution = r; },
    releaseFoundingSeat: async () => { state.seatsRemaining++; },
    getSubscription: async (id) => state.subs[id] ?? null,
    upsertSubscription: async (s) => { state.subs[s.id] = s; },
    getMembership: async () => null,
    applyPaidPlan: async (u, tier, period, founding, end) => { state.plans[u] = { tier, period, founding, end }; },
    lapsePlan: async (u, keep) => { state.lapses.push({ u, keep }); },
    upsertInvoice: async (inv) => { state.invoices.push(inv); },
    recordAddon: async (u, kind, pi, amt, due) => { state.addons.push({ u, kind, pi, amt, due }); },
    businessDaysFrom,
    log: async (a, d) => { state.logs.push({ a, d }); },
  };
  return { deps, state };
}

const t0 = 1_767_225_600; // 2026-01-01T00:00:00Z
const ev = (id: string, type: string, object: any, created = t0): StripeEventLike => ({ id, type, created, data: { object } });

describe("Stripe webhook handler", () => {
  it("applies a founding six-month plan once and ignores the duplicate delivery", async () => {
    const { deps, state } = fakeDeps({ reservations: { cs_1: { user_id: "u1", claimed_tier: "founding", resolution: null } } });
    const e = ev("evt_1", "checkout.session.completed", { id: "cs_1", mode: "subscription", metadata: { user_id: "u1", price_id: "price_f_6" } });
    const r1 = await handleStripeEvent(e, deps);
    const r2 = await handleStripeEvent(e, deps);
    expect(r1.note).toBe("plan applied: founding six_month");
    expect(r2.note).toBe("duplicate event ignored");
    expect(state.plans.u1.founding).toBe(true);
    expect(state.plans.u1.end.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(state.reservations.cs_1.resolution).toBe("paid");
    expect(state.logs).toHaveLength(1);
  });

  it("charges the 31st buyer the regular price because the seat decision was made at checkout", async () => {
    const { deps, state } = fakeDeps({ reservations: { cs_31: { user_id: "u31", claimed_tier: "regular", resolution: null } } });
    await handleStripeEvent(ev("evt_31", "checkout.session.completed", { id: "cs_31", mode: "subscription", metadata: { user_id: "u31", price_id: "price_r_m" } }), deps);
    expect(state.plans.u31).toMatchObject({ tier: "regular", founding: false, period: "monthly" });
  });

  it("gives a founding seat back when the checkout expires unpaid", async () => {
    const { deps, state } = fakeDeps({ seatsRemaining: 12, reservations: { cs_x: { user_id: "u2", claimed_tier: "founding", resolution: null } } });
    const r = await handleStripeEvent(ev("evt_x", "checkout.session.expired", { id: "cs_x" }), deps);
    expect(r.note).toContain("seat released");
    expect(state.seatsRemaining).toBe(13);
    const again = await handleStripeEvent(ev("evt_x2", "checkout.session.expired", { id: "cs_x" }), deps);
    expect(again.note).toBe("no open reservation");
    expect(state.seatsRemaining).toBe(13);
  });

  it("ignores an older subscription event that arrives after a newer one", async () => {
    const { deps, state } = fakeDeps();
    const newer = ev("evt_n", "customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "active", metadata: { user_id: "u3" }, items: { data: [{ price: { id: "price_f_m" } }] }, current_period_end: t0 + 30 * 86400 }, t0 + 100);
    const older = ev("evt_o", "customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "past_due", metadata: { user_id: "u3" }, items: { data: [{ price: { id: "price_f_m" } }] } }, t0 + 50);
    await handleStripeEvent(newer, deps);
    const r = await handleStripeEvent(older, deps);
    expect(r.note).toBe("older event ignored");
    expect(state.subs.sub_1.status).toBe("active");
  });

  it("keeps the founding price on a lapse of 30 days or less and drops it after", async () => {
    const { deps, state } = fakeDeps();
    const base = { id: "sub_2", customer: "cus_2", status: "canceled", metadata: { user_id: "u4" }, items: { data: [{ price: { id: "price_f_m" } }] } };
    await handleStripeEvent(ev("evt_a", "customer.subscription.deleted", { ...base, current_period_end: t0 - 10 * 86400 }, t0), deps);
    await handleStripeEvent(ev("evt_b", "customer.subscription.deleted", { ...base, id: "sub_3", current_period_end: t0 - 45 * 86400 }, t0), deps);
    expect(state.lapses[0].keep).toBe(true);
    expect(state.lapses[1].keep).toBe(false);
  });

  it("records a $497 add-on with a due date five business days out", async () => {
    const { deps, state } = fakeDeps();
    // 2026-11-06 is a Friday: five business days later is Friday 13 November
    const friday = Math.floor(Date.UTC(2026, 10, 6, 12) / 1000);
    await handleStripeEvent(ev("evt_add", "checkout.session.completed", { id: "cs_add", mode: "payment", payment_intent: "pi_1", metadata: { user_id: "u5", price_id: "price_addon_app" } }, friday), deps);
    expect(state.addons[0]).toMatchObject({ u: "u5", kind: "application_review", amt: 49700 });
    expect(state.addons[0].due.toISOString().slice(0, 10)).toBe("2026-11-13");
  });

  it("records paid and failed invoices against the member", async () => {
    const { deps, state } = fakeDeps({ subs: { sub_9: { user_id: "u9" } } });
    await handleStripeEvent(ev("evt_i1", "invoice.paid", { id: "in_1", subscription: "sub_9", amount_paid: 1700, tax: 85, status: "paid", hosted_invoice_url: "https://x" }), deps);
    await handleStripeEvent(ev("evt_i2", "invoice.payment_failed", { id: "in_2", subscription: "sub_9", amount_paid: 0, status: "open" }), deps);
    expect(state.invoices).toHaveLength(2);
    expect(state.invoices[0]).toMatchObject({ user_id: "u9", amount_paid_cents: 1700, tax_cents: 85 });
    expect(state.invoices[1].paid_at).toBeNull();
  });

  it("never applies a plan for a session without a user", async () => {
    const { deps, state } = fakeDeps();
    const r = await handleStripeEvent(ev("evt_nou", "checkout.session.completed", { id: "cs_nou", mode: "subscription", metadata: { price_id: "price_f_m" } }), deps);
    expect(r.note).toBe("no user on session");
    expect(Object.keys(state.plans)).toHaveLength(0);
  });
});

describe("businessDaysFrom", () => {
  it("skips weekends", () => {
    expect(businessDaysFrom(new Date("2026-11-06T12:00:00Z"), 5).toISOString().slice(0, 10)).toBe("2026-11-13");
    expect(businessDaysFrom(new Date("2026-11-03T12:00:00Z"), 3).toISOString().slice(0, 10)).toBe("2026-11-06");
  });
});
