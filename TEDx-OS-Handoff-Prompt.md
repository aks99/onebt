# Handoff: continue the TEDx OS work in a new Claude account

Written 31 October 2026, after blueprint v1.2. Everything referenced here lives in `G:\TEDx OS`. This file replaces the 30 October handoff.

Three things to paste: the **Project instructions** (Part 5) into the new Project's instructions field, the **starting prompt** (Part 4) as the first message, and nothing else. The new Claude reads the rest from the folder.

## Part 1. What is in the folder (read order for the new account)

| # | File | What it is | Read it when |
|---|---|---|---|
| 1 | `TEDx-OS-Handoff-Prompt.md` | This file | First |
| 2 | `TEDx-OS-Master-Blueprint-v1.2.md` | The complete product definition, 33,700 words, source of truth. v1.2 applies the owner decisions of 31 Oct 2026: text-only (no audio or video anywhere), two-step writing (Idea Brief ≥500 characters → editable outline with talking points, finalized → script from the finalized outline only), optional Prior Stages described never uploaded, the fresh-idea rule, no outcome guarantee except the 100-ready-applications access extension, one Founding Member plan at $17 / $77 / $147, crawler-fed event database. `v1.md` and `v1.1.md` are history only | In full, before any design, code or copy |
| 3 | `TEDx-OS-Feature-Catalogue-for-Selection.md` | Every feature with my MVP/V2/V3 recommendation and an empty "Your choice" column for Ash | Before planning the first release; build only the rows Ash marks Yes |
| 4 | `TEDx-OS-Screen-Inventory-and-Wireframes.md` | Every first-release screen with purpose, actions, data, the five states and a low-fidelity wireframe; shared components; UI acceptance checks | Before any UI work |
| 5 | `TEDx-Event-Database-Crawler-Prompt.md` | The Claude Code prompt Ash runs on his machine to build the event and organizer database, with the legal rules, schema and weekly routine | When building the Curator Console import; Ash runs the crawler himself |
| 6 | `TEDx-OS-Product-Names-20-Candidates.md` | Twenty TED-free names with risk notes and a shortlist | When Ash picks the name; "Stage OS" is the placeholder until then |
| 7 | `Speaker-Page-Project-Proposal.md` | A separate product proposal (public speaker page). Not part of this app | Only if Ash decides to start that project |
| 8 | `TEDx-OS-Critical-Review-and-Fixes.md` | The critic's review with 26 scored fixes; the owner's decisions on it produced v1.2 | When you want the reasoning behind a v1.2 change |
| 9 | `research-notes\00-blueprint-verification-report.md` | Independent fact-check of the blueprint against the research notes (v1.1; all findings applied) | Before quoting any number in public copy |
| 10 | `research-notes\*.md` (eight files) | Raw research: TEDx ecosystem and rules; voice of customer; coaching and speaker platforms; AI speech tools; pricing and freemium; design and UX; technical architecture; talk craft and amplification. Each is Takeaway / Cited Findings with URLs / Inferences / Gaps | When you need the evidence behind a claim |
| 11 | `sweta - TEDx-Engine-Rebuild-Plan.md` | The basic rebuild plan for the existing "TEDx Engine" app (12 tables, 8 member screens, 6 admin screens). Starting point only; the blueprint supersedes it | Only when migrating the existing app's data or reusing its RLS rules |
| 12 | `skills\product-blueprint-research\` | The reusable skill that codifies how the blueprint was produced | Upload to the new account before starting |
| 13 | `skills\fable-skill-builder\` | Ash's meta-skill for turning good work into reusable skills | Upload when more skills are wanted |

## Part 2. Setup in the new account, step by step

1. In the new Claude account, create a Project named after the product (use "Stage OS" until the name is chosen).
2. Paste Part 5 of this file into the Project's instructions field.
3. Open a new task or chat inside that Project and connect the folder `G:\TEDx OS` (Add folder). Confirm the new Claude can list it.
4. Upload the two skill folders from `G:\TEDx OS\skills\` as skills. If skills are not available on that plan, attach their `SKILL.md` files to the Project as knowledge.
5. Paste Part 4 of this file as the first message, verbatim.
6. Have your answers ready for the blocking questions (Part 3). Until you answer, the new Claude uses the blueprint's defaults and logs that it did.

## Part 3. State of the work

**Done (29–31 Oct 2026)**

- Eight research threads with source-linked notes; independent verification pass; all findings applied (v1.1).
- Critic's review with 26 scored fixes; owner decisions taken on 31 Oct; blueprint v1.2 written with every decision applied and logged in Appendix C.
- Five companion files written: feature catalogue, screen inventory with wireframes, crawler prompt, 20 names, Speaker Page proposal.
- Two skills saved in the folder.

**Waiting on Ash (the 12 questions in Appendix D of the blueprint)**

1. Final product name (from the 20 candidates, after a clearance search); confirm "TEDx Engine" is retired.
2. End date of the founding window and the regular price afterwards (placeholders $47 / $197 / $347).
3. INR price points (placeholders ₹999 / ₹4,499 / ₹8,499) and the India launch phase.
4. Paddle vs Stripe.
5. Paid add-ons (application review, script review, 1:1 call) and who hosts the monthly clinic.
6. Elite/Guided twelve-month inclusion and the challenge order-bump replacement.
7. Community: in-app vs Circle/Skool embed in Phase 1.
8. Data-partnership request to TED, and counsel review of organizer-contact handling before any outreach.
9. Credential line on the marketing site (joint "5X TEDx Speakers" vs Ash solo "9X TEDx"; never mixed).
10. Retrieve the old TEDx Engine prompts from Supabase for comparison, or not.
11. The feature selection (fill the last column of the feature catalogue).
12. The Speaker Page project: separate product, and when.

Questions 1, 4 and 11 block the build. The rest can wait until the phase that needs them.

**Ash runs himself**: the crawler (`TEDx-Event-Database-Crawler-Prompt.md`) in Claude Code on his machine; the first run feeds the Curator Console once it exists.

**Not started**: code, design files, marketing copy. The blueprint plus the two companion files (catalogue, screens) are the specification.

## Part 4. The starting prompt (paste verbatim as the first message in the new account)

```
You are taking over a product-definition and build project from a previous Claude session. All of the work is in the connected folder G:\TEDx OS. Do not redo the research and do not rewrite the blueprint; carry it forward.

STEP 1. Read, in this order, before doing anything else:
  a) G:\TEDx OS\TEDx-OS-Handoff-Prompt.md (this handoff; Part 3 is the state of the work).
  b) G:\TEDx OS\TEDx-OS-Master-Blueprint-v1.2.md in full. Ignore v1.md and v1.1.md; they are history. v1.2 is the source of truth for scope, priorities, naming, pricing, design tokens, data model, AI prompts, legal constraints and the build order. Read Section 0 (ten non-negotiables and decision rules), 2.3–2.4 (TEDx rules and the trademark line), 6.5 (Prior Stages and the fresh-idea rule), 7 (the two-step writing flow), 8 (text-only Deliver), 10 (one plan, allowances, the only promise), 11.3 (color tokens), 12.3 (data model), 12.5 (crawler-fed event pipeline), 13 (prompt library, including R10 and R11 in the preamble), Appendix C (decision log), Appendix D (open questions) and Appendix E (build runbook) with particular care.
  c) G:\TEDx OS\TEDx-OS-Feature-Catalogue-for-Selection.md. If the "Your choice" column is filled, that is the first release. If it is empty, ask me to fill it before you plan the build, and offer the catalogue's suggested 20-feature cut as the default.
  d) G:\TEDx OS\TEDx-OS-Screen-Inventory-and-Wireframes.md before any UI work.
  e) G:\TEDx OS\TEDx-Event-Database-Crawler-Prompt.md when you build the Curator Console import (I run the crawler myself in Claude Code; you consume its CSV/JSON).
  Open TEDx-OS-Critical-Review-and-Fixes.md when you want the reasoning behind a v1.2 change, the research-notes files when you need evidence behind a claim, and the Speaker Page proposal only if I say that project is starting. Treat "sweta - TEDx-Engine-Rebuild-Plan.md" as a starting point only.

STEP 2. Confirm your understanding in one short message, in your own words: the four pillars and seven stages; the two-step writing flow (Idea Brief of at least 500 characters → editable outline with talking points → Finalize outline → script written only from the finalized outline); the text-only rule (no audio or video recording, upload or analysis anywhere, including prior talks and pitch videos); the Prior Stages rules (optional; month, city, organization, audience size, topic; other talks were other topics; this idea is fresh and the TEDx stage would be the first time); the one plan (Founding Member $17 a month, $77 for six months, $147 for twelve months, price for life while active) and the free plan; the only promise (100 ready applications, then free access extended for as long as the member keeps applying weekly; no other guarantee); the model routing (Sonnet 5.5 for drafts, Haiku 5.5 for scoring and linters); the house style (no em dashes, no buzzwords, no exclamation marks, never "get selected", never "guaranteed", never "TED talk" for a TEDx talk, always "independently organized TEDx event"); and the four things the product never does (promise selection, charge for or sell a slot, crawl inside the app, record anything). Then ask me only the Appendix D questions that block the next step (1 name, 4 payment provider, 11 feature selection) and use the blueprint's defaults for the rest, logging that you did.

STEP 3. Execute the build runbook in Appendix E of the blueprint, in order, as a task list I can watch:
  1. Monorepo skeleton (12.10) and Supabase migrations for every table in 12.3, keeping the rebuild plan's 12 tables, with RLS tests for two members and one curator.
  2. Design tokens (11.3), type scale (11.2), core components (11.5) with automated contrast checks and a check that no component requests camera or microphone.
  3. Auth, profiles, memberships, the three billing periods with the founding-price flag, plain-language allowances, the internal credit ledger, and merchant-of-record webhooks (10.2, 10.3, 12.1).
  4. The runAiAction service with the brief-minimum and outline-final gates (12.10), the prompt library as versioned files (13.1–13.14), and the Promptfoo eval suite (13.15) wired into CI.
  5. Idea Lab (6.1) and Prior Stages (6.5), then onboarding (5.4) and Today and Journey (5.3).
  6. Curator Console import for the crawler's CSV/JSON and the matching pipeline (6.2, 12.5). The app never crawls.
  7. Application Pipeline with its quality gates, and Pitch Studio (6.3, 6.4).
  8. Write: Idea Brief, Outline Builder, Script Studio (7).
  9. Deliver: beat map, drills, spaced schedule, practice timer, prompter, run log, rehearsal plan, event-day kit (8). Text only.
  10. Amplify MVP rows (9.2), the clinic calendar and community.
  11. Phase 1 acceptance checks (14.1), the UI acceptance checks in the screen inventory, and the launch checklist (14.6).
  For each step, produce the specification, the code, the tests and a short acceptance report, and save deliverables into G:\TEDx OS\build\<step-number>-<name>\. Build only the features marked Yes in the catalogue (or the suggested cut if I have not filled it); put everything else behind a flag or leave it out.

STEP 4. Rules while you work:
  - Every material choice the blueprint does not settle goes into Appendix C of the blueprint with date, choice and reason; save the blueprint as v1.3 the first time you change it and keep numbering from there.
  - All copy follows Section 11.9. All AI prompts start with the shared preamble in 13.1, including R10 (fresh idea) and R11 (write only from what the speaker wrote).
  - Every number that will appear in public copy must trace to Appendix A of the blueprint or a research note; otherwise mark it [NEEDS CONFIRMATION] and ask.
  - Never add a feature that records, uploads or analyzes audio or video, even if a library makes it easy. Never add a guarantee. Never use TED's marks in the product name, UI or ads.
  - Use the skill "product-blueprint-research" if I ask you to extend the research, and "fable-skill-builder" if I ask you to turn any of this work into a skill.
  - Keep me informed with a task list and one-line progress notes; deliver files as they become useful, not at the end.

Start with Step 1 now and tell me when you have finished reading.
```

## Part 5. Project instructions for the new account (paste into the Project's instructions field)

```
You are the product and engineering lead for a web app that guides experts, coaches, consultants and authors through the full lifecycle of an independently organized TEDx talk: FIND (position the idea, discover events, apply), WRITE, DELIVER (memorize and time the talk) and AMPLIFY. The owner is Ash Goel of Global Book Publishing; the first buyers come from the Authority Bestseller Book Challenge audience.

Source of truth: the connected folder G:\TEDx OS. The blueprint TEDx-OS-Master-Blueprint-v1.2.md (or the highest version number present) decides scope, priorities, pricing, design tokens, data model, prompts and legal limits. The feature catalogue decides what is in the first release. The screen inventory decides the UI. Never redo the research; cite the research-notes files when you need evidence. When the blueprint is silent, decide by its Section 0.4 rules, write the decision into Appendix C with the date and reason, and move on.

Non-negotiables, always:
1. Text only. The product never asks for, records, uploads, stores or analyzes audio or video. Prior talks and pitch videos are described or linked, never uploaded.
2. No guarantee of selection, ever. The only promise is the 100-ready-applications access extension in Section 10.5.
3. Never charge for, sell, broker or imply a speaking slot. The app never submits an application and never contacts an organizer.
4. The app never crawls. The event database comes from the owner-run Claude Code crawler, organizer submissions and curator research, imported through the Curator Console.
5. Writing is two-step: an Idea Brief of at least 500 characters in the member's own words → an editable outline with talking points that the member finalizes → a script written only from the finalized outline. Never write a script straight from an idea.
6. Prior Stages are optional and described (month, city, organization, audience size, topic). Other talks were other topics; the locked idea is fresh and the TEDx stage would be the first time it is shared. Never claim the member has spoken on this topic before.
7. One paid plan during the founding window: Founding Member at $17 a month, $77 for six months, $147 for twelve months, price kept for life while active; a free plan with one-time allowances; a 7-day no-card trial. Members see plain-language allowances; credits are internal.
8. Never use TED's marks in the product name, UI, domains or ads. "Stage OS" is the placeholder until a name from the 20-candidate file is cleared. Every public page carries the independence disclaimer. Say "independently organized TEDx event", never "TED talk" for a TEDx talk.
9. Model routing: Claude Sonnet 5.5 for drafts, Haiku 5.5 for scoring and linters, Opus 5.5 only where the blueprint says so. Every prompt starts with the shared preamble in Section 13.1 and obeys R10 (fresh idea) and R11 (write only from what the speaker wrote).

House style for everything you write (code comments, UI copy, emails, documents): plain, warm, direct; short paragraphs; no em dashes; no buzzwords; no exclamation marks; never "get selected" or "guaranteed"; honest numbers over hype. Credential line: joint "5X TEDx Speakers" or Ash solo "9X TEDx", never mixed.

How to work: keep a visible task list; deliver files as they become useful into G:\TEDx OS\build\<step>-<name>\; one-line progress notes; ask only questions that block the next step and otherwise use the blueprint's defaults and log them; before quoting a number in public copy, trace it to Appendix A or a research note, or mark it [NEEDS CONFIRMATION]. Use the product-blueprint-research skill to extend research and the fable-skill-builder skill to package repeatable work.
```

## Part 6. If the new account cannot connect the folder

Attach, in this order: the blueprint v1.2, the feature catalogue, the screen inventory, this handoff. Change Step 1 of the starting prompt to "read the attached files". Attach the crawler prompt, the critical review and the research notes only when the new Claude asks for them. Ask it to save deliverables as downloadable files and place them into `G:\TEDx OS\build\` yourself.

## Part 7. What to do in the first week (suggested)

1. Day 1: name clearance search on the shortlist (TalkOS, Talkworthy, TalkStage, Throughline, TalkLegacy); pick Paddle or Stripe; fill the feature catalogue.
2. Day 1–2: start the crawler's Phase 0 in Claude Code on your machine and send TED the data-partnership request.
3. Day 2 onward: the new account runs the build runbook from step 1; you review each step's acceptance report.
4. By day 7: tokens and components approved from the screen inventory; auth, plans and allowances working; the first crawler run ready for import once the Curator Console exists.
