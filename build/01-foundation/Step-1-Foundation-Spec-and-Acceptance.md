# Step 1: Foundation. Specification, deliverables and acceptance report

Date: 1 November 2026. Blueprint v1.5, Appendix E step 2 (runbook step 1): monorepo skeleton (12.10), Supabase migrations for every table in 12.3 (keeping the legacy plan's 12 tables), RLS tests for two members and one curator.

## 1. What was built

Code lives in the same repository under `app/` (decision: one repository for the whole project, so any AI or person finds the definition and the code together).

| Path | What it is |
|---|---|
| `app/package.json`, `app/pnpm-workspace.yaml` | pnpm workspace: `apps/web`, `packages/db`, `packages/prompts`, `packages/ui`, `packages/evals`, `tools/crawler-import`, `tools/copy-lint` (12.10) |
| `app/apps/web/` | Next.js 15 (App Router, React 19, TypeScript) shell. `lib/product.ts` holds the product name, the disclaimer, the promise, the prices and the credential lines as the only constants. `next.config.ts` sends `Permissions-Policy: camera=(), microphone=(), display-capture=()` on every page, so no page can ask for a camera or microphone even by mistake. The footer renders the disclaimer on every page. |
| `app/packages/db/supabase/migrations/0001..0007` | Seven migrations: extensions, enums and role helpers; accounts and billing; FIND (spine, Idea Lab, Prior Stages, catalogue, pipeline, Pitch Studio); WRITE; DELIVER and AMPLIFY; ops and clinic (deferred, schema kept); RLS. 61 tables, 2 views, 1 materialized view, 18 functions, 20 triggers. |
| `app/packages/db/local/0000_local_auth_shim.sql` | Local-only imitation of Supabase's `auth.users`, `auth.uid()` and the three roles so the tests run on plain Postgres 16 with pgvector. Never deployed. |
| `app/packages/db/tests/rls_and_gates.sql` | 64 checks: two members, one curator, one admin, anonymous, plus every binding gate. |
| `app/packages/db/scripts/local-apply.sh`, `local-test.sh` | Apply everything to a fresh database; run the suite; non-zero exit on any failure. |
| `app/.github/workflows/db-tests.yml` | CI: `pgvector/pgvector:pg16` service, applies the migrations, runs the suite on every push that touches `packages/db`. |
| `app/tools/copy-lint/check.mjs` | Fails on em dashes, exclamation marks and the banned phrases in anything under `apps/` (11.9). |
| `app/.env.example` | Every secret the app needs, named, empty. |

## 2. Decisions the blueprint did not settle (logged in Appendix C of v1.6)

1. **No PostGIS.** Plain `lat`/`lng` columns and a haversine function `distance_km()` cover the 25 km dedup radius and the travel-radius filter. Fewer dependencies, same result. Reversible: a PostGIS column can be added later.
2. **`user_id` on every member-owned table.** Child tables (ideas, outline_versions, beats, claims...) carry the owner's id, so RLS is one cheap predicate per table instead of joins. Inserts must set `user_id = auth.uid()`; the policy refuses anything else.
3. **Gates live in the database as well as the API.** The 500-character minimum (`idea_brief_minimum` constraint on saved briefs), the final-outline requirement for scripts (`OUTLINE_NOT_FINAL`), the five-drafts limit (`DRAFT_LIMIT_REACHED`), the readiness requirement for Ready (`NOT_READY`), the 50-target cap and the one-application-per-event-per-cycle rule all hold even if an API route has a bug. Error messages start with the structured code from 12.10.
4. **Trial starts at sign-up.** `handle_new_user()` starts the 3-day trial and unlocks member allowances for it; the one-idea, three-event limits are enforced in the API (step 3) against `memberships.trial_ends_at`.
5. **Founding seats are a single-row table with a row lock.** `claim_founding_seat()` returns `founding` for the first 30 callers and `regular` after, atomically.
6. **Measured pace** is computed by a trigger on `timed_runs` after three timer runs with a word count.
7. **Deferred features keep their tables** (run log, rehearsal plans, live-audience log, clinic, reviews, clip plans, press kits, talk stats, outcomes) and ship dark behind rows in `feature_flags`, so no second migration is needed when they are switched on.
8. **Deleted features have no tables**: nothing for community, peer matching, office hours or coach-only mode.
9. **Public pages read views, never tables.** `public_open_calls` and `public_counts` are the only objects the anonymous role can read; `organizer_contacts` is readable by curators and admins only.

## 3. Table inventory (from the live test database; RLS is enabled and forced on every table)

| Table | Columns | RLS on | Policies |
|---|---|---|---|
| `addon_purchases` | 7 | yes | 1 |
| `allowances` | 18 | yes | 1 |
| `allowed_emails` | 4 | yes | 1 |
| `application_calls` | 27 | yes | 2 |
| `applications` | 30 | yes | 4 |
| `audit_log` | 8 | yes | 1 |
| `beat_progress` | 8 | yes | 4 |
| `beats` | 10 | yes | 4 |
| `claims` | 14 | yes | 4 |
| `clinic_attendance` | 4 | yes | 4 |
| `clinic_questions` | 6 | yes | 4 |
| `clinics` | 9 | yes | 2 |
| `clip_plans` | 5 | yes | 4 |
| `consents` | 6 | yes | 4 |
| `crawler_runs` | 14 | yes | 1 |
| `credits_ledger` | 11 | yes | 1 |
| `email_log` | 9 | yes | 1 |
| `eval_runs` | 9 | yes | 1 |
| `event_reports` | 10 | yes | 5 |
| `event_sources` | 10 | yes | 1 |
| `event_topics` | 4 | yes | 2 |
| `event_watches` | 3 | yes | 4 |
| `events` | 59 | yes | 2 |
| `feature_flags` | 5 | yes | 2 |
| `founding_seats` | 4 | yes | 1 |
| `idea_briefs` | 10 | yes | 4 |
| `idea_dossiers` | 7 | yes | 4 |
| `idea_expansions` | 11 | yes | 4 |
| `ideas` | 22 | yes | 4 |
| `import_sources` | 14 | yes | 1 |
| `invoices` | 11 | yes | 1 |
| `known_talk_titles` | 10 | yes | 2 |
| `launch_plans` | 9 | yes | 4 |
| `live_audience_logs` | 10 | yes | 4 |
| `llm_calls` | 16 | yes | 1 |
| `memberships` | 15 | yes | 1 |
| `organizer_claims` | 6 | yes | 1 |
| `organizer_contacts` | 10 | yes | 1 |
| `organizers` | 20 | yes | 2 |
| `outcomes` | 9 | yes | 4 |
| `outline_versions` | 9 | yes | 4 |
| `outlines` | 6 | yes | 4 |
| `pitch_packs` | 9 | yes | 4 |
| `pitch_variants` | 9 | yes | 4 |
| `press_kits` | 5 | yes | 4 |
| `prior_stages` | 14 | yes | 4 |
| `profiles` | 19 | yes | 2 |
| `prompt_versions` | 10 | yes | 2 |
| `rehearsal_plans` | 5 | yes | 4 |
| `reviews` | 13 | yes | 1 |
| `runs` | 10 | yes | 4 |
| `script_versions` | 15 | yes | 4 |
| `scripts` | 10 | yes | 4 |
| `stripe_events` | 4 | yes | 1 |
| `subscriptions` | 18 | yes | 1 |
| `talk_stats` | 5 | yes | 1 |
| `talks` | 18 | yes | 4 |
| `target_list` | 6 | yes | 4 |
| `timed_runs` | 9 | yes | 4 |
| `user_roles` | 5 | yes | 2 |
| `writing_samples` | 5 | yes | 4 |

## 4. Acceptance report

Command: `PGHOST=/tmp PGPORT=5499 PGUSER=postgres bash app/packages/db/scripts/local-test.sh` on Postgres 16.15 with pgvector 0.8, pg_trgm, citext, pgcrypto. Result: **64 passed, 0 failed**.

| Check | Result |
|---|---|
| 30 founding seats granted | PASS |
| 31st purchase is regular | PASS |
| 5 business days from a Friday is the next Friday | PASS |
| A applications untouched by B delete | PASS |
| A talk title untouched by B | PASS |
| B cannot drill A beat | PASS |
| B cannot record a drill on A beat | PASS |
| B cannot see own ledger of A | PASS |
| B cannot update A talk | PASS |
| B sees none of A applications | PASS |
| B sees none of A beats | PASS |
| B sees none of A briefs | PASS |
| B sees none of A ideas | PASS |
| B sees none of A prior stages | PASS |
| B sees only own talk | PASS |
| admin reads all talks | PASS |
| admin reads audit log (empty is fine) | PASS |
| anon cannot read events table | PASS |
| anon cannot read profiles | PASS |
| anon reads public counts | PASS |
| anon reads public open calls view | PASS |
| applied_at defaults to today | PASS |
| applied_at is editable afterwards | PASS |
| brief: 499 characters refused | PASS |
| brief: 500 characters accepted and counted | PASS |
| curator inserts events | PASS |
| curator reads organizer contacts | PASS |
| curator sees no member briefs | PASS |
| curator sees no member scripts | PASS |
| curator sees no member talks | PASS |
| curator updates events | PASS |
| dedup finds the near-duplicate event | PASS |
| drill hit: interval 1 to 3 days | PASS |
| drill miss: review tomorrow | PASS |
| finalized_at set by trigger | PASS |
| follow-up defaults to 14 days later | PASS |
| locked idea change marks pitch pack stale | PASS |
| measured pace set after three timed runs | PASS |
| member cannot change own plan | PASS |
| member cannot escalate own role | PASS |
| member cannot insert a talk for another user | PASS |
| member cannot insert events | PASS |
| member cannot read organizer contacts | PASS |
| member cannot update events | PASS |
| member reads events | PASS |
| new user: 3-day trial started | PASS |
| new user: one allowance row | PASS |
| new user: one member role | PASS |
| new user: one membership on spark | PASS |
| new user: one profile | PASS |
| new user: trial allowances unlocked | PASS |
| no media columns anywhere | PASS |
| one application per event per cycle | PASS |
| outcome_at set when outcome logged | PASS |
| ready application counts toward 100 | PASS |
| ready refused without readiness pass | PASS |
| ready_applications_sent counts 1 | PASS |
| removal request sets a 7-day due date | PASS |
| script accepted from a final outline | PASS |
| script refused until outline is final | PASS |
| seats remaining is zero | PASS |
| sixth concurrent draft refused | PASS |
| target list accepts a row | PASS |
| timed run refuses zero duration | PASS |

Phase 0 acceptance items from blueprint 14.1 covered here: member A cannot read or change any row of member B (tested by script); first login creates exactly one membership and one profile; the design-token contrast checks and the disclaimer render belong to step 2; the credit charge and refund appear in the ledger belongs to step 3 (the ledger table, statuses and idempotency key exist now).

## 5. What step 2 needs from here

Nothing blocks. Step 2 builds `packages/ui` (tokens, type scale, components, contrast tests, no-capture test). Step 3 builds the auth flow, Stripe Checkout and webhooks against `subscriptions`, `invoices`, `stripe_events`, `founding_seats`, `allowances` and `credits_ledger`, and the trial limits.
