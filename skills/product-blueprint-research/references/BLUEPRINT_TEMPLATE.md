# BLUEPRINT TEMPLATE: section architecture and acceptance criteria for the document

Target length 20,000–35,000 words. Markdown. Tables for anything a builder looks up. Citation keys in brackets map to a numbered sources appendix.

## Front matter
Title with the working product name and version; prepared for / on; purpose in one sentence; research basis (threads, dates); the rule that sourced numbers carry sources and decisions are labelled.

## 0. Read me first (for the builder)
0.1 What this document is and how to treat it (source of truth; decision rules when silent).
0.2 What already exists (apps, plans, data) and the rule for reusing it ("starting point only; this document supersedes").
0.3 The non-negotiables (8–12 numbered rules: naming and trademark, promises the product never makes, platform rules, data sourcing, privacy defaults, stack, house style).
0.4 Decision rules when the document is silent (reversibility, legality, simplicity, source hierarchy, log every choice).
0.5 Reading map (section → what it gives → who needs it).

## 1. Executive summary and thesis
1.1 One-sentence product. 1.2 Why now in five sourced facts. 1.3 The thesis (where value concentrates; what the product combines that nobody else does). 1.4 Business model in one table (tiers, prices, who, human component). 1.5 12-month targets with the benchmarks behind them. 1.6 Top five risks and handling. 1.7 Business context (owner-stated facts, labelled).

## 2. Platform ecosystem, rules and legal line
2.1 Scale and seasonality (table with sources) and product implications. 2.2 How admission or selection works (canonical form fields table, timelines, odds, stated rejection reasons, what accepted people credit). 2.3 Rules every output must obey (table: rule, detail, source) and the ethical line. 2.4 Trademark and naming (controlling quotes, risk assessment, naming brief, candidates, disclaimer text, visual-distance rule). 2.5 Recent platform changes and implications.

## 3. Customer
3.1 Who buys and what the outcome does for them (first-person vs vendor evidence). 3.2 Personas (4–6, with vocabulary). 3.3 Jobs to be done ranked by willingness to pay. 3.4 Journey map (moment, duration, what happens, failure, product answer). 3.5 Voice-of-customer vocabulary by emotion. 3.6 Expectation management as a feature. 3.7 Segment playbooks (onboarding path, defaults, copy angle).

## 4. Competitive analysis
4.1 Landscape map (two axes). 4.2–4.5 Priced tables by category (offer, price, claims, guarantee, weakness vs the product). 4.6 Gap summary (numbered). 4.7 Positioning statement and tagline candidates. 4.8 Differentiation checklist (why hard to copy).

## 5. Product architecture
5.1 Pillars → stages → outcomes → artifacts; the spine object. 5.2 Navigation tree and rationale. 5.3 Home screen contents in order. 5.4 Onboarding that yields an artifact in the first session. 5.5 Roles and permissions. 5.6 Notification and nudge design with evidence. 5.7 Progress and motivation mechanics. 5.8 Modes.

## 6–9. Feature specifications (one section per pillar, plus coaching, community, admin, partner portals)
For each module: purpose; screens; feature table (ID, name, description, tier, phase, metering); AI behavior rules; data tables and fields; metrics with targets; acceptance checks. Feature IDs: F<pillar>.<module>.<n>. Tiers abbreviated and defined once. Phases: MVP, V2, V3.

## 10. Monetization
10.1 Pricing principles from evidence. 10.2 Tier matrix (every gate). 10.3 Metering (credits or minutes per action with COGS by model). 10.4 Free tier and conversion mechanics (trial type with benchmark justification; PQL signals; upgrade triggers). 10.5 Program pricing and guarantee (effort-conditioned text). 10.6 Regional pricing and payments (merchant of record, local methods, caps). 10.7 Retention design by moment. 10.8 Unit economics per tier and blended; acquisition assumptions. 10.9 Ascension and cross-sell. 10.10 Refunds, cancellation, fair use.

## 11. Design system
11.1 Brand direction, wordmark, naming distance from the platform, disclaimer placement. 11.2 Typography (faces, weights, licenses, type scale table, readability rules). 11.3 Color tokens light and dark with hex and computed contrast; implementation mapping (shadcn/Radix/OKLCH); chart colors. 11.4 Layout, spacing, shape, navigation. 11.5 Components and editor/charts/motion choices with licenses. 11.6 AI UX rules (numbered, binding). 11.7 Media UX (recording, review, prompter, captions). 11.8 Accessibility and i18n. 11.9 Copy voice and microcopy examples. 11.10 Empty states, errors, email.

## 12. Technical architecture
12.1 Stack table (layer, choice, why, dated price). 12.2 System diagram. 12.3 Data model (carried over, extended, added; RLS). 12.4 AI layer (routing, patterns, costs, guardrails, evals, data use). 12.5 Data pipelines and their legal basis. 12.6 Media pipeline. 12.7 Editor, prompter, exports. 12.8 Privacy, security, compliance table. 12.9 Cost model at three scales. 12.10 Engineering conventions. 12.11 Effort estimates.

## 13. AI prompt library
13.1 Shared preamble with the platform rules as numbered R-rules and the style. 13.2 Linters with JSON schemas and seeded test phrases. Rubrics (criteria, Level 4 vs Level 1, quoted standard, gate). Prompts for every AI action with inputs, constraints and JSON outputs. Human review templates. Eval set minimums.

## 14. Roadmap, team, metrics, go-to-market, risks, launch checklist
Phases with weeks, scope by feature ID, acceptance checks. Team. Metrics table (area, metric, target). GTM numbered plays with the owner's channels. Risk table (likelihood, impact, mitigation). Launch checklist (legal, product, commercial, content, ops).

## Appendices
A Sources: numbered blocks by topic, URL, viewing or publication date; "research gaps acknowledged" paragraph. B Glossary. C Decision log (date, decision, reason, owner). D Open questions for the owner. E Build runbook (ordered steps referencing sections).

## Acceptance criteria for the document itself
- Every in-text citation key exists in Appendix A; every Appendix A block is numbered.
- Tier names, prices, allotments, feature IDs, pillar names, stage numbers and model routing are identical everywhere (grep them).
- Every table a builder will implement (features, tokens, data model, prompts) is complete, not illustrative.
- No em dashes; no banned words; no exclamation marks; no promises the product cannot keep.
- Owner-stated facts are labelled as such and separated from research-backed facts.
- The verification report exists and shows zero High findings.
