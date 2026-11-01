# Start here: handoff for any AI or person continuing One Big Talk

Written 1 November 2026. This file replaces `TEDx-OS-Handoff-Prompt.md` (kept for history). It is written so that a new Claude account, another AI, or a human engineer can open this repository cold and continue from exactly where the work stands.

## Part 1. Paste this as the project instructions (or system prompt)

```
You are the product and engineering lead for One Big Talk, a web app that guides experts, coaches, consultants and authors through the full lifecycle of a talk at an independently organized TEDx event: FIND (position the idea, discover events, apply), WRITE, DELIVER (memorize and time the talk) and AMPLIFY. The owner is Ash Goel of Global Book Publishing; the first buyers come from the Authority Bestseller Book Challenge audience.

Source of truth: this repository. TEDx-OS-Master-Blueprint-v1.15.md (or the highest version number present) decides scope, priorities, pricing, design tokens, data model, prompts and legal limits. TEDx-OS-Feature-Decisions.xlsx (column L) and MVP-First-Release.md decide what is in the first release. TEDx-OS-Screen-Inventory-and-Wireframes.md decides the UI. Never redo the research; cite the research-notes files when you need evidence. When the blueprint is silent, decide by its Section 0.4 rules, write the decision into Appendix C with the date and reason, bump the blueprint version, and move on.

Non-negotiables, always:
1. Text only. The product never asks for, records, uploads, stores or analyzes audio or video. Prior talks and pitch videos are described or linked, never uploaded. "Talk Record" means a database record the member types into.
2. No guarantee of selection, ever. The only promise is the 100-ready-applications access extension in Section 10.5.
3. Never charge for, sell, broker or imply a speaking slot. The app never submits an application and never contacts an organizer.
4. The app never crawls. The event database comes from the owner-run Claude Code crawler, a Google Sheet the owner maintains (synced weekly), organizer submissions and curator research, through the Curator Console.
5. Writing is two-step: an Idea Brief of at least 500 characters in the member's own words, then an editable outline with talking points that the member finalizes, then a script written only from the finalized outline. Never write a script straight from an idea.
6. Prior Stages are optional and described (month, city, organization, audience size, topic). Other talks were other topics; the locked idea is fresh and the TEDx stage would be the first time it is shared. Never claim the member has spoken on this topic before.
7. One paid plan: Founding Member at $17 a month, $77 for six months, $147 for twelve months, price kept for life while active, limited to the first 30 paying members (a true, server-counted limit; no timers); then $97 a month. A free plan with one-time allowances; a 3-day no-card trial limited to one idea and three events. Members see plain-language allowances; credits are internal. USD only. Stripe with Stripe Tax. Two add-ons: human application review $497 (5-business-day SLA) and human script review $497.
8. Never use TED's marks in the product name, UI, domains or ads. The name is One Big Talk (onebigtalk.com), held in one constant. Every public page carries the independence disclaimer. Say "independently organized TEDx event", never "TED talk" for a TEDx talk.
9. Model routing: Claude Sonnet 5.5 for drafts, Haiku 5.5 for scoring and linters, Opus 5.5 only where the blueprint says so. Every prompt starts with the shared preamble in Section 13.1 and obeys R10 (fresh idea) and R11 (write only from what the speaker wrote).
10. No community of any kind, no clinic at launch (deferred), no Elite or Guided inclusion, no order bump, no INR pricing, no request to TED, no advisory council (owner decisions of 31 Oct and 1 Nov 2026).

House style for everything you write (code comments, UI copy, emails, documents): plain, warm, direct; short paragraphs; no em dashes; no buzzwords; no exclamation marks; never "get selected" or "guaranteed"; honest numbers over hype. Credential line: Ash solo "9X TEDx"; joint "10X TEDx Speakers"; never mixed.

How to work: keep a visible task list; deliver files as they become useful into build/<step>-<name>/; one-line progress notes; ask only questions that block the next step and otherwise use the blueprint's defaults and log them; before quoting a number in public copy, trace it to Appendix A or a research note, or mark it [NEEDS CONFIRMATION].
```

## Part 2. Read order

1. This file.
2. `TEDx-OS-Master-Blueprint-v1.15.md` in full. Pay particular attention to Section 0 (non-negotiables, decision rules), 2.3 and 2.4 (TEDx rules and the trademark line), 5 (architecture, Today, onboarding), 6.2 (Event Finder including the Google Sheet sync and the status rules), 6.3 (pipeline, quality gates, dated applications), 6.5 (Prior Stages), 7 (two-step writing), 8 (Deliver, text only), 10 (pricing, allowances, the only promise, the 3-day trial), 11.3 (color tokens), 12.3 (data model), 12.5 (crawler-fed pipeline), 12.10 (engineering conventions including credit reservation and error codes), 13 (prompt library), 14.1 (Phase 1 as decided), Appendix C (decision log, every decision with date and reason), Appendix E (build runbook).
3. `MVP-First-Release.md` (or the xlsx): the exact first-release feature set.
4. `TEDx-OS-Screen-Inventory-and-Wireframes.md` before any UI work.
5. `TEDx-Event-Database-Crawler-Prompt.md` when building the Curator Console import and the Google Sheet sync.
6. `build/00-review/External-Documents-Review.md` to see what was taken from the three ChatGPT documents in `external-reviews/` and what was rejected and why.
7. `research-notes/` only when you need the evidence behind a claim; `TEDx-OS-Critical-Review-and-Fixes.md` for the reasoning behind v1.2; `legacy/` only when migrating the previous app's data or reusing its RLS rules.

## Part 3. State of the work (1 November 2026)

Done:
- Research (eight threads, source-linked), independent verification, critic's review, blueprint v1.0 through v1.5.
- All twelve Appendix D questions answered by the owner on 31 Oct 2026 and applied (Appendix C).
- Three external ChatGPT documents reviewed; sixteen text-only ideas adopted into v1.4; rejections recorded.
- Feature selection done by the owner on 1 Nov 2026: 82 MVP rows, 23 Keep, 15 Defer, 7 Delete (`TEDx-OS-Feature-Decisions.xlsx`).
- Screen inventory v1.1 aligned to the blueprint; crawler prompt updated for the Google Sheet route and two optional fields.
- Blueprint v1.15 logs the engineering decisions of build steps 1 to 10 in Appendix C.
- The repository is public at https://github.com/aks99/onebt and mirrors the owner's folder `G:\TEDx OS`.
- Owner instruction (1 Nov 2026): every screen is built phone-first and widened for desktop. 16px gutters, 44px touch targets, no horizontal scroll, bottom tab bar under 768px.

Code: runbook steps 1 to 10 are done (1 Nov 2026). `app/` holds the pnpm workspace, the Next.js app (shell with rail and bottom tabs, onboarding, Today, Journey, Idea Lab, Prior Stages, Event Finder, event detail, Targets, Applications board and detail, Pitch Studio, Idea Brief, Outline Builder, Script Studio, Fact-check, Memorize, Drill, Practice timer, printables, Launch (publication tracker, plan, copy kit, upload pack, bio updater), Curator Console, public open calls, pricing, Plan, auth), fourteen Supabase migrations for all 68 tables and the lock, journey, overlap, sync, verify, merge, reminder, calendar, research, follow-up, pipeline, finalize, script-lock, beat-map, drill, timer, publication and launch functions, the RLS and gate test suite (216 checks, all green), 142 Vitest unit tests, the prompt library (25 actions) and evals, the prompt library and evals, and the CI workflows. Reports are in `build/0N-*/`. Marketing site copy is not started. The remaining steps of Appendix E, in order:
1. Done. Monorepo skeleton (12.10) and Supabase migrations for every table in 12.3, RLS tests for two members and one curator.
2. Done. Design tokens, type scale, core components, contrast checks and the no-capture guard (`build/02-design-system/`).
3. Done. Auth, memberships, Stripe Checkout and webhooks, founding seats, trial limits, allowances and the credit ledger functions, pricing and Plan pages (`build/03-accounts-billing/`).
4. Done. `runAiAction` with seven gates, 25 versioned prompts with schemas (24 in step 4, `script_rubric` added in step 8), the `/api/ai/<action>` route, 31 unit tests, the 240-fixture Promptfoo suite in CI (`build/04-ai-service/`).
5. Done. Idea Lab (interview, spark, batches, scorecard, Idea Card, lock), Prior Stages with the fresh-idea check and framing, onboarding with "log an application I already sent", Today and Journey with the recommender and the weekly commitment (`build/05-idea-lab/`).
6. Done. Curator Console (Sources, Import runs, Diff, Verify, Dedup, Organizers, Tickets, Tags), the import pipeline, weekly sheet sync and daily reminders, Event Finder with ranking and filters, event detail, Targets, watches, reports, calendar feed, public open calls (`build/06-curator-events/`).
7. Done. Application Pipeline (board, five-draft cap, research step, Form Mapper, personalization diff, Readiness Review gate, submit assist, dated applied and follow-up with restraint rules, outcomes, authorship meter, CSV and text export) and Pitch Studio (versioned pack, text-only pitch video kit), local-connection finder (`build/07-pipeline-pitch/`).
8. Done. Idea Brief (500-character rule, autosave, completeness), word budget and structure templates, Outline Builder (talking points, budgets, consent chips, versions, Finalize), Script Studio (section-by-section draft from the final outline, coverage, eight passes as versions, rubric, lock and unlock, meters), Fact-check Flagger, exports (`build/08-write/`).
9. Done. Deliver core: verified beat map, four drills, spaced schedule with due beats on Today, full-screen practice timer saving durations (measured pace), printables, sample script for the free plan (`build/09-deliver/`).
10. Done. Amplify basics: publication tracker with the official-link rule, standard and personalized launch plan dated from the link, copy kit and upload pack with the compliance check, bio updater, second-talk guard (`build/10-amplify/`).
11. Phase 1 acceptance checks (14.1), UI acceptance checks (screen inventory Section 11), launch checklist (14.6).
Deferred and deleted features are listed in `MVP-First-Release.md`; build deferred ones behind PostHog flags only after launch.

Owner runs himself: the crawler (Claude Code on his machine), the Google Sheet it feeds, the name clearance search for One Big Talk, Stripe account and tax registrations, the Google service account for the sheet sync.

Open items for the owner (none blocks the build):
- Six- and twelve-month prices after the 30 founding seats are taken [NEEDS CONFIRMATION]; until then only the $97 monthly regular price exists.
- Confirm the trial reading: 3 days, member tools unlocked for one locked idea and three events, then the free plan.
- Trademark clearance for One Big Talk (classes 9, 41, 42; USPTO, IP India, UK IPO, EUIPO) and handle checks. Caution on record: "The Big Talk Academy" is an existing speaker-coaching brand.

## Part 4. Ways to build this

- A Claude Code or Claude account with this repository: follow Appendix E in order, saving each step's specification, code, tests and acceptance report into `build/<step>-<name>/`.
- A no-code or AI app builder (apper.io, ezsite.ai or similar): use the prompts in `build/00-prompts/`, which point back to the raw files in this repository. Those builders cannot run the owner's crawler or the Claude prompt library on their own; the prompts say what to stub and what to connect.
- A human team: Sections 12.11 and 14.2 of the blueprint give effort (16 to 24 person-weeks for the first release with two senior engineers) and roles.

## Part 5. If you change anything

Every material choice the blueprint does not settle goes into Appendix C with date, choice and reason, and the blueprint file is saved under the next version number (v1.6 and so on). Keep the previous version in `blueprint-history/`. Update `MVP-First-Release.md` from the xlsx whenever the decisions change. Never add a feature that records, uploads or analyzes audio or video. Never add a guarantee. Never use TED's marks.
