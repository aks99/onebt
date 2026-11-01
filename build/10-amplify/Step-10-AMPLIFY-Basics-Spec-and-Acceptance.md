# Step 10: AMPLIFY basics (publication tracker, upload pack, launch plan, copy kit, bio updater, second-talk guard)

Runbook step 10 of Appendix E (blueprint v1.15). Built 1 November 2026. Sections: 9.1, 9.2 MVP rows (F4.1, F4.2, F4.3, F4.4, F4.11, F4.12), 13.13. Screen S6.1. The clinic is not built (owner decision 1 Nov 2026) and no public copy mentions one; S6.2 and S6.3 are V2 and stay behind their flags.

Compliance is the feature. Only the official YouTube or TED link is accepted; every text the member edits is checked against the TEDx rules (no TED mix-ups, no endorsement, no logo, no re-upload, clips of 60 seconds at most, the phrase "an independently organized TEDx event") and a blocking flag refuses the save. The app never touches video; the one media reference anywhere is the link the member pastes.

## 1. What was built

| Area | Files | What it does |
|---|---|---|
| Database | `app/packages/db/supabase/migrations/0014_amplify.sql` | `talks.event_name_manual`; `is_official_talk_url()`; `set_publication()` (the seven states, official link required for published, window and organizer timeline stored on `launch_plans`, stage to Amplify, `talk_published` milestone once); `save_launch_plan()`, `set_launch_item_done()` (returns the done count, logs a launch step); `save_launch_text()` for the copy kit and the upload pack; `published_talk_count()` for the guard |
| Database tests | `app/packages/db/tests/rls_and_gates.sql` (step10 block) | 19 new checks; 216 in total, all green (steps 9 and 10 now run as the `authenticated` role so RLS is exercised too) |
| Rules | `lib/amplify/rules.ts` | Publication states with realistic copy; `isOfficialUrl`; `complianceFlags` (seven rules, blocking or advisory, plus the independence phrase check); the standard launch plan from TED's playbook (15 relative items); `nextMondayOrTuesday`, `datePlan`, `planProgress`, `dueNow`; `insertLink` (the link into every block once); `kitText`; `bioLine`; `uploadPackChecks` (three titles of 100 characters or fewer carrying the speaker and the event, 2 to 3 sentence description, 4 to 7 sentence bio, five tags); `SECOND_TALK_GUARD` copy |
| Actions | `app/(app)/amplify/actions.ts` | `setPublication` (dates a relative plan from the next Monday or Tuesday and inserts the link into the kit when the link arrives), `generateUploadPack` and `saveUploadPack`, `useStandardPlan` (no credits), `generatePlan` (5 credits), `savePlan`, `setItemDone`, `datePlanFromLaunch`, `generateCopyKit` (15 credits) and `saveCopyKit`, `updateBio` (3 credits) |
| Launch screen | `app/(app)/amplify/launch/page.tsx`, `components/amplify/Launch.tsx` | Publication tracker (state buttons with plain copy, event name, organizer timeline, window, official link with validation); Launch plan (standard or personalized, progress band, due-now count, date the plan, grouped by phase, check off, edit the wording); Copy kit (seven blocks, compliance flags, per-block Copy, Copy all, Save edits refused while a blocking flag stands); Upload pack (write, checks against the playbook, edit, Copy all); Bio updater at `#bio` (paste current texts, three rewritten texts with the exact phrasing, the bio line to copy); Second-talk guard once a talk is published |
| Unit tests | `tests/amplify.test.ts` | 10 tests; 142 in the web package in total |
| Dev preview | `app/dev/screens/page.tsx` | Launch fixture for screenshots |

## 2. Rules carried into code

- Official link only (9.1 principle 1): `youtube.com/watch`, `youtu.be`, `youtube.com/shorts` or `ted.com/talks`, over https. Anything else is refused in the browser and in the database.
- Dates count from the confirmed link (F4.1 v1.4): the standard and personalized plans stay relative ("launch day + 2") until the link is logged; then they date from the next Monday or Tuesday, and the member can pick another launch day.
- The playbook (9.1 principle 3): launch team of 20 to 50, list building, Monday or Tuesday launch, first 48 hours, weeks 1 to 8 with new angles, ongoing re-promotion; specific titles, a 2 to 3 sentence description, a 4 to 7 sentence bio, five tags.
- Phrasing: the bio line is exactly "Spoke at <event> <year>, an independently organized TEDx event."; the independence phrase check flags the first TEDx mention that lacks it.
- Honest numbers: "go viral", "millions of views" and the banned promise words are flagged; the plan never promises view counts.
- Second-talk guard (F4.12): shown once the member has a published talk; it names TED's discouragement of serial applicants and the duplicate rule, and offers only the path to a new idea.
- Text in, text out: clip plans, quote cards, press kit and stats are named as arriving after launch; the footer says any clip is cut with the member's own tools, 60 seconds at most, tagged to the event's TEDx account.
- Web and mobile: the tracker's fields stack on a phone; the plan and the kit sit side by side from 1024px and stack below; textareas are full width; no horizontal scroll at 390px.

## 3. Acceptance checks

| Check (9.2 MVP rows; S6.1) | Result |
|---|---|
| Published cannot be set without the official link; a non-official link is refused | pass: database checks `published needs the official link`, `a non-official link is refused`; `isOfficialUrl` unit test; the Save button is disabled until the link is valid |
| Awaiting upload stores the window, the organizer's timeline and the event name | pass: database check |
| Publishing sets the link, the time, the Amplify stage and the milestone, once | pass: database checks `published sets the link...` and `publishing twice awards the milestone once` |
| A window that ends before it starts is refused | pass: database check `BAD_WINDOW` |
| The standard plan is relative until the link, then dates from a Monday or Tuesday | pass: `STANDARD_PLAN` and `datePlan` unit tests (Thursday 3 Dec to Monday 7 Dec; "launch day + 1" to 8 Dec; "launch day - 14" to 23 Nov; sorted) |
| Marking an item done returns the count and logs a launch step; unmarking lowers it; a bad index is refused | pass: database checks |
| The copy kit and upload pack save as JSON; an unknown kind is refused | pass: database checks `the copy kit is saved`, `an unknown text kind is refused` |
| The compliance check blocks the TED mix-ups, endorsement, logo and re-uploads, passes clean copy, asks for the independence phrase, warns on long clips and hype | pass: `complianceFlags` unit tests |
| The link is inserted into every block once | pass: `insertLink` unit test (placeholder replaced, appended when absent, not duplicated) |
| The upload pack is checked against TED's playbook | pass: `uploadPackChecks` unit tests (count, length, speaker and event in each title, sentence counts, five tags; a correct pack returns no problems) |
| The bio line uses the exact phrasing and passes the compliance check | pass: `bioLine` unit test |
| Another member cannot set this member's publication, mark their items or read their launch plan | pass: database checks `B cannot set the publication of A talk`, `B cannot mark A launch items`, `B cannot read A launch plan` (RLS, authenticated role) |
| `published_talk_count` is 1 for the publisher and 0 for another member | pass: database checks |
| Phone and desktop render without horizontal scroll | pass: `amplify-phone.png` (390px) and `amplify-desktop.png` (1280px); `scrollWidth` equals the viewport on both |
| Copy lint, no-capture guard, type check, unit tests, build | pass: copy lint clean (the banned phrases appear in this feature only as patterns); no-capture clean; `tsc --noEmit` clean; 142 Vitest tests; `next build` lists `/amplify/launch` |

## 4. Decisions logged (Appendix C, v1.15)

Eight rows dated 2026-11-01: the official link pattern; the standard plan at no credit beside the personalized plan at 5; relative plan dates until the link, then the next Monday or Tuesday with a member override; the compliance check as the save gate for member edits (the linter already runs on generation); the upload pack checks in the browser; the bio updater keeps its output in `launch_plans.copy_kit.bio_updates`; `event_name_manual` on talks for the invited and published paths; the second-talk guard shown on Launch once a talk is published, with a new Talk Record flow deferred.

## 5. Owner items

- None new. The step-6 items stand (Google service account, Stripe, Resend and CRON secrets, trademark clearance, six and twelve month regular prices [NEEDS CONFIRMATION]).

## 6. Carried to step 11

- The Phase 1 acceptance list (14.1), the UI acceptance checks (screen inventory Section 11) and the launch checklist (14.6) are run against everything built in steps 1 to 10.
