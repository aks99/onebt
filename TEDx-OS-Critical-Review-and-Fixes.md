# TEDx OS Blueprint: Critical Review and Recommended Fixes

Written 30 October 2026, after the independent verification pass. Scope: a critic's read of `TEDx-OS-Master-Blueprint-v1.1.md` with one question in mind: what would make this product fail commercially even if it is built exactly as specified?

Scoring: each fix has a score out of 100 (how much it raises the odds of success, weighted by confidence and urgency). Effort is listed separately: S (days), M (weeks), L (a month or more).

## The four ways this product fails (what the fixes defend against)

1. The open-call database is thinner than promised. TED says organizers rely on networks and interviews more than forms; nobody measured what share of events publish a form. If it is 20%, the Event Finder is a pretty list, not a pipeline.
2. Organizers decide the product is an application mill. Mass pitching is a stated rejection reason; AI-personalized volume looks like mass pitching from the other side of the table.
3. Members churn on rejection. Single-digit odds per event, 3–12 months of applying, and a monthly subscription that invites "cancel after the no."
4. TED sends a letter. The business sits in the category TED calls "not legitimate" when fee-based; descriptive use of "TEDx" at marketing scale is still exposure.

What is already strong and should not be touched: the trademark finding and TED-free naming, the rules-enforcing prompt library, honest expectation-setting, the pipeline-plus-outcomes positioning, the no-scraping data policy, on-device biometrics, narrative-first feedback, and the sourced pricing corridor.

## A. Strategy and demand

### Fix 1. Validate demand and price before building anything. Score 92. Effort: 2 weeks.
Why: every conversion and churn number in the blueprint is a borrowed benchmark; the research explicitly failed to reach forums, keyword volumes and India pricing. Run a landing page with the real positioning and a waitlist, a Van Westendorp price survey to the challenge list (1,200–1,900 registrants per cohort), and 20 interviews: 10 coaches and authors, 5 accepted TEDx speakers, 5 ex-organizers. Decide the launch tier prices from that, not from analogies.
Downside: two weeks of delay; survey intent overstates purchase; GBP's list is author-skewed, so the sample must be deliberately widened.

### Fix 2. Run a 300-event data pilot to size the open-call supply. Score 90. Effort: 2 weeks of one curator.
Why: the product's number-one differentiator is a verified open-call database, and its existence is assumed, not measured. Catalogue 300 upcoming events in the US, India, UK and Canada: share with a public form, with a deadline, with a theme, minutes per event to verify. If the open-call share is low, the Event Finder must be rebuilt around visibility and relationships (Fixes 3 and 13), and the marketing must say so.
Downside: the result may force a repositioning before launch; that is exactly its value.

### Fix 3. Add the "Stage Ladder": smaller stages as stepping stones and proof. Score 78. Effort: M.
Why: application forms ask for prior speaking video; organizers find speakers through visibility; odds per event are single digits. Toastmasters, meetups, PechaKucha, Ignite, company and university talks, podcasts: tracked wins keep members engaged between rejections and generate the evidence a TEDx application needs.
Downside: scope creep and a softer TEDx focus; it needs more event data and a second taxonomy.

### Fix 4. Broaden the category to "idea-driven stages" with TEDx as the flagship. Score 72. Effort: S (positioning), M (data).
Why: it reduces trademark concentration risk and roughly triples the addressable market; it is also the fallback if counsel narrows TEDx-centric marketing.
Downside: "TEDx" is the word that sells; a broader category needs more explanation and weaker search intent.

## B. Legal and ethics

### Fix 5. Trademark opinion letter and organizer-safe copy review before any marketing goes live. Score 88. Effort: 2–3 weeks, roughly $3–8K.
Why: the license agreement and Terms are quoted in the blueprint, but a quoted policy is not an opinion. Counsel should rule on the name candidates, the descriptive-use copy, the disclaimer wording, and whether "TEDx" may appear in ads and landing-page headlines at all. TED has new leadership and a tighter data and IP posture since May 2024.
Downside: counsel will probably narrow the marketing language, which costs conversion; the fee and the wait.

### Fix 6. Organizer Advisory Council plus hard application-quality gates. Score 82. Effort: M.
Why: the hidden existential risk is organizer backlash. Recruit three to five former TEDx organizers as paid advisors; cap active applications per member at five; make the per-event research step (theme, past talks, why this audience) a prerequisite for unlocking personalization; publish the ethics page with their names on it. The pipeline then produces fewer, better applications, which is also what wins.
Downside: lower "applications sent" numbers (a vanity metric anyway); advisor time and cost; some organizers will object on principle regardless.

### Fix 7. Rename the guarantee. Score 62. Effort: S.
Why: "Extended until you're on stage" presupposes selection; a reader, a regulator or TED can read it as an outcome promise. "Keep-going guarantee: your access is extended free for as long as you keep applying with ready applications" keeps the mechanics and drops the presupposition.
Downside: less memorable copy.

## C. Product

### Fix 8. Make "Accepted Speaker Mode" a first-class product with its own price. Score 86. Effort: M (mostly repackaging Pillars 2 and 3).
Why: the most urgent, highest-willingness-to-pay users are people who have just been accepted or invited (8–12 weeks to stage). Serving them sidesteps the "get selected" category entirely (coaching after selection is what organizers themselves do), gives a defined term that kills graduation churn, and nobody sells a good tool for it. Offer a "Stage-Ready Intensive" at $997 one-time for 12 weeks (or Pro monthly) with organizer-milestone sync, script lock, memorization, analytics and the event-day kit.
Downside: it splits roadmap focus between Find and Deliver; organizers already coach for free, so the added value (memorization, analytics, availability at 11 pm) must be explicit.

### Fix 9. Speaker-first drafting: AI edits the speaker's spoken words and never invents the stories. Score 80. Effort: S (prompt and flow change).
Why: generic LLM scripts are the fastest way to sound like everyone else; audiences and curators detect it; TED's own AI guidance is restrictive. Change F2.4 and F2.6 so every story beat comes from the member's voice interview transcript and the AI structures, trims and sharpens rather than authors. The voice-sample feature alone does not achieve this.
Downside: the member must talk for 20–30 minutes before a draft exists; slower first draft; some buyers want "write it for me" and will be disappointed.

### Fix 10. Promote memorization ("Know it cold") to the hero of Deliver in the MVP. Score 76. Effort: +2–3 person-weeks in Phase 1.
Why: filler-word and pace metrics are commoditized down to $0 (Microsoft, SpeakUp Coach); memory blanks are the most-reported day-of failure; no competitor has a memorization system. Move the spaced schedule, audio companion and coverage tracking into the MVP and let vision metrics wait.
Downside: Phase 1 grows; the demo is less flashy than "AI watches you speak."

### Fix 11. Replace credits in the member UI with plain allowances. Score 70. Effort: S.
Why: the audience skews 45+ and non-technical; credit balances create anxiety and support tickets; credit systems work for creators who already understand them. Show "tailored applications left: 7 of 10" and "rehearsal review minutes: 62 of 90", and keep the credit ledger internal.
Downside: coarser upsell levers; every AI action must map to one of a few allowances.

### Fix 12. Add cohort rituals on top of the subscription. Score 74. Effort: M (ops).
Why: accountability drives completion in coaching products, and GBP's own challenge proves this audience responds to cohorts. A monthly four-week Application Sprint and an eight-week Stage-Ready cohort, each with a start date, a host and a shared finish line.
Downside: fixed calendars and a community host; the ops load is real and recurring.

### Fix 13. Public Speaker Page with the 90-second idea video. Score 68. Effort: M.
Why: visibility is how many speakers actually get found; the page (idea, video, bio, prior talks) is both an application asset and a discovery surface, and SpeakerHub charges for a weaker version. It also makes Fix 2's possible repositioning concrete.
Downside: hosting, moderation and SEO work; it must never route organizers to members through the product (that would look like a marketplace and attract TED's attention).

### Fix 14. Define the MVP slice explicitly: the 20 features of release one and a "not now" list. Score 80. Effort: S.
Why: a 30,000-word specification invites over-building, and a builder Claude will try to build all of it. A one-page cut (Idea Lab, Event Finder basics, Pipeline, Pitch Pack, Script Studio core, audio-first Rehearsal with memorization, Today and Journey, billing) gets to first revenue in weeks, not months.
Downside: Amplify and coaching features are thin at launch; stakeholders will push to add things back.

### Fix 15. Screen inventory with states, and low-fidelity wireframes for the ten key screens. Score 66. Effort: 1 week of design.
Why: the blueprint defines features, data and tokens but not screens; a builder will invent layouts and states (empty, loading, error, upgrade-gated) inconsistently.
Downside: a week before code; risk of freezing UI decisions that user testing would change.

## D. Monetization

### Fix 16. Lead with the six-month program price; make monthly the secondary option. Score 72. Effort: S.
Why: this niche sells one-time programs ($997–$4,997) with financing, the need lasts 6–12 months, and a $149 monthly plan invites "cancel after the yes." Program framing also matches the guarantee and the consumer data that annual plans front-load churn unless onboarding is bundled.
Downside: higher sticker shock, lower trial-to-paid, and cash concentrated in fewer buyers; it must be paired with a strong 30-day refund.

### Fix 17. Restructure Inner Circle's human components for margin and capacity. Score 64. Effort: S.
Why: at roughly 45% gross margin and 40 members per coach, the top tier is a services business that does not scale. Pods of six with a monthly group session plus a quarterly 1:1 restore margin to about 65%; alternatively price monthly 1:1 at $699–$799.
Downside: less white-glove; the $499 tier may convert worse without the monthly 1:1.

### Fix 18. A low-ticket entry product for the challenge audience ("Idea + Application Kit", $197 one-time). Score 58. Effort: S.
Why: GBP's funnel already uses low-ticket bumps, the stale "$197 TEDx training" bump needs a replacement, and it seeds the pipeline with warm users.
Downside: anchors the brand low; the copy must not imply selection.

## E. Go-to-market and proof

### Fix 19. Founding cohort of 30 before public launch, with a published, honest outcomes report. Score 85. Effort: 3–4 months of calendar time.
Why: competitors claim "650+ placements" with no denominators; the blueprint's edge is transparency, and transparency needs data. Thirty members (GBP authors plus at least ten non-author experts) produce real funnel numbers, testimonials and the first cohort report, which becomes the launch asset.
Downside: public revenue starts later; early results may be humbling and must still be published.

### Fix 20. Diversify acquisition beyond authors toward practitioners with original work. Score 62. Effort: M.
Why: organizers favor people "actively doing original work," and authors or coaches pitching books are a stated red flag. Clinicians, scientists, educators and engineers have better odds and strong willingness to pay, and they rarely see TEDx coaching offers.
Downside: new channels cost money and time; GBP's brand is author-centric.

### Fix 21. One-line promise plus a name sprint in week one. Score 55. Effort: S.
Why: the positioning statement is a paragraph; "Stage OS" is a placeholder; domain, handles and design all wait on the name.
Downside: naming under time pressure produces safe names.

## F. Technical and data

### Fix 22. Start the event database with four countries and a member "scout" program. Score 70. Effort: S to set up.
Why: 0.25–0.5 FTE for a global catalogue is optimistic; US (22% of listings), India (14%), UK and Canada cover the owner's audience. Members earn allowances for verified tips, with curator approval.
Downside: members elsewhere see thin results; tip quality needs control.

### Fix 23. Prove the recording pipeline on real devices before Phase 1 ends. Score 60. Effort: M.
Why: twenty-minute browser recordings on Safari and iPad, flaky networks and old laptops are exactly where consumer tools earn one-star reviews ("lost connection," crashes). An audio-first, mobile-friendly path is the safety net.
Downside: engineering time on plumbing instead of visible features.

### Fix 24. Test the prompt library on ten real profiles before building the UI. Score 74. Effort: 1 week.
Why: the prompts are untested, and generic ideas in the first session kill activation. GBP has authors to test with now; have two ex-organizers rate outputs blind and iterate the rubrics.
Downside: requires organizer-reviewer time; may send the idea prompts back to the drawing board.

### Fix 25. Add an analytics event taxonomy, API route list and data dictionary. Score 56. Effort: S.
Why: the metrics targets exist without instrumentation definitions; the builder will improvise names and lose comparability.
Downside: documentation time.

## G. Process

### Fix 26. Quarterly re-verification of rules and prices, including a verbatim fetch of the TEDx Rules. Score 52. Effort: S, recurring.
Why: several rule texts in the research are fetch summaries, prices drift, and TED's new leadership may change the program.
Downside: recurring cost and attention.

## Priority order (if you do only ten)

| Rank | Fix | Score | Why first |
|---|---|---|---|
| 1 | 1. Demand and price validation | 92 | Cheapest way to avoid building the wrong thing |
| 2 | 2. 300-event data pilot | 90 | Tests the core differentiator before it is built |
| 3 | 5. Trademark opinion and copy review | 88 | Existential; must precede marketing |
| 4 | 8. Accepted Speaker Mode as a product | 86 | Highest-urgency buyers, lowest legal exposure, no churn problem |
| 5 | 19. Founding cohort and outcomes report | 85 | Turns transparency into a weapon |
| 6 | 6. Organizer council and quality gates | 82 | Prevents the backlash that would end the product |
| 7 | 14. Explicit MVP slice | 80 | Gets to revenue; protects the builder from the spec's size |
| 8 | 9. Speaker-first drafting | 80 | Authenticity is the moat against generic AI |
| 9 | 3. Stage Ladder | 78 | Engagement between rejections, proof for applications |
| 10 | 10. Memorization as the Deliver hero | 76 | The one delivery feature nobody else has |

## The next 14 days

1. Launch the waitlist page and price survey; book the 20 interviews (Fix 1).
2. Hire or assign the curator; start the 300-event catalogue (Fix 2).
3. Send the name candidates and the marketing copy to a trademark attorney (Fix 5).
4. Write the one-page MVP slice and the Accepted Speaker Mode offer (Fixes 14 and 8).
5. Test the Idea Lab prompts on ten real author profiles with two ex-organizer reviewers (Fix 24).
6. Approach three former organizers for the council (Fix 6).

## How to apply this in the new account

Amend Step 2 of the handoff prompt to: "Read TEDx-OS-Critical-Review-and-Fixes.md. Before building, apply the fixes Ash has approved (he will list the numbers) to the blueprint, save it as v1.2, and log each in Appendix C." Each fix maps to specific sections: 1 and 2 to Sections 1.5 and 6.2; 3, 4 and 13 to Sections 5–6; 5, 6 and 7 to Sections 2.3–2.4 and 10.5; 8 to Sections 3.7, 7, 8 and 10.2; 9 to Section 7.3 and 13.8; 10 to Section 8.3; 11 to Section 10.3; 12 and 19 to Section 9.3 and 14.4; 14 and 15 to Section 14.1; 16, 17 and 18 to Section 10; 20 and 21 to Sections 4.7 and 14.4; 22 to Sections 6.2 and 12.5; 23 to Section 12.6; 24 to Section 13.15; 25 to Section 12.10; 26 to Appendix A.
