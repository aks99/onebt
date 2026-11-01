# Step 4: AI service, prompt library, evals. Specification, deliverables and acceptance report

Date: 1 November 2026. Blueprint v1.9 Sections 12.4, 12.10, 13.1 to 13.15; runbook step 4: `runAiAction` with the brief-minimum and outline-final gates, the prompt library as versioned files, the Promptfoo eval suite wired into CI.

## 1. What was built

| Path | What it is |
|---|---|
| `app/packages/prompts/preamble.md` | The shared preamble (13.1), rules R1 to R11, plus one paragraph making every piece of member, event or sheet text data rather than instruction |
| `app/packages/prompts/actions/<key>/v1.md` and `schema.json` | 24 versioned prompts with closed JSON schemas: linter (13.2), idea_generator and idea_scorecard (13.3), brief_completeness (13.3b), prior_stages_framing (13.3c), readiness_review (13.4), pitch_pack (13.5), personalization (13.6), outline and script_section (13.8), editing_pass (the eight passes of 13.8 in one prompt keyed by `pass_key`), factcheck (13.9), run_log_summary (13.10, deferred feature), clip_plan (13.12, V2), launch_copy (13.13), event_tagging (13.14), and the actions the first release needs that Section 13 implies: idea_expansion, throughline_refine, experience_summary, beat_map, upload_pack, launch_plan, bio_updater, idea_test |
| `app/packages/prompts/registry.json` | Per action: model (Sonnet 5.5 for drafts, Haiku 5.5 for scoring and linting), credits (10.3), the member-facing allowance or fair-use counter and cap, minimum plan, gates, whether the linter runs on the output, prompt version, max tokens; model prices for cost logging |
| `app/packages/prompts/src/index.ts` | Loader: preamble plus body, strict placeholder rendering (a missing placeholder throws), schema access, cost estimate |
| `app/packages/prompts/scripts/check-prompts.mjs` | Structural check: every action has its files, preamble carries R10 and R11, no em dashes or exclamation marks, no media language, closed schemas |
| `app/apps/web/lib/ai/runAiAction.ts` | The one door: plan and flag checks, seven gates (`brief_minimum`, `outline_final`, `research_step_complete`, `organizer_ai_policy` behind its flag, `idea_locked`, `script_locked`, `dossier_min_300`), allowance or fair use, monthly credit cap, idempotent reservation, model call with a forced structured-output tool, schema validation, linter pass on generated prose, `llm_calls` log with cost from tokens, settle or release |
| `app/apps/web/lib/ai/deps.ts` | Real dependencies: Supabase RPCs from step 3 and the Claude API (`claude-sonnet-5-5`, `claude-haiku-5-5`) with prompt caching on the system turn |
| `app/apps/web/lib/ai/context.ts`, `app/api/ai/[action]/route.ts` | The route builds the member and the gate facts from the database, never from the client, and maps error codes to HTTP statuses (409 for gates, 429 for allowances, 502 for model failures) |
| `app/apps/web/tests/runAiAction.test.ts` | 22 unit tests over gates, credits, allowances, idempotency, cost logging, the linter, and the prompt library |
| `app/packages/evals/` | 9 Promptfoo suites, 240 fixtures (13.15), prompt functions that send the exact product prompts, a runner, a structural check, results folder |
| `app/.github/workflows/evals.yml` | CI: structural checks always; the live evals when `ANTHROPIC_API_KEY` is set; a regression fails the job |

## 2. Decisions the blueprint did not settle (Appendix C, v1.9)

1. **Structured output through one forced tool** (`return_result`) whose input schema is the action's output schema, then validated again server-side. No free-text JSON parsing.
2. **The linter runs after every drafting action and its flags travel with the output**; a linter failure never blocks the member's own work (the UI shows "linter unavailable"). Scoring actions are not linted.
3. **Gate facts come from the database**, keyed by ids the client sends; the client cannot assert that a brief is long enough or an outline final.
4. **A monthly credit cap of 1,200 per member** (about $3.50 at list prices, the heavy month in 10.3) returns `COST_CAP_REACHED`; the per-organization cap and the Haiku degrade path remain for the ops step.
5. **The eight editing passes are one prompt** keyed by `pass_key`, one allowance counter, one schema (a JSON patch of changed sections plus notes), as 13.8 describes.
6. **Seven extra actions** (idea_expansion, throughline_refine, experience_summary, beat_map, upload_pack, launch_plan, bio_updater, idea_test) are added to the library because first-release features need them; each follows the preamble and the house style.
7. **Fixture counts** follow 13.15 with 30 real ideas added so the scorecard suite tests passes as well as failures (50 idea fixtures in total); the 5 AI-policy cases are API-level and live in the Vitest suite, not in Promptfoo.
8. **Idempotency is two-layered**: the ledger's key (durable, step 3) and a per-process result cache so a retried request returns the finished result.

## 3. Acceptance report

| Check | Result |
|---|---|
| 24 prompts, each starting with the preamble carrying R10 and R11; no em dashes; no media language; closed schemas | pass (`check-prompts.mjs`) |
| A brief of 499 characters is refused with `BRIEF_TOO_SHORT`, nothing reserved, no model call; 500 accepted | pass |
| A script section is refused until the outline is final | pass |
| Personalization refused before the research step; refused for a prohibited organizer only when the flag is on | pass |
| Member actions refused on the free plan; a free member can score an idea; the public Idea Test charges nothing | pass |
| AI switched off in settings blocks every action | pass |
| Beat map requires a locked script | pass |
| Exhausted allowance returns plain words with the reset date and charges nothing | pass |
| Model failure releases the reservation and logs an error; schema failure does the same | pass |
| A retry with the same idempotency key returns the same result and charges once | pass |
| Monthly credit cap enforced | pass |
| Cost logged from tokens including cache reads; prompt version recorded | pass |
| Blocking linter flags returned with the output; call marked `blocked_by_linter`; scoring actions not linted | pass |
| Drafts routed to Sonnet, scoring to Haiku | pass |
| Vitest: 31 tests (22 here, 9 billing) | pass |
| Eval suite structure: 9 suites, 240 fixtures, every fixture asserted | pass (`check-suite.mjs`) |
| Live Promptfoo runs | not run here (no API key in this workspace); CI runs them when the secret is set, and a regression blocks deploy |
| Typecheck, build, copy lint, no-capture guard | pass |

## 4. What step 5 needs from here

Nothing blocks. Step 5 builds the Idea Lab, Prior Stages, onboarding, Today and Journey screens on top of `/api/ai/<action>` and the step-2 components.
