# Step 5: Idea Lab, Prior Stages, onboarding, Today and Journey

Runbook step 5 of Appendix E (blueprint v1.10). Built 1 November 2026. Sections: 5.3 Today, 5.4 Onboarding, 5.7 Progress mechanics, 6.1 Idea Lab, 6.5 Prior Stages. Screens S1.1 to S1.5, S2.1, S2.2, S3.1 to S3.3, S3.9.

Everything here is text. No screen asks for, records or uploads audio or video. The Prior Stages module has no upload control; a public link is a typed URL and nothing else.

## 1. What was built

| Area | Files | What it does |
|---|---|---|
| Database | `app/packages/db/supabase/migrations/0009_journey_and_lock.sql` | `week_commitments`, `milestones`, `activity_log` with RLS; `lock_idea()`, `unlock_idea()`, `idea_lock_check()`; `prior_stage_overlap()`, `topic_overlap()`, `content_words()`; `log_activity()`, `set_week_paused()`, `set_week_target()`, `award_milestone()` (not callable by members), `record_activity()` (internal), `beat_summary()`, `dossier_char_count()`, `week_start_of()` |
| Database tests | `app/packages/db/tests/rls_and_gates.sql` (step5 block) | 29 new checks; 113 in total, all green |
| Recommender and Journey | `app/apps/web/lib/journey/recommender.ts` | `nextBestAction()` (one action, minutes, a factual reason, one alternative), `computeJourney()` (seven stage states and notes), `weekMessage()`, `defaultWeekTarget()` |
| Idea rules | `app/apps/web/lib/find/ideaRules.ts` | The nine-criterion rubric with quoted standards, `lockCheck()` mirror of the database gate, `topicOverlap()` mirror of the fresh-idea check, `framingViolations()` sentence check for R10 |
| Interview | `app/apps/web/lib/find/interview.ts` | Eight prompts with minimums, progress, dossier rendering for the generator |
| Onboarding rules | `app/apps/web/lib/onboarding/validate.ts` | Three questions, path extras, the already-applied form |
| Prior Stages rules | `app/apps/web/lib/find/priorStages.ts` | Five described facts, result line, link validation (URL only) |
| Talk loader | `app/apps/web/lib/talks.ts` | Current Talk Record and the one-pass `loadJourneyInput()` |
| AI door for server actions | `app/apps/web/lib/ai/server.ts` | `runActionForUser()`: the same gates and ledger as the API route |
| Shell | `app/apps/web/components/AppShell.tsx`, `app/(app)/layout.tsx` | Left rail on desktop, five-item bottom tab bar on phones, section sub-navigation that scrolls sideways, skip link, 44px targets |
| Today | `app/(app)/today/page.tsx`, `actions.ts`, `components/today/WeekControls.tsx` | Next action card, week dots with pause and target, three deadlines with `DeadlineChip` (dates hidden on the free plan), pipeline counts, readiness list from Stage 4 |
| Journey | `app/(app)/journey/page.tsx` | Seven stages with "you are here", milestones with dates, applications with applied and follow-up dates, "Log one I sent" |
| Idea Lab | `app/(app)/find/idea-lab/page.tsx`, `interview/page.tsx`, `[ideaId]/page.tsx`, `actions.ts`, `components/idea-lab/*` | Spark (paste 300+ characters, steer, two-phase loading, Stop), Interview (autosave, resume, progress), batch of five with scorecards, grid with the locked idea pinned, compare two, Idea Card with every field editable as "Your words", scorecard with quoted standards and fixes, expansion, throughline builder, lock with the soft-gate reason, unlock with a reason, archive |
| Prior Stages | `app/(app)/find/prior-stages/page.tsx`, `actions.ts`, `components/prior-stages/PriorStages.tsx` | Optional log (month, year, city, organization, audience size, topic, result line, public link), live and server-side overlap warning with the two paths, strong-candidate framing and the 60-word summary (member tools) with the R10 sentence check and Copy |
| Onboarding | `app/onboarding/page.tsx`, `actions.ts`, `components/onboarding/Steps.tsx` | Pick a path, three questions (invited and published extras), spark, pick one and see three matches, track, "Already applied somewhere?" with applied date defaulting to today, follow-up, outcome and event date, expectation screen acknowledged once |
| Placeholders | `app/(app)/[...later]/page.tsx` | Screens from steps 6 to 10 say which step builds them instead of a 404 |
| Public counts | `app/api/public-counts/route.ts` | Founding seats left and open calls for the inline upgrade sheet |
| Dev preview | `app/dev/screens/page.tsx` | The step-5 screens with fixture data, used for the screenshots below |
| Unit tests | `app/apps/web/tests/step5.test.ts` | 32 tests; 63 in the web package in total |
| Guards | `app/tools/copy-lint/check.mjs` | "unlock" is now banned only as a buzzword ("unlock your potential"); the Idea Lock keeps its name |

## 2. Rules carried into code

- Idea Lock gate (13.3): criteria 1 and 4 below Level 2 cannot be locked, with or without a reason. Criteria 1, 4 or 5 below Level 3 ask for a written reason of at least 20 characters (S3.3). An unscored idea cannot be locked. The trial allows one locked idea. Locking snapshots the profile, moves the talk to Discover and awards the `idea_locked` milestone. Unlocking needs a reason, marks the pitch pack and open applications stale and is audited.
- Fresh idea (6.5 rules 4 and 5, R10): each prior stage is compared with the locked idea on save and on every page load; a score of 0.30 or more shows the warning with the two paths. Framing and summary outputs are checked sentence by sentence; a sentence that ties "this talk", "this idea" or "this topic" to delivery language without a first-time clause is reported. The blueprint's example sentence passes.
- Prior stages are optional: the page says so, nothing nags, the recommender offers "Add a prior stage (optional)" only as the alternative action, never as the next action.
- Allowances in plain words: one idea batch is one allowance unit; the batch's five scorecards count toward the scorecards fair-use cap; the Idea Lab home shows the `AllowanceMeter`; every refusal is an inline `GateNotice`, never a wall.
- Already-applied log (F1.3.9 v1.5): applied date defaults to today and cannot be in the future; follow-up, outcome and event date are optional; records never count toward the 100-ready-applications promise.
- Weeks, not days (5.3, 5.7): the week starts on Monday, pausing is one tap, a missed week shows "Fresh start", a paused week never counts as missed.
- No selection promise anywhere: a unit test scans every recommender output for "guarantee", "selected" and "chosen".

## 3. Web and mobile

Owner instruction, 1 Nov 2026: all designs web and mobile optimized. Applied as a rule for every screen from this step on (README, Appendix C):

- Phone-first layout at 390px; one column that becomes two or three at 640px and 768px.
- 16px side gutters; the rail is 240px on desktop and becomes a five-item bottom tab bar under 768px, with the safe-area inset respected.
- 44px touch targets on coarse pointers (`pointer-coarse:` variants on buttons; a global rule for selects, inputs and button-like links). Inline text links inside sentences stay at text height, which WCAG 2.5.8 allows.
- No horizontal scroll: the screenshot script reads `document.documentElement.scrollWidth` at 390px and 1280px and fails if it exceeds the viewport. Section sub-navigation scrolls sideways inside its own strip, never the page.
- Light and dark both rendered (`screens-phone.png`, `screens-phone-dark.png`, `screens-desktop.png`).

## 4. Acceptance checks

| Check (blueprint 6.1, 6.5, 5.3, 5.4; screen inventory Section 11) | Result |
|---|---|
| Generated ideas survive refresh | pass: rows in `ideas` with `batch_id`; the grid is server-rendered from the database |
| The scorecard explains every score with a quoted criterion | pass: `RubricChip` carries the quoted standard; "Why these scores" lists each reason |
| A motivational platitude scores Level 1 and cannot be locked | pass: `step5: platitude cannot be locked` (SQL) and `IDEA_GATE_FAILED` (unit) with no override |
| The questionnaire refuses answers under 120 characters with a clear message | pass: `validateAnswer` ("A little more, please: 9 of 120 characters") and the Next button opens at the minimum |
| The linter catches self-promotion phrases | carried from step 4 (110 linter fixtures); flags shown on the Idea Card as `LinterFlag` chips |
| An application with no prior stages reaches Ready | pass by design: nothing in this module gates any application; readiness is step 7 |
| Framing never ties "this talk / this idea / this topic" to a prior stage | pass: `framingViolations` unit tests; violations are shown and the draft is not marked approved |
| A log entry whose topic matches the locked idea triggers the warning | pass: `step5: same-topic prior stage triggers the warning`; adjacent topic stays under |
| No upload control exists in the Prior Stages module | pass: no-capture guard clean; the only link field is a typed URL validated with `^https?://` |
| First session produces a scored idea and three matches in under 12 minutes | pass on the path: three fields, one paste, one batch (about 2 minutes of model time), three matches; timing to be measured with real members |
| Already applied somewhere: event, applied date (today, editable), follow-up, outcome, event date | pass: `ExistingApplicationForm`, `validateExistingApplication`, `logExistingApplication` |
| Expectation screen acknowledged once per account | pass: `profiles.expectation_acknowledged_at`; the callback and onboarding both check it |
| Today: one next action with a time estimate and a reason; alternative; week dots with pause; three deadlines with ICS or countdown; pipeline; readiness | pass (ICS links arrive with the application pipeline in step 7) |
| Journey: seven stages, "you are here", milestones tied to artifacts, applications with dates | pass; milestones cannot be inserted by members (`step5: member cannot insert a milestone`) |
| Free members see "deadline in N days" without the date | pass: `DeadlineChip hidden` driven by `has_member_access` |
| RLS: members see only their own week rows, milestones and activity | pass: three SQL checks |
| Phone 390px: no horizontal scroll; targets 44px | pass: screenshot script output |
| Copy lint and no-capture guard | clean |
| Typecheck and production build | pass (`next build`, 20 routes) |

Numbers on the expectation screen (single-digit acceptance rates, 10 to 20 events over 3 to 12 months, fewer than 1% lifted to TED.com, up to 15 months) are the blueprint's Section 3.6 figures and trace to Appendix A.

## 5. Not in this step

- The Event Finder, the matching engine and the target list screen (step 6). Onboarding matches rank open verified calls by deadline with the member's country first until then.
- The Applications board and detail, ICS links, the readiness review (step 7). The Today pipeline and deadlines read the records that exist.
- "Has it been done?" against the curator title index (F1.1.4) ships with the Curator Console import of `known_talk_titles` in step 6; the Idea Card shows the scorecard's `similar_talks_to_check` phrases in the meantime.
- Friend test for the throughline (F1.1.5 "sends a one-question form to 3 contacts") needs the email layer (Resend) from the ops step; the throughline builder itself is in.
- Stage Ladder suggestions (F1.5.4) are V2.

## 6. How to run

```
# database
PGHOST=/tmp PGPORT=5499 PGUSER=postgres bash app/packages/db/scripts/local-test.sh
# web
cd app/apps/web && npx vitest run && npx tsc --noEmit && npx next build
# guards
cd app && node tools/copy-lint/check.mjs && node packages/ui/scripts/check-no-capture.mjs
```
