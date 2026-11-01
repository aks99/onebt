# Start here: handoff for any AI or person continuing One Big Talk

Written 1 November 2026. This file replaces `TEDx-OS-Handoff-Prompt.md` (kept for history). It is written so that a new Claude account, another AI, or a human engineer can open this repository cold and continue from exactly where the work stands.

## Part 1. Paste this as the project instructions (or system prompt)

```
You are the product and engineering lead for One Big Talk, a web app that guides experts, coaches, consultants and authors through the full lifecycle of a talk at an independently organized TEDx event: FIND (position the idea, discover events, apply), WRITE, DELIVER (memorize and time the talk) and AMPLIFY. The owner is Ash Goel of Global Book Publishing; the first buyers come from the Authority Bestseller Book Challenge audience.

Source of truth: this repository. TEDx-OS-Master-Blueprint-v1.5.md (or the highest version number present) decides scope, priorities, pricing, design tokens, data model, prompts and legal limits. TEDx-OS-Feature-Decisions.xlsx (column L) and MVP-First-Release.md decide what is in the first release. TEDx-OS-Screen-Inventory-and-Wireframes.md decides the UI. Never redo the research; cite the research-notes files when you need evidence. When the blueprint is silent, decide by its Section 0.4 rules, write the decision into Appendix C with the date and reason, bump the blueprint version, and move on.

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
2. `TEDx-OS-Master-Blueprint-v1.5.md` in full. Pay particular attention to Section 0 (non-negotiables, decision rules), 2.3 and 2.4 (TEDx rules and the trademark line), 5 (architecture, Today, onboarding), 6.2 (Event Finder including the Google Sheet sync and the status rules), 6.3 (pipeline, quality gates, dated applications), 6.5 (Prior Stages), 7 (two-step writing), 8 (Deliver, text only), 10 (pricing, allowances, the only promise, the 3-day trial), 11.3 (color tokens), 12.3 (data model), 12.5 (crawler-fed pipeline), 12.10 (engineering conventions including credit reservation and error codes), 13 (prompt library), 14.1 (Phase 1 as decided), Appendix C (decision log, every decision with date and reason), Appendix E (build runbook).
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
- Screen inventory v1.1 aligned to v1.5; crawler prompt updated for the Google Sheet route and two optional fields.

Not started: code, design files, marketing copy. The next step is Appendix E of the blueprint, in order:
1. Monorepo skeleton (12.10) and Supabase migrations for every table in 12.3, RLS tests for two members and one curator.
2. Design tokens (11.3), type scale (11.2), core components (11.5), automated contrast checks, a check that no component requests camera or microphone.
3. Auth, profiles, memberships, three billing periods with the founding-price flag and the 30-seat counter, $97 regular price, 3-day trial limits, allowances, credit ledger with reservation and idempotency, Stripe webhooks, the two $497 add-ons.
4. `runAiAction` with the brief-minimum and outline-final gates, the prompt library as versioned files (13.1 to 13.14), the Promptfoo eval suite (13.15) in CI.
5. Idea Lab and Prior Stages, onboarding (including "log an application I already sent"), Today and Journey.
6. Curator Console: Google Sheet sync (weekly plus Sync now), CSV upload, diff, verify queue with flag rules, dedup, organizer records; the matching pipeline.
7. Application Pipeline with quality gates, dated applications, authorship meter; Pitch Studio.
8. Write: Idea Brief, Outline Builder, Script Studio, passes, fact-check, locks, exports.
9. Deliver core: beat map, four drills, spaced schedule, practice timer that saves durations (measured pace).
10. Amplify basics: publication tracker, upload pack, launch plan, launch copy kit, bio updater, second-talk guard.
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
