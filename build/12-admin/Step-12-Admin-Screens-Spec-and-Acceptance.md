# Step 12: admin screens A1 to A3 and A5 to A7

Runbook step 12 of Appendix E (added 1 Nov 2026 after the acceptance run; blueprint v1.17 Section 9.5). Built 1 November 2026. The Curator Console (A4) was built in step 6; this step adds the other six screens under `/admin`, behind the admin role, with every write audited. The screens show counts, dates, plans and money. They never show a member's draft, brief, script or application text.

## 1. What was built

| Area | Files | What it does |
|---|---|---|
| Database | `app/packages/db/supabase/migrations/0015_admin.sql` | `assert_admin()`; `monthly_value_cents()`; `admin_funnel()` (nine steps from signed up to published); `admin_overview()` (members by plan, trials, subscriptions, MRR, past due, seats, allowances used this month, AI cost by action, credits settled, reviews open and overdue, events); `admin_members(query, limit)` (one row per member: email, name, role, access, plan, period, founding flag, trial, extension, region, stage, path, ideas locked, prior stages, applications sent, ready applications toward 100, credits this month, last activity); `admin_member_timeline()` (milestones and activity, no content); `admin_member_allowances()`; writes `admin_set_role()` (cannot demote yourself), `admin_set_plan()`, `admin_grant_extension()`, `admin_set_flag()`, `admin_activate_prompt()`, each writing `audit_log`; `admin_ai_settings()`; `admin_billing()`; `admin_reports()`; `admin_audit()` |
| Database tests | `app/packages/db/tests/rls_and_gates.sql` (step12 block) | 19 new checks; 235 in total, all green |
| Role helpers | `lib/roles.ts` | `requireAdmin()` for pages, `assertAdmin()` for actions |
| Actions | `app/(app)/admin/actions.ts` | `setRole`, `setPlan`, `grantExtension`, `setFlag`, `activatePrompt`, all through the audited functions |
| A1 Admin home | `app/(app)/admin/page.tsx` | MRR, founding seats left, members by plan and trials, AI cost this month; the funnel by stage as bars; allowances consumed; AI cost by action; reviews open and past SLA; events verified and with deadlines |
| A2 Access and A3 Members | `app/(app)/admin/members/page.tsx`, `components/admin/MembersTable.tsx` | Search by email or name; the members table; a member panel with role and access, plan assignment (plan, period, founding flag, end date, a note that goes to the audit log), the 100-applications extension (Grant opens at 100), this month's allowances, and the Talk Record timeline |
| A5 AI settings | `app/(app)/admin/ai/page.tsx`, `components/admin/AiSettings.tsx` | Model routing and credit prices read from the registry the server runs; feature flags with audited on and off; prompt versions with eval pass rate and Activate; eval runs; cost caps named; cost by model for 30 days |
| A6 Reports | `app/(app)/admin/reports/page.tsx` | Application outcomes (shown only when the cohort is 20 or more), applications to in-app events, churn by plan and period, allowance burn, event coverage with the Phase 3 targets, practice this week |
| A7 Billing | `app/(app)/admin/billing/page.tsx` | Founding seats left, revenue, Stripe Tax and refunds this month; subscriptions with monthly value and dunning marked; add-ons with review status and SLA date; invoices with links to Stripe |
| Audit | `app/(app)/admin/audit/page.tsx` | Every admin write with actor, action, resource and details |
| Shell | `components/AppShell.tsx`, `app/(app)/layout.tsx`, `app/(app)/admin/layout.tsx`, `components/admin/AdminNav.tsx` | Admin link in the rail for admins; the admin layout checks the role once; six-section nav |
| Dev preview | `app/dev/screens/page.tsx` | Admin fixtures (stats, members table with the panel, AI settings) for screenshots |

## 2. Rules carried into code

- Admin only, twice: `requireAdmin()` decides what renders; `assert_admin()` inside every function decides what runs. A curator is not an admin (checked).
- Every write audits: role, plan, extension, flag and prompt activation each insert an `audit_log` row with the actor; the audit screen shows them.
- No content: the member functions return counts, states and dates. The timeline is milestone keys and activity kinds, not text.
- Cohort privacy: outcome rates show only when 20 or more applications exist (the F1.3.10 rule applied to the admin view as well).
- Money: MRR spreads six and twelve month prices over their months (`monthly_value_cents`: $77 is $12.83 a month, $147 is $12.25); revenue is paid invoices less refunds; Stripe Tax is shown separately.
- Routing and prices are read from `packages/prompts/registry.json`, the same file `runAiAction` uses, so the screen cannot drift from the code; changing them is a commit.
- The 100-applications extension (B4, 10.5) is granted by an admin after the count is read from `ready_applications_sent()`; the button opens at 100 and the audit row records the count.
- Web and mobile: tables scroll inside their own containers; the page never scrolls sideways at 390px; the member panel's three forms stack on a phone.

## 3. Acceptance checks

| Check | Result |
|---|---|
| A member cannot read the overview, list members or flip a flag | pass: database checks (`ADMIN_ONLY`) |
| A curator is not an admin | pass: database check |
| The funnel has nine steps and counts the published member | pass: database check |
| The overview carries plans, seats and AI cost | pass: database check |
| The members list finds a member by email with stage and counts and no content | pass: database check |
| The member timeline lists milestones and activity | pass: database check |
| Flag changes save and audit; an unknown flag is refused | pass: database checks |
| Role changes save and audit; an admin cannot demote themselves | pass: database checks |
| Plan assignment saves the founding flag and audits | pass: database check |
| The extension grants and audits with the ready count | pass: database check |
| AI settings carry flags, prompt versions and eval runs | pass: database check |
| Billing carries the seat counter, subscriptions, invoices and add-ons | pass: database check |
| Reports carry outcomes, churn, allowance burn and event coverage | pass: database check |
| Audit rows list the admin writes with the actor's email | pass: database check |
| Monthly value spreads six and twelve month prices | pass: database check (1283, 1225, 1700) |
| Phone and desktop render without horizontal scroll | pass: `admin-phone.png` (390px) and `admin-desktop.png` (1280px) |
| Copy lint, no-capture guard, type check, build | pass: all clean; `next build` lists the six `/admin` routes |

## 4. Decisions logged (Appendix C, v1.17)

Six rows dated 2026-11-01: admin functions as security-definer aggregates with `assert_admin()`; every admin write audited; no member content on admin screens; cohort outcomes hidden under 20; routing and prices read from the registry (a commit, not a live edit); the extension granted by hand at 100 with the count in the audit row.

## 5. Owner items

- None new. The acceptance run's owner list stands (`build/11-acceptance/`).
