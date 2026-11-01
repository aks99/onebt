# Step 7: Application Pipeline and Pitch Studio

Runbook step 7 of Appendix E (blueprint v1.12). Built 1 November 2026. Sections: 6.3 Application Pipeline (F1.3.1 to F1.3.7, F1.3.9, F1.3.12, F1.3.13, F1.3.14, F1.3.15), 6.4 Pitch Studio (F1.4.1, F1.4.2, F1.4.4), 13.4 to 13.6. Screens S3.6, S3.7, S3.8.

The product never submits an application and never contacts an organizer. There is no network call to any organizer domain in this code; the member opens the organizer's form in a new tab, copies each answer across and presses their submit button, then marks the application as applied here.

## 1. What was built

| Area | Files | What it does |
|---|---|---|
| Database | `app/packages/db/supabase/migrations/0011_pipeline_pitch.sql` | `applications`: `ai_originals`, `follow_up_draft`, `decision_date`, `no_enquiries`, `feedback_requested_at`, `readiness_checked_at`, `research_completed_at`; `research_complete()` and its trigger; milestones and talk hand-off on applied and accepted; `follow_up_allowed()`; `mark_follow_ups_due()`; `pitch_packs.ai_fields` and `pitch_kit`; `next_pitch_pack_version()`; `ready_applications_detail()` |
| Database tests | `app/packages/db/tests/rls_and_gates.sql` (step7 block) | 17 new checks; 159 in total, all green |
| Rules | `lib/pipeline/rules.ts` | Application rubric with quoted standards, the Ready gate, status moves with the five-draft cap, follow-up restraint mirror, follow-up and feedback templates, authorship meter and note, CSV, research questions |
| Form Mapper | `lib/pipeline/formMapper.ts` | Curator fields or eight defaults; routing by key and label; trim and count against limits |
| Pipeline actions | `app/(app)/find/applications/actions.ts` | Research, prefill from the pack, save an answer (authorship recomputed), personalize (allowance, research gate, organizer AI policy via `runAiAction`), accept a personalized field, Readiness Review, status moves with confirmations, dates, follow-up draft and sent, outcome with feedback draft and re-apply, authorship note, park |
| Board | `app/(app)/find/applications/page.tsx`, `components/pipeline/Board.tsx`, `LogExisting.tsx` | Columns with move buttons (no drag needed), deadline days, readiness level, applied and follow-up dates, "counts" marker, the 100 counter, the five-draft notice, "log an application I sent", CSV link |
| Detail | `app/(app)/find/applications/[appId]/page.tsx`, `components/pipeline/ApplicationDetail.tsx` | Step 1 research, Step 2 fields with AI, your words and AI-assisted labels, limits, personalization diff per field, Step 3 submit assist with copy buttons and the applied confirmation; right panel: readiness chips with quoted standards, organizer's eyes, linter flags with one-click fix, rewrites, dates, follow-up with the reason it is or is not allowed, outcome form, authorship note, text export |
| Pitch Studio | `app/(app)/find/pitch/page.tsx`, `actions.ts`, `components/pipeline/PitchStudio.tsx` | Generate from the locked idea (expansion, profile, Prior Stages, writing sample), ten editable blocks, word counts, Copy, Reset to AI version, claims needing a source, the text-only pitch video kit (length, script with three beats, read-along pacer, shot checklist, typed self-review, pasted link) |
| Local connection | `lib/catalogue/load.ts`, Event Finder | "Near you" filter: city, hometown, places lived, alma mater |
| Exports | `app/api/export/pipeline.csv/route.ts`, `app/api/export/application/[appId]/route.ts` | Pipeline CSV; one record as plain text with the authorship note |
| Unit tests | `tests/pipeline.test.ts` | 18 tests; 105 in the web package in total |

## 2. Rules carried into code

- One application per member per event per cycle (unique index); tracking twice opens the existing record.
- Quality gates (6.3): at most five in Drafting or Ready (database trigger and UI message "Finish or park one of your 5 drafts first"); personalization only after the research step; Ready only when the review passes Level 3 on idea statement, why you and compliance with no blocking flag; "applied anyway" after a confirmation never counts toward the 100.
- Organizer AI policy (v1.4): where `ai_policy = prohibited`, the drafting controls are hidden inside that application and `runAiAction` refuses personalization; scoring, the linter and the completeness check stay on.
- Follow-up restraint (F1.3.7 v1.4): one follow-up, not before 14 days, never before a stated decision date, never where the page says not to enquire, public forms only; the draft is a template status enquiry.
- Dated applications (v1.5): applied date defaults to today and is editable; follow-up defaults to 14 days later; outcomes carry a date; acceptance copies the event and date to the talk.
- Authorship (F1.3.15): per-field typed versus kept characters, "Your words: N%" in the header, a note for organizers.
- Text only: the pitch video is filmed on the member's device; the kit stores a length, ticks, typed answers and an optional pasted link validated as a URL.

## 3. Acceptance checks

| Check (6.3 and 6.4 acceptance checks; S3.6 to S3.8) | Result |
|---|---|
| Tracking an event creates exactly one application; a second click opens it | pass: unique index (`step7: one application per event per cycle`); EventCard shows "Tracked: open application" |
| Readiness refuses "Ready" when the one-sentence idea is a topic | pass: `readiness gate` unit tests (criterion 1 at Level 1 fails) and `NOT_READY` trigger |
| The linter catches self-promotion phrases | carried from step 4 (110 fixtures); flags shown with one-click fix in the readiness panel |
| A sixth concurrent draft is refused with a clear message | pass: `canMove` unit test; `DRAFT_LIMIT_REACHED` trigger; board notice |
| Personalization is unavailable until the Researching step is complete | pass: button disabled until three answers of 20 characters; `research_step_complete` gate in `runAiAction`; `step7: short research answers do not complete the step` |
| Follow-up reminders stop when status moves past Applied | pass: `follow_up_allowed` returns NOT_APPLIED for other statuses; `mark_follow_ups_due` only touches applied rows |
| The Submit assist never performs a network request to an organizer's domain | pass by construction: the form link is a plain anchor with `target=_blank`; no fetch to organizer URLs anywhere in `app/` |
| Follow-up rules: once, not before the decision date, not where told not to, public form only | pass: five SQL checks and six unit tests |
| First application sent and acceptance are milestones; acceptance moves the talk to Write with the event | pass: three SQL checks |
| An application sent without readiness never counts toward 100 | pass: `step7: an application sent without readiness does not count toward 100` |
| Pitch pack versions increment; edits are the member's words; reset to AI version | pass: SQL version checks; `resetPackField` reads `ai_fields` |
| Form Mapper routes fields and trims to limits | pass: 9 routing assertions and trim tests |
| Authorship meter: typed versus kept | pass: three unit tests |
| Phone 390px: no horizontal scroll | pass (`pipeline-phone.png`, `pipeline-desktop.png`) |
| Copy lint and no-capture guard | clean |
| Typecheck, unit tests, production build | pass (105 tests; 31 routes) |

## 4. Not in this step

- PDF and DOCX exports (F1.3.12, F2.11) share one exporter built in step 8 with the script exports.
- Interview and audition prep (F1.3.8), cohort stats (F1.3.10), human review (F1.3.11) are Keep or V2.
- Organizer research card (F1.4.3) is V2; the one-sheet PDF (F1.4.5) is Keep.
- The weekly plan email and the re-apply reminder email join the reminders job in the ops step; the dates are stored now.

## 5. How to run

```
PGHOST=/tmp PGPORT=5499 PGUSER=postgres bash app/packages/db/scripts/local-test.sh
cd app/apps/web && npx vitest run && npx tsc --noEmit && npx next build
cd app && node tools/copy-lint/check.mjs && node packages/ui/scripts/check-no-capture.mjs
```
