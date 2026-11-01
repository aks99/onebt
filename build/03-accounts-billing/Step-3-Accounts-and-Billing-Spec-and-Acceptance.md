# Step 3: Accounts and billing. Specification, deliverables and acceptance report

Date: 1 November 2026. Blueprint v1.8 Sections 10.1 to 10.5, 10.6 (Stripe, USD), 10.10, 12.8, 12.10; runbook step 3: auth, profiles, memberships, the three billing periods with the founding-price flag and the 30-seat counter, the $97 regular price, the 3-day trial limits, plain-language allowances, the credit ledger with reservation and idempotency, Stripe webhooks, the two $497 add-ons.

## 1. What was built

| Path | What it is |
|---|---|
| `app/packages/db/supabase/migrations/0008_billing_functions.sql` | `is_trial_active`, `has_member_access`, `trial_limit_check` (one locked idea, three events during the trial); `consume_allowance` (refuses with `ALLOWANCE_EXHAUSTED` and the reset date in plain words) and `consume_fair_use` (caps for the "unlimited" items); `reserve_credits` (idempotent by key), `settle_credits`, `release_credits`, `credits_settled_this_month`; `release_founding_seat`, `founding_seat_reservations`; `apply_paid_plan`, `lapse_plan` (founding price kept for a lapse of 30 days or less). Everything that moves money, credits or plans is executable by the service role only; members can call the read-only checks |
| `app/packages/db/tests/rls_and_gates.sql` (step 3 section) | 20 new checks: trial state and limits, allowance consumption and exhaustion, fair-use caps, idempotent reservation, settle and release, seat release and re-claim, plan apply and lapse, and that members cannot call the service functions directly |
| `app/apps/web/lib/supabase/{server,client,admin}.ts`, `middleware.ts` | SSR Supabase clients; the service-role client refuses to run in the browser; the middleware refreshes the session and sends signed-out visitors from member paths to `/login` |
| `app/apps/web/app/(auth)/login/`, `app/auth/callback/route.ts` | S0.4: passwordless email link, same message whether or not the address exists, resend; the callback exchanges the code and sends new accounts to onboarding |
| `app/apps/web/lib/billing/webhook.ts` | The Stripe event handler as a pure function over an injected data layer: applied once per event, older events never override newer state, the 31st buyer pays the regular price, an expired checkout gives its seat back, a lapse over 30 days loses the founding price, an add-on creates a review due in 5 business days |
| `app/apps/web/lib/billing/deps.ts`, `checkout.ts` | Real data layer (Supabase service role), the price map from environment variables, Checkout Session creation that claims the founding seat atomically and records a reservation, add-on Checkout, Customer Portal session |
| `app/apps/web/app/api/stripe/webhook`, `api/billing/checkout`, `api/billing/portal` | Routes: signature verification, checkout creation, portal |
| `app/apps/web/app/pricing/page.tsx` | S0.2 with the live count of founding seats, the $97 regular price once seats are gone, the promise in full, the add-ons |
| `app/apps/web/app/(app)/me/plan/page.tsx` | S7.3 Plan tab: plan and price, founding badge, renewal date, change period, pause and cancel through the Customer Portal, money-back window, the 100-applications counter, allowance meters with the reset date, the add-on buttons, a dunning banner when a payment fails |
| `app/apps/web/components/PlanButtons.tsx` | Checkout buttons with the fixed failure text "That did not work. Nothing was charged. Try again." |
| `app/apps/web/tests/webhook.test.ts` | 9 Vitest cases over the handler |
| `app/.github/workflows/app-checks.yml` | CI: copy lint, tokens, contrast, no-capture, typecheck, unit tests |

## 2. Decisions the blueprint did not settle (Appendix C, v1.8)

1. **The founding seat is claimed when the Checkout Session is created**, so the price the member sees is the price they pay, and released by the `checkout.session.expired` webhook (30-minute sessions) if they abandon. A reservation row ties the session to the claim.
2. **Regular members have a monthly price only** until the owner sets six- and twelve-month regular prices [NEEDS CONFIRMATION]; a buyer who arrives after the 30 seats sees $97 a month.
3. **Change period, pause and cancel run through Stripe's Customer Portal**, configured with no retention offers, which meets "cancel in two clicks" without custom billing screens. Pause is a portal pause of up to 3 months.
4. **The 30-day founding grace is judged from the subscription's period end** to the cancellation event; the webhook passes keep or drop to `lapse_plan`.
5. **Trial limits are enforced in the API through `trial_limit_check`** (one locked idea, three tracked events), called before Idea Lock and before Track, with the trial itself started by the new-user trigger from step 1.
6. **Money-moving SQL functions are service-role only** (`revoke execute from public, authenticated, anon`); the API calls them after its own checks. Members hold read-only checks.
7. **Stripe Tax amounts are mirrored on invoices** (`tax_cents`) so the owner's accountant can see what was collected; tax registration remains the owner's task (owner decision 31 Oct 2026).

## 3. Acceptance report

| Check | Result |
|---|---|
| All migrations apply on a fresh database (8 files, 62 tables) | pass |
| RLS and gate suite including the step-3 section | pass, 84 of 84 |
| Fourth script draft in a month refused with the reset date in the message | pass (`ALLOWANCE_EXHAUSTED: you have used this month's 3 script drafts. Resets 01 Dec.`) |
| Reserving credits twice with one idempotency key creates one ledger row | pass |
| Settle then release leaves the row settled | pass |
| Releasing a founding seat makes it available and the next claim is founding | pass |
| Paid plan applied and full allowances granted; lapse returns to Spark and drops the founding price when told to | pass |
| Member role cannot call `reserve_credits` or `claim_founding_seat` | pass (permission denied) |
| Webhook: founding six-month plan applied once, duplicate ignored | pass (Vitest) |
| Webhook: 31st buyer charged regular | pass |
| Webhook: expired checkout releases the seat, second expiry does nothing | pass |
| Webhook: older subscription event ignored after a newer one | pass |
| Webhook: founding kept on a lapse of 10 days, lost after 45 days | pass |
| Webhook: $497 add-on records a review due 5 business days later (Friday to Friday) | pass |
| Webhook: paid and failed invoices mirrored with tax | pass |
| Webhook: session without a user applies nothing | pass |
| Typecheck, production build with the new routes and middleware | pass |
| Copy lint and no-capture guard | pass |

Still to verify against a live Stripe test account (needs the owner's keys): the Checkout and Portal round trips, webhook signature with a real secret, and the 31st purchase end to end. The handler logic those flows call is the code tested above.

## 4. What step 4 needs from here

Nothing blocks. Step 4 builds `runAiAction` on top of `reserve_credits`, `consume_allowance`, `consume_fair_use`, `has_member_access`, `is_trial_active` and `trial_limit_check`, with the brief-minimum and outline-final gates, the prompt library files and the Promptfoo suite.
