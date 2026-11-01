# Claude Cowork kickoff brief for the professional speaking platform

Upload this file together with TEDx_End_to_End_Product_Blueprint.md. Read the entire blueprint before making product or implementation decisions. The companion HTML is a reading copy of the same blueprint and does not need to be uploaded as a third source.

## Your assignment

Act as a senior product manager, UX designer, technical architect, and implementation partner. Build a high-quality independent professional speaking web application for experts, authors, consultants, researchers, and executives. Support idea development, appropriate opportunity research, application preparation, script development, rehearsal, delivery planning, and permission-aware amplification.

Use the research dated 30 October 2026 as the starting evidence. Reverify volatile prices, event calls, program rules, vendor terms, APIs, and library versions before using them operationally. Distinguish observed facts, recommendations, assumptions, and unresolved dependencies. Do not state that customer demand or $499 willingness to pay has already been validated.

## Critical commercial dependency

TED's current published speaking policy explicitly rejects services charging to land a TEDx talk. The original sales promise is therefore blocked pending written clarification and appropriate review of the exact offer. A disclaimer, software label, education label, or free TEDx funnel does not automatically solve the conflict. See the blueprint's policy section and [TED's current speaking guidance](https://www.ted.com/tedx/speaking-at-tedx).

Build and validate independent general-speaking capabilities. Keep the TEDx-specific commercial journey disabled by a feature flag until the founder supplies evidence that the exact use is acceptable. Do not imply affiliation, inside access, guaranteed selection, publication, views, or revenue. Do not silently substitute a policy workaround for the original business model.

## Product principles

1. The core unit is a versioned speaking project, not an endless chat.
2. The expert's genuine idea and evidence come before polished titles.
3. Every important external requirement has a source and checked date.
4. Event existence and speaker-application availability are separate facts.
5. An AI-generated draft is a suggestion, not proof or program approval.
6. The user controls edits, external submission, publication, and sharing.
7. Privacy, ownership, basic export, and cancellation are available across plans.
8. The premium tier has bounded service allowances and real operating costs.
9. Fictional demonstration data must be isolated and visibly labeled.
10. The next useful artifact matters more than the number of AI features.

## First deliverables

Before writing a large application, produce these concrete planning outputs:

- A one-page decision brief stating the initial persona, the first paid job, the policy dependency, and the smallest full workflow.
- A decision log that separates settled requirements from assumptions and questions.
- A product requirements document with P0/P1/P2 scope and explicit exclusions.
- A route map and task flows for the major entry stages.
- A low-fidelity prototype for onboarding, idea brief, opportunity detail, application editor, script editor, practice result, amplification, and billing.
- A schema and permission matrix covering the entities in Sections 19 and 21.
- A delivery backlog mapped to the acceptance criteria in Section 22.
- An implementation plan, risk register, cost model, and measurable pilot plan.

Use the founder's existing authorization and environment to progress on reversible planning and local implementation work. Bring material business dependencies to the founder with a concrete proposal. Do not repeatedly ask about routine implementation details that the blueprint already resolves.

## Initial build slice

Build one complete general-speaking workflow:

1. A user signs up, creates a private workspace, and selects their starting stage.
2. The user records real facts and develops an editable idea brief.
3. The user approves a version of the brief.
4. The user adds a permitted, user-provided opportunity or views a clearly sourced catalog record.
5. The user captures exact application questions and drafts answers from approved facts.
6. The user reviews the packet, exports it, and submits externally themselves.
7. The user creates and revises a script with sources and version history.
8. The user records or uploads audio, corrects the transcript, and receives timecoded suggestions.
9. The user revises and records again.
10. The user creates a small original companion-content plan from authorized materials.
11. The user can export, change plan, cancel, or delete the account through an honest workflow.

If a live transcription, model, payment, or storage service is not configured, expose the missing dependency honestly. Do not show a simulated result as production functionality. A demo mode may exist if it is explicit, isolated, and never sold as a live integration.

## Suggested implementation

Use TypeScript, React/Next.js, PostgreSQL, managed authentication, private object storage, and durable asynchronous workers unless the repository or environment supports a better justified option. Keep provider adapters for text generation, transcription, payments, and research fetching. Use current supported library versions verified from official documentation. Start with a modular monolith.

Persist all real user work. Enforce workspace and resource permissions on the server and at the data layer where appropriate. Keep privileged keys server-side. Use immutable approved/submitted versions, idempotent jobs, a usage ledger, reversible credit reservations, verified payment webhooks, and explicit job states.

The system must continue saving and exporting drafts during a model-provider outage. Media processing must use a worker rather than a short-lived web request. Do not assume browser speech recognition has consistent support or appropriate privacy behavior across devices.

## Visual system

Follow the blueprint's tokens and component requirements. Use Inter with system fallbacks, a light canvas, dark slate text, indigo primary actions, and labeled semantic statuses. Keep the interface calm and professional. Avoid a TED-like identity, red X imagery, decorative gamification, and fake authority metrics.

Target WCAG 2.2 AA. Use visible keyboard focus, readable text, accessible labels and errors, reflow, transcript correction, and non-color status cues. Use 44px primary touch targets as a product target. Provide keyboard alternatives to drag-and-drop and list alternatives to maps.

## Monetization

The proposed independent-speaking tiers are Free, Studio $149/month, Professional $299/month, and Editorial Partner $499/month. These are hypotheses. The first paid beta can use Free and Editorial Partner only.

Apply the actual allowances and cost assumptions in Sections 16 and 17. The $499 package includes 80 total specialist minutes monthly, not unlimited coaching: 45 live, 15 preparation, and 20 async. Scoped research checks are separately bounded. Complex fact-checking and full ghostwriting are excluded.

Do not claim pure-software margins for this package. The illustrative fully utilized premium contribution margin is approximately 59% before acquisition and fixed costs. Track actual labor, model, media, support, and free-user costs. Avoid automatic overages, hidden annual billing, cancellation obstacles, or fabricated urgency.

## Required safeguards in the product

- Never infer an open speaker call from an event date or attendance availability.
- Never infer a precise deadline timezone from missing data.
- Never invent credentials, results, quotes, local connections, or source support.
- Never present relevance as acceptance probability.
- Never let AI mark a claim human-reviewed or approve official program compliance.
- Never auto-submit applications, contact organizers, or publish marketing.
- Never treat a generic contact form as permission to pitch.
- Never process official TED/TEDx recordings into clips by default.
- Never assume that appearing in a video establishes commercial reuse rights.
- Never expose private manuscripts through analytics, logs, shared search, or model tools.
- Never sell editorial appointments beyond actual available capacity.

## Test and launch requirements

Map tests to the acceptance stories in Section 22. Prioritize tenant isolation, version consistency, stale/closed calls, word limits, missing dates, credit idempotency, recording recovery, transcript correction, rights gates, webhook handling, export, and cancellation.

Use a permissioned AI evaluation set and human review. A beautiful interface does not establish factual reliability. Report evaluation counts and observed failures. Test current transcription with diverse speakers and equipment; do not infer present accuracy from old studies or vendor marketing.

Before a paid launch, provide a concrete readiness report showing what works, what is demo-only, what remains conditional, how it was tested, available service capacity, actual costs, and unresolved business dependencies. Never list a feature as complete solely because its screen exists.

## Definition of success

The initial product succeeds when qualified experts pay for it, use the resulting artifacts, complete at least one feedback-to-revision loop, receive the promised service, and voluntarily renew for another useful job. Selection by an independent event is not the product's guaranteed outcome.

Start with the decision brief, product requirements, route map, and the smallest implementation plan. Keep the entire blueprint available as context; do not reduce it to a generic AI writing app.
