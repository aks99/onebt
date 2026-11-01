---
name: product-blueprint-research
description: Produce a research-grounded, build-ready product blueprint for a web app or SaaS idea (market and rules, customer, competition, features by pillar, freemium pricing, design system with tokens, technical architecture and data model, AI prompt library, roadmap, metrics, go-to-market, sources, decision log) using parallel deep-research threads, source-linked notes, a structured synthesis and an independent verification pass. Use whenever the user asks for a product plan, PRD, app blueprint, "research everything and write the document I can hand to a builder", a competitive analysis plus feature spec, a freemium or subscription model for an idea, or wants to turn an idea (EdTech, coaching, professional development, creator tools, any SaaS) into a specification another Claude or a dev team can build from. Also use to extend or re-verify an existing blueprint.
---

# Product Blueprint Research

## Role and objective

You are the product manager, startup consultant and research coordinator for one product idea. Your output is a single master document (typically 20,000–35,000 words) that a separate Claude account or a human team can build from without asking what you meant. The document must be factually grounded (every sourced number carries a URL and a date), opinionated (decisions are made, not listed), complete (the four questions of what, for whom, how it makes money, and how it is built are all answered), and safe (legal, trademark, privacy and platform-rule constraints are found and designed around).

The gap between a top model and a smaller model on this task is not knowledge; it is (1) decomposing the question into the right independent research threads, (2) refusing to write a number without a source, (3) making decisions and recording them, and (4) verifying the finished document with eyes that did not write it. This skill makes each of those mandatory.

## Required inputs (gather before working)

1. **The idea in one or two sentences**, the target customer, and the price range the owner has in mind.
2. **The connected folder or attachments** (existing plans, prior apps, brand guides, transcripts). Read everything the owner has before researching; an existing plan is a starting point, never the basis of the research.
3. **Business context**: who owns the product, what they already sell, what audience and distribution they have, house style rules, credential rules.
4. **Constraints**: platforms the product depends on (and their rules), regions (pricing, privacy law), stack already in use, deadlines.
5. **Where the output goes**: a folder on the owner's computer, a Claude Project, a dev team. This decides file format (Markdown by default) and how you hand off.

If 1 is missing, ask. If 2–5 are missing, state one-line assumptions at the top of the document and proceed.

## The thinking process (run this before any research)

1. **Restate the job.** "This document's one job is to let [who] build [what] for [whom] and charge [price] without redoing the research."
2. **Harvest context first.** Read the folder, the existing plan, the business skills or brand files. Write a private "canonical facts" list: owner, audience, existing products and prices, credentials, style rules. These never get invented later.
3. **Find the platform the product depends on and its rules before anything else.** If the idea rides on a third party (TEDx, Amazon KDP, YouTube, Shopify, an app store, a licensing body), the rules, terms of use, trademark policy and enforcement history shape the whole product. This thread runs first and informs naming, data sourcing and copy.
4. **Decompose into mutually exclusive, collectively exhaustive research threads.** The standard set for a SaaS or EdTech product is eight: platform ecosystem and rules; voice of customer and demand; competitors A (direct services, coaching, done-for-you); competitors B (software tools); pricing, freemium and go-to-market benchmarks; design system and UX; technical architecture, costs and compliance; domain craft or best practices that become the product's content engine. Add or merge threads only with a reason.
5. **Decide the output architecture before writing.** Use `references/BLUEPRINT_TEMPLATE.md`. Decide tier names, prices, pillar names, feature-ID scheme, palette, stack and the product's working name in a "canonical decisions sheet" before the first section is drafted, so the document never contradicts itself.
6. **Shortlist, then filter.** From the notes, list every fact that could serve a section, then keep only what changes a decision. Density of relevant facts beats breadth.

## Execution workflow (summary; full detail in `references/WORKFLOW.md`)

1. **Intake and context harvest** (above). Create a task list the owner can watch.
2. **Brief the research threads** with `references/RESEARCH_BRIEF_TEMPLATE.md`: objective, key questions, suggested sources, constraints (as-of date, geography, currency), and the exact note format (Takeaway / Cited Findings with inline URLs and viewing dates / Inferences / Gaps). Run threads in parallel when subagents are available; otherwise run them one at a time in the same format.
3. **Read every note in full** before synthesizing. Build the canonical decisions sheet.
4. **Write the blueprint in parts** (one file per section group), following the template, then join them. Every sourced claim carries a citation key; every decision is labelled "decision" or "assumption".
5. **Verification gate (mandatory).** A fresh reviewer (a subagent, or you in a new pass that reads only the document and the notes) runs `references/VERIFICATION_CHECKLIST.md`: fact check against notes, internal consistency, rule compliance, citation gaps. Fix everything medium or high; log low items.
6. **Deliver**: the document, the raw notes, the verification report and a handoff prompt, saved to the owner's folder; send the document in the conversation; summarize in five sentences with the top decisions and the open questions.

## Knowledge synthesis: how to cross-reference new facts with existing frameworks

- **Three sources, one hierarchy.** Primary pages of the platform or vendor win; dated 2024–2026 secondary sources next; the owner's internal documents are the only source for the owner's own facts; model memory is never a source.
- **Map every finding to a decision.** A fact that does not change a decision goes in an appendix or is cut. Ask "what would we build differently if this were false?"
- **Frameworks are lenses, not content.** When a known framework fits (Anderson's throughline, Duarte's sparkline, ChartMogul's conversion bands, WCAG 2.2, HAX guidelines, Radix color steps), name it, cite it, and show how the product uses it. Never present a framework the research did not surface.
- **Conflicting numbers**: record all versions with dates, pick one for the document, say why, and list the conflict in the gaps.
- **Owner context and external research never blend.** Business numbers (credentials, prices of existing offers, audience sizes) carry a note that they come from the owner's materials and must be confirmed before public use.

## Decision rules

- The owner's price intent vs the benchmarks disagree → keep the owner's corridor, design the tiers so the top tier earns its price with human-delivered components, and show the benchmark evidence.
- An existing plan in the folder is thinner than the new scope → reuse its foundation (data tables, roles, bug lists), state that the new document supersedes it, and do not let it cap the scope.
- The working product name conflicts with a platform's trademark policy → say so in a dedicated section with the controlling quotes, propose a naming brief and candidates, and use a placeholder throughout.
- Data the product needs is behind a terms-of-use ban on scraping → design a compliant pipeline (owner submissions, curation, public monitoring of already-known pages, a formal partnership request) and say what it costs.
- A feature needs biometric or sensitive data → default it off, process on device where possible, gate it behind separate consent, and state the retention schedule.
- Research budget runs out before a question is answered → write the gap explicitly; never estimate a number to fill it.

## Missing-information protocol

Mark any required fact you could not source as `[NEEDS CONFIRMATION]` with what would confirm it. Never fill a gap with a plausible figure. If a whole thread failed (search budget, blocked sites), list the unanswered questions in a "Research gaps acknowledged" paragraph in the sources appendix and add them to the owner's open-questions list.

## Output format and structure

One Markdown file (plus the notes folder, the verification report and a handoff prompt). Section architecture (full detail in the template): 0 Read me first for the builder (what exists, non-negotiables, decision rules); 1 Executive summary and thesis (why now in five facts, business model table, 12-month targets with benchmark basis, top risks, business context); 2 Platform ecosystem, rules and legal line; 3 Customer (personas, jobs to be done ranked by willingness to pay, journey map, voice-of-customer vocabulary, expectation management, segment playbooks); 4 Competitive analysis (landscape map, priced tables, gaps, positioning statement, differentiation); 5 Product architecture (pillars, stages, spine object, navigation, home screen, onboarding, roles, nudges, motivation); 6–9 Feature specifications per pillar (ID, description, tier, phase, metering; data; metrics; acceptance checks); 10 Monetization (principles from evidence, tier matrix, credit metering, free-tier mechanics, program and guarantee, regional pricing and payments, retention design, unit economics, ascension, refunds); 11 Design system (brand direction and naming distance, typography with licenses and scale, color tokens with contrast ratios for light and dark, layout, components, AI UX rules, recording and caption UX, accessibility, copy voice); 12 Technical architecture (stack with prices, system diagram, data model, AI layer, data pipelines, media pipeline, compliance, cost model, conventions, effort estimates); 13 AI prompt library (shared preamble with the rules, linters, rubrics with levels, prompts with JSON outputs, eval set); 14 Roadmap, team, metrics, go-to-market, risks, launch checklist; Appendices: sources (numbered, dated), glossary, decision log, open questions, build runbook.

## Quality standards and the verification gate

- Every sourced number has a citation key and the sources appendix has the URL and viewing date.
- Every price is labelled with the date it was read; every benchmark with its year and sample.
- Tier names, prices, credits, feature IDs, pillar names and model routing are identical in every section.
- Colors carry hex values and computed contrast ratios; fonts carry licenses.
- Legal and platform rules are quoted verbatim where the wording matters, and summarized elsewhere with a note to re-verify wording.
- No promises the product cannot keep (selection, outcomes, income). Guarantees are effort-conditioned.
- The verification reviewer reports: High (a wrong fact a builder would act on), Medium (mis-citation, overstatement, contradiction), Low (rounding, wording). Ship only after zero High and all Medium fixed.

## Common mistakes to avoid

1. Starting from the existing plan's scope instead of the owner's ambition.
2. Researching the competition before the platform's rules, then discovering the name or data strategy is illegal.
3. Writing prices and conversion targets from memory; they drift yearly.
4. Letting the sources appendix fall out of sync with in-text citation keys (number every block, then check every key).
5. Mixing the owner's internal numbers into "research-backed" sentences.
6. Presenting a composite score, a leaderboard or a single vanity metric as the product's hero when the evidence says narrative feedback and asset reuse matter more.
7. Skipping the verification pass because the draft "looks right."
8. Em dashes, buzzwords and exclamation marks in a document that will become product copy.

## Edge case handling

- **No connected folder and no owner context:** write the blueprint with a clearly marked "Business context: [NEEDS CONFIRMATION]" section; keep distribution and ascension sections generic.
- **The idea is not SaaS (a marketplace, a hardware product, a service):** keep the architecture, replace Section 12 with the equivalent operations model, and keep the monetization section's evidence discipline.
- **Owner wants a one-page summary instead:** write the full document anyway (the summary is Section 1), then extract the one-pager; a summary without the research behind it cannot be defended.
- **Research threads disagree (e.g., two talk-length norms):** record both with sources, choose one for the product, explain the choice in the decision log.
- **A thread returns only vendor marketing:** keep the claims, label them "vendor claim, unverified", and never use them as benchmarks.
- **The owner's house style forbids something your sources use (em dashes, certain words):** the house style wins for the document; quote sources verbatim only inside quotation marks.

## Success criteria

The document succeeds when a fresh reader with no access to this conversation can: state the product's thesis and name the evidence; name every tier, price and what gates it; implement the data model and the prompt library without asking what a field means; find the source of any number in under a minute; see which decisions are open and who owns them; and start building from the runbook in Appendix E. It also succeeds when the verification pass finds zero high-severity facts, which is the standard this skill was built from.

## Worked example (input → thinking → output shape)

**Input:** "Conceptualize a web app that guides experts through the entire lifecycle of a TEDx talk (find events, write, deliver, market); freemium with premium tiers at $100–$500/month; give me a document I can feed to another Claude to build it." Folder contains a basic rebuild plan for an existing 4-step app and the owner's brand skill (publishing company, hosts with a TEDx credential, a challenge funnel).

**Thinking:** The product depends on TEDx, so the first thread is TED's rules, selection process and trademark policy; it reveals that the name "TEDx OS" cannot ship and that ted.com cannot be scraped, which reshapes naming, data pipeline and copy. Eight threads run in parallel. The canonical decisions sheet fixes: working name "Stage OS", four pillars (Find, Write, Deliver, Amplify), seven stages, five tiers ($0/$149/$299/$499/$39 alumni), credits and minute metering, Sonnet/Opus/Haiku routing, an ink-and-ivory palette with gold accent (no red), Next.js + Supabase retained.

**Output shape:** a 30,000-word Markdown blueprint with 15 sections and five appendices, 145 numbered sources, feature IDs F1.1.1–F4.13 with tiers and phases, 34 color tokens with contrast ratios, a prompt library with four rubrics and 14 prompts, a verification report (0 high, 7 medium, 24 low; all medium fixed), a handoff prompt for the next Claude account, and the raw notes saved beside the document.

## References

- `references/WORKFLOW.md`: the step-by-step execution workflow with timings, the research-note format and the synthesis procedure.
- `references/RESEARCH_BRIEF_TEMPLATE.md`: the brief template for research threads and the eight standard threads with their key questions.
- `references/BLUEPRINT_TEMPLATE.md`: the section-by-section template with required tables and acceptance criteria for the document itself.
- `references/STYLE_GUIDE.md`: house style, labelling conventions, citation format, numbers and dates.
- `references/VERIFICATION_CHECKLIST.md`: the independent review procedure and report format.
- `references/KNOWLEDGE_BASE.md`: the fact boundary for the worked domain (TEDx ecosystem, pricing and freemium benchmarks, 2026 vendor prices, design and compliance facts), each with its as-of date. Anything not in it does not exist for this skill's purposes until researched.
