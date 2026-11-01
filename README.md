# One Big Talk

A web app that guides experts, coaches, consultants and authors through the full lifecycle of a talk at an independently organized TEDx event: find one idea worth spreading, discover and apply to the right events, write the talk in two steps from the speaker's own brief, memorize it and finish under time, then launch the published talk. Text only. Never promises selection. Never sells a slot.

Owner: Ash Goel, Global Book Publishing. Working repository for the product definition and build. Everything a person or an AI needs to continue the work is here: https://github.com/aks99/onebt

Binary files (the decisions workbook `.xlsx`, screenshots `.png`, the external review PDF) are in the repository as well as in the owner's folder `G:\TEDx OS`, which mirrors this repository.

One Big Talk is an independent product and is not affiliated with, endorsed by, or sponsored by TED Conferences, LLC. TED and TEDx are trademarks of TED Conferences, LLC. TEDx events are independently organized under license from TED. One Big Talk never charges for, sells, or guarantees speaking slots.

## Start here

1. `START-HERE.md`: the handoff for any AI or new team member. Project instructions, non-negotiables, the state of the work, the read order and the open items. Read it first.
2. `TEDx-OS-Master-Blueprint-v1.11.md`: the complete product definition (about 36,000 words). Source of truth for scope, pricing, design tokens, data model, prompts, legal constraints and the build order. Older versions are in `blueprint-history/`.
3. `MVP-First-Release.md` and `TEDx-OS-Feature-Decisions.xlsx` (also `.csv`): every feature with the owner's decision of 1 November 2026. The first release is every row marked MVP.
4. `TEDx-OS-Screen-Inventory-and-Wireframes.md`: every first-release screen, its five states and a low-fidelity wireframe. Read before any UI work.
5. `TEDx-Event-Database-Crawler-Prompt.md`: the Claude Code prompt the owner runs on his own machine to build the event database, and how the app imports it (weekly Google Sheet sync). The app itself never crawls.

## Folder map

| Path | What it holds |
|---|---|
| `START-HERE.md` | Handoff and project instructions for any AI or person |
| `TEDx-OS-Master-Blueprint-v1.11.md` | Current blueprint (source of truth) |
| `blueprint-history/` | Earlier blueprint versions (history only) |
| `MVP-First-Release.md`, `TEDx-OS-Feature-Decisions.xlsx`, `.csv` | The decided feature set |
| `TEDx-OS-Feature-Catalogue-for-Selection.md` | The original catalogue the decisions were made from |
| `TEDx-OS-Screen-Inventory-and-Wireframes.md` | Screens, states, wireframes, UI acceptance checks |
| `TEDx-Event-Database-Crawler-Prompt.md` | Owner-run crawler prompt, schema, weekly routine, Google Sheet import |
| `TEDx-OS-Critical-Review-and-Fixes.md` | The critic's review that produced blueprint v1.2 |
| `TEDx-OS-Product-Names-20-Candidates.md`, `domains/` | Naming history; the chosen name is One Big Talk (onebigtalk.com) |
| `research-notes/` | Eight source-linked research files plus an independent verification report. Every number in public copy traces here or to Appendix A of the blueprint |
| `external-reviews/` | Three ChatGPT-produced documents and `build/00-review/External-Documents-Review.md`, which records what was adopted from them and what was not |
| `skills/` | Two reusable Claude skills: `product-blueprint-research` (how the blueprint was produced) and `fable-skill-builder` |
| `build/` | Build deliverables by runbook step (`00-review`, `00-prompts`, then `01-foundation` onward) |
| `app/` | The application monorepo (Next.js web app, Supabase migrations, design tokens, prompt library, evals) |
| `legacy/` | The rebuild plan for the previous app; starting point only, superseded by the blueprint |
| `Speaker-Page-Project-Proposal.md` | A separate, deferred project; not part of this app |

## The ten things that never change

1. Text only. The product never asks for, records, uploads, stores or analyzes audio or video.
2. No guarantee of selection, ever. The only promise is the 100-ready-applications access extension (blueprint 10.5).
3. Never charge for, sell, broker or imply a speaking slot. The app never submits an application and never contacts an organizer.
4. The app never crawls. The event database comes from the owner-run crawler, imported through a Google Sheet and the Curator Console.
5. Writing is two steps: an Idea Brief of at least 500 characters in the member's own words, then an editable outline the member finalizes, then a script written only from the finalized outline.
6. Prior Stages are optional and described (month, city, organization, audience size, topic). Other talks were other topics; the locked idea is fresh.
7. One paid plan: Founding Member at $17 a month, $77 for six months, $147 for twelve months, price kept for life while active, for the first 30 paying members; then $97 a month. Free plan with one-time allowances; 3-day trial limited to one idea and three events.
8. Never use TED's marks in the product name, UI, domains or ads. Every public page carries the disclaimer above. Say "independently organized TEDx event", never "TED talk" for a TEDx talk.
9. Model routing: Claude Sonnet 5.5 for drafts, Haiku 5.5 for scoring and linters. Every prompt starts with the shared preamble in blueprint Section 13.1 and obeys R10 (fresh idea) and R11 (write only from what the speaker wrote).
10. House style: plain, warm, direct; short paragraphs; no em dashes; no buzzwords; no exclamation marks; never "get selected" or "guaranteed".

## Design rule for every screen

Every screen is built for phones first and then widened for desktop (owner instruction, 1 Nov 2026). Minimum 16px side gutters, 44px touch targets, no horizontal scrolling, and the five states (empty, loading, error, gated, success) on each screen. The left rail becomes a bottom tab bar under 768px.

## Stack

Next.js (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, Tiptap; Supabase (Auth, Postgres with pgvector and RLS, Storage, Edge Functions, pg_cron); Claude API; Stripe with Stripe Tax (USD only); Resend; PostHog; Sentry; Google Sheets API for the weekly catalogue sync. No speech, video or vision vendors.
