# Step 8: WRITE (Idea Brief, Outline Builder, Script Studio, Fact-check)

Runbook step 8 of Appendix E (blueprint v1.13). Built 1 November 2026. Sections: 7.1 to 7.7 (F2.0 to F2.17), 13.8 to 13.15. Screens S4.1 to S4.6.

Writing is two-step and stays two-step in code. The outline is written only from a saved Idea Brief of 500 or more characters in the member's own words. The script is written only from the finalized outline, one section at a time, and every talking point is either covered or listed as uncovered with a reason. There is no path from an idea to a script. The product never records or analyzes audio or video; pace and length are estimated from word counts and, once the member has typed practice durations in step 9, from their measured pace.

## 1. What was built

| Area | Files | What it does |
|---|---|---|
| Database | `app/packages/db/supabase/migrations/0012_write.sql` | `scripts.lock_override_reason`, `scripts.unlocked_at`; `script_versions.readability`, `script_versions.quirks`; `finalize_outline()` (one final per outline, talk to Write, milestone `outline_finalized`); `reopen_outline()`; `script_lock_check()`; `lock_script()` (talk to Rehearse, milestone `script_locked`, audit row); `unlock_script()` (reason of 10+ characters); `script_versions_post_lock` trigger (post-lock flag, automatic version numbers); `next_outline_version()`, `next_script_version()` |
| Database tests | `app/packages/db/tests/rls_and_gates.sql` (step8 block) | 16 new checks; 175 in total, all green |
| Prompt library | `app/packages/prompts/actions/script_rubric/{v1.md,schema.json}`, `registry.json`, `scripts/write-actions.py` | New `script_rubric` action (Haiku 5.5, 5 credits, readiness fair-use pool): 11 criteria scored 1 to 4 with a quoted reason, lock gate verdict, quirks with quotes, strongest and weakest line, one next step; 25 actions, all checks pass |
| Rules | `lib/write/rules.ts` | Brief prompts and the 500-character rule; word budget (130 to 160 words a minute, target at 92 percent of the slot); five structure templates with sources and time shares; outline and script document types; coverage; story consent problems; syllables, Flesch-Kincaid grade, jargon with plain alternatives, ten quirk patterns; the 11-criterion rubric and the lock gate (1, 3, 9, 11 at Level 3 or a 20-character override); pace line; cut percent; prompter text; fact-check sheet text; numbers in a text |
| Exporters | `lib/write/exporters.ts` | Speaker PDF (16-point body, section headers, cue times, ending points), outline PDF, annotated fact-check PDF, script DOCX, application record PDF and DOCX, all with pdf-lib and docx (no binaries) |
| Actions | `app/(app)/write/actions.ts` | `saveBrief` (autosave draft, save under the rule), `briefCompleteness`, `setTalkLength`, `setStructure`, `generateOutline` (allowance and gates through `runAiAction`), `saveOutline` (new user version), `finalizeOutline`, `reopenOutline`, `startScript`, `writeNextSection` (one section per call, full outline in context), `saveScriptEdit`, `restoreVersion`, `runPass` (eight passes, each a new llm version with notes and removed text), `scoreScript`, `lockScript`, `unlockScript`, `setScriptDeadline`, `runFactcheck`, `updateClaim`, `jargonReport` |
| Idea Brief | `app/(app)/write/brief/page.tsx`, `components/write/BriefForm.tsx` | Seven prompts in the member's words, live character count against 500, autosave every few seconds, Save, the completeness check (what the outline will still need), talk length and structure picker with the word budget |
| Outline Builder | `app/(app)/write/outline/page.tsx`, `components/write/OutlineEditor.tsx` | Build from the brief, every line editable in place, reorder, add or delete sections and points, running time total against the slot, ending points planned, story consent chips (named with permission, pseudonymized, composite), Save edits, Finalize, Reopen, version list |
| Script Studio | `app/(app)/write/script/page.tsx`, `components/write/ScriptStudio.tsx` | Start from the final outline, section-by-section writing with the current section named, coverage panel (covered, uncovered with reason, missing), editable text per section, the pace line with the assumption labelled, cut-to-target percent, eight editing passes, Score the script (rubric chips with quoted standards, strongest and weakest line, next step), Script Lock with override, Unlock with reason, reading level, jargon list, quirk list, versions with restore, exports, deadline |
| Fact-check Flagger | `app/(app)/write/factcheck/page.tsx`, `components/write/FactcheckPanel.tsx` | Claims extracted from the current version with risk, type and R5 or overclaim flags; statuses (needs a source, sourced, softened, removed, personal experience); source URL and note per claim; re-run keeps member statuses by text match; annotated PDF and text sheet |
| Exports | `app/api/export/script/[file]/route.ts`, `outline/[file]`, `factcheck/[file]`, `application/[appId]` | `script.pdf`, `script.docx`, `prompter.txt`, `outline.pdf`, `factcheck.pdf`, `factcheck.txt`; the application record now also as PDF and DOCX |
| Unit tests | `tests/write.test.ts` | 15 tests; 120 in the web package in total |
| Dev preview | `app/dev/screens/page.tsx` | Outline Builder and Script Studio fixtures for screenshots |

## 2. Rules carried into code

- Two-step writing (non-negotiable 5): `generateOutline` refuses without a saved brief (`BRIEF_TOO_SHORT`), `startScript` and `writeNextSection` refuse without a final outline (`OUTLINE_NOT_FINAL`). The script prompt receives the outline and the brief, never the idea alone.
- R10 and R11: every prompt starts with the shared preamble; the script is written only from what the member wrote in the brief and finalized in the outline. Points the member marked "to find" are left as bracketed placeholders, never invented.
- Fresh idea (non-negotiable 6): Prior Stages are not in the writing context at all.
- Word budget (F2.1): 130 to 160 words a minute; the target is 92 percent of the slot so the talk lands with a buffer; the pace line always says which assumption it used ("assumed 150 words a minute" until step 9 supplies a measured pace).
- Story consent (F2.15): a story point without a consent chip blocks Finalize.
- Versions (7.1 principle 4): nothing is rewritten in place. Member edits are user versions, passes and regenerations are llm versions with the pass key, notes and removed text; "go back" copies an earlier version forward so history survives.
- Script Lock (7.4): Level 3 on structure, one idea, ending and compliance, or a written override of 20 or more characters that is logged; unlocking needs a reason and every later version is flagged post-lock by a trigger; locking moves the talk to Rehearse and awards the milestone.
- Quirks (F2.9): TED's list as patterns (meta-talk, apology, summary ending, pitch, overstatement, pun, rhetorical pile-up, thanks opening, jargon run, slide reference). Found in the browser without credits; the rubric quotes them too.
- Text only: the prompter export is plain text for the member's own device; nothing is recorded.
- Allowances: outlines, scripts, passes and rubric runs count against the plan allowances in `runAiAction`; the free plan's one-time outline and the trial limits are enforced there, and the inline Gate sheet opens on `ALLOWANCE_EXHAUSTED` and `TRIAL_LIMIT`.

## 3. Acceptance checks

| Check (7.7 acceptance; S4.1 to S4.6) | Result |
|---|---|
| A brief of 499 characters cannot be saved; 500 can | pass: `briefSavable` unit test; `saveBrief` returns `BRIEF_TOO_SHORT`; the form shows the count live |
| The outline cannot be built without a saved brief | pass: action guard and the Outline Builder notice with a link to the brief |
| A 10-minute talk shows a 1,300 to 1,600 word budget; 18 minutes shows 2,340 to 2,880 | pass: `wordBudget` unit test |
| Every template's time shares sum to one and cite a source | pass: `TEMPLATES` unit test |
| Finalize refuses while a story point has no consent chip | pass: `storyConsentProblems` unit test; the Finalize button is disabled with the explanation |
| Only one final version per outline; finalizing moves the earlier final to draft | pass: `step8: finalize makes exactly one final version` database check |
| The script cannot be started without a final outline | pass: `OUTLINE_NOT_FINAL` in `startScript`; `step8: a new script needs a final outline again` database check |
| Every talking point in the outline is covered or listed as uncovered with a reason | pass: `coverage` unit test (covered, uncovered, missing) and the coverage panel |
| The pace line labels its assumption and shows the overrun | pass: `paceLine` unit test ("assumed 150 words a minute, 11:40, 1:40 over the 10-minute slot") |
| Cut to target gives the right percent | pass: `cutPercent` unit test (1,750 words in a 10-minute slot: 21 percent) |
| The quirk detector catches meta-talk, apology, summary ending, pitch, overstatement and pun, and is silent on clean text | pass: `quirks` unit test |
| Jargon is listed with a plain alternative | pass: `jargon` unit test ("leverage" to "use") |
| Reading grade is computed from syllables and sentences | pass: `readability` unit test |
| A summary ending scores Level 1 on Ending and blocks the lock unless a reason is written | pass: `lockCheck` unit tests; database checks `a summary ending (Level 1) blocks the lock`, `a short override is not enough`, `lock with a reason sets the locked version and moves the talk to Rehearse`, `unscored script cannot be locked` |
| Locking moves the talk to Rehearse and awards the milestone; unlocking needs a reason and later versions are flagged post-lock | pass: database checks `script_locked milestone awarded`, `unlock needs a reason`, `unlock clears the locked version`, `a version after an unlock is flagged post-lock and numbered` |
| A member cannot lock another member's script or finalize another member's outline | pass: database checks `B cannot lock A script` and `B cannot finalize A outline` |
| The fact-check sheet lists every number in the script and the hours estimate | pass: `factcheckText` unit test (every number present, "needs a source", "2 to 12 hours") |
| Exports are real files: PDF starts with `%PDF`, DOCX is a zip | pass: `scriptPdf`, `scriptDocx`, `outlinePdf`, `factcheckPdf` unit tests |
| Prompter text carries section headers and the ending point marker | pass: `prompterText` unit test |
| The brief, outline, script and fact-check pages compile and route | pass: `next build` lists `/write/brief`, `/write/outline`, `/write/script`, `/write/factcheck` and the three export routes |
| Phone and desktop render without horizontal scroll | pass: `write-phone.png` (390px) and `write-desktop.png` (1280px); `scrollWidth` equals the viewport on both |
| Copy lint, no-capture guard, prompt check | pass: no banned phrases; no media fields or capture APIs; 25 actions, all checks pass |
| Type check and unit tests | pass: `tsc --noEmit` clean; 120 Vitest tests green |

## 4. Design notes (web and mobile)

- Phone first at 390px with 16px gutters; the Outline Builder's section header wraps to two rows on a phone and the point rows wrap under the kind selector. Desktop uses the full width with the coverage and rubric panels beside the text.
- Touch targets are 44px on coarse pointers (`pointer-coarse:min-h-11` on buttons; the global rule on selects, inputs and inline links).
- Long scripts are a column of per-section textareas, not one giant field, so a phone keyboard never hides the section you are editing.
- No horizontal scroll at either width; verified by script.

## 5. Decisions logged (Appendix C, v1.13)

Eight rows dated 2026-11-01: the `script_rubric` action; section-by-section writing without token streaming; every pass and edit as a version with restore by copy; brief autosave drafts versus saved briefs; one final per outline and reopening after a script exists; the lock gate in `lock_script()` with override, unlock and post-lock flags; pdf-lib and docx exporters; browser-side readability, jargon and quirk meters.

## 6. Owner items

- None new for this step. The step-6 owner items stand (Google service account, Stripe, Resend and CRON secrets, trademark clearance, six and twelve month regular prices [NEEDS CONFIRMATION]).

## 7. Carried to step 9

- `script_locked` is the gate for the beat map and the drills.
- `estimateSeconds` and `paceLine` take a measured pace; step 9 supplies it after three typed practice runs.
- The prompter text export is the source for the read-along pacer.
