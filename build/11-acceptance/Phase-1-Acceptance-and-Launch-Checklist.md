# Step 11: Phase 1 acceptance run and launch checklist

Runbook step 11 of Appendix E (blueprint v1.16). Run 1 November 2026 against everything built in steps 1 to 10 (`aks99/onebt`, main). Three lists are covered: the Phase 1 acceptance checks in 14.1, the UI acceptance checks in Section 11 of the screen inventory, and the launch checklist in 14.6.

Every automated check can be re-run with one command from `app/`: `bash scripts/acceptance.sh` (set `SKIP_DB=1` without a local Postgres). On 1 Nov 2026 it printed ten PASS lines and "acceptance: all automated checks pass". The same checks run in GitHub Actions from `.github/workflows/` (moved to the repository root in this step so they actually run; they had been under `app/.github/`).

Status words: **pass** (automated or verified in this run), **verified** (checked by reading the code or the rendered screen), **owner** (needs an account, a person or a decision the builder cannot supply), **deferred** (the feature is behind a flag by owner decision, so the check waits with it).

## 1. Phase 1 acceptance (14.1)

| Check | Status | Evidence |
|---|---|---|
| The Section 6 to 8 checks marked MVP | pass | Each step's acceptance table: `build/05-idea-lab/`, `06-curator-events/`, `07-pipeline-pitch/`, `08-write/`, `09-deliver/`, `10-amplify/`; 216 database checks and 142 unit tests behind them |
| A new user reaches a scored idea and three event matches in under 12 minutes in a usability test of 8 people | owner | The flow is built (onboarding path and three questions, Idea Spark, pick and match). The test needs eight people and a stopwatch; a one-page script is in Section 4 below |
| The Idea Brief refuses 499 characters | pass | `briefSavable` unit test; `saveBrief` returns `BRIEF_TOO_SHORT`; database constraint `idea_brief_minimum`; Save is disabled under 500 with the explaining message |
| "Write the script" is unavailable until an outline is final | pass | Button disabled until `outlineFinal`; gate copy "opens once an outline is final"; `OUTLINE_NOT_FINAL` in `startScript` and in the database |
| A full 10-minute draft lands within budget and covers every talking point or lists it | pass (rules), owner (live model run) | `wordBudget`, `coverage` unit tests; `writeNextSection` records covered and uncovered ids per section; the live check needs an Anthropic key, which the eval workflow runs when the secret is set |
| No screen requests camera or microphone permission | pass | `check-no-capture.mjs` clean; browser run found no `getUserMedia` use; no media columns in any migration (SQL guard) |
| The Promptfoo suite passes including the R10 fresh-idea tests | pass (structure), owner (model run) | `check-suite.mjs`: 9 suites, 240 fixtures, structure ok; the model run needs `ANTHROPIC_API_KEY` in the repository secrets (`.github/workflows/evals.yml`) |
| RLS tests pass for two members and one curator | pass | `rls_and_gates.sql`: 216 checks, members A and B, curator C, admin D, anon; steps 9 and 10 run under the `authenticated` role |
| Purchase of monthly, six-month and twelve-month plans, cancellation and the founding-price flag work in Stripe test mode | pass (code and webhook tests), owner (live test mode) | `webhook.test.ts` covers the three periods, cancellation and the founding flag; the live run needs the Stripe test keys and the three price ids in `.env` |
| The 31st purchase after 30 founding seats is charged the regular price | pass | database checks `30 founding seats granted`, `31st purchase is regular`, `seats remaining is zero` |

## 2. UI acceptance (screen inventory Section 11)

| Check | Status | Evidence |
|---|---|---|
| Every screen renders all five states from a Storybook story | verified (preview, not Storybook) | `/dev/screens` renders the built components with fixtures for empty, loading, error, gated and filled states where they exist; Storybook was not added (decision logged) |
| No screen requests camera or microphone; no upload control accepts audio or video | pass | no-capture guard; the only file inputs are the curator's CSV and JSON import |
| Contrast at least 4.5:1 for text and 3:1 for UI on every token pair, light and dark | pass | `check-contrast.mjs`: 45 pairs, 0 failures (prompter text 18.34:1) |
| Target size at least 24 by 24 px with 8 px spacing on drills, timer and prompter controls | pass | Browser run at 320px: timer controls 48px tall; drill targets 56px; checkboxes and radios now 24px by a global rule (added in this step). The only controls under 24px are inline text links inside sentences, which WCAG 2.2 exempts, and the skip link, which is visually hidden until focused |
| 200 percent zoom keeps the editor usable; prompter and timer work at 320 px width | pass | At 640px (the layout width of 1280 at 200 percent) the Write section renders without horizontal scroll (`write-640-zoom200.png`); the timer at 320px renders and runs (`timer-320.png`); the prompter is deferred |
| Reduced motion disables scrolling animation, flips and celebrations | pass | `prefers-reduced-motion` read in the timer and the drills; no `animate-pulse` at rest under `reducedMotion: reduce`; tokens.css carries the media rule; the prompter's step scroll is deferred with it |
| The Idea Brief refuses 499 characters client-side with the explaining message | pass | BriefForm: Save disabled with "N more before Save opens" |
| "Write the script" is disabled until an outline version is final and the gate copy says so | pass | ScriptStudio line 70 and 77 |
| Deadline dates render in both the organizer's and the member's timezone | pass (fixed in this run) | The chip showed the organizer's time and "timezone not stated by the organizer"; it did not show the member's local time. Added `zonedToUtc` and `memberLocalText` to the UI package (DST-safe), the Event Finder passes the browser's timezone, and a unit test checks New York 23:59 to Kolkata 10:29 |
| No em dashes, exclamation marks, "get selected", "guaranteed", the TED mix-up or TED logos anywhere in the UI copy | pass | copy lint clean across `apps/`; no logo asset exists in the repository |

## 3. Launch checklist (14.6)

| Area | Item | Status | Note |
|---|---|---|---|
| Legal | Name cleared | owner | "One Big Talk" is the working name from the 20-candidate file; trademark clearance is outstanding. The name lives in one constant (`lib/product.ts`) |
| Legal | Disclaimer live | pass | `DISCLAIMER` in every public footer, onboarding and pricing |
| Legal | ToS, privacy policy, ethics page, AI disclosure | owner | Text to be supplied or approved by the owner; routes exist for the footer links |
| Legal | DPAs signed; organizer-data lawful-basis note and removal process | owner | The Curator Console carries the consent and lawful-basis field per organizer contact (step 6); the removal process is a support task |
| Product | Phase 1 acceptance passed | pass (automated), owner (three live items above) | This document |
| Product | Eval suite green | owner | Needs the Anthropic key in repository secrets; structure check passes |
| Product | RLS tests green | pass | 216 checks |
| Product | 300+ verified events imported from the crawler | owner | Curator Console import and the weekly Sheet sync are built; the first crawler run and the service account are outstanding (step 6 owner items) |
| Product | The first clinic scheduled and one replay available | deferred | Clinic deferred to after launch (owner decision 1 Nov 2026); no public copy mentions it |
| Commercial | Pricing page with the three Founding prices, the true seat count of 30, the $97 regular price, the two $497 add-ons and the 100-applications promise | pass | `/pricing` reads the live count from `public_counts`; the promise is rendered from `THE_PROMISE` |
| Commercial | Stripe live with Stripe Tax; refund policy | owner | Webhooks and checkout are built and unit-tested; live keys, Stripe Tax registration and the refund policy text are the owner's |
| Commercial | Support inbox and SLAs; affiliate terms | owner | The 5-business-day review SLA is in the blueprint; the inbox and the affiliate terms are outside the code |
| Content | Workshop deck; rubric page; outcome-report template; onboarding emails | owner | The rubrics are in the prompt library and the UI; the deck and the templates are content work |
| Ops | Weekly crawler run and curator review rota | owner | Cron routes exist (`/api/cron/sheet-sync` Mondays 06:00, `/api/cron/reminders` daily 07:00) |
| Ops | Clinic host rota | deferred | With the clinic |
| Ops | Cost dashboard with alerts at 80 percent of budget | partly built | Per-action cost caps live in `runAiAction` and the AI settings screen; the alert email at 80 percent is an owner setting once Resend is live |

## 4. Usability test script (for the owner's 8-person test)

1. Give each person a laptop or a phone, a fresh magic-link sign-in and a stopwatch. Say only: "Find one idea for a TEDx talk and three events that fit it."
2. Start the clock at the first screen of onboarding. Stop it when the Journey shows a scored idea and three tracked events.
3. Record the time, where they hesitated longer than 20 seconds, and the first thing they said afterwards.
4. Pass is 8 of 8 under 12 minutes. Anything over goes into the step's acceptance folder as a finding with the screen name.

## 5. Fixes made during this run and one gap found

- **Gap: admin screens.** Phase 1 lists admin A1 to A5 and A7 (9.5). The Curator Console (A4) is built; A1 Admin home, A2 Access, A3 Members, A5 AI settings, A6 Reports and A7 Billing have their data (audit log, user roles, memberships, allowances, feature flags, prompt versions, eval runs, subscriptions, Stripe events) and their service functions, but no screens. Appendix E has no runbook item for them. Decision: build them as step 12 before ship, as read-mostly tables under `/admin` behind `is_admin()`, so the owner does not run launch from Supabase Studio.

- The three GitHub Actions workflows moved from `app/.github/workflows/` to `.github/workflows/` at the repository root so they run (their paths already pointed at `app/`).
- Checkboxes and radios are 24 by 24 px everywhere by a global rule, and the seven hand-sized checkboxes in components were raised to match.
- `app/scripts/acceptance.sh` runs every guard and suite in one command and is the thing to run before any deploy.

## 6. What is left before launch, in one list

Owner: trademark clearance; legal pages; Google service account and the first crawler import (300+ events); Stripe live keys, price ids and Stripe Tax; Resend key and sender; `CRON_SECRET`; `ANTHROPIC_API_KEY` in repository secrets for the eval run; the 8-person usability test; the six and twelve month regular prices [NEEDS CONFIRMATION]; content (deck, templates, onboarding emails).

Builder: step 12, the admin screens (above). Then, after the owner items arrive: run `scripts/acceptance.sh`, run the eval suite once with the key, do one live Stripe test-mode purchase of each period, import the first crawler run with the curator, and ship.
