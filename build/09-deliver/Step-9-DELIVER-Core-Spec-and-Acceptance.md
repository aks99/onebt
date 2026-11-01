# Step 9: DELIVER core (beat map, four drills, spaced schedule, practice timer)

Runbook step 9 of Appendix E (blueprint v1.14). Built 1 November 2026. Sections: 8.1 to 8.3 (F3.1 to F3.7), 8.5, 8.6, 8.8, 11.7. Screens S5.1 Memorize, S5.2 Drill, S5.3 Practice timer, plus the two printables. The prompter, run log, rehearsal plan, live-audience log, nerves kit, readiness checklist and event-day kit stay behind their flags (owner decision 1 Nov 2026); their routes show "After launch".

The app never hears or sees a rehearsal. No screen in this pillar requests a camera or a microphone, no table holds a recording, and the copy never says "you sounded". The timer keeps the time; the member keeps the words.

## 1. What was built

| Area | Files | What it does |
|---|---|---|
| Database | `app/packages/db/supabase/migrations/0013_deliver.sql` | `normalize_ws()`, `first_words()`; `build_beat_map(version, beats)` (locked version only; the beats must reproduce the script word for word; every beat starts new and due today; rebuild replaces); `update_beat()` (cue and stage note); `beat_summary()` now returns mastered, total and due; `beat_map(talk)` one query for the screen; `save_timed_run()` (duration required, prompter mode refused while its flag is off, `first_run_under_time` milestone, activity); `recent_runs()` with the pace each run implies; activity kinds `beat_map_built` and `drill_block` |
| Database tests | `app/packages/db/tests/rls_and_gates.sql` (step9 block) | 22 new checks; 197 in total, all green |
| Rules | `lib/deliver/rules.ts` | `splitBeats` (sections, paragraphs, sentences into 12 to 20 beats), `verifyBeats` (word for word, cues are openings), `nextReview` (1, 3, 7, 14; a miss resets), `coverage`, `drillQueue` (due first), `blankFill` (10, 30, 60 percent; first two words and short words kept; stable per seed), `scoreTyped` (80 percent is a got it), `chainingRounds`, `cumulative`, `beatAt`, `checkpoints` (6-minute ticks, ending points from the script's flagged sections, the slot end), `runVerdict`, `measuredWpm`, `cueCardsText`, `beatMapText` |
| Sample | `lib/deliver/sample.ts` | An original five-minute sample script so the free plan can try the drills and the timer; nothing in it is about TED |
| Actions | `app/(app)/deliver/actions.ts` | `buildBeatMap` (Haiku `beat_map`, verified; deterministic split as the fallback; saved through `build_beat_map`), `updateBeat`, `drillResult` (`record_drill_result`), `logDrillBlock`, `saveRun` (`save_timed_run`, returns the measured pace), `setTargetWpm` (110 to 190) |
| Memorize | `app/(app)/deliver/memorize/page.tsx`, `components/deliver/Memorize.tsx`, `lib/deliver/load.ts` | Header with version, beats, mastered and due today; coverage band with the 95 percent aim; the four drills; beat rows (first three words in Newsreader, purpose, budget, four-step mastery dots, due date, cue and stage-note editor); Build or Rebuild (with a confirmation); print links; the lock message with a link to the sample |
| Drill | `app/(app)/deliver/drill/[kind]/page.tsx`, `components/deliver/DrillRunner.tsx`, `SampleDrill.tsx`, UI `DrillCard` | One card per beat, two large targets, G and M keys, Reveal, Skip, End; read-cover-recite (show, cover, mark), cue cards (first three words, reveal), blank-fill (level per run, typed mode scored, spoken mode self-marked), bottom-up chaining (last beat first, previous beat added each round); the summary lists the beats moved up or down and their next review date; a finished drill logs one practice block |
| Practice timer | `app/(app)/deliver/timer/page.tsx`, `components/deliver/TimerScreen.tsx`, UI `PracticeTimer` | Count-up and count-down, full-screen with one escape key, Geist Mono digits, 6-minute ticks with the beat under each, ending-point markers, the beat you should be on, space to pause, quiet pulse that respects reduced motion; Finish saves the duration, the beat reached and the locked version; the verdict as a band; recent runs as bands with the pace each implies; target pace editor; the measured pace once it exists |
| Printables | `app/(app)/deliver/print/[what]/page.tsx` | Beat map and cue cards through the browser's print dialog, black on white, 12pt minimum; the cue cards carry only the first three words and the stage note |
| Journey | `lib/talks.ts`, `lib/journey/recommender.ts` | `beatsDue` flows from `beat_summary`; Today recommends "Drill N beats due today" before general drilling |
| Free plan | `components/deliver/sample-progress.ts` | Sample progress is a per-browser convenience in local storage, wrapped in try/catch; sample runs are not saved |
| Unit tests | `tests/deliver.test.ts` | 12 tests; 132 in the web package in total |
| Dev preview | `app/dev/screens/page.tsx` | Memorize and Practice timer fixtures for screenshots |

## 2. Rules carried into code

- Beat map only from the locked version (gate `script_locked` in `runAiAction`, `SCRIPT_NOT_LOCKED` in the database). The model's split is verified word for word in the browser and again in `build_beat_map`; if the model's beats fail, the deterministic split is saved and the member is told.
- Retrieval beats re-reading (8.1): every drill hides the text before the member marks it; read-cover-recite covers, cue cards and chaining show three words, blank-fill removes words.
- Spaced schedule (F3.6): new, learning, known, cold; 1, 3, 7, 14 days; a miss resets to tomorrow; coverage is beats known or cold over total, shown as a band with the 95 percent aim, never as a score (8.5).
- Timing is a skill (8.1 principle 5): the timer defaults to count-up until a run exists, then count-down with checkpoints and the two ending points.
- Measured pace (F2.17): the trigger from step 3 recomputes `talks.measured_wpm` after three timer runs; the timer and the Script Studio pace line label which assumption they used.
- Feedback rules (8.5): the run list leads with the member's runs as bands; no composite score; no leaderboard; the product never comments on voice or body.
- Text only (11.7): the full-screen timer and the drill cards request nothing from the device; the no-capture guard passes.
- Web and mobile: beat rows wrap on a phone (cue on one line, mastery and due date beneath), drill targets are 56px tall and 44px on coarse pointers, the timer fills the screen at 390px without horizontal scroll.

## 3. Acceptance checks

| Check (8.8; S5.1 to S5.3) | Result |
|---|---|
| The beat map splits a seeded 10-minute script into 12 to 20 beats with correct first words | pass: `splitBeats` unit test (range, first words, order, reproduces the text); the sample script also lands in range |
| Beats that change, drop or reorder a word are refused | pass: `verifyBeats` unit tests; database check `beats that change a word are refused` (`BEATS_MISMATCH`) |
| Only the locked version can have a beat map | pass: database check `an unlocked version cannot have a beat map`; `runAiAction` gate `script_locked` |
| Empty cues fall back to the first three words | pass: database check |
| A missed beat in read-cover-recite moves its next review to tomorrow | pass: `nextReview` unit test; database check `a missed beat is due tomorrow and learning` |
| A hit expands the interval 1, 3, 7, 14 and the state follows | pass: `nextReview` unit test; database check `a hit beat moves to a 3-day interval` |
| The spaced schedule surfaces due beats on Today | pass: `beat_summary` returns `due` (database checks 3 due, then 1 after two drills); recommender returns "Drill N beats due today" |
| The practice timer shows the right beat at the 6-minute checkpoint for a seeded script | pass: `beatAt(360)` is beat 10 for fifteen 40-second beats; `checkpoints` unit test; ending markers from the script's flagged sections |
| The run log refuses to save without a duration | pass: `saveRun` returns `RUN_NEEDS_DURATION`; database check `a run without a duration is refused`; Finish is disabled before the first second |
| Three timer runs set the measured pace; each saved run recomputes it | pass: database checks (145 before, 146 after one run, 147 after three); `measuredWpm` unit test |
| The under-time milestone is awarded once | pass: database check |
| The prompter mode stays dark behind its flag | pass: database check `FEATURE_OFF` |
| Another member cannot build, see or save on this member's talk | pass: database checks `B cannot build a beat map on A version`, `B sees no beats of A talk`, `B cannot save a run on A talk` |
| Blank-fill removes about the asked share, keeps the opening, scores typed answers at 80 percent | pass: `blankFill` and `scoreTyped` unit tests |
| Chaining starts at the last beat and adds the previous one each round | pass: `chainingRounds` unit test |
| Cue cards show only the first three words and the stage note | pass: `cueCardsText` unit test; the print page |
| The readiness checklist cannot be completed without 4 logged live audiences | deferred with F3.16 and F3.11 (flags `readiness_checklist`, `live_audience_log`) |
| No screen in this pillar contains a microphone or camera permission request | pass: no-capture guard clean; no `getUserMedia`, `MediaRecorder` or media columns anywhere |
| Phone and desktop render without horizontal scroll | pass: `deliver-phone.png` (390px) and `deliver-desktop.png` (1280px); `scrollWidth` equals the viewport on both |
| Copy lint, type check, unit tests, build | pass: copy lint clean; `tsc --noEmit` clean; 132 Vitest tests; `next build` lists `/deliver/memorize`, `/deliver/drill/[kind]`, `/deliver/timer`, `/deliver/print/[what]` |

## 4. Decisions logged (Appendix C, v1.14)

Nine rows dated 2026-11-01: word-for-word verification with a deterministic fallback; rebuild replaces beats and progress after a confirmation; the free plan's sample script and browser-only progress; blank-fill levels per run and the 80 percent typed threshold; the drill queue and the `drill_block` activity; count-up and count-down both saved as `timer`, prompter refused while dark, the under-time milestone; `beat_summary` due count and the Today recommendation; printables as print-styled pages; target pace editable on the timer screen.

## 5. Owner items

- None new. The step-6 items stand (Google service account, Stripe, Resend and CRON secrets, trademark clearance, six and twelve month regular prices [NEEDS CONFIRMATION]).

## 6. Carried to step 10

- `first_run_under_time` and `script_locked` milestones feed the Amplify launch plan's starting state.
- The deferred DELIVER screens have their tables (`runs`, `rehearsal_plans`, `live_audience_logs`) and flags ready; the prompter text export from step 8 is the source for the prompter when its flag opens.
