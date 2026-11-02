# Having Codex review and fix One Big Talk, with every fix shown first

Written 1 November 2026. Everything Codex needs is in the public repository `https://github.com/aks99/onebt` (main branch, blueprint v1.17, runbook steps 1 to 12 done). `G:\TEDx OS` is a mirror of that repository; Codex works on the repository, never on the folder.

The one rule that makes "show me before you fix it" hold whatever tool or setting you use: **Codex never writes to `main`.** It writes findings to a file first, then fixes on a branch, and every branch becomes a pull request you read and merge yourself. Git is the gate, not a checkbox in Codex.

## 0. Before you start (once, 20 minutes)

1. A ChatGPT plan that includes Codex (Plus, Pro, Team or Enterprise as of this writing; check the current plan page).
2. On your Windows machine: install Git for Windows and Node 22 (from nodejs.org). Both are needed only for the command-line route (Route B); the cloud route (Route A) needs neither.
3. In GitHub, protect `main`: Settings, Branches, Add rule for `main`, tick "Require a pull request before merging". Now nobody, Codex included, can change `main` without a PR you approve.
4. Tell the Claude account (old or new) that Codex is reviewing, so it does not push to `main` at the same time. Claude's work during the review goes to its own branches too.

## 1. How the review is split

One pass over 300 files is shallow. Give Codex one review per area, each with its own findings file. The eight passes, in the order that matters most:

| # | Pass | What Codex reads | What it checks against |
|---|---|---|---|
| 1 | Non-negotiables | the whole `app/` tree | Blueprint Section 0 and the ten rules in `START-HERE.md` Part 1: text only, no guarantee, never submit or contact an organizer, the app never crawls, two-step writing, Prior Stages fresh-idea rule, pricing and seats, no TED marks, model routing, no community |
| 2 | Database and security | `app/packages/db/` | RLS on every table, `security definer` functions check `auth.uid()` or the role, no path from a member to another member's rows, no media columns, migrations apply from empty, the 235 checks cover the gates |
| 3 | AI door | `app/apps/web/lib/ai/`, `app/packages/prompts/`, `app/packages/evals/` | Every model call goes through `runAiAction`; gates and allowances before any call; credits reserved then settled; the preamble with R10 and R11 on every prompt; schemas match the code that reads the output; the linter runs where the registry says |
| 4 | Billing | `app/apps/web/lib/billing/`, `app/apps/web/app/api/billing/`, webhook tests | Stripe signature verification, idempotent webhooks, the 30-seat decision at checkout, founding price kept on a lapse of 30 days or less, Stripe Tax amounts stored, refunds written back |
| 5 | Member screens | `app/apps/web/app/(app)/`, `app/apps/web/components/` | Phone-first at 390px, 44px targets on touch, no horizontal scroll, every state (empty, loading, error, gated, filled), server actions validate input, no client-trusted plan facts |
| 6 | Copy and compliance | all UI strings, emails, prompts | Section 11.9 house style; "independently organized TEDx event"; the disclaimer on every public page; the compliance rules in `lib/amplify/rules.ts` |
| 7 | Ops | `.github/workflows/`, `app/scripts/acceptance.sh`, cron routes, `.env.example` | CI runs what the acceptance script runs; secrets named and never committed; cron routes check `CRON_SECRET`; the service role key is used only server-side |
| 8 | Blueprint consistency | `TEDx-OS-Master-Blueprint-v1.17.md` Appendix C and the `build/*/` reports against the code | Every Appendix C decision is in the code as written; every acceptance table row still holds; nothing in the code lacks a decision |

## 2. Route A: Codex in ChatGPT (cloud), the simplest way to see fixes before they land

Every Codex cloud task ends as a diff you read and a pull request you choose to open or not. Nothing touches your repository until you click.

1. Open ChatGPT, then Codex (the Codex entry in the sidebar, or chatgpt.com/codex). Connect GitHub when asked and grant it the `aks99/onebt` repository.
2. Create an environment for the repository. In the environment's setup script, paste:
   ```
   cd app && corepack enable && corepack prepare pnpm@10.28.0 --activate && pnpm install --frozen-lockfile
   ```
   Leave internet access at the default. The database checks need Postgres, which the cloud environment does not have; Codex runs the rest of the acceptance script with `SKIP_DB=1`, and GitHub Actions runs the database checks on every PR.
3. **Review phase.** Start one task per pass from Section 1. Paste the review prompt from Section 4 with the pass number filled in. Ask for a findings file, not code changes. Codex works, then shows you the result as a diff that adds one file: `build/13-codex-review/findings-0N-<pass>.md`. Read it. If it is good, click "Create PR" (or "Push branch"); the PR adds only the findings file. Merge it. If it is thin, reply in the task with what it missed and let it revise.
4. **Your decision.** Open the findings file. Every finding has a number, a severity, the file and line, why it matters, which rule it touches, and the proposed fix. Mark each one `APPROVE`, `REJECT` or `ASK` in the `Owner decision` column. Commit that edit (in GitHub's web editor is fine). Anything you are unsure about, paste to Claude and ask; Claude knows why the code is the way it is and will say so, including when Codex is right.
5. **Fix phase.** Start a new Codex task per findings file with the fix prompt from Section 5. Codex changes code on a branch, one commit per approved finding, runs `cd app && SKIP_DB=1 bash scripts/acceptance.sh`, and shows you the diff. Read the "Files changed" view. Create the PR. GitHub Actions runs the three workflows (app checks, database tests, prompt evals). Green checks plus your reading of the diff is the approval. Merge.
6. **Verify.** After each merged fix PR, ask Codex (or Claude) for one more task: "Re-run the review pass N against main and confirm each approved finding is closed; list anything new." The second file goes next to the first.
7. **Sync.** When the fixes are merged, the Claude account pulls `main` and copies the changed files to `G:\TEDx OS` so the folder matches again (the folder is a mirror, not a second source).

## 3. Route B: Codex CLI on your machine, for people who like a terminal

Same two phases, same branch rule; the difference is you watch it work. Flag names change between Codex releases, so check `codex --help` once and adjust.

```
npm install -g @openai/codex
codex login
git clone https://github.com/aks99/onebt.git C:\dev\onebt
cd C:\dev\onebt\app && corepack enable && pnpm install --frozen-lockfile
```

Clone to `C:\dev\onebt`, not into `G:\TEDx OS`, so the mirror folder is never half-edited.

**Review phase (read-only).** From `C:\dev\onebt`:
```
git checkout -b codex/review-01
codex --sandbox read-only
```
Paste the review prompt. In read-only mode Codex can read and run read-only commands but cannot edit files; it prints the findings and you save them (or, if your version supports it, let it write only `build/13-codex-review/` by running with `--sandbox workspace-write` and the approval mode that asks before every edit, usually `--ask-for-approval untrusted`). Commit the findings file, push the branch, open a PR, merge.

**Decision.** Same as Route A step 4.

**Fix phase (asks before each change).**
```
git checkout main && git pull
git checkout -b codex/fixes-01
codex --sandbox workspace-write --ask-for-approval untrusted
```
Paste the fix prompt. With this approval mode Codex shows each edit and each command and waits for `y`. When it has finished, run the acceptance script yourself (full, if you have local Postgres; otherwise `SKIP_DB=1`):
```
cd app && bash scripts/acceptance.sh
```
Then `git push -u origin codex/fixes-01`, open the PR on GitHub, read "Files changed", wait for the three workflows, merge.

The newer CLI also has `codex review`, which reviews the uncommitted changes or a branch against `main`. It is a good last step before you open each fix PR: `codex review --base main`.

## 4. The review prompt (paste, with the pass number)

```
You are reviewing One Big Talk, a text-only web app for people preparing a talk at an independently organized TEDx event. The repository is the source of truth. Read START-HERE.md first (Part 1 is the rule set), then TEDx-OS-Master-Blueprint-v1.17.md Sections 0, 10, 12 and Appendix C, then the files for this pass.

This is review pass <N>: <pass name from the table>. Review only that area, in depth.

Do not change any code in this task. Write one file, build/13-codex-review/findings-0<N>-<pass>.md, with a table:

| # | Severity (blocker, high, medium, low) | File and line | What is wrong | Which rule or section it breaks | Proposed fix (specific, one paragraph) | Owner decision (leave blank) |

Rules for the review:
- A blocker is anything that lets the product record or analyze audio or video, promise selection, submit an application or contact an organizer, crawl, write a script without a finalized outline, expose one member's rows to another, charge the wrong price, or use TED's marks.
- Quote the line you object to. If you cannot point to a line, it is not a finding.
- Check the claim in the matching build/<step>/ acceptance report; if the report says a check passes and the code disagrees, that is a finding against both.
- Respect the owner's decisions in Appendix C. Disagreeing with a logged decision is a comment at the end of the file, not a finding, unless the decision breaks a rule in START-HERE.md Part 1.
- Do not propose adding audio, video, speech, a community, a clinic, INR pricing, SMS, or anything the blueprint deferred or deleted.
- House style for anything you write: plain, short paragraphs, no em dashes, no exclamation marks, no buzzwords.
- End with a five-line summary: counts by severity, the three findings you would fix first, and the one thing the codebase does well that must not be lost in fixing.

Run read-only commands if they help (cd app && pnpm --filter @onebigtalk/web typecheck; pnpm --filter @onebigtalk/web test; node tools/copy-lint/check.mjs). Do not run anything that writes.
```

## 5. The fix prompt (paste, with the findings file name)

```
You are fixing One Big Talk from the reviewed findings in build/13-codex-review/<findings file>. Read START-HERE.md Part 1 and the findings file first.

Work on the current branch only (never main). Fix only the findings whose Owner decision is APPROVE, in order of severity. Skip REJECT. For ASK, write your answer in the file's Owner decision column and do not change code.

For each approved finding:
1. Make the smallest change that resolves it, in the same style as the surrounding code.
2. If a rule or decision is involved, add or update a test (Vitest in app/apps/web/tests, or a check in app/packages/db/tests/rls_and_gates.sql) that would have caught it.
3. Commit with the message "Fix #<n>: <one line>" and nothing else in that commit.

When all approved findings are done:
- Run: cd app && SKIP_DB=1 bash scripts/acceptance.sh (or without SKIP_DB if Postgres is available). Everything must pass. If a fix breaks a check, fix the fix, do not weaken the check.
- Run: node tools/copy-lint/check.mjs. Clean.
- Update the findings file: set each fixed row's Owner decision to "FIXED in <commit>" and add a short "What changed" section at the end.
- If any fix changes a decision in the blueprint's Appendix C, do not edit the blueprint; list the decision and the proposed new wording in the findings file so the owner and Claude can log it.

Never: add audio or video handling, a guarantee, organizer contact, crawling, a script path that skips the finalized outline, or TED's marks. Never edit files under build/0*/ reports, research-notes/, or blueprint-history/.

Stop and show me the diff. I will open the pull request myself.
```

## 6. What to do with Codex's findings and Claude's view

Codex and Claude will disagree somewhere. Where Codex says a thing is wrong and Claude's Appendix C says it was a deliberate choice, you decide; both arguments are in writing. Keep three habits:

- Fix blockers and highs before anything cosmetic.
- Make Codex re-review after its own fixes (Section 2 step 6). A fixer grading its own work is the thing we are avoiding.
- After the last merge, ask the Claude account to run `app/scripts/acceptance.sh` with the database, re-sync `G:\TEDx OS`, bump the blueprint with any decisions Codex changed (Appendix C, dated), and update `START-HERE.md`.

## 7. Cost and time

A review pass over one area takes Codex a few minutes to half an hour; eight passes in an afternoon. Fix PRs depend on how much you approve. Plan on one evening for the review, one for your decisions, one for the fixes and merges.
