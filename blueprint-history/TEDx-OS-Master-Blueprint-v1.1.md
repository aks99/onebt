# TEDx OS: Master Product Blueprint (v1.1, verification fixes applied)

**Working product name in this document: "Stage OS"** (see Section 2.4 on why the name "TEDx OS" cannot ship, and how to pick the final name).

**Prepared for:** Ash Goel, Global Book Publishing (GBP) / India Authors Academy (IAA)
**Prepared on:** 30 October 2026
**Purpose:** A single, self-contained brief that another Claude account (or a human product team) can use to design, build, price, launch and operate an end-to-end web application that takes an expert from "I have expertise" to "my TEDx-style talk is live and working for my business."
**Research basis:** Eight parallel research threads run on 29–30 October 2026 (TEDx ecosystem and rules, two competitive sweeps, voice of customer, pricing and freemium benchmarks, design and UX, technical architecture, talk craft and amplification). Every number in this document that comes from research carries a source in Appendix A or inline. Where a number is a product decision rather than a sourced fact, it is labelled "decision" or "assumption".

---

## 0. Read me first (instructions for the Claude account that will build this)

### 0.1 What this document is

This is the complete product definition. Treat it as the source of truth for scope, priorities, naming, pricing, design tokens, data model, AI prompts and legal constraints. When you need to make a choice that this document does not cover, follow the decision rules in 0.4 and record what you chose in the Decision Log (Appendix C).

### 0.2 What already exists (do not start from zero)

1. **A live v1 app, "TEDx Engine"**, at growth.indiaauthorsacademy.com: a React front end on Supabase with three AI functions (generate ideas, expand idea, generate pitch) and an events list pulled from ted.com. It serves India Authors Academy "Diamond Members" through an allow-listed magic-link login.
2. **A rebuild plan dated 30 Oct 2026** ("TEDx Engine Rebuild Plan", file `sweta - TEDx-Engine-Rebuild-Plan.md` in the same folder as this document). It defines a 12-table Supabase data model, 8 member screens (M1–M8), 6 admin screens (A1–A6), 9 workflows (W1–W9), row-level-security rules, 7 email templates, a 4-phase build with acceptance checks, and a list of 9 bugs and 10 missing pieces in the current app.

**Rule:** Treat the rebuild plan as a starting point only. It describes a basic four-step application helper; this blueprint supersedes it and defines a four-pillar, seven-stage, monetized product from independent research. Reuse what is useful from it (the Supabase foundation, the row-level-security rules, the admin basics, the bug list, the member-migration steps) and let nothing in it limit the scope defined here. Section 12.3 defines the full data model and notes where the plan's tables are a subset of it.

### 0.3 The ten non-negotiables

1. **The product name, domain, logo and app icon must not contain "TED" or "TEDx".** TED's license agreement bars use of its marks "in connection with any work or service purporting to offer guidance on how to give an effective TED Talk or TEDx Talk, or how to get chosen to deliver a TED Talk or TEDx Talk." TEDx may be used only descriptively in body copy ("for speakers applying to independently organized TEDx events"). A non-affiliation disclaimer appears in the footer, onboarding, pricing page and app-store listings. (Section 2.4)
2. **Never promise selection.** Marketing, onboarding and sales copy never say "get selected", "land your TEDx talk" or "guaranteed stage". The product sells idea development, public-speaking preparation, event discovery and amplification tooling. Guarantees are effort-based ("extended access"), never outcome-based. (Section 10.5)
3. **No pay-to-play, ever.** The product never routes money to organizers, never sells "slots", never submits applications on the user's behalf without the user pressing the button, and never encourages users to mention the product in an application. (Section 2.3)
4. **Do not scrape ted.com.** TED's Terms of Use (updated 7 May 2024) prohibit automated collection of TED content. The event database is built from organizer submissions, curator research, public organizer websites and social posts, plus a weekly single-page re-verification of events already in the database. Deep-link to ted.com for canonical details. (Section 12.5)
5. **Idea before event.** The journey starts with the Idea Lab, not the event list, because organizers select ideas, not people ("Ideas, not profiles" is TED's own principle). (Section 5)
6. **Coach the user away from self-promotion.** Every AI prompt that touches an application, pitch or script enforces TED's content guidelines: no selling, no book plugs, no "professional speaker/coach" framing, no motivational platitudes, no multiple-TEDx-stage hunting. (Section 13)
7. **Narrative feedback first, numbers second.** Rehearsal analytics lead with two or three "what worked / try next" notes; scores are shown second and against the user's own previous take, never as a single composite "speech score" hero. (Section 8.5)
8. **Biometrics stay on the device and default to off.** Eye-contact and gesture analysis run in the browser with MediaPipe; no landmarks or face data are uploaded; a separate electronic consent is captured before the feature is enabled. Raw rehearsal video auto-deletes after 30 days unless the user keeps it. (Section 12.8)
9. **Keep React + Supabase.** The 2026 cost and capability comparison in Section 12.1 (Supabase vs Clerk, Neon, Convex, Firebase) stands on its own: Supabase Auth, Postgres with pgvector/PostGIS, Storage and RLS cover the needs at the lowest incremental cost, so there is no reason to migrate. Add Next.js App Router, a job worker (Trigger.dev or Inngest), Deepgram, the Claude API, Paddle or Stripe, PostHog and Sentry around it.
10. **House style for all copy:** plain, warm, direct, short paragraphs, no em dashes, no buzzwords ("unlock", "unleash", "elevate", "seamless", "game changer", "next level", "dive in"). The buyer is the hero; the product is the pit crew.

### 0.4 Decision rules when this document is silent

- Prefer the option that is cheaper to reverse.
- Prefer the option that keeps the user inside TED's rules.
- Prefer the simplest implementation that satisfies the acceptance criteria in Section 14.
- When two sources in Appendix A conflict, the primary TED page wins over a third party; a dated 2026 source wins over an older one.
- Record every material choice in Appendix C with date, choice, reason.

### 0.5 How to read the rest

| Section | What it gives you | Who needs it |
|---|---|---|
| 1 | Thesis, opportunity, business context | Everyone |
| 2 | TEDx ecosystem facts, rules, legal line | PM, legal, prompt author |
| 3 | Customer, personas, journey, vocabulary | PM, design, marketing |
| 4 | Competitive analysis and positioning | PM, marketing |
| 5 | Product architecture, journey map, navigation | PM, design, engineering |
| 6–9 | Feature specifications for the four pillars plus coaching, community, admin | Design, engineering |
| 10 | Monetization: tiers, prices, credits, guarantee, payments, unit economics | PM, finance |
| 11 | Design system: naming, fonts, colors, tokens, components, AI and video UX | Design, front end |
| 12 | Technical architecture, data model, pipelines, compliance, cost model | Engineering |
| 13 | AI prompt library, rubrics, JSON schemas | Prompt author, engineering |
| 14 | Roadmap, build phases, acceptance checks, KPIs, GTM, risks | PM, leadership |
| Appendices | Sources, glossary, decision log, open questions for Ash | Everyone |

---
## 1. Executive summary and product thesis

### 1.1 The one-sentence product

Stage OS is a web application that guides experts, coaches, consultants and authors through the full lifecycle of a TEDx-style talk: finding one idea worth spreading, discovering and applying to the right independently organized TEDx events, writing and rehearsing the talk to a stage-ready standard, and turning the published video into credibility, leads and paid stages.

### 1.2 Why now, in five facts

1. **Supply is large and findable, but nobody structures it.** TED says "more than 4000 events are now held annually"; the official directory listed 2,164 upcoming events on 30 Oct 2026; an independent pull of all 2026 listings found 1,365 events with the US at 22% and India at 14% (the two markets GBP already serves). Yet the directory has no "accepting applications" flag, no theme tags and no deadlines; the best current discovery product is a hand-curated Substack ("8 open applications" in an August 2026 issue). [A1, A2, A3, A133]
2. **The help market is expensive, manual and ethically wobbly.** Programs sell at $997 (Thought-Leader, anchored against a "$9,997" list price), $2,500–$4,997 (coaching cohorts), $14,997 (done-for-you placement, "we pitch you until you're selected"), $30,000 (Speaker Salon) and $120,000/year (1:1). An Australian firm hires "TEDx application writers" on Upwork at $25–$50/hour to tailor applications and track statuses by hand. TED revoked a Dubai license in October 2025 after speakers were sold "guaranteed" slots for $10,000–$25,000. [A34, A61, A101–A104]
3. **AI speech tools have left this segment.** Yoodli (the best-funded, $40M Series B, >$300M valuation) pivoted to enterprise roleplay; Poised shut down on 8 Oct 2026; survivors are $8–$30/month mobile habit apps built for 1–5 minute drills with session caps (Yoodli: any run over 30 seconds consumes one of 5 lifetime free sessions). No tool found combines script structuring, long-form rehearsal, memorization support and delivery analytics. [A106–A110]
4. **The buyer already budgets at $100–$500/month.** Coaches and consultants pay Kajabi $179/$249/$499, GoHighLevel $97/$297/$497, Circle $89/$199/$419 and Thinkific $109/$219/$499 for tools. Premium tiers in this band are justified by human touch (concierge onboarding, expert sessions) rather than features alone. [A62–A66]
5. **The founders have the credential and the audience.** GBP's hosts carry the joint credential "5X TEDx Speakers", the Elite Authority Accelerator already promises "TEDx strategy and stage research" and a "signature talk and TEDx pitch pack", and the Authority Bestseller Book Challenge registers roughly 1,200–1,900 people per cohort. The existing TEDx Engine proves demand inside the IAA Diamond membership.

### 1.3 The thesis

The paid value in this market concentrates in the two phases organizers do not cover: **before acceptance** (idea quality, event discovery, application volume and personalization) and **after the event** (promotion and repurposing). Organizers provide free coaching after acceptance, so the product's writing and rehearsal tools must be strong enough to be used alongside organizer coaching, but the business is won on the front and back of the funnel.

Stage OS wins by being the only product that combines:

- a **verified, continuously refreshed database of open TEDx calls** with theme tags, deadlines and "why you match" explanations;
- an **application pipeline** (CRM) purpose-built for the realities of this process: 5–10% odds per event, 5–20 applications per cycle, 2–4 selection rounds, follow-ups after two weeks, re-application next year;
- **AI drafting that adapts one idea to each event's theme and form fields** while enforcing TED's content rules;
- a **writing and rehearsal studio** built for an 8–18 minute memorized talk (not a two-minute drill): throughline, outline with a time budget, full script with version history, teleprompter, full-length recording analysis, memorization drills, event-day kit;
- an **amplification kit** that is compliant with TEDx sharing rules (link sharing, 60-second clips tagged to the official account, no re-uploads) and converts the video into bios, reels, press kits and paid-speaking outreach;
- **transparent cohort outcome stats** (applications → interviews → selections → published talks), which no competitor publishes;
- a **human layer** (group clinics, application and script reviews, 1:1 calls) at the top tier, which is what justifies $499/month in this category.

### 1.4 Business model in one table (details in Section 10)

| Tier | Price (USD, monthly) | Annual | For whom | Human component |
|---|---|---|---|---|
| Spark (free) | $0 | n/a | Everyone; the PQL engine | None |
| Builder | $149 | $1,490 (two months free) | Self-directed experts who want the full toolset | Community only |
| Pro | $299 | $2,990 | Experts who want live group coaching and premium AI | Monthly Application Clinic + Rehearsal Lab (group), office hours |
| Inner Circle | $499 | $4,990 | High-authority individuals who want done-with-you support | Monthly 1:1 call, 2 application reviews + 1 script review per month, curated event shortlist |
| Encore (alumni) | $39 | $390 | Speakers whose talk is published | Community |

Six-month program pricing (pay in full): Pro $1,497, Inner Circle $2,497, each with an "Extended until you're on stage" access guarantee (effort-conditioned, Section 10.5). India pricing in INR at roughly 45–50% of USD list via Paddle (UPI Autopay for amounts under ₹15,000 per renewal).

### 1.5 What success looks like in 12 months (targets, not promises)

| Metric | Month 6 | Month 12 |
|---|---|---|
| Free sign-ups | 3,000 | 12,000 |
| Paying members | 150 | 600 |
| Blended ARPU | $230/month | $240/month |
| MRR | $35K | $145K |
| Free-to-paid (within 90 days) | 4% | 6% |
| Monthly logo churn (paid) | ≤5% | ≤4% |
| Applications submitted through the pipeline | 1,500 | 8,000 |
| Members with at least one acceptance | 20 | 120 |
| Published talks tracked in Encore | 10 | 80 |

Benchmarks behind these targets: ChartMogul 2026 puts "good" freemium-to-paid at 3–5% and "great" at 8–12% within six months, with AI-native/hybrid products at 6–8% / 15–20%; churn falls sharply with price (ChartMogul: 6.1%/month under $25 ARPA vs 2.2% above $500; CRV 2025: AI products above $250/month retain ~70% of revenue vs 23% below $50). Education is the highest-churn vertical, so the targets lean conservative. [A40, A41, A42]

### 1.6 The five biggest risks and how the blueprint handles them

| Risk | Handling |
|---|---|
| Trademark action from TED over the name or positioning | TED-free name, disclaimer, descriptive use only, no red/black/Helvetica look, no "get selected" claims (Sections 2.4, 11.1) |
| Organizers penalize applicants who used "TEDx coaching" | Product never appears in applications; copy coaches users to lead with the idea; positioning is public-speaking and idea coaching (Section 2.3) |
| Expectation gap (vendors promise "millions of views"; first-person accounts report 3,000–400,000) | Honest onboarding, views framed as a vanity metric, success tracked as assets reused and stages booked (Section 3.6) |
| Graduation churn (need lasts 6–12 months) | Six-month program pricing, Encore alumni tier, amplification phase features (Section 10.7) |
| AI and video cost eating margin | Credit metering, model routing (Haiku/Sonnet/Opus), on-device vision, 30-day video retention; heavy-user COGS modelled at $1.6–$4/month (Section 12.9) |

### 1.7 Business context that shapes every decision

The facts in this subsection come from GBP's own brand guide and challenge knowledge base, not from the external research; the building Claude should treat them as given and confirm any number with Ash before it appears in public copy.

- **Owner:** GBP, a partnership-publishing company ("we don't just publish books, we architect authority empires"), hosts Sush Dutta and Ash Goel. Credential rule from the brand guide: joint content says "5X TEDx Speakers"; Ash solo says "9X TEDx". Never mix the two sets in one asset.
- **Existing distribution:** the free 5-day Authority Bestseller Book Challenge (1,200–1,900 registrants per cohort, VIP upgrade $27, Day 4 offer of Guided $9,997 / Elite $19,997), a Global Author Network community, India Authors Academy Diamond members, and an affiliate program (50% of the $27 VIP).
- **Existing TEDx deliverables in the Elite offer:** "TEDx strategy and stage research" (Pillar 4 of the offer) and "signature talk and TEDx pitch pack" (Pillar 6). Stage OS productizes both, which means Elite clients should receive Pro seats as part of their package (Sections 10.9 and 14.4).
- **Audience skew:** experts 45+, North America first, India second, with a global tail; segments include coaches and consultants, clinicians and health professionals, authors launching a book, late-career legacy authors, faith-based authors and executives.
- **Style:** the house voice is warm, direct, plain-spoken; "we will care" is the brand line; no fake scarcity, no countdown timers, no income promises.

---
## 2. The TEDx ecosystem: facts, rules and the legal line

Everything the product says to users about TEDx must be consistent with this section. The prompt library (Section 13) encodes these rules.

### 2.1 Scale and seasonality (what to tell users and what to plan for)

| Fact | Value | Source |
|---|---|---|
| Events per year | "More than 4000 events are now held annually" (TED program page); 3,300+ in 2023 per TED's Nov 2023 "State of the X"; "more than 3,000" in TED's Feb 2025 materials. Plan on 3,500 ± 500. | A1, A4 |
| Upcoming events in the official directory | 2,164 on 30 Oct 2026 (50 per page, 44 pages) | A2 |
| 2026 listings by country (Dec 2025 snapshot of 1,365 events) | US 306 (22%), India 190 (14%), Italy 69, UK 60, China 44, Canada 43, Türkiye 42, UAE 37, Brazil 37, Nigeria 26 | A3 |
| 2026 listings by quarter | Q1 62.4%, Q2 30.7%, Q3 5.1%, Q4 1.7% (counts grow as licenses are issued, so Q3/Q4 are under-counted at snapshot time) | A3 |
| Cumulative | 42,000+ events since 2009, 180+ countries, 200,000+ talks (Nov 2023); 250,000+ talks (Feb 2025) | A4, A5 |
| TEDx Talks YouTube channel (26 Oct 2026) | 44.7M subscribers, 272,588 videos, 9.16B views; mean ≈ 33,600 views per video; median not published and likely in the low thousands | A6 |
| Featured on TED.com | About 1% historically (122 of 12,900 by 2012); "less than 0.1%" per TEDxBoulder; editors pick "about 100 per year" | A7, A8, A9 |

**Product implications**

- The application calendar peaks mid-year for the following Q1. Build the "season planner" around this: June–October is application season; January–March is talk season.
- Most events are posted to the directory 2–6 months ahead, so the event database must be refreshed continuously, not annually.
- Views are a lottery. The product measures success as assets created and reused, applications sent, interviews, acceptances and stages booked, with views as a secondary metric.

### 2.2 How events work and how speakers are selected

**Licensing and event types.** A TEDx license is free, lasts one year, covers one event in one city and is non-transferable; event names are owned by TED. There are 13 event types (Standard, University, Youth, ED, Salon, TEDxPlay, TEDxLive, Women, Business, Internal, Library, Countdown, Studio). Attendance tiers: Community (≤100 attendees, $150 ticket cap, the default), Community Plus (>100, requires in-person attendance at a qualifying TED conference), Summit ($450 cap, after four 100+ events), Legacy (invite-only pilot). Programs run in 90-minute sessions of about four full talks; observed events feature 10–15 speakers. [A10, A11, A12]

**Selection is local and volunteer-run.** TED's guidance to speakers: there is no central application; apply only through a public form on the event's TED.com page or official channels; submit one nomination per person; teams "rely on research, local networks, and interviews more than pitch forms"; teams look for "original, innovative work that the speaker is actively doing, not a personal story alone." [A13]

**What the forms ask (canonical field set, compiled from eight real forms: TEDxJacksonville, TEDxWilson Park, TEDxBoulder, TEDxTCD, TEDxTinHau Women, TEDxWinnipeg, TEDxLinz, TEDxTerry Talks):**

| Field | Typical constraint | Notes |
|---|---|---|
| Central idea in one sentence | "avoid slogans or vague statements" | TEDxJacksonville: "Ninety percent of applicants are rejected based solely on their answer to question #1" |
| The belief your idea challenges and how | 100–250 words | |
| Why the idea matters now | 100–250 words, plus a 1–2 minute video (Jacksonville) | |
| Why you are the right person | 100–250 words | "ideas, not profiles"; peer credibility, original work |
| Have you presented this before; how did it change | | Mentioning other TEDx talks is a red flag at some events (TEDxDirigo) |
| How it differs from existing TED/TEDx talks on the topic | | |
| One recent accomplishment | ≤100 words | |
| Local connection | required at most city events | TEDxBoulder: must live, work or have a meaningful connection to Boulder County |
| Bio | 100–150 words (optional) to 250 words (Dirigo) | |
| Prior speaking video | optional at most; required at some | |
| Pitch video | 60–90 s (Minneapolis), 1–2 min (Jacksonville), ≤3 min (Linz) | "as if on stage": standing, well lit |
| Commitment to coaching and rehearsal dates | yes/no/discuss | Coaching is mandatory at most events; 3–5 hours/week (Jacksonville); 60+ hours total (Dirigo) |
| Consent | talk recorded, TED holds "exclusive rights to distribute and edit the recording worldwide, in perpetuity" | |

[A14–A19, A126–A129]

**Timelines.**

- Application windows close roughly 3–7 months before the event (Winnipeg 5–6 months; TCD 4 months; TinHau 7 months; Boulder about 10 weeks). Decisions arrive 2–8 weeks after close. Then 6–12 weeks of mandatory coaching with fixed in-person dates (TEDxBoulder: seven mandatory three-hour Tuesday practices; TEDxABQ: 12 weeks, at least 8 sessions, "even for seasoned speakers"). [A15, A17, A18, A127, A128]
- TED's recommended preparation calendar for organizers: 6 months out thesis and outline; 5 months script; 4 months second draft and first rehearsals; 3 months final draft; 2 months bi-weekly rehearsals; 1 month weekly; then a 2-week break; dress rehearsal 1–2 days before. [A12]
- Large Indian events (e.g., TEDxHyderabad) curate by invitation starting 8–10 months out, "3–4 speakers per idea"; smaller events in India and Canada can be under-subscribed (TEDxUNBC extended its deadline for lack of applicants). [A50, A51]

**Odds (the only quantified data points found).**

- TEDxThirdWard 2026: 786 applications → 155 semifinalists (≈20% first-round survival; final selection likely ≈1.5–2%).
- TEDx Bard College 2027: 65+ applications → 15 speakers (≈23%, closed university community).
- TEDxBoulder: double-blind review, top 30 interviewed, 12 chosen.
- TEDxCamden: 300+ applications → 8 selected. TEDxAlabaster: 600+ applicants for 2026.
- Coach-reported planning numbers: "most events accept 5 to 10% of applicants"; "apply to 5 to 10 events"; a coaching program told a client "the average is about 82 submissions before landing a first stage"; a 2026 first-person account: 10 applications, 8 rejections in a year, two still in play. [A8, A16, A52, A53, A121, A130, A131]

**Why applicants are rejected (organizer voice, verbatim themes).** Calling yourself a professional speaker, trainer or coach; saying another audience "loved" the talk; claiming you can speak about anything; self-promotion ("blacklist"); sending the same message to multiple organizers; not researching the event's theme or past talks; no angle "relatable to everyone"; no concrete action for the audience; lineup balance; "wanting to be on stage" rather than the idea; and, at TEDxDirigo, "signing up for courses or coaching that promise to help you land a TEDx talk." Content exclusions at some events: "life coaches, simple inspirational and motivational messages, linear life stories, and unfounded opinions" (TEDxPorto). [A18, A54, A55]

**What accepted speakers credit.** Theme alignment using the event's own language; prior video or online visibility (organizers "found her through the videos on her website"); local relationships and volunteering; a specific, intriguing title; a 1–2 minute pitch video; peer encouragement; applying again the next year. [A52, A56, A57, A135, A136, A138]

### 2.3 The rules every talk must obey (encode these in prompts and checklists)

| Rule | Detail | Source |
|---|---|---|
| Length | "Typically under 18 minutes"; 3 to 9 minutes described as ideal (TEDx Rules, as summarized in the research fetch; re-verify the exact wording before quoting it in product copy); TED tells organizers "8–10 minutes is a sweet spot"; TEDxMinneapolis targets 10–14; TEDxDirigo 6–12 | A20, A21, A27, A55 |
| No payment either way | "Speakers never pay, directly or indirectly"; events "may neither pay nor charge speakers"; "Fee-based 'TEDx services' are not legitimate. Talks tied to paid arrangements become ineligible for publication" | A13, A20 |
| No selling | No pitching products or services, no book plugs, no funding asks, no logos; "if it feels like an advertisement, it probably is" | A22 |
| Who is not a fit | "Professional or circuit speakers, such as motivational speakers and life coaches, are not a fit for TEDx events"; TEDx "discourages curating talks from speakers who are actively seeking participation in multiple TEDx events" | A22 |
| Politics and religion | No partisan politics, extremist or inflammatory positions; no proselytizing; "be wary of new age beliefs" | A22 |
| Science and health | Claims must be testable, peer-reviewed, consistent with established knowledge; "quantum consciousness" or "crystal healing" are "a major red flag"; talks must never be framed as medical advice | A22, A23 |
| Fact-checking and AI | "Never use AI as a substitute for fact-checking"; treat AI "like a tertiary source"; don't paste a full script into AI; speakers supply an annotated script with references; fact-checking takes 2–12 hours; "Don't use generative AI tools with copyrighted material or input not original to the speaker" (slides) | A23, A12 |
| Slides | Optional; one idea per slide; 1–2 lines; sans serif ≥42 pt (Speaker Guide); 16:9 1920×1080; no bullets, logos or watermarks; owned or CC images with credit; videos ≤30 s (Anderson) and never over 60 s; blank screen when not referring to slides | A12, A24, A25 |
| Rights | Speaker Release gives TED exclusive distribution; speakers receive a link, not the file; the TEDx Rules prohibit re-uploads, remixing and podcasts built on the talk; speakers may post a 60-second clip for non-commercial social use if they tag the official TEDx account, anyone else 30 seconds. TED's published content is licensed CC BY-NC-ND 4.0 and the Usage Policy requires the TED embeddable player; whether that policy covers TEDx talks is not stated explicitly, so treat the TEDx Rules as the binding text and the CC terms as the likely default | A20, A26, A27, A32 |
| Branding | Speakers must say the event is "an independently organized TEDx event, not a TED event"; never use the TED logo or the generic TEDx logo; never imply TED endorsement | A20, A28 |
| Publication | Uploads within one month of the event; review 3–5 business days; TED "reserves the right to remove, reject, annotate or limit the distribution of any TEDx talk"; one speaker reports that flagged talks can take up to six months and may never post | A29, A30, A60 |

**The ethical line the product sits on.** Paying for public-speaking coaching is allowed; paying to be selected is not. TED's own speaker page says coaching from the event is free and that fee-based "TEDx services" are illegitimate, and at least one organizer treats enrolment in "land a TEDx talk" courses as disqualifying. Therefore:

- Position the product as idea development, public-speaking preparation, event discovery and amplification tooling. Not "TEDx coaching", not "placement".
- Never suggest users mention the product, a coach or a program in an application. The in-app application reviewer flags any such mention.
- Never contact organizers on the user's behalf. The "organizer relationships" features (Section 6.4) help the user do it personally.
- Publish an ethics page that states all of this, and report pay-to-play offers users encounter to tedx@ted.com with their consent.

### 2.4 Trademark: why "TEDx OS" cannot ship, and how to name the product

**The controlling texts.**

- TEDx License Agreement §1: the marks may not be used "(b) in connection with any work or service purporting to offer guidance on how to give an effective TED Talk or TEDx Talk, or how to get chosen to deliver a TED Talk or TEDx Talk"; public-speaking guidance is permitted "provided that such works and/or services shall not in any way refer to TED." [A31]
- TED.com Terms of Use §7 (updated 7 May 2024): third parties are "not permitted to publish, display, distribute or use these marks [TED, TEDx, TED-Ed, Ideas Worth Spreading] ... for any purposes without prior written authorization." [A32]
- Enforcement history: a cease-and-desist against the parody show "Drunk TED Talks" (renamed), and license revocation of a Dubai event over speaker fees. [A33, A34]

**Risk assessment of "TEDx OS": high.** The name uses TED's registered mark as the dominant element, in exactly the service category the license agreement names. The better-established services keep the mark out of their brand names ("Speaker Accelerator", "From Dream to Speaker Stage", "Red Dot Coaching", "The Big Talk Academy", "Thought-Leader"); smaller offers that do use it ("UNMUTE Your TEDx", "TEDxCellence", a "TEDx Coaching" site) carry exactly the exposure this section describes and are not a precedent to copy. Note that the current internal product name "TEDx Engine" carries the same risk and should be retired at the same time.

**Naming brief.**

- Must not contain TED, TEDx, "TED-ready", "TEDstyle", or a three-letter red uppercase wordmark.
- Should describe the outcome (stage, talk, idea, spotlight, throughline) and work as a two-word phrase in a sentence ("open Stage OS").
- Must pass a trademark clearance search in the US (USPTO), India, UK and EU, and domain/handle availability.
- Descriptive use in copy is fine: "prepare a TEDx-style talk", "for speakers applying to independently organized TEDx events", "track your TEDx applications."

**Candidates to clear (decision for Ash):** Stage OS (used in this document as the placeholder); Throughline; Talkworthy; Spotlight OS; Idea Stage. Avoid "Red Dot" and "Ideaworthy" (too close to TED's stage imagery and to the "Ideas Worth Spreading" mark).

**Disclaimer text (footer, onboarding, pricing page, app-store listings; counsel to confirm the entity name):**

> Stage OS is an independent product and is not affiliated with, endorsed by, or sponsored by TED Conferences, LLC. TED and TEDx are trademarks of TED Conferences, LLC. TEDx events are independently organized under license from TED. Stage OS never charges for, sells, or guarantees speaking slots.

**Visual distance (Section 11):** no vivid red primary color, no black-and-white-only backgrounds with a red wordmark, no Helvetica or Inter Light as the logo face. TED's own TEDx logo rules prescribe exactly "TED Red #EB0028, Helvetica (or Inter Light), white or black backgrounds only," so any product that looks like that reads as TED at a glance. [A28]

### 2.5 What changed at TED in 2025–2026 and why it matters

On 4 Feb 2025 Chris Anderson opened a stewardship search; on 15 Oct 2025 TED announced it stays a nonprofit, Sal Khan joins the board as unpaid "Vision Steward", Logan McClure Davda becomes CEO, Jay Herratti (former head of TEDx) moves to the board, and Helen Walters remains head of media and curation; the handover happened at TED2026 in Vancouver (13–17 April 2026). No changes to TEDx licensing, pricing or the rulebook were announced. Anderson explicitly cited the volunteer culture of TEDx organizers as a reason to reject a for-profit route. TED's Terms of Use added explicit anti-scraping and anti-AI-training language in May 2024. [A35, A36, A37]

**Implications:** expect tighter control over data and AI (plan for no data access and no scraping), expect possible TED-made paid speaker education (differentiate on pipeline and outcomes, not on craft curricula), and expect the volunteer organizer network to be protected (so organizer-facing features must be free and respectful of their time).

---
## 3. The customer

### 3.1 Who buys, and what a TEDx talk actually does for them

The dominant stated motive is third-party credibility: being able to say "I spoke at a TEDx event" in a bio. Visibility and paid speaking come second. The only first-person, non-vendor business numbers found: Bobby Umar (5× TEDx speaker, April 2025) reports speaker fees up 2.5×, consulting fees roughly doubled and engagements up 40% after his first talk; Carrie Green's 2014 talk passed 1M views and "helped bring many people" to her association; an author's 2017 talk produced reader messages and "a handful of new Amazon reviews." Vendor claims ("4 million views", "250+ paid gigs", "guaranteed 50,000 views") are marketing, not data. [A56, A57]

The speaking business itself: SpeakerFlow's 2026 industry report (216 thought leaders) puts median revenue at $153K with 64.7% of revenue driven by referrals and word of mouth; its 2022 report found 65% charged under $5,000 per gig and 53% used no CRM. A TEDx talk's business value is therefore mostly realized when it is packaged into bios, reels and outreach that make referrals easier, which is exactly the step most speakers skip. [A58, A59]

### 3.2 Personas (five, with the vocabulary they use)

**P1. The Coach-Consultant ("Priya", 46, leadership coach, Toronto).** Has a framework and a program; wants "automatic credibility" and a fee ceiling raise. Biggest danger: she describes herself the way organizers reject ("coach", "speaker", "my program"). Needs identity translation from "coach with a program" to "person with a lived-experience idea." Pays for coaching already ($997–$4,997 programs). Time-poor: "I have a family and a full time job."

**P2. The Author ("Daniel", 58, cardiologist and first-time author, Dallas; an ABB/GBP client).** Launching a book; wants the talk as a platform extension. Danger: book-launch framing is a red flag; the book idea may be too narrow for a general audience. Needs the talk to be an adjacent, broader idea than the book. Arrives with a deadline (launch month) and a manuscript full of material.

**P3. The Executive ("Bonnie", 52, CMO, financial services).** Legacy-driven; fears the employer's reaction and "putting herself out there"; wants control over the message. Often invited rather than applying; short runway (8–10 weeks). Needs the fast-track "invited speaker" path and a script coach, not an event finder.

**P4. The Academic or Clinician ("Athene", 60, physicist).** Usually invited; the pain is format shift (scripting and memorizing a spoken talk: "my brain plasticity is not what it was"; "Actors can do it. I cannot."). Needs memorization tools, a blank-recovery plan, and help turning research into a story.

**P5. The India-based Expert ("Deepak", 38, digital-marketing educator, Chennai).** Large Indian events curate by invitation 8–10 months out; smaller ones have open calls; travel is self-funded; wants English-language coaching with Indian-English transcription and INR pricing with UPI. Visibility (a blog, a YouTube channel) got him invited.

**Common traits:** 35–60, time-poor, high standards, allergic to hype, used to paying for expertise, more afraid of looking foolish than of being rejected, and deeply motivated by the identity shift ("call myself a TEDx speaker", "stepping out onto the red dot").

### 3.3 Jobs to be done (ranked by willingness to pay)

| Rank | Job | Today's workaround | Why people pay |
|---|---|---|---|
| 1 | "Find one idea that is big enough" (and know it is not already a TED talk) | Weeks of circling; "too many ideas or none"; asking friends | Idea anxiety is universal; it is where coaches spend the first six weeks |
| 2 | "Find the events I can actually get into, and apply before the deadlines" | 20–40 hours of searching (vendor claim); spreadsheets; newsletters; private "rolodexes" | Discovery is the thinnest layer of the market; rolodexes are sold as $9,997-value bonuses |
| 3 | "Write an application that survives question 1" | Templates; $25–50/hour freelancers; coaching programs | 90% of applicants are rejected on the idea statement |
| 4 | "Write a talk that fits the time and sounds like me" | Google Docs; 50-minute first drafts; hiring a script coach ($799 for three sessions) | Organizer coaching helps, but some events (TEDxNCState, for example) use student curators rather than script coaches, and speakers hire their own |
| 5 | "Memorize it so I do not blank on stage" | Phone recordings, commutes, mirror, Toastmasters clubs | Memory blanks are the most-reported day-of failure, even after months of practice |
| 6 | "Make the talk pay me back" | Posting the link once; disappointment at 3,422 views | Referrals drive ~65% of speaker revenue; the talk only pays when repackaged |

### 3.4 The journey map (what happens, how long it takes, where people drop)

The moments below describe the customer's lived journey; the product's seven numbered stages (Section 5.1) are a different, product-side sequence, so this table uses names rather than numbers.

| Moment | Duration | What happens | Where people fail | Stage OS answer |
|---|---|---|---|---|
| Spark | 1–4 weeks | Peer says "do a TED talk"; excitement, then "panic because I didn't know what to talk about" | Never start; or start with a topic, not an idea | Idea Lab with the idea test battery (Section 6.1) |
| Position | 2–6 weeks | Choose one idea; test novelty; write the one-sentence version; shoot a pitch video | Pitch a topic or a motivational platitude; copy an existing talk | Idea scorecard, "has it been done" search, throughline builder |
| Discover and apply | 3–12 months | Find 5–20 events; tailor each application; track status; follow up; get rejected "dozens" of times | Mass pitches; no theme research; giving up after rejections | Event Finder, Application Pipeline, per-event personalization, rejection normalization |
| Accepted and coached | 6–12 weeks (up to 7 months) | Organizer coaching; script lockdown a month out; mandatory in-person rehearsals | 50-minute drafts; too many points; sounding scripted | Script Studio with time budget, organizer-milestone sync |
| Rehearse | 4–8 weeks, 55–100 hours total | Record, transcribe, edit, repeat; "one hour of rehearsal per minute of talk" | Blanking; over-rehearsed stiffness; nerves | Rehearsal Studio, memorization drills, recovery plan |
| Event day | 1–2 days | Dress rehearsal, mic, clicker, confidence monitor, the red circle | Mic failure, slide operator missing, blanks | Event-day kit and backstage card |
| Publication | 2–8 weeks after event (can be months if flagged) | Organizer uploads; TED review 3–5 business days; speaker gets a link | Expecting 2–3 weeks; talk "under review" | Launch kit with realistic timeline and pre-built assets |
| Amplify | 12+ months | Launch, repurpose, pitch stages | Posting once; refreshing the view counter | Encore tier: clips, press kit, outreach, stats |

Durations and failure points come from 28 first-person accounts indexed in the voice-of-customer research (Appendix A, items A52–A61 and A134–A145).

### 3.5 Voice-of-customer vocabulary (use these words in onboarding, copy and prompts)

- **Idea anxiety** (the underlying question is whether the idea is big enough): "no clear idea or too many competing ideas"; "it's been done before"; "not five ideas, one single idea, which is not easy."
- **Not knowing how it works:** "Not sure WHO or WHERE to go"; one 2026 applicant was surprised to learn anyone can apply, having assumed a TED talk came after establishing herself as a speaker.
- **Rejection:** "rejection after rejection"; "8 rejections stung a bit"; "Are you ready to be rejected dozens of times?"
- **Dread:** "lovely news, but scary"; "the talk of your life"; "the most terrifying 40 seconds"; "my brain plasticity is not what it was"; "Actors can do it. I cannot."
- **Time and cost:** "I have a family and a full time job"; "fly across the country and donate two days to speak for six minutes for free."
- **Post-talk deflation:** "refreshed it constantly"; "I lost track of what was actually important"; "under review."
- **Triumph:** "Dreams do come true"; "excessive squealing and dancing when I got that official 'Congratulations' email"; "call myself as a TEDx speaker"; "intense, excruciating and rewarding."

Sources for the quotations above: A52, A60, A61, A134–A145.
- **Craft maxims speakers repeat:** "killing my darlings"; "when you squeeze too much in, you squeeze the audience out"; "you can't rehearse authenticity"; "the first sentence is key."

### 3.6 Expectation management (a product feature, not a disclaimer)

Onboarding states, in plain words: most open-call city events accept a single-digit percentage of applicants; expect to apply to 10–20 well-matched events over 3–12 months; many speakers are rejected dozens of times before a yes; a first-year view count in the low thousands is normal; fewer than 1% of TEDx talks are lifted to TED.com and it can take 15 months. Then it shows what the product tracks instead: applications sent, interviews, acceptances, assets built, stages booked. This honesty is a positioning asset against vendors who promise "millions of views in 30 days."

### 3.7 Segment playbooks (how the product adapts)

| Segment | Onboarding path | Default settings | Copy angle |
|---|---|---|---|
| Coach / consultant | Full journey from Idea Lab | Identity-translation prompts on; self-promotion linter strict | "Lead with the idea, hide the business" |
| Author (incl. GBP clients) | Idea Lab seeded from manuscript or book summary | "Adjacent idea" generator; book-plug linter | "The talk is the front door, the book is the house" (never say this on stage) |
| Executive / invited speaker | "I've been invited" fast track: skip Find, start at Write with event date | Short-runway plan (8–10 weeks) | "You have the invitation; now get the words right" |
| Academic / clinician | Invited fast track; story-extraction interview | Jargon test on; fact-check flags on by default | "Turn research into a story" |
| India-based | Event Finder defaults to India + remote-friendly events; INR pricing; en-IN transcription | Travel-cost filter | "Events near you, in your language" |
| TEDxYouth (minors) | Parent/guardian-managed account only; recording features 18+ | | |

---
## 4. Competitive analysis

Prices below were read from vendor pages on 29–30 October 2026 unless dated otherwise. Sources: Appendix A items A38, A39, A61, A62–A69 and A101–A110.

### 4.1 The landscape in one picture

```
                      HIGH TOUCH (humans)
                            |
   Done-for-you placement   |   Coaching cohorts / academies
   MIC $14,997 "we pitch    |   Big Talk Academy ($4,997 in 2022; now
   you until selected"      |   price on application), Thought-Leader
   Speaker Lab VIP $14-15K  |   30DTL $997, UNMUTE $2,500-4,500,
   Brouk 1:1 $120K/yr       |   TEDxCellence $3,997, Moxie $1,995-4,495
   Speaker Salon $30K       |   Heroic Public Speaking (unpublished)
                            |
 PIPELINE ------------------------------------------------ CRAFT
 (events, applications,     |   (idea, script, delivery)
  outcomes)                 |
                            |
   Discovery & CRM tools    |   AI practice apps / courses
   Speaker Accelerator      |   Yoodli $8-20/mo, Orai $12.99/mo,
   Substack ($48 class),    |   Speeko $24.99/mo, VirtualSpeech $45/mo,
   SpeakerHub $0-350/yr,    |   Verble $14.99 one-time, MS Speaker
   SpeakerMatch $30-80/4wk, |   Coach free, TED Masterclass $49.99,
   Innovation Women         |   Toastmasters $169/yr, Ultraspeaking
   $159-249/yr, Sessionize  |   $99/mo, Coursera free
   (free for speakers)      |
                            |
                      LOW TOUCH (software)

   Stage OS target position: center-right-top. Software-led pipeline
   + craft, with a human layer at the top tier. Nobody occupies it today.
```

### 4.2 TEDx coaching and placement services (the real competitors for the wallet)

| Vendor | Offer | Price | Claims | Guarantee | Weakness vs Stage OS |
|---|---|---|---|---|---|
| Thought-Leader / Leadr (Taylor Conroy) | "30 Day Thought Leader": course, community, one 1:1 call, "Private TEDx Events Rolodex" ("updated monthly"), talk-writing course, "Paid Speaker Blueprint", "Six Figures in Six Months Talk Marketing" | $997 (or 3 × $497 = $1,491); "regular investment $9,997"; countdown timers | 650+ clients landed talks (400 in Apr 2023; "1,000+ stages" on homepage); "100,000,000+ talk views"; "as little as 2 applications"; "guaranteed at least 50,000 views" (2023 podcast) | 60-day refund conditional on completing the course and "Apply to 20 TEDx events (Takes 3 hours max)" | Static rolodex, no application tracking, no delivery analytics, inconsistent claims, BBB D+ with one unanswered complaint (file opened Oct 2026) |
| Masters in Clarity (Dolores Hirschmann) | Done-for-you research, submission and follow-up; up to 5 strategy sessions; written talk; "roughly 10 events per month" | $14,997 one-time | "Most speakers land their stage within roughly 6 months"; 2 clients/month | None stated | Manual, expensive, opaque; the product automates the research and tracking it sells |
| Tricia Brouk, The Big Talk Academy | 12-week certification cohort; weekly group calls; speaker directory | $4,997 (2022); now price on application; $47 masterclass funnel; Speaker Salon $30K; 1:1 $120K/yr | "thousands of speakers", "countless TEDx stages" (no number); ~$600K/yr revenue, 8 staff | None | Craft and community, no pipeline tooling |
| UNMUTE Your TEDx (Dr. Rita Renee) | High-touch coaching | $2,500 (3–6 months) / $4,500 (6–12 months) | "does not guarantee TEDx stage selection" | None | Human-only, small scale |
| TEDxCellence (Bennett Ink + Marie Incontrera) | 10-week mastermind; pitch materials; 90-second idea video | $3,997 | Marie "landed every single one of her clients" (no count) | "makes no guarantees" | Page still advertises a Feb 2022 cohort |
| Moxie Institute | TED-style talk online class bundles | $1,995 / $3,295 / $4,495 for "3+ hours" of training plus bootcamp | "veteran TEDx coaches" | None | Weak price-to-value |
| Wise Whisper Agency (Ashley Stahl) | Agency booking | Not published | "booked more than 120 TEDx talks" | None | Opaque |
| The Speaker Lab (Grant Baldwin) | 6-month cohorts for paid speaking; VIP Accelerator | VIP $14,000–$15,000; Core/Premium customized with 3–36-month financing; $297 bootcamp; $1 book pack | "17,000 speakers trained"; first paid gig in 90–180 days | "Booked or Extended" | Not TEDx-focused; expensive |
| Heroic Public Speaking | CORE 2-day (free with $1,000 refundable deposit); GRAD programs | Unpublished | NPS "99" | "you will be a better speaker. Guaranteed." | Premium retreats, no booking pipeline |
| Speaker Accelerator (Geleen Antonio) | Substack roundups of open TEDx calls; monthly masterclass; 1:1 application strategy sessions | $48 per masterclass; sessions unpriced | Pulled all 1,365 2026 listings by hand | None | One person, manual, no software |
| Low-ticket | Kelliann McDonald "How to Land Your First TEDx Talk" $37; Str8ghtup "Road to TEDx" $29.99; Insight Coaching Community $1,497 (12 × $130 Afterpay); Dr. mOe Anderson $799 for three sessions | | | | Information products; no tooling |
| Freelance labor | Upwork "TEDx Application Writer" role at $25–$50/hour to tailor applications and track statuses; Fiverr "help you get accepted for tedx" gigs | | | | Proof that the job is done by hand today |

**Reading the table.** The market has four price bands: $30–$100 self-serve guides; $997–$4,997 courses and cohorts; $10K–$15K done-for-you; $30K–$120K bespoke. A $149–$499/month subscription lands in the gap between bands one and two and is cheaper over six months than every cohort, while delivering tooling none of them have.

### 4.3 Speaker platforms, CRMs and discovery

| Platform | Price | What it does | TEDx coverage | Application tracking |
|---|---|---|---|---|
| SpeakerFlow | $3K/$6K/$10K setup + $99/user/month (Zoho) | Speaker-business CRM; "not a coaching company, agency or bureau"; declines early-stage speakers | None | Generic CRM |
| SpeakerHub | Free / $149.99 / $349.90 per year | Directory, speaker page, one-sheet PDF, opportunity board (paid leads on Gold) | Not mentioned | No |
| SpeakerMatch | $30 / $50 / $80 per 4 weeks ($325 / $520 / $845 per year); bundles eSpeakers Basic ("$179 value") | Job leads, profile, "PitchPerfect" writing tools | Not mentioned | No |
| Innovation Women | $159 / $199 / $249 per year | 2,500+ women speakers; "50–100 new opportunities weekly"; "tools to manage speaking applications" | One TEDx event on its calendar | Basic |
| Sessionize | Free for speakers; $499/event for commercial organizers | CFP tool; 319K speakers; submission-status tracking for Sessionize-hosted calls | Used by some events (TEDxOslo2026) | Only for Sessionize-hosted CFPs |
| Bureaus (BigSpeak, AAE) | Commission 25–35% | Represent speakers already at $10K+ fees with 10+ paid gigs/year and a book; exclusive needs $300K gross | n/a | n/a |

**Gap:** no platform offers a TEDx-specific opportunity feed with theme tags, deadlines and "accepting applications" status, and none offers application tracking across the heterogeneous forms TEDx events actually use. The TED directory itself has search, upcoming/past, date and webcast filters only.

### 4.4 AI speech-practice and presentation tools

| Tool | Price (2026) | Measures | Built for | Why it fails a TEDx speaker |
|---|---|---|---|---|
| Yoodli | Free: 5 lifetime sessions (any run >30 s counts); Pro $8/mo annual ($11 monthly), 10 roleplays/week; Advanced $20/mo annual ($28 monthly), unlimited; enterprise quote (~$600/user/yr reported) | Filler words, pace, conciseness, structure, tone, eye contact (listed on partner page), word choice | Enterprise sales/leadership roleplay after a $40M Series B at >$300M valuation; uses Gemini and GPT; no mobile app | Session caps; "doesn't always evaluate the quality or strategy of what you're saying"; Toastmasters members report the free partnership being revoked and data used for training |
| Orai | $12.99/mo, $49.99/yr, $99.99 lifetime (in-app); 7-day trial, no free plan | Filler, pace, clarity, energy, confidence, conciseness | Mobile drills, English only; $2.3M seed 2019 | "Unable to upload recordings for analysis"; no gesture feedback; stability complaints |
| Speeko | $24.99/mo, $79.99–$99.99/yr (in-app); $299.99 lifetime (web) | Pace, filler, tone, pauses, "storytelling structure"; new course "From Idea to Applause" for TED-style talks | Apple-first (1.7★ on Google Play) | Filler false positives ("flags 'well' used correctly"); repetitive tips; coaching upsell called "shady" |
| Poised | Was $13/mo annual, $19 monthly | Live-meeting coaching | Shut down 8 Oct 2026 despite a $4.5M seed and 4.5★ on G2 | Gone; accounts deleted |
| VirtualSpeech | $45/mo or $399/yr; enterprise custom | Pace, hesitation words, eye-contact heatmap (head direction), body language, roleplay content scores | VR and web; enterprise | "Feedback generic" (2024 review); most expensive individual plan |
| Microsoft Speaker Coach | Free in PowerPoint/Teams | Pace (100–165 WPM target), filler, monotone, originality, inclusive language; body language web-only, seated | Everyone | Reports "disappear" when closed; English only; no history |
| Verble | $14.99 one-time | AI speechwriter with practice center | Students, nervous presenters | No delivery analysis |
| Wellspoken, Vocal Image, EchoPitch, SpeakUp Coach, Speakio, Presento, Hold the Floor | $0–$37/month; session packs | Filler, pace, confidence indices; some face analysis | Short drills; interviews | None built for one memorized 8–18 minute talk; none offer memorization or rehearsal scheduling beyond streaks |
| Teleprompters: Speakflow (free / $15 / $99 per month yearly), Teleprompter.com (free / $7.50 / $24.99 per month yearly) | | Voice-activated scrolling | Video creators | Speakflow's voice scroll "glitches" on ~20-minute scripts (Capterra) |

**Gap:** the delivery-metric set (filler + WPM + a tone score) has commoditized down to $0. Differentiation comes from context (the user's actual script and event), long-form support, longitudinal private history with a no-training guarantee, memorization tooling, and stage-style (standing, moving) body-language feedback, which almost no tool provides.

### 4.5 Craft courses and communities

TED Masterclass (TED's own course, Chris Anderson, 11 lessons) was listed at $49.99 one-time in a 2023 app-store listing (the current in-app price could not be confirmed) and teaches craft only; Toastmasters costs $72 per six months plus $25 (357K members); Ultraspeaking $99/month for daily live practice; Coursera's public-speaking course has 401,286 enrollees and is free to audit; Duarte and Gallo are quote-only. None touch applications, event matching or amplification. [A38, A39]

### 4.6 Gap summary: what nobody offers today

1. A verified, continuously refreshed database of open TEDx calls with theme tags, deadlines and "accepting applications" status.
2. A pipeline/CRM purpose-built for TEDx applications (status, follow-ups, re-application rules, organizer notes).
3. AI drafting that adapts one idea to each event's theme and form fields while enforcing TED's content rules.
4. A writing-plus-rehearsal studio designed for an 8–18 minute memorized talk, with time budgets, version history, memorization drills and full-length analytics.
5. An amplification kit that is compliant with TEDx sharing rules and converts the video into business assets.
6. Published cohort outcome statistics (applications → interviews → selections → published).
7. A credible ethics stance (no pay-to-play, no fake nominations, no "guaranteed stage"), which the Dubai scandal makes valuable.

### 4.7 Positioning statement

For experts, coaches, consultants and authors who want a TEDx-style talk to work for their authority and their business, Stage OS is the end-to-end preparation and pipeline platform that takes one idea from first draft to published talk and beyond. Unlike coaching programs that sell a static "rolodex" and manual application help for $997–$14,997, and unlike $10/month practice apps built for two-minute drills, Stage OS combines a live database of open calls, an application pipeline, AI drafting that obeys TED's rules, a long-form rehearsal studio and a compliant amplification kit, with human coaching at the top tier and honest outcome statistics. It never sells slots and never promises selection.

**Tagline candidates (decision for Ash):** "One idea. Every stage." / "From expertise to the red circle, the honest way." / "The operating system for your signature talk."

### 4.8 Differentiation checklist (features competitors would need to copy)

| Differentiator | Hard to copy because |
|---|---|
| Curated open-call database with freshness SLA | Requires ongoing curator labor and organizer relationships; TED data cannot be scraped |
| Outcome statistics | Requires a pipeline that captures outcomes; coaching vendors have no denominators |
| Rule-enforcing AI (content guidelines, self-promotion linter) | Requires the prompt library and rubric work in Section 13 |
| Founder credibility with an existing author audience | GBP's challenge funnel and author network |
| Honest expectation-setting | Vendors cannot adopt it without undercutting their own claims |

---
## 5. Product architecture

### 5.1 Four pillars, seven stages, one spine

The user's four pillars map to seven stages. Stages are sequential by default but can be entered out of order (an invited speaker starts at Stage 4).

| Pillar | Stage | Name | User outcome | Key artifact |
|---|---|---|---|---|
| FIND | 1 | Position | One idea that passes the idea test battery; a one-sentence throughline; a speaker profile | Idea Card (locked) |
| FIND | 2 | Discover | A ranked shortlist of events with deadlines and match reasons | Target List |
| FIND | 3 | Apply | Submitted, tailored applications tracked to outcome | Application records |
| WRITE | 4 | Write | A stage-ready script that fits the slot | Script v1…vN (locked version) |
| DELIVER | 5 | Rehearse | The talk known cold, delivery metrics trending right | Rehearsal log, readiness |
| DELIVER | 6 | Perform | Event day executed without surprises | Event-day kit |
| AMPLIFY | 7 | Launch and leverage | Published talk converted into assets, outreach and stages | Launch plan, clips, press kit, stats |

**The spine is the Talk Record.** Every artifact hangs off one `talk` object: profile snapshot → idea → throughline → target events → applications → script versions → rehearsals → event → published video → launch plan → outcomes. A member can have more than one Talk Record (a second idea for a different event), but the product defaults to one at a time because TED discourages multiple-stage hunting and because focus is the whole point ("not five ideas, one single idea").

### 5.2 Navigation and information architecture

Desktop: a persistent left rail with five top-level items and a completion ring on each pillar. Mobile: a bottom tab bar (Today · Journey · Record · Library · Me).

```
Left rail
├── Today            (home: next best action, this week's plan, deadlines)
├── Journey          (the path view: 7 stages with milestone nodes)
├── FIND
│   ├── Idea Lab
│   ├── Event Finder
│   └── Applications
├── WRITE
│   ├── Script Studio
│   ├── Slides checker
│   └── Fact-check
├── DELIVER
│   ├── Rehearsal Studio
│   ├── Memorize
│   └── Event-day kit
├── AMPLIFY
│   ├── Launch plan
│   ├── Clips and press kit
│   └── Talk stats
├── Coaching         (clinics, reviews, 1:1; tier-gated)
├── Community
└── Me               (profile, plan, credits, data, consents)
Admin (role-gated): Members · Events curation · Coaching ops · AI settings · Reports · Access
```

Rationale (Section 11.4): pillars are parallel but the program is sequential; the rail gives orientation, the Journey path gives sequence, Today gives the one action. This follows the measured patterns at Duolingo (single guided path, "you are here" marker) and Headspace (a "Today" surface that decomposes a long goal into one small action; deep-linked nudges produced +109% week-1 retention vs control). [A70, A71]

### 5.3 The Today screen (home)

Contents, top to bottom:

1. **Next best action card:** one primary CTA deep-linked to the exact step, with a time estimate and a reason ("12 min · because your throughline is locked, draft the Why-now paragraph for TEDxWilson Park, deadline in 9 days"), plus one secondary "or do this instead."
2. **This week:** a 7-dot weekly commitment row (default target: 3 practice blocks or 2 applications, set by stage) with a pause/freeze control. Weeks are celebrated, not days (Peloton's weekly streak; Duolingo's "give learners an option to take breaks" finding). [A72]
3. **Deadlines:** the next three application deadlines or organizer milestones, each with a countdown and an ICS link.
4. **Pipeline snapshot:** applications by status (planned / applied / follow-up / interview / accepted / declined).
5. **Readiness (once in Stage 4+):** script fit to time, last rehearsal pace, memorization coverage.
6. **Coach and community:** next clinic, unread review comments.

### 5.4 Onboarding (first session must produce an artifact)

Target: the user leaves session one with a scored idea and a shortlist of three events in under 12 minutes.

1. **Pick a path:** "I want to apply" (full journey) / "I've been invited" (fast track: event name, date, slot length) / "My talk is published" (Encore).
2. **Three profile questions only:** expertise in one line, city and country, target talk date. Everything else is requested contextually (WCAG 3.3.7 Redundant Entry; progressive profiling).
3. **Idea spark:** paste a bio, a book summary or a LinkedIn "About"; or answer TED's five discovery prompts (controversy in your field; misconception to clear up; why it matters and to whom; who disagrees and why; how you carried it out). The Idea Lab returns 5 candidate ideas with scores.
4. **Pick one, see the match:** the Event Finder shows the three best-matched upcoming events with deadline and match reasons.
5. **Expectation screen** (Section 3.6), then the Journey view with Stage 1 unlocked and the next action set.

Free users can do all of the above (one idea batch, one scoring, three event matches) before any paywall. The reverse-trial variant (14 days of Pro, then fall back to Spark) is the recommended default for the first six months (Section 10.4).

### 5.5 Roles

| Role | Who | Can |
|---|---|---|
| Visitor | Not logged in | Marketing site, pricing, public "open calls this week" preview (3 events, no deadlines) |
| Member (Spark / Builder / Pro / Inner Circle / Encore) | Paying or free users | Own Talk Records; tier-gated features and credits |
| Coach | GBP-certified coaches | Review queue, clinic hosting, comments on scripts and applications, no billing data |
| Curator | Event-database staff | Event submissions queue, verification, dedup, organizer claims |
| Admin | GBP staff | Everything in the rebuild plan's admin screens plus coaching ops, pricing, AI settings |
| Organizer (v2) | Verified TEDx organizers | Claim and edit their event listing, post the call, receive nothing else (free, no inbox access to members) |
| System | Jobs | Imports, reminders, metrics, retention deletes |

Access states (invited / active / paused / removed) and the RLS rules carry over from the rebuild plan unchanged.

### 5.6 Notification and nudge design (evidence-based)

- One weekly plan email, Sunday evening or Monday morning (fresh-start effect: goal-directed behavior spikes at week starts; commitment contracts +62.9% at week start). [A73]
- One mid-week in-app or push nudge deep-linked to the single next step.
- Milestone-triggered messages (idea locked, first application sent, acceptance, script locked, first full run under time, talk published).
- Deadline reminders at 14, 7, 3 and 1 days (ICS plus email), and organizer-milestone reminders once an acceptance is logged.
- Re-engagement at month starts and after holidays; a "fresh start" screen after a missed week that resets the weekly target without shaming.
- SMS only for time-critical items (coaching session in 1 hour; deadline today), opt-in.
- Member-controllable from Me → Notifications; defaults on.

### 5.7 Progress and motivation mechanics

- Journey path with gold completed nodes and a floating "you are here" marker.
- Per-pillar completion rings; no global percent-complete hero (months-long programs stay low for a long time).
- Weekly commitment unit with optional daily momentum count; pauses allowed.
- Celebration cards tied to real artifacts (first draft, first 5-minute recording, first run under time, acceptance), share-ready for LinkedIn (no TED logo, no implied endorsement).
- Cohort stats visible to members: "This month, members sent 412 applications and logged 9 acceptances."

### 5.8 The two modes that cut across everything

- **Guided mode (default):** the product recommends the next step and explains why.
- **Expert mode:** all tools unlocked, no hand-holding, for repeat speakers and coaches. Toggle in Me → Preferences.

---
## 6. Pillar 1: FIND (Position → Discover → Apply)

Each feature carries an ID (F-pillar.module.number), a tier (S = Spark/free, B = Builder, P = Pro, IC = Inner Circle, E = Encore) and a phase (MVP, V2, V3). Credit costs refer to the AI-credit system in Section 10.3.

### 6.1 Idea Lab (Stage 1: Position)

**Purpose.** Turn expertise into one idea that passes the tests organizers actually apply, before any event is touched. Organizers reject most applicants on the idea statement alone; coaches spend the first six weeks here.

**Screens.** Idea Lab home (candidate ideas as cards) · Idea Card detail (scorecard, throughline, antagonist, evidence, stories, "has it been done" results) · Idea Interview (conversational intake) · Compare (two ideas side by side) · Lock (confirm the one idea).

**Features.**

| ID | Feature | Description | Tier | Phase | Credits |
|---|---|---|---|---|---|
| F1.1.1 | Idea Interview | A 10–15 minute conversational intake that asks TED's five discovery prompts plus three about lived experience and original work; can be voice (recorded, transcribed) or text; produces a "raw material" dossier | S (1 free) | MVP | 10 |
| F1.1.2 | Idea Generator | Generates 5 candidate ideas from the profile, dossier, book summary or pasted material; each with a ≤15-word throughline, the belief it challenges, who would disagree, the evidence base, and the audience action; excludes topics, motivational platitudes and personal narrative alone | S (1 batch), B/P/IC unlimited | MVP (exists in v1; upgrade prompt) | 10 per batch |
| F1.1.3 | Idea Scorecard | Scores each idea against the 9-criterion idea rubric (Section 13.3) with Level 1–4 descriptors and one-line reasons; gates: an idea that scores Level 1 on "idea, not topic" or "arguable" cannot be locked | S | MVP | 5 |
| F1.1.4 | "Has it been done?" | Searches the user's topic against a TEDx/TED talk-title index (built from the user's own pasted titles, public YouTube titles via YouTube Data API `search.list` within quota, and curator-maintained lists) and returns the closest 5 talks with a "how yours must differ" note | B | MVP (manual paste) / V2 (API) | 5 |
| F1.1.5 | Throughline Builder | Iterative refinement to one sentence of ≤15 words; "read it aloud" check; friend test (sends a one-question form to 3 contacts: "summarize this in your own words"; mismatch triggers a rewrite) | S | MVP | 3 |
| F1.1.6 | Adjacent-idea mode (authors) | For authors: proposes ideas adjacent to and broader than the book's thesis; book-plug linter warns when the idea is the book | B | MVP | included |
| F1.1.7 | Identity translation (coaches) | Rewrites "I'm a leadership coach with a 5-step program" into "person with lived-experience idea" framing; shows the before/after and the organizer rule it satisfies | B | MVP | included |
| F1.1.8 | Idea Expansion | Thesis, why it matters, 3–5 key points, 3 candidate stories (specific moment, sensory detail, change), evidence to find, the "what is / what could be" contrast | S (1) / B+ | MVP (exists in v1) | 10 |
| F1.1.9 | Idea Lock | Marks one idea as the Talk Record's idea; snapshots the profile; later stages read only the locked idea; unlocking creates a new Talk Record version | S | MVP | 0 |
| F1.1.10 | Coach review of idea | Human coach writes a 150-word note and a rubric score within 3 business days | IC (included), P (add-on) | V2 | n/a |

**AI behavior rules.** Every generation runs the Content-Guideline Linter (Section 13.2): flags selling, book plugs, political/religious persuasion, unsupported health claims, "professional speaker" framing. Flags are shown inline as chips with the rule quoted.

**Data.** `ideas` and `idea_expansions` from the rebuild plan, extended with `throughline`, `belief_challenged`, `antagonist`, `evidence_notes`, `audience_action`, `score jsonb`, `similar_talks jsonb`, `locked_at`.

**Metrics.** Time to first scored idea (target < 8 minutes); % of free users who lock an idea (target 35%); idea rubric median score at lock (target ≥ Level 3 on all criteria).

**Acceptance checks.** Generated ideas survive refresh; the scorecard explains every score with a quoted criterion; a motivational platitude ("be your authentic self") always scores Level 1 and cannot be locked; the linter catches "my program", "my book" and "as a coach" in a seeded test set of 50 phrases.

### 6.2 Event Finder (Stage 2: Discover)

**Purpose.** Replace 20–40 hours of searching with a ranked, explained shortlist of events the user can realistically get into, with deadlines they will not miss.

**Data sources (in priority order; see Section 12.5 for the pipeline).** Organizer self-submissions (verified by email to a TEDx-licensed address); curator research from organizer websites, university newsrooms, chamber sites, Sessionize pages, Instagram/LinkedIn posts; user tips with "report outdated"; weekly single-page re-verification of events already in the database; and the canonical TED event page as a deep link only. No crawling of ted.com.

**Event record (what the user sees).** Name, city, country, map pin, event date, type (Standard/University/Youth/Salon/Women/…), attendee tier if known, theme, "accepting applications" status (open / closed / by nomination / invitation-only / unknown), application deadline, form link, form fields summary, pitch-video requirement, local-connection requirement, talk length target, prior-year speakers and themes (curated), organizer website, Instagram/LinkedIn, last verified date and confidence, "why you match."

**Features.**

| ID | Feature | Description | Tier | Phase |
|---|---|---|---|---|
| F1.2.1 | Match ranking | Score = theme/topic similarity (pgvector cosine between the idea embedding and the event theme and past-talk embeddings) + geography (same city 3, region 2, country 1, remote-friendly bonus) + deadline fit (open and ≥14 days away) + open-call likelihood (Standard/University with "Spaces available" > invite-only) + lineup-gap bonus (curated: themes under-represented last year) | S (top 3), B+ (full) | MVP |
| F1.2.2 | "Why you match" | Three-line explanation per event (theme overlap, distance, deadline fit) and one caution ("requires local connection to Boulder County") | S | MVP |
| F1.2.3 | Filters | Country, region, city radius, date range (default today → 270 days), type, status, deadline window, talk length, "virtual pitch accepted", "travel covered" (rare; curated), "matches my topics" | B+ | MVP |
| F1.2.4 | Deadline alerts | Email + ICS at 14/7/3/1 days; per-user calendar feed URL | B+ | MVP |
| F1.2.5 | Target List | Save up to 25 events (B), 50 (P), unlimited (IC) with a private note and a priority; one-click "Track" creates a planned application | B+ | MVP |
| F1.2.6 | Season planner | Shows the application calendar (62% of events in Q1; windows close 3–7 months out) and proposes a 90-day application sprint with weekly targets | B+ | MVP |
| F1.2.7 | Event intel page | Past-year speakers and talk titles (curated links to the official TEDx YouTube videos; no re-hosting), theme history, production quality notes, "what their form asks" | P+ | V2 |
| F1.2.8 | Curated shortlist (human) | Inner Circle: a curator hand-picks 10 events per month with a note on each and a suggested angle; delivered in-app and by email on the 1st | IC | V2 |
| F1.2.9 | Open calls this week (public) | Marketing page listing 3 open calls without deadlines; email capture for the full list | Visitor | MVP |
| F1.2.10 | Organizer claim | Verified organizers claim their listing, edit fields, post or close the call; free, no member data shared | Organizer | V2 |
| F1.2.11 | Report outdated | One-click flag routes to the curator queue; member sees "thanks, checking" and a resolution | S+ | MVP |

**Freshness SLA (displayed in the UI).** Every event with a future deadline re-verified at least every 14 days; `last_verified_at` shown on every card; auto-expire 30 days after the event date. Budget 0.25–0.5 FTE curator for a 1,000–2,000 event catalogue.

**Metrics.** Catalogue coverage (events with deadline known / events upcoming; target 60% at month 6); median `last_verified_at` age (target ≤ 10 days); % of applications sent to events discovered in-app (target 60% by month 12, rising toward 80% as coverage grows); "report outdated" rate per 100 cards (target < 2).

**Acceptance checks.** Events in the next 7 days are shown; "why you match" is correct for 5 test profiles; an event marked invitation-only never shows an "Apply" CTA; deadline reminders fire once per interval and never when disabled; deleting an event cascades to tracked applications as "event cancelled" without deleting the user's notes.

### 6.3 Application Pipeline (Stage 3: Apply)

**Purpose.** A CRM for the real process: 5–20 applications per cycle, 2–4 rounds, two-week follow-ups, next-year re-applications, with every application tailored and every status honest.

**Pipeline stages (Kanban and table views).** Planned → Drafting → Ready (passes the rubric) → Applied → Follow-up due → Interview/Audition → Accepted → Declined → Withdrawn → Reapply next cycle. One application per member per event per cycle (unique on `user_id, event_id, cycle_year`).

**Features.**

| ID | Feature | Description | Tier | Phase |
|---|---|---|---|---|
| F1.3.1 | Application record | Event, pitch version used, fields with answers (stored per event form), status, applied date, next action date, organizer contacts (user-entered), notes, outcome, rejection reason (if known) | S (3 records), B+ (unlimited) | MVP |
| F1.3.2 | Form Mapper | Maps the event's known form fields onto the member's Pitch Pack so each answer is pre-filled from the right source (one-sentence idea → Q1; why now → Q3…); supports custom fields the curator adds per event | B+ | MVP |
| F1.3.3 | Per-event personalization | Rewrites the Pitch Pack for this event: theme language, local connection, talk-length target, "why this audience"; shows a diff against the base pack; never invents facts (claims come only from the profile and dossier) | B+ (10/month), P+ (unlimited) | MVP |
| F1.3.4 | Application Readiness Score | Scores the draft against the 8-criterion application rubric (Section 13.4); blocks "Ready" below Level 3 on idea statement, why-you and compliance; lists the exact fixes | B+ | MVP |
| F1.3.5 | Self-promotion and compliance linter | Flags "coach", "speaker", "my program", "my book", "other TEDx talks I gave", mass-pitch phrasing, mentions of courses or this product, and anything that reads as selling | S+ | MVP |
| F1.3.6 | Submit assist | Opens the organizer's form in a new tab with a copy panel for each answer (the member pastes and presses submit; the product never submits); marks Applied on confirmation | B+ | MVP |
| F1.3.7 | Follow-up engine | Default next action 14 days after applying ("brief, friendly email"); drafts the follow-up; reminds; logs the reply | B+ | MVP |
| F1.3.8 | Interview and audition prep | Generates likely questions ("summarize your core message", "how will you support the idea outside the stage", "how do you feel about coaching"), a 3-minute pitch script for "speed-dating" auditions (TEDxABQ format), and a mock Q&A roleplay with AI | P+ | V2 |
| F1.3.9 | Outcome logging | Accepted / declined with optional reason; "ask for feedback" email draft (organizer opinions differ; both options offered); re-apply reminder for next cycle | B+ | MVP |
| F1.3.10 | Cohort stats | Anonymized funnel across members: applications → interviews → acceptances by event type, region and month; shown in-app and published quarterly | S+ | V2 |
| F1.3.11 | Human application review | A coach reviews up to 2 applications per month with tracked changes and a rubric; 3-business-day SLA | IC (included), P (add-on credits) | V2 |
| F1.3.12 | Export | Application record as PDF/DOCX; pipeline as CSV | B+ | MVP |

**Metrics.** Applications sent per paying member per month (target 3); % of applications that pass Readiness before sending (target 90%); interview rate and acceptance rate by cohort (publish quarterly); time from Idea Lock to first application (target ≤ 21 days).

**Acceptance checks.** Tracking an event creates exactly one application; a second click opens it; Readiness refuses "Ready" when the one-sentence idea is a topic; the linter catches "as a professional speaker" and "my book, available on Amazon"; follow-up reminders stop when status moves past Applied; the Submit assist never performs a network request to an organizer's domain.

### 6.4 Pitch Studio (the reusable Pitch Pack and the pitch video)

**Purpose.** Produce the reusable assets every form asks for, then personalize them per event.

| ID | Feature | Description | Tier | Phase |
|---|---|---|---|---|
| F1.4.1 | Pitch Pack | Base assets: title (3 options using TED's title rules: specific, verb-driven, searchable, no generic praise), one-sentence idea (≤15 words), 100–250-word idea statement, belief challenged, why now, why you, 100-word accomplishment, 150-word and 250-word bios, 4–7-sentence YouTube bio, links; versioned; "Reset to AI version" per field (carried over from v1) | S (1 version), B+ unlimited | MVP |
| F1.4.2 | Pitch Video Coach | Records a 60–180 s pitch in-browser with a framing guide (standing, head-and-shoulders, eye-line), teleprompter of the three beats (idea, why it matters, why you), time bar; returns transcript, pace, filler count and a 3-point narrative review; one-click re-take; exports MP4 and a shareable unlisted link | B+ | MVP (audio metrics), V2 (lighting/framing checks) |
| F1.4.3 | Organizer research card | For each target event: organizer name(s) (public), past themes, what they said they look for (quoted from their site), suggested personal angle; drafts a relationship-first message ("reference their work, ask for feedback") that the member sends personally | P+ | V2 |
| F1.4.4 | Local-connection finder | Lists events within the member's hometown, alma mater, places lived and 2-hour travel radius (profile fields), since local relevance is the most-cited acceptance factor | B+ | MVP |
| F1.4.5 | Speaker one-sheet | PDF: headshot, one-sentence idea, bio, prior speaking, links; auto-updated when the Pitch Pack changes | B+ | V2 |

**Prompts.** Section 13.5 (Pitch Pack), 13.6 (Per-event personalization), 13.4 (Readiness Review), 13.7 (human coach review templates).

---
## 7. Pillar 2: WRITE (Stage 4)

### 7.1 Design principles for the writing pillar

1. **Words before delivery.** "We get the words right before we learn how to say them" (TEDx organizer Peter Scott). The script is locked before rehearsal intensity rises; the product enforces a Script Lock milestone.
2. **Outline first, then prose.** Outline-first generation gives the user a checkpoint to edit, keeps each AI call short, and mirrors how coaches work (idea → structure → script).
3. **Time is the hard constraint.** Every section carries a time budget; the running total is always visible; two planned ending points are built in (Duarte: if running long, stop at the first ending).
4. **The AI drafts, the speaker owns.** Drafts appear as labelled "AI draft" blocks inside the editor with regenerate-with-steer, version history and per-paragraph accept/reject diffs. The script must sound like the speaker talks, so the editor includes a "sounds like me" pass that uses the speaker's own transcribed speech (from the Idea Interview or pitch video) as a voice sample.
5. **Rules are built in.** The Content-Guideline Linter and the Fact-check Flagger run on every version.

### 7.2 Script Studio screens

Outline Builder (structure cards with time budgets) · Script Editor (Tiptap document; sections as blocks; cue marks for pause and emphasis; word count and estimated duration in the footer; focus mode) · Versions (list, diff, restore) · Passes (one-click editing passes) · Fact-check (claims list with source status) · Script Lock.

### 7.3 Features

| ID | Feature | Description | Tier | Phase | Credits |
|---|---|---|---|---|---|
| F2.1 | Talk length and word budget | User sets slot length (default 10 min; range 3–18) and target pace (default 150 wpm; band 130–160); the product computes the word budget (10 min ≈ 1,300–1,600 words; 18 min ≈ 2,340–2,880) and the buffer | S | MVP | 0 |
| F2.2 | Structure picker | Templates with pre-set section cards and time splits: TED four-beat (care → idea → evidence/implementation → effect), Duarte sparkline (what is / what could be alternation, call to action, new bliss), Anderson journey (problem first, then solution as story), Gallo message map (headline + three messages), Story spine (specific moment → change → idea); each template cites its source | S | MVP | 0 |
| F2.3 | Outline Builder | Generates a section-by-section outline from the locked Idea Card and expansion: hook (one surprising fact, moment or "what if" question; no greeting), why care, idea stated early, evidence layered from familiar to new with the counterargument acknowledged, implication, winnable call to action, new-bliss close; each section has a purpose line, bullet beats and a time budget | B+ | MVP | 20 |
| F2.4 | Script Draft | Writes the full script section by section (streamed), present tense, conversational, strong verbs, sentences short enough to breathe; obeys the word budget; marks claims that need sources; marks story beats; never writes a pitch, a summary ending, or a book cover close | B+ | MVP | 60 (Sonnet) / 90 (Opus premium pass, P+) |
| F2.5 | Editing passes | One-click passes, each producing a new version with a diff: Cut to time (removes lowest-value 10–20%); Stronger opening (5 alternatives); Kill the jargon (non-specialist test); Add contrast (what is / what could be); Sounds like me (voice sample); Sharpen the close (two ending points + winnable CTA); De-pitch (removes selling); Simplify (reading level) | B+ | MVP | 25 full / 8 section |
| F2.6 | Story Extraction interview | Voice or text interview that pulls 3 specific stories (moment, sensory detail, what changed) and writes them as beats; for authors it mines the manuscript for scenes | B+ | V2 | 15 |
| F2.7 | Quirk detector | Flags TED's own list: talking about the talk, apologizing, rhetorical questions where statements are clearer, overstatement, utopianism/dystopianism, forced emotion, TED puns, purely anecdotal evidence, failing to admit controversy, reading quotes | S | MVP | included |
| F2.8 | Fact-check Flagger | Extracts every checkable claim into a list with status (needs source / source added / verified by user); exports the annotated script organizers ask for; reminds that fact-checking takes 2–12 hours and that "cure/heal" language must become "reduce risk of" | B+ | MVP | 10 |
| F2.9 | Reading-level and jargon meter | Flesch-Kincaid grade, average sentence length, jargon list with plain alternatives | S | MVP | 0 |
| F2.10 | Script Lock | Freezes a version as the rehearsal baseline; later edits require unlock and are flagged "post-lock"; the organizer's script deadline can be set so the lock reminder fires a week before | B+ | MVP | 0 |
| F2.11 | Exports | Speaker script PDF (large type, section headers, cue marks), DOCX, plain text for teleprompter apps, annotated fact-check PDF | B+ | MVP | 0 |
| F2.12 | Coach script review | Human review with tracked changes and the script rubric; 5-business-day SLA | IC (1/month) | V2 | n/a |
| F2.13 | Slides checker | Upload a PDF export of slides; checks count vs sections, text per slide (≤2 lines), font size (≥42 pt flag), aspect 16:9, logos/book covers detected (vision model), video length note, image-rights checklist, blank-slide suggestion when a section has no visual purpose | P+ | V2 | 10 |
| F2.14 | Catchphrase and title workshop | Proposes the repeatable line ("the ONE" the audience would repeat to friends) and 5 YouTube-ready titles using TED's title rules | B+ | V2 | 5 |

### 7.4 The script rubric in the editor

The 11-criterion script rubric (Section 13.8) is displayed as a side panel with Level 1–4 chips per criterion and the quoted standard on hover. A script cannot be locked below Level 3 on Structure, Brevity/one idea, Ending and Compliance. The user can override with a reason (logged).

### 7.5 Data

`scripts(id, talk_id, slot_minutes, target_wpm, structure_template, locked_version_id)`; `script_versions(id, script_id, version, doc jsonb, source enum[user, llm, coach], parent_version, word_count, est_seconds, rubric jsonb, created_by)`; `claims(id, script_version_id, text, section_id, status, source_url, note)`; `voice_samples(user_id, transcript, source)`.

### 7.6 Metrics

Time from Idea Lock to first full draft (target ≤ 7 days); % of scripts locked within ±10% of the word budget (target 90%); median number of versions before lock (expect 8–15); % of claims with a source at lock (target 100% for science/health talks).

### 7.7 Acceptance checks

A 10-minute draft lands between 1,300 and 1,600 words; the De-pitch pass removes a seeded product mention and the linter confirms; the Cut-to-time pass reduces word count by the requested percentage within ±3 points; version history survives refresh and restore works; the fact-check export lists every number in a seeded script; a script with a summary ending scores Level 1 on Ending.

---
## 8. Pillar 3: DELIVER (Stages 5 and 6)

### 8.1 Design principles

1. **Built for one long talk, not two-minute drills.** Unlimited or minute-metered full-length recordings on paid tiers (competitors cap by session count: Yoodli's free plan counts any run over 30 seconds as one of five lifetime sessions).
2. **Memorize so thoroughly you can vary it.** The standard combines Anderson ("many of our best talks have been memorized word for word"; beware the half-memorized "valley of awkwardness") with TED's organizer guidance ("if a speaker sounds too rehearsed, they need more rehearsal") and Science of People's finding that scripted-sounding delivery lowers charisma. Over-learn past the valley, then deliberately rehearse with different emphasis and audiences. [A25, A111, A112, A115]
3. **Retrieval beats re-reading.** Rehearse from memory with the script hidden (Roediger & Karpicke 2006: one-week retention 56–61% with retrieval practice vs 40–42% with re-reading). [A118]
4. **Narrative first, numbers second, self-referenced.** Feedback leads with 2–3 notes; metrics are shown against the user's previous takes; no composite "speech score" hero (education research on grades vs comments).
5. **On-device vision, consent first, audio-only by default.** Section 12.8.

### 8.2 Rehearsal Studio screens

Pre-flight (camera/mic test, framing guide, lighting warning) · Record (3-second countdown, timer with 6-minute checkpoints, teleprompter or hidden-script mode, pause/restart) · Review (video left, interactive transcript right synced word-by-word, metrics timeline with markers for fillers, pace spikes and long pauses, narrative notes, trend vs last take) · Log (all takes with duration, pace, fillers, readiness) · Memorize (drills) · Event-day kit.

### 8.3 Features

| ID | Feature | Description | Tier | Phase | Metering |
|---|---|---|---|---|---|
| F3.1 | Full-length recording | In-browser video or audio-only recording up to 25 minutes; chunked, resumable upload direct to storage; local buffer so a tab crash does not lose a take | S (3 takes ≤ 5 min, one-time), B (90 analyzed min/month), P (300), IC (unlimited, fair use 900) | MVP | minutes |
| F3.2 | Transcript and timing | Word-level transcript (Deepgram Nova-3 with filler words kept; en-IN and Hindi supported), section timing vs budget, total vs slot, checkpoint hits at 6/12/18 min | B+ | MVP | included |
| F3.3 | Delivery metrics | Gross WPM and articulation rate; pause distribution (0.5–1 s micro, 1–2 s deliberate, >2 s long) with count per minute and longest pause; filler rate per minute and per 100 words with a user-editable crutch-word list ("like", "so", "you know", "basically"); vocal variety (F0 and energy coefficient of variation per 10-second window via Praat/Parselmouth) expressed against the user's own baseline; target bands shown (delivery pace 120–160 wpm, the sourced recommended range; the script word budget uses the narrower 130–160; TED speakers trend 150–175) | B+ | MVP | included |
| F3.4 | Narrative feedback | Three notes: what worked, one thing to try next, one line about the opening 7 seconds; grounded in the transcript and metrics JSON; references the script section by name; never generic ("breathe", "relax") | B+ | MVP | 10 credits |
| F3.5 | Script adherence | Diff between the locked script and the transcript: dropped beats, added filler, reordered sections; "coverage %" of memorized content; highlights the exact lines that keep getting lost | B+ | MVP | included |
| F3.6 | Camera-facing time (eye contact) and gesture activity | On-device MediaPipe Face and Pose Landmarker at 10–15 fps in a Web Worker; outputs % of speaking time facing the camera, longest look-away, look-aways per minute, hands-visible %, gesture activity per minute (wrist displacement); labelled "camera-facing time", not "eye contact"; disabled or relabelled when the teleprompter is on; consent-gated; default off | P+ | V2 | included |
| F3.7 | Teleprompter | Scroll driven by target WPM (default 150, range 110–190), large type (48–64 px, centered 30–40-character column, ivory on near-black), eye-line marker in the upper third, keyboard ±5% speed and pause, mirror toggle, countdown; records "teleprompter on" as take metadata; optional voice-following scroll via streaming STT (P+) | B+ | MVP (timed scroll), V2 (voice-follow) | streaming minutes for voice-follow |
| F3.8 | Memorize: chunk drills | Splits the locked script into beats (sections → paragraphs → lines); drills: read-cover-recite per chunk, bottom-up chaining (last chunk first, then add the previous), cue-card mode (first three words of each paragraph), blank-fill (random words removed), audio companion (TTS or the user's own recording for commutes); spaced schedule across the plan | B+ | MVP (cards, blank-fill), V2 (spaced schedule, audio companion) | 0 |
| F3.9 | Memorize: stage-position anchors | Lets the user attach a stage position or gesture to each beat (a reported memory aid); printable "beat map" | B+ | V2 | 0 |
| F3.10 | Rehearsal plan | Generates a plan from today to the event: TED's calendar (bi-weekly at 2 months, weekly at 1 month, a 2-week break, dress rehearsals), at least 4–5 live audiences of different kinds, count-up timing first then count-down with checkpoints, "one hour of rehearsal per talk minute" in the final weeks, a day-of single full run; syncs with organizer milestones; pushes the weekly commitment | B+ | MVP | 5 credits |
| F3.11 | Live-audience log | Log rehearsals in front of real people (family, Toastmasters club, a class) with their one-line feedback; counts toward the "4–5 audiences" target | B+ | MVP | 0 |
| F3.12 | Blank-recovery drills | Practice the protocol: pause, breathe, go back a paragraph and restart; "they'll take this out in post" line; the product randomly interrupts a run with a "you've blanked" prompt and times the recovery | P+ | V2 | 0 |
| F3.13 | Nerves kit | Brooks (2014) reappraisal ("I am excited" rather than "calm down"), breathing timer, pre-walk-on routine (beat, breath, anchor feet), stop-physical-rehearsal-days-before guidance | S | MVP | 0 |
| F3.14 | AI audience Q&A (for auditions and interviews, not the talk) | Roleplay of organizer interview questions; not for on-stage Q&A, which TEDx does not permit | P+ | V2 | 10 credits |
| F3.15 | Coach video review | Coach watches a take and leaves timestamped comments on the transcript | IC (1/month), P add-on | V2 | n/a |
| F3.16 | Readiness meter | Combines: script locked, coverage ≥ 95% on last 3 takes, pace in band, total time under slot on last 3 takes, 4+ live audiences, dress-rehearsal logged; shown as a checklist, not a score | B+ | MVP | 0 |
| F3.17 | Rehearsal group matching (community) | Pairs members at the same stage for peer rehearsals over Zoom; schedules weekly slots | P+ | V2 | 0 |

### 8.4 Event-day kit (Stage 6: Perform)

A printable and mobile "backstage card" generated from the Talk Record:

- Logistics checklist (arrive for dry run a day early; check lights, stage area, monitors, clicker; confirm who advances slides; wardrobe: no stripes, complex patterns, bright colors, dangling jewelry; mic check protocol; water; Xylimelts-style dry-mouth note).
- The 6/12/18-minute checkpoints with the line you should be on; the two ending points.
- The first three words of each paragraph (cue list) for the organizer-approved backup card if allowed.
- Recovery lines for a blank or a mic failure.
- The walk-on routine (beat, breath, anchor feet) and the "I am excited" line.
- Post-talk: what to ask the organizer (publication timeline, title and description inputs, release form on file), and a reminder not to post raw footage or clips before the official upload.

### 8.5 Feedback presentation rules (binding for design)

1. Order: narrative notes → script adherence → metrics vs your last take → trend sparkline across takes.
2. Metrics are bands, not grades: "Pace 171 wpm (band 120–160; TED speakers trend 150–175)".
3. Every flag is anchored to a transcript position the user can click to seek.
4. A "hide numbers" preference exists and persists.
5. No leaderboard of delivery metrics across members.
6. Teleprompter-on takes are labelled and excluded from camera-facing stats.

### 8.6 Data

`rehearsals(id, talk_id, script_version_id, started_at, duration_s, mode enum[video, audio], teleprompter_on bool, storage_key, status)`; `rehearsal_metrics(rehearsal_id, wpm_gross, wpm_articulation, pauses jsonb, fillers jsonb, crutch_words jsonb, f0_cv, energy_cv, coverage_pct, section_timings jsonb, camera_facing_pct, gesture_rate, notes jsonb)`; `transcripts(rehearsal_id, words jsonb)`; `consents(user_id, kind enum[biometric_vision, audio_processing], version, signed_at, ip, policy_version)`; `rehearsal_plan(talk_id, plan jsonb)`; `live_audience_logs`.

### 8.7 Metrics

Takes per paying member per week in Stage 5 (target 3); % of members whose coverage is ≥ 95% in the final week before the event (target 70%); % of members whose last three takes are under the slot (target 85%); feedback usefulness thumbs-up rate (target ≥ 80%); consent opt-in rate for vision features (track, do not target).

### 8.8 Acceptance checks

A 12-minute recording uploads and is analyzed end-to-end in under 4 minutes; filler detection matches a hand-count within ±2 on a 5-minute test set; WPM matches a manual count within ±3%; coverage detects a deliberately skipped paragraph; feedback never contains the seeded generic phrases ("just relax", "practice more"); teleprompter scroll keeps a 150-wpm script within ±5% of elapsed time; vision features cannot be enabled without a stored consent row; raw video is deleted 30 days after creation unless `keep=true`.

---
## 9. Pillar 4: AMPLIFY (Stage 7), plus the coaching, community, admin and organizer layers

### 9.1 Design principles for AMPLIFY

1. **Compliance is the feature.** TEDx rules allow: sharing the official YouTube link, embedding with the TED player, a 60-second clip for non-commercial social use tagged to the official TEDx account (30 seconds for anyone else), calling the event "an independently organized TEDx event." They prohibit: re-uploading the talk, remixing, podcasts built on the talk, using the TED or generic TEDx logo, implying TED endorsement. Every output is checked against this list.
2. **The video is a credibility asset, not a view-count game.** The product tracks assets built and reused, outreach sent, inquiries and bookings; views are a secondary panel.
3. **TED's own playbook is the baseline.** Specific, search-friendly titles; 2–3-sentence descriptions with a hook; 4–7-sentence bios; release on Monday or Tuesday; personal messages to the network with three simple asks (watch, like/comment, forward); outreach to bloggers and communities; repeated re-promotion with new angles.

### 9.2 Features

| ID | Feature | Description | Tier | Phase | Credits |
|---|---|---|---|---|---|
| F4.1 | Publication tracker | Logs event date, expected upload window (TED asks organizers to upload within a month; review 3–5 business days; flagged talks can take months), the organizer's stated timeline, and the moment the link arrives; realistic status copy | B+ / E | MVP | 0 |
| F4.2 | Upload asset pack (for the organizer) | Generates what the organizer needs at upload: 3 title options (≤100 characters including speaker and event name), a 2–3-sentence description with a hook, a 4–7-sentence bio, 5 tags; the member sends these to the organizer before the event (titles are set by organizers, and one speaker warns "do not let the TEDx organizer name your talk for you") | B+ | MVP | 5 |
| F4.3 | Launch plan | A dated checklist: pre-publication list building (email list, LinkedIn connections, partners, press, launch team of 20–50 people who commit to watch, like and comment on day one), Monday/Tuesday launch, first-48-hours tasks (reply to every comment, second-angle repost, newsletter, email signature line), weeks 1–8 (clips, quote cards, article, podcast pitches, community posts), ongoing | B+ / E | MVP | 5 |
| F4.4 | Launch copy kit | Personal email to network (three asks), LinkedIn post (idea first, link in post), newsletter block, email signature line, 10 second-angle posts for re-promotion, outreach notes to topic bloggers and communities; all with the "independently organized TEDx event" phrasing and no logo | B+ / E | MVP | 15 |
| F4.5 | Clip Cutter (compliant) | From the member's own recording (or the official video only via link, never downloaded): transcript with timestamps → AI selects 5–8 self-contained 30–60-second segments scored for hook strength and quotability → FFmpeg trims, 9:16 face-centred crop, burned captions (DCMP style), loudness normalization; enforces ≤60 s and inserts the "@TEDx" tag reminder and "non-commercial" notice; a rights checkbox before export | P+ / E | V2 | 40 per pack |
| F4.6 | Quote cards and carousels | Pull-quotes from the transcript rendered as images and a 7-slide LinkedIn carousel of the idea (no video re-use) | B+ / E | V2 | 10 |
| F4.7 | Press kit PDF | Headshot, one-sentence idea, bio, abstract, 3 pull-quotes, QR/short link to the official video, speaking topics, contact; regenerated when stats change | B+ / E | V2 | 5 |
| F4.8 | Talk stats | Paste the YouTube URL (or link the channel); daily `videos.list` (1 quota unit) to track views, likes, comments; shown as a trend with honest framing ("typical first-year range for non-celebrity speakers: low thousands to low hundreds of thousands") | E | V2 | 0 |
| F4.9 | Article and podcast pitch generator | Long-form article draft from the script (new text, not a transcript dump) and 5 podcast pitch emails that link to the talk rather than re-use audio | E | V2 | 15 |
| F4.10 | Paid-stage pipeline | A light CRM for conference and association outreach: target list by niche, outreach email drafts that lead with the idea and link the talk, follow-up cadence, fee-range guidance from industry data (65% of speakers charged under $5,000 per gig in 2021 data), speaker one-sheet attached | E | V2 | 10 |
| F4.11 | Bio and profile updater | Rewrites LinkedIn About, website bio and email signature with the correct phrasing ("spoke at TEDx[City] 20xx, an independently organized TEDx event") | S+ (one use on Spark), E (unlimited) | MVP | 3 |
| F4.12 | Second-talk guard | Reminds that TED discourages serial applicants and that duplicate talks are not published; offers the path to a new original idea only | E | MVP | 0 |
| F4.13 | Outcome capture | Member logs inquiries, bookings, fee changes, press mentions, book-sales notes; feeds anonymized cohort stats and testimonials (with consent) | E | V2 | 0 |

### 9.3 The coaching layer (what makes $299 and $499 defensible)

Research on premium prosumer tiers is consistent: top tiers are justified by human-delivered deliverables (Circle's concierge onboarding only on Scale annual; Mighty's "Growth Expert Sessions" on its $354 tier; the Speaker Lab's coach messaging and managed outreach on Premium). Software-only features do not clear $400/month in this segment.

| Component | Pro ($299) | Inner Circle ($499) |
|---|---|---|
| Live Application Clinic (group, 60 min, monthly) | ✓ | ✓ |
| Live Rehearsal Lab (group, 90 min, monthly; 4 members perform, all get notes) | ✓ | ✓ |
| Office hours (weekly, 45 min, drop-in) | ✓ | ✓ |
| Human application reviews | add-on (credits) | 2 per month included |
| Human script review | add-on | 1 per month included |
| Coach video review of a take | add-on | 1 per month included |
| 1:1 coaching call (45 min) | add-on ($249) | 1 per month included |
| Curated event shortlist with notes (10 events) | ✗ | monthly |
| Done-with-you launch plan session | ✗ | once per published talk |
| Priority support (same business day) | ✗ | ✓ |

**Coach operations.** A coach review queue with SLAs (application 3 business days, script 5, video 5); rubric-based review templates so feedback is consistent; coach capacity planning (one coach handles ~40 Inner Circle members at the included volumes); coaches are GBP-certified and sign the ethics policy (no organizer contact on behalf of members, no "guaranteed" language). Clinics run on Zoom with replays stored 30 days in-app. Record every session in `coaching_sessions` and every review in `reviews` with rubric scores so the quality of coaching is measurable.

**Where the coaches come from.** GBP's own hosts and certified coaches; alumni who have been published and trained on the rubrics; the existing Global Author Network format (monthly mastery calls, weekly office hours) is the operating template.

### 9.4 Community

- Spaces by stage (Idea Lab, Applying, Accepted, Rehearsing, Published) so conversations match the moment.
- Weekly rituals: "Applications sent" roll call (Monday), "Rehearsal buddy" matching (Wednesday), "Wins" thread (Friday).
- Peer feedback on pitch videos and takes via timestamped comments; no public delivery-metric comparisons.
- Moderation rules: no selling, no organizer-contact sharing without consent, no "I know an organizer, pay me" posts (instant ban).
- Hosted in-app (Supabase-backed threads) for MVP; a Circle or Skool embed is acceptable in V1 if faster, as long as single sign-on is used.

### 9.5 Admin and curator tools

The admin area has eight screens. A1–A6 reuse the rebuild plan's screen numbering so the existing admin basics map cleanly; A7 and A8 are new.

| Screen | Scope |
|---|---|
| A1 Admin home | Funnel by stage (Idea locked → Applied → Interview → Accepted → Script locked → Published), MRR, credits consumed, AI cost, STT minutes, coach SLA compliance |
| A2 Access | Unchanged, plus plan and tier assignment, Elite-client seat provisioning, PPP region |
| A3 Members | Adds Talk Record timeline, consent status, credit ledger, coaching history |
| A4 Events | Becomes the Curator Console: submissions queue, verification status, dedup candidates (pg_trgm + geodistance), organizer claims, freshness board (events overdue for re-verification), "report outdated" tickets, bulk theme tagging with Haiku suggestions |
| A5 AI settings | Prompt versions per function, model routing per tier, credit prices per action, eval results (Promptfoo), cost caps |
| A6 Reports | Adds cohort outcome stats, coach SLA, churn by tier, credits burn, event coverage |
| A7 Coaching ops (new) | Review queue, assignments, SLAs, clinic calendar, replay storage |
| A8 Billing (new) | Subscriptions, credit top-ups, refunds, dunning status, PPP overrides, program (6-month) plans |

### 9.6 Organizer portal (V2, free, deliberately minimal)

Organizers are volunteers protective of their time; TED's own guidance tells speakers not to pester them. The portal offers: claim the listing, edit fields, post or close the call with dates and form link, optionally state what they look for (quoted on the event page), and nothing else. No access to member data, no messaging, no fees, no "sponsored placement." This earns trust and keeps the event database accurate.

---
## 10. Monetization: freemium with premium tiers

### 10.1 Pricing principles (from the evidence)

1. **Price in the $100–$500 corridor the buyer already uses for tools** (Kajabi $179/$249/$499; GoHighLevel $97/$297/$497; Circle $89/$199/$419; Thinkific $109/$219/$499). Three paid tiers at roughly entry / "most popular" / top is the pattern. [A40–A46]
2. **Higher price, lower churn.** ChartMogul: 6.1%/month churn under $25 ARPA vs 2.2% above $500; CRV 2025: AI products above $250/month retain ~70% of revenue vs 23% below $50. Do not launch a $29 tier for the core journey. [A41, A42]
3. **Human touch at the top.** Software alone does not clear $400/month in this category; group clinics, reviews and 1:1 calls do.
4. **Anchor against programs, not apps.** Six months of Pro ($1,497 pay-in-full) costs less than one $799 three-session package plus one $997 course, and a fraction of $4,997–$14,997 cohorts and placements.
5. **Meter AI by credits and rehearsal by minutes; never by session count.** Session caps are hostile to someone who needs 30–60 full run-throughs.
6. **Sell the six-month program, not just the subscription.** Speaker coaching is sold as fixed-term programs with financing and outcome-linked access extensions (the Speaker Lab's "Booked or Extended"); consumer data shows annual plans front-load churn (35% of annual cancellations happen in month 1; ~72% within year 1) unless paired with onboarding. [A43]
7. **No fake scarcity, no countdown timers, no income promises.** House rule.

### 10.2 The tiers

| | Spark (free) | Builder | Pro | Inner Circle | Encore (alumni) |
|---|---|---|---|---|---|
| **Monthly** | $0 | $149 | $299 | $499 | $39 |
| **Annual** | n/a | $1,490 | $2,990 | $4,990 | $390 |
| **6-month program (pay in full)** | n/a | n/a | $1,497 | $2,497 | n/a |
| **AI credits / month** | 100 one-time | 500 | 1,500 | 4,000 | 300 |
| **Rehearsal minutes analyzed / month** | 15 one-time (3 takes ≤ 5 min) | 90 | 300 | Unlimited (fair use 900) | 60 |
| **Premium AI pass (Opus 5.5 drafts and polish)** | ✗ | ✗ | ✓ | ✓ | ✗ |
| **Idea Lab** | 1 batch, 1 scorecard, 1 expansion | Unlimited | Unlimited | Unlimited | Unlimited |
| **Event Finder** | Top 3 matches, no deadlines, no filters | Full, 25 targets | Full, 50 targets, event intel | Full, unlimited, curated monthly shortlist | Full (second-talk guard on) |
| **Application Pipeline** | 3 records | Unlimited; 10 personalizations/month | Unlimited personalizations; interview prep | Unlimited; 2 human reviews/month | View-only history |
| **Script Studio** | Word budget, structure picker, quirk detector | Full | Full + premium pass + slides checker | Full + 1 human script review/month | Read-only + exports |
| **Rehearsal Studio** | Basic metrics on 3 takes | Full audio metrics, teleprompter, memorize drills | + camera-facing/gesture (consent), voice-follow prompter, blank drills, peer matching | + 1 coach video review/month | 60 min/month |
| **Amplify** | Bio updater | Launch plan, copy kit, upload pack, press kit | + Clip Cutter, quote cards | + done-with-you launch session | Full Amplify suite, talk stats, paid-stage pipeline |
| **Live group clinics (Application Clinic, Rehearsal Lab)** | Replays only (1) | Replays | Live + replays | Live + replays | Replays |
| **Office hours** | ✗ | ✗ | Weekly | Weekly | Monthly |
| **1:1 coaching call** | ✗ | ✗ | Add-on $249 | 1/month included | Add-on |
| **Community** | Read-only | Full | Full | Full + Inner Circle space | Full |
| **Support** | Email | Email (2 business days) | Email (1 business day) | Priority (same business day) | Email |
| **Exports** | Watermarked PDF | All | All | All | All |
| **Data for AI training** | Never | Never | Never | Never | Never |

**Why these specific numbers.** $149 sits just under Kajabi Basic ($179) and above Thinkific Start ($109); $299 matches GoHighLevel Unlimited ($297) and sits between Circle Business ($199) and Mighty Growth ($354); $499 matches Kajabi Pro and GoHighLevel Founder. Annual at "two months free" (≈17%) is inside the observed 10–33% range. The $39 Encore price converts graduation churn into a retained low-ARPA cohort and sits near the SpeakerMatch/SpeakerHub band.

**Tier naming (decision for Ash):** Spark / Builder / Pro / Inner Circle / Encore. Alternatives: Spark / Stage / Spotlight / Red Carpet / Encore (avoid "Red Carpet" if it reads as TED imagery).

### 10.3 The credit system (metering AI without punishing serious users)

| Action | Credits | Approx. COGS (at the model routing in Section 12.4) |
|---|---|---|
| Idea Interview processing | 10 | $0.02 |
| Idea batch (5 ideas) | 10 | $0.016 |
| Idea scorecard | 5 | $0.01 |
| Idea expansion | 10 | $0.021 |
| Throughline refinement | 3 | $0.005 |
| "Has it been done?" search | 5 | $0.01 |
| Pitch Pack generation | 10 | $0.018 |
| Per-event personalization | 15 | $0.02 |
| Application readiness review | 5 | $0.01 |
| Outline | 20 | $0.03 |
| Full script draft | 60 (Opus pass 90) | $0.07 (Opus $0.14) |
| Full editing pass | 25 | $0.05 |
| Section edit | 8 | $0.024 |
| Fact-check extraction | 10 | $0.02 |
| Rehearsal narrative feedback | 10 (+ minutes) | $0.0014 on Haiku (default); $0.028 on Sonnet (Pro+) (+ STT $0.0077/min) |
| Rehearsal plan | 5 | $0.01 |
| Upload asset pack / launch plan / launch copy kit | 5 / 5 / 15 | $0.01–0.03 |
| Clip pack (5–8 clips) | 40 | ≈ $0.25 |

Rules: credits reset monthly and do not roll over (except a 2-month rollover on annual plans); top-ups at $10 per 500 credits (a premium over COGS, as Circle, Kajabi and Clay do); when a user hits 80% a banner appears; at 100% the product degrades to Haiku for low-stakes actions before blocking; a per-user hard cost cap exists server-side. Target: the median paying user yields ≥ 60% gross margin on AI after credits are priced (practitioner guidance for AI-native products), with a fair-use cap at ~3× median usage on "unlimited" minutes. [A44, A45]

### 10.4 Free tier and conversion mechanics

- **Default: reverse trial.** New sign-ups get 14 days of Builder-level features (plus one clinic replay), then fall back to Spark. Evidence: reverse trials convert at 4–6% (good) / 8–12% (great) and trial-style products convert in ~14 days vs 60–90 for pure freemium; freemium sign-up rates (~9% of visitors) beat trials (~5%). No card required. [A40, A46]
- **Spark is designed to filter experimenters, not to be a forever plan:** one-time credits (like Descript's one-time 100 credits), watermarked exports, top-3 event matches with deadlines hidden, 3 application records.
- **Product-qualified lead signals** (trigger human outreach from GBP's team within 24 hours): idea locked with Level 3+; 3 events tracked; pitch video recorded; expectation screen completed. 44% of free-trial companies have sales reach out to more than half of sign-ups, and outreach to free sign-ups correlates with faster growth. [A46, A47]
- **Upgrade triggers inside the product:** deadline shown as "in 9 days (upgrade to see the date)"; personalization count exhausted; rehearsal minutes exhausted mid-plan; "a coach can review this" on a Ready application; clinic calendar visible with "join live" gated.

### 10.5 The six-month program and the guarantee

**Offer:** "The Stage Program": six months of Pro ($1,497 pay-in-full, saves $297) or Inner Circle ($2,497, saves $497), with a 1:1 kickoff call for both (the month-1 cancellation spike on annual plans is the reason to bundle onboarding). Financing via Klarna/Afterpay where available (common in this niche).

**Guarantee: "Extended until you're on stage."** Effort-conditioned, never outcome-promising:

> If, within your six months, you lock an idea that scores Level 3 or higher, submit at least 12 applications through the pipeline that passed the Readiness check, and attend at least three live clinics (Pro) or use your included reviews (Inner Circle), and you have not logged an acceptance, we extend your Pro-level access free, month by month, until you do, for up to 12 additional months.

This mirrors the Speaker Lab's "Booked or Extended" and Thought-Leader's "apply to 20 events" refund condition, while staying inside TED's rules (no promise of selection). Plus a 30-day money-back guarantee on any first purchase, no conditions (Circle and Taplio practice).

### 10.6 India and global pricing

- **Merchant of record:** Paddle (5% + 50¢) handles global sales tax, EU/UK VAT and, since 17 June 2026, UPI Autopay for recurring INR subscriptions with a ₹15,000 cap per renewal (₹100,000 per transaction). Stripe India is invite-only and Stripe Managed Payments is not supported in India. Recommendation: Paddle as the single MoR from day one (simplicity and tax coverage), with Stripe (2.9% + 30¢; Billing 0.7%; Tax Basic 0.5%) as the alternative if the team accepts tax registration work; the cost difference at $299 is about $6 per subscription per month. [A48, A49]
- **INR list (decision; roughly 55–60% of USD list at 2026 rates, a lighter discount than the 50–75% purchasing-power adjustments some SaaS vendors apply to India, because the human coaching components cost the same to deliver):** Builder ₹6,999/month, Pro ₹13,999/month (under the UPI Autopay renewal cap), Inner Circle ₹24,999/month (card, or quarterly billing); Encore ₹1,999. Show INR to Indian billing addresses only; require a local billing address and payment method to limit VPN arbitrage. Paddle reports INR display can lift checkout conversion substantially and that UPI is 86% of India's digital transactions.
- **UK and Canada:** GBP and CAD display via the MoR; VAT handled by Paddle.

### 10.7 Retention design for a lifecycle product

| Moment | Risk | Mechanism |
|---|---|---|
| Month 1 | Annual-plan cancellation spike; "I don't know what to do" | Kickoff call (program buyers), Today screen next-best-action, week-1 artifact (scored idea + 3 targets) |
| Rejections | Discouragement | Rejection normalization copy, cohort stats, re-apply reminders, clinic "rejection review" |
| Acceptance | "I have organizer coaching now, why pay?" | Script Studio synced to organizer milestones, rehearsal analytics, memorization, event-day kit, coach reviews; the organizer's coach rarely offers these |
| After the talk | Graduation churn | Automatic downgrade offer to Encore at $39 with the Amplify suite and stats; alumni roles in community (rehearsal audiences, testimonials) |
| Billing failures | Involuntary churn (31% of Google Play cancellations are involuntary) | Dunning with 3 retries, in-app banner, pause option |

### 10.8 Unit economics (planning assumptions; verify with real usage after 90 days)

| | Builder | Pro | Inner Circle | Encore |
|---|---|---|---|---|
| Price | $149 | $299 | $499 | $39 |
| AI + STT + video COGS (median user) | $2.5 | $4 | $6 | $1 |
| Group coaching (amortized: 2 clinics + office hours ÷ attendees) | $0 | $12 | $12 | $0 |
| 1:1 and reviews (coach time ≈ 3.5 h/month at $60/h loaded) | $0 | $0 | $210 | $0 |
| Payment fees (Paddle ≈ 5% + 50¢) | $8 | $15 | $25 | $2.5 |
| Support and ops allocation | $5 | $10 | $20 | $2 |
| **Gross margin** | **≈ 90%** | **≈ 86%** | **≈ 45%** | **≈ 86%** |

Blended gross margin at the Month-12 mix (40% Builder, 40% Pro, 10% Inner Circle, 10% Encore) is roughly 80%. Inner Circle is a margin-light, trust-heavy tier whose job is testimonials, outcomes and upsells to GBP's publishing offers; cap it at coach capacity (≈ 40 members per coach).

**Acquisition math (planning):** blended CAC $350 (webinar funnel, affiliates at 30% recurring for 12 months, founder-led LinkedIn); payback under 2 months at $230 ARPU and 80% gross margin; LTV at 7-month average paid tenure ≈ $1,300 → LTV:CAC ≈ 3.7. These are assumptions to be replaced by measured numbers; no prosumer-specific CAC benchmark was found in research.

### 10.9 Ascension and cross-sell inside GBP's ecosystem

- **Elite Authority Accelerator clients** receive six months of Pro included (productizes "TEDx strategy and stage research" and the "signature talk and TEDx pitch pack"); Guided clients receive three months of Builder.
- **India Authors Academy Diamond members** migrate from TEDx Engine to Builder as a membership benefit; the allow-list and tier field in the rebuild plan already support this.
- **ABB challenge order bump:** replace the stale "$197 TEDx training" bump with "Stage OS: first month of Builder for $47 plus the Idea Lab masterclass replay" (decision for Ash; must not imply selection).
- **Reverse path:** Stage OS members who need a book are a warm audience for the Authority Accelerator; show it only inside the Amplify stage ("the talk is the front door"), never inside application or script flows.

### 10.10 Refunds, cancellations, fair use

30-day money-back on first purchase; cancel in two clicks from Me → Plan (no retention dark patterns); pause for up to 3 months once per year; fair-use cap on unlimited minutes at 900/month with a courtesy notice; credits top-ups are non-refundable; program plans refundable pro rata in the first 30 days only.

---
## 11. Design system

### 11.1 Brand direction

**Feel:** a dark house and a lit stage. Ink navy, warm ivory, one spotlight gold. Editorial serif for ideas and scripts, neutral sans for the tool. Quiet confidence, no sparkle gradients, no red.

**Why not red/black/Helvetica:** TED's own TEDx logo rules prescribe "TED Red #EB0028, Helvetica (or Inter Light), white or black backgrounds only." A product that looks like that is a trademark and trade-dress problem (Section 2.4). The third-party value #E62B1E (Pantone 485) is also a TED red; avoid both and any vivid red as brand accent. Danger/error red is reserved for error semantics only. [A28, A74]

**Wordmark:** the product name set in Fraunces (soft old-style display serif, Google Fonts, OFL) in ink on ivory; the "O" of OS may carry a subtle spotlight ring. Logo mark: a single warm circle of light (gold) on ink, not a red dot.

**Tagline usage:** one line only, under the wordmark on marketing pages: "One idea. Every stage."

**Non-affiliation line** appears in the footer of every page and on pricing and onboarding (text in Section 2.4).

### 11.2 Typography

| Role | Face | Weights | Source / license | Notes |
|---|---|---|---|---|
| UI (chrome, tables, forms, buttons) | Inter (variable) | 400, 500, 600 (never 300 Light for brand) | Google Fonts, OFL | Tall x-height, tabular numerals (`font-variant-numeric: tabular-nums` on metrics), stylistic set 03 for IDs. Alternative: Geist (Vercel, OFL); note one small test found Geist ~8% slower to read at 16px on Windows ClearType |
| Editorial (script editor body, idea cards, long reading) | Newsreader (variable, optical size axis) | 400, 500, 600 | Google Fonts, OFL | "Primarily intended for continuous on-screen reading"; use opsz ≈ text at 18–20px |
| Display (wordmark, hero, celebration cards, pull-quotes) | Fraunces (variable) | 500–700 | Google Fonts, OFL | Display only, never below 24px; alternative Instrument Serif (condensed display) |
| Mono (timers, WPM, timestamps, code) | Geist Mono | 400, 500 | Google Fonts, OFL | |
| Indic | Noto Sans Devanagari (variable) | 400–600 | OFL | Font stack: `Inter, "Noto Sans Devanagari", "Noto Sans", system-ui`; line-height ≥ 1.5 for Devanagari; add Noto families for Tamil, Bengali, Gurmukhi when needed |

Commercial faces (Söhne, Tiempos) are explicitly not recommended: one-off perpetual licenses priced by page views/MAUs, and app embedding requires contacting the foundry. [A75]

**Type scale (base 16px, rem units; token names follow Vercel's vocabulary):**

| Token | Size/line | Weight | Tracking | Face |
|---|---|---|---|---|
| display | 40/44 | 600 | −0.02em | Fraunces |
| page-title | 28/36 | 600 | −0.015em | Inter |
| title | 22/28 | 600 | −0.01em | Inter |
| section | 18/26 | 600 | 0 | Inter |
| lede | 18/28 | 400 | 0 | Newsreader |
| body | 16/24 | 400 | 0 | Inter |
| editor-body | 19/30 (1.6) | 400 | 0 | Newsreader, `max-width: 66ch` |
| compact | 14/20 | 400 | 0 | Inter |
| label | 13/18 | 500 | +0.01em | Inter |
| metadata | 12/16 | 500 | +0.02em | Inter, never below 4.5:1 contrast |
| teleprompter | 48–64/1.35 | 500 | 0 | Inter, ivory on near-black, centred 30–40-character column |

Readability rules: 45–75 characters per line (66 ideal), line-height ≥ 1.5, left-aligned, test at 200% zoom, offer user controls for size, line spacing and background in the editor and teleprompter. [A76]

### 11.3 Color tokens (Palette "Ink & Ivory", WCAG 2.x ratios computed; all text tokens ≥ 4.5:1, borders/focus ≥ 3:1)

**Light theme**

| Token | Hex | Contrast note |
|---|---|---|
| --bg | #FBF8F3 | page |
| --surface | #FFFFFF | cards |
| --surface-2 | #F3EEE6 | sidebars, code, subtle panels |
| --border-subtle | #E3DCCF | |
| --border | #C9BFAE | |
| --border-strong / --input | #857B68 | 3.94:1 vs bg |
| --text | #121A2B | 16.4:1 |
| --text-secondary | #3F4A5F | 8.4:1 |
| --text-muted | #5F6B7E | 5.1:1 |
| --primary (buttons) | #121A2B fill, ivory text | 16.4:1 |
| --accent-solid (gold: progress, highlights, selected) | #D9A21B with ink text | 7.56:1; outline #A6780A where a boundary is needed (3.73:1) |
| --accent-text | #8A5B00 | 5.5:1 |
| --success-text / --success-solid | #1B6B3A / #1F8A4C (use ink text on solid) | 6.2:1 / 4.38:1 white |
| --warning-text | #8A5B00 | 5.5:1 |
| --danger-text / --danger-solid | #A32D2D / #C0392B (white text 5.4:1) | errors only, never brand |
| --ai-bg / --ai-text | #EFEAFB / #5B3FA6 | 7.3:1; the only "AI" tokens |
| --focus | #2F5FD0 | 5.4:1 |

**Dark theme**

| Token | Hex | Contrast note |
|---|---|---|
| --bg | #0B1220 | |
| --surface | #121A2B | |
| --surface-2 | #1A2438 | |
| --border-subtle | #243049 | |
| --border | #34425C | |
| --border-strong / --input | #5C6B86 | 3.48:1 |
| --text | #F4EFE6 | 16.4:1 |
| --text-secondary | #C9C2B6 | 10.6:1 |
| --text-muted | #9AA3B5 | 7.4:1 |
| --accent-solid | #E6B54A with ink text | 9.9:1 |
| --accent-text | #F0C45E | 11.4:1 |
| --success-text / --success-solid | #5FD38A / #2EA862 (ink text 6.2:1) | |
| --warning-text | #F0C45E | |
| --danger-text / --danger-solid | #F48A8A / #E5484D (ink text 4.78:1) | |
| --ai-bg / --ai-text | #1E1A33 / #B9A7F2 | 8.8:1 |
| --focus | #8FB0FF | 8.8:1 |

**Implementation:** define 12-step neutral (Radix "sand" family), accent (gold) and status scales per theme; alias the semantic tokens above; map to shadcn/ui names (`--background`, `--card`, `--muted`, `--border`, `--input`, `--ring`, `--primary`, `--destructive`, `--chart-1…5`) in OKLCH under `:root` and `.dark`. Radix step roles: 1 app bg, 2 subtle bg, 3 element bg, 4 hover, 5 active, 6 subtle border, 7 border, 8 hovered border/focus, 9 solid, 10 hovered solid, 11 low-contrast text, 12 high-contrast text (steps 11/12 guarantee APCA Lc 60/90 on step 2). Color is used only for state, action or data meaning, always with a non-color cue. [A77, A78]

**Charts:** --chart-1 gold #D9A21B, --chart-2 ink #121A2B, --chart-3 slate #5F6B7E, --chart-4 teal #1F8A8A, --chart-5 plum #5B3FA6; sequential scales derive from ink; never red/green alone.

### 11.4 Layout, spacing, shape

- Grid: 12 columns desktop, 6 tablet, 4 mobile; 16px side gutter minimum on phones; no horizontal scroll.
- Spacing scale 4px base (space-1 … space-16): within-group gaps space-2 to space-4, between groups space-6 to space-8, section turns space-8 to space-12, space-16 for chapter breaks.
- Radius: 8px controls, 12px cards, 16px modals; restrained, consistent.
- Elevation: borders over shadows; one soft shadow level for popovers.
- Navigation: left rail (240px, collapsible to 64px icons) on desktop; bottom tab bar on mobile; Today is home; Journey path reachable from the home card (Section 5.2).
- Density: dashboard screens use `compact` type in tables; the Script Editor and Idea Cards use `editor-body` with generous white space and a focus mode that hides chrome.

### 11.5 Components (shadcn/ui on Tailwind v4, React 19, Radix primitives)

Core set: Button (primary ink, secondary outline, gold "milestone" variant), Card, Stepper/Path node, Progress ring, Weekly commitment dots, Deadline chip with countdown, Status badge (pipeline), Rubric chip (Level 1–4 with hover standard), Linter flag chip (quotes the rule), AI-draft block (labelled, with Regenerate-with-steer, Why-this, Versions, Accept/Reject diff), Transcript (word-level, clickable, ≥24×24 hit areas or line-level targets), Metrics timeline (markers for fillers, pace spikes, pauses), Recorder (pre-flight, countdown, timer with checkpoints), Teleprompter, Kanban board, Data table (TanStack), Toast (Sonner), Dialog, Command palette (⌘K), Empty state with a 2-minute first action.

Editor: Tiptap (ProseMirror) with custom nodes: `section` (attrs: sectionId, kind: hook | care | idea | evidence | implication | cta | close, targetSeconds), `aiDraft`, inline marks `pause`, `emphasis`, `claim`. Lexical is acceptable if the team prefers Meta's MIT license. Avoid Slate/Plate (beta). [A79]

Charts: shadcn chart components (Recharts) with the tokens above; visx only if the metrics timeline outgrows them.

Motion: `tw-animate-css` for micro-animations; Motion (Framer) only for path and milestone celebrations; everything gated by `prefers-reduced-motion`; streaming "typewriter" rendering disabled under reduced motion (render in chunks).

### 11.6 AI UX patterns (binding)

1. Label AI output next to the content ("AI draft", "AI-assisted", "Your words"), never only in a footer.
2. Edit in place; AI never lives only in a side chat.
3. Regenerate with a steer (chips: shorter, more personal, stronger opening, less jargon) creates a new version and keeps the previous one.
4. Diff view with accept-all, accept-by-paragraph, reject when AI edits existing text; the override is as visible as the output.
5. "Why this" popover tied to the user's own inputs (idea, audience, rubric) on every generated block.
6. Confidence only when it changes a decision, and categorical (Needs a source / Low-confidence transcript segment), never fake percentages.
7. Streaming with a Stop control; no interaction goes more than 800 ms without a visible progress signal that distinguishes "thinking" from "writing".
8. Per-suggestion feedback (thumbs down, "not right") feeds the eval set.
9. A global AI switch and per-feature toggles in Me → AI.
10. One restrained AI token set (--ai-bg/--ai-text); no gradients, no sparkles everywhere.
11. Review reminder before export or share, never a block.
12. Name gaps directly ("I can't verify this claim from what you've given me").

Sources: Microsoft HAX guidelines G1–G18, Google PAIR explainability guidance, Shape of AI trust builders, practitioner pattern libraries. [A80–A83]

### 11.7 Recording, review, teleprompter and caption UX (binding)

- **Pre-flight:** live camera preview, head-and-shoulders silhouette with an eye-line rule-of-thirds guide, input-level meter with a 5-second "say your name" test and playback, lighting warning, mic selection.
- **Countdown:** 3 seconds (skippable in settings); then timer with 6-minute checkpoint ticks; pause/resume; restart take; notes overlay just below the camera when enabled.
- **Review:** video left, transcript right, metrics timeline under the scrubber; narrative notes above numbers; numbers vs previous take; "hide numbers" preference; keyboard seeking (arrow keys) and "add marker here" buttons (WCAG 2.5.7 dragging alternatives).
- **Teleprompter:** 48–64px ivory on near-black (#F4EFE6 on #000 ≈ 18.3:1), centred narrow column, eye-line marker upper third, wpm-driven scroll (default 150; 5–10% slower than feels right), keyboard ±5% and pause, mirror toggle.
- **Captions (DCMP style):** white medium-weight sans with shadow or translucent box, mixed case, ≤2 lines, 1–6 s per caption, ≤160 wpm presentation rate, default on, user-adjustable size, keyboard-accessible transcript. [A84]

### 11.8 Accessibility and internationalization

WCAG 2.2 AA throughout: 4.5:1 text, 3:1 UI; Target Size ≥ 24×24 CSS px with 8px spacing; Dragging Movements alternatives for scrubbers and Kanban (move buttons); Focus Not Obscured (sticky toolbars keep a bottom safe area); Redundant Entry (progressive profiling never re-asks); Accessible Authentication (magic link, no puzzles); visible focus; semantic tables; text alternatives for charts; reduced motion; 200% zoom. Timezones: store UTC, render in the member's timezone, deadlines shown with the organizer's local time and the member's. Languages: UI English first; en-IN transcription supported; Hindi UI later. [A85]

### 11.9 Copy voice and microcopy

- Plain, warm, direct; the buyer is the hero; the product is the pit crew.
- Short paragraphs (1–3 sentences). No em dashes. No buzzwords. No exclamation marks in system copy.
- Honest numbers over hype: "Most open-call city events accept a single-digit percentage of applicants" beats "Land your TEDx talk in 30 days."
- Rejection copy: "This one said no. Most speakers hear no dozens of times. Your idea scored Level 3 on all nine criteria; the pipeline has 4 open events that match it. Pick the next one."
- Milestone copy: "Idea locked. Organizers choose ideas, not people. Yours is specific, arguable and evidence-based."
- Never say "get selected", "guaranteed", "TED-approved", "official".
- Always say "independently organized TEDx event", never "TED talk" for a TEDx talk.

### 11.10 Empty states, errors, emails

- Every empty state shows the path with the first node unlocked and a 2-minute first action.
- AI error banner (carried from the rebuild plan): "That didn't work. You weren't charged a credit. Try again."
- Transactional emails (Resend or Postmark, branded, from the product domain): weekly plan, deadline reminders, milestone celebrations, clinic reminders, review ready, billing; one column, 600px, Inter/Newsreader fallbacks to system fonts, no images required to understand the message.

---
## 12. Technical architecture

### 12.1 Stack (keep Supabase; add around it)

| Layer | Choice | Why | 2026 price points (verified 30 Oct 2026) |
|---|---|---|---|
| Front end | Next.js (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, Radix, Tiptap, TanStack Table/Query | Mainstream, matches the existing React codebase | Vercel Pro $20/seat incl. $20 usage; Fluid functions 300 s default / 800 s max |
| Backend | Supabase: Auth (magic link + OAuth), Postgres (RLS, pgvector, PostGIS, pg_trgm, pg_cron), Storage (resumable uploads), Edge Functions (webhooks only; 2 s CPU limit), Realtime | Already in use; covers auth, data, storage; Team plan adds SOC 2/ISO reports | Pro $25/month (100K MAU, 8 GB, 100 GB storage, 250 GB egress); Team $599 |
| Jobs | Trigger.dev (per-second compute, Docker with FFmpeg + Python Parselmouth/librosa) or Inngest (event-driven orchestration) | Media processing cannot run in Edge Functions or Vercel functions | Trigger.dev Hobby $10 / Pro $50 + ≈$0.12–0.61 per hour compute; Inngest Free (50K executions) / Pro $99 |
| STT | Deepgram Nova-3 (`filler_words=true`, `smart_format`, word timestamps, `en-IN`, `hi`); AssemblyAI Universal-3.5 Pro (`disfluencies=true`) as cheaper English batch fallback | Only vendors with documented filler retention; Deepgram supports batch and streaming | Deepgram $0.0077/min PAYG ($0.0065 Growth; $200 signup credit); AssemblyAI $0.21/hr = $0.0035/min |
| Acoustics | Parselmouth (Praat) for F0/intensity; librosa for RMS | Vocal-variety metrics | compute only |
| Vision | MediaPipe Face Landmarker + Pose Landmarker, WASM in a Web Worker, on-device | Privacy, zero server GPU | free |
| LLM | Claude Sonnet 5.5 (default writer), Opus 5.5 (premium pass), Haiku 5.5 (tagging, feedback summaries, moderation); prompt caching; Batch API for nightly jobs; structured outputs | Quality/cost tiers; 1M context at standard pricing | Opus 5.5 $4/$20 per MTok; Sonnet 5.5 $2/$10; Haiku 5.5 $0.10/$0.50; cache read 0.05× on Opus/Sonnet 5.5; Batch 50% off (platform.claude.com/docs/en/about-claude/pricing). Fallbacks: OpenAI gpt-6.1-sol $2/$10; Gemini 3.1 Pro $2/$12 |
| Video storage | MVP: Supabase Storage + progressive `<video>`; V2: Cloudflare Stream ($5 per 1,000 min stored, $1 per 1,000 delivered, free encoding) or Mux (720p $0.0024/min/month stored, $0.0008/min delivered, $20 monthly credit) | Retention policy, not vendor, drives cost | see left |
| Payments | Paddle (MoR, 5% + 50¢; UPI Autopay INR) or Stripe (2.9% + 30¢; Billing 0.7%; Tax Basic 0.5%) | Section 10.6 | |
| Email | Resend (Free 3K; Pro $20 for 50K) or Postmark (Basic $15) | Branded transactional email | |
| Analytics / flags | PostHog (1M events, 5K replays, 1M flag requests, 100K errors free monthly) | Product analytics + feature flags in one | |
| Errors | Sentry Team $29 | | |
| Evals / tracing | Promptfoo (eval suite) + Langfuse-style tracing into an `llm_calls` table | Prompt quality and cost control | prices not verified |
| Geocoding | Mapbox or Google Geocoding at insert time | A few thousand events/year sits in free/low tiers | not verified |

Do not migrate to Clerk, Neon, Convex or Firebase; Supabase Auth, Postgres and Storage already cover the needs at lower incremental cost. [A86–A95]

### 12.2 System diagram

```
Browser (Next.js app)
 ├─ Recorder: getUserMedia → MediaRecorder(timeslice) → tus resumable upload → Storage
 ├─ MediaPipe worker: per-frame head pose + eye blendshapes → per-10s aggregates only
 ├─ Tiptap editor ↔ /api/script (SSE streaming from Claude)
 └─ Supabase client (RLS) for reads/writes
Vercel (route handlers): auth-aware API, LLM streaming, PDF (react-pdf), ICS, webhooks (Paddle/Stripe)
Supabase: Postgres (RLS, pgvector, PostGIS, pg_cron), Storage, Auth, Realtime, Edge Functions (webhook receivers)
Job worker (Trigger.dev/Inngest, Docker): FFmpeg audio extraction → Deepgram → Praat/librosa → metrics →
   Claude feedback → write rehearsal_metrics → email; clip generation; event re-verification; retention deletes
Third parties: Deepgram/AssemblyAI, Claude API, Paddle/Stripe, Resend, PostHog, Sentry, YouTube Data API,
   LinkedIn Posts API (v2), Cloudflare Stream/Mux (v2)
```

### 12.3 Data model

The full model is defined here. The rebuild plan's 12 tables are a subset; they are listed first so the migration from the existing app is traceable, and everything that follows is new.

**Carried over from the existing foundation (with additions):** `users` (Supabase Auth), `allowed_emails`, `memberships` (add `plan`, `tier`, `region`, `program_ends_at`), `profiles` (add `headshot`, `hometown`, `alma_mater`, `places_lived[]`, `travel_radius_km`, `timezone`, `voice_sample_id`), `email_log`, `audit_log`, `ai_usage` (renamed `llm_calls`, add `prompt_version`, `cache_read_tokens`, `credits_charged`, `talk_id`).

**Extended:** `ideas` and `idea_expansions` (Section 6.1 fields); `pitches` → `pitch_packs` (base) and `pitch_variants` (per event); `events` (Section 6.2 fields plus `application_status`, `application_deadline`, `form_url`, `form_fields jsonb`, `pitch_video_required`, `local_connection_required`, `talk_length_target`, `theme_embedding vector(1024)`, `lat`, `lng`, `last_verified_at`, `confidence`, `source enum[organizer, curator, user_tip, monitor]`); `applications` (add `cycle_year`, `pitch_variant_id`, `answers jsonb`, `readiness jsonb`, `organizer_contacts jsonb`, `rejection_reason`, `reapply_at`).

**Added:**

| Table | Purpose |
|---|---|
| `talks` | The Talk Record spine: user_id, idea_id, status (stage), slot_minutes, event_id (once accepted), published_url, created_at |
| `event_sources`, `event_topics`, `organizer_claims`, `event_reports` | Event pipeline provenance, tags, claims, "report outdated" tickets |
| `scripts`, `script_versions`, `claims`, `voice_samples` | Section 7.5 |
| `rehearsals`, `rehearsal_metrics`, `transcripts`, `rehearsal_plans`, `live_audience_logs` | Section 8.6 |
| `consents` | Biometric vision and audio processing consents with policy version, timestamp, IP, e-signature |
| `credits_ledger` | Every credit grant, charge, top-up and refund (append-only) |
| `subscriptions`, `invoices` (mirror from MoR webhooks) | Billing state |
| `coaching_sessions`, `reviews`, `clinics`, `clinic_attendance` | Coaching ops |
| `community_posts`, `community_comments`, `rehearsal_pairs` | Community (if in-app) |
| `launch_plans`, `clips`, `press_kits`, `talk_stats` (daily snapshots), `outcomes` | Amplify |
| `cohort_stats` (materialized view) | Anonymized funnel |
| `feature_flags` (or PostHog), `prompt_versions`, `eval_runs` | Ops |

RLS: members read/write only rows where `user_id` is their own; coaches read assigned members' artifacts via `review_assignments`; curators write `events*`; admins everything except login tokens; a server-side `is_admin()`/`is_coach()` function, never a client flag. Test with two member accounts and one coach before launch (carried from the rebuild plan).

### 12.4 LLM layer

- **Routing by action and tier:** Sonnet 5.5 for ideas, expansions, pitch packs, personalization, outlines, drafts, editing passes, launch copy; Opus 5.5 for the premium pass (Pro+); Haiku 5.5 for scorecards, linters, tagging, rehearsal feedback summaries, moderation, title generation. Opus is ~2× Sonnet, so a premium draft adds ≈ $0.07.
- **Patterns:** outline-first generation (two calls: outline then script by section); JSON-schema structured outputs for outlines, scorecards, linter flags, section metadata and feedback (`{"metric":"pace","value":171,"band":[130,160],"advice":"..."}`); SSE streaming to the editor; section-level edits returned as JSON patches (section id + replacement) to cut output tokens ~4×; 1-hour prompt caching of the system prompt plus script context during an editing session (input cost of revisions drops ~95%); Batch API for nightly tagging, embeddings and clip-candidate selection.
- **Cost per action and per user:** full script draft ≈ $0.07 (Sonnet) / $0.14 (Opus); heavy user ≈ $0.80–1.20/month with caching and Haiku feedback; see the credit table in Section 10.3. Run a 20-sample tokenizer check before publishing unit economics.
- **Guardrails:** every generation passes the Content-Guideline Linter; a Haiku safety pre-check before anything is posted externally; per-user monthly token cap and per-request `max_tokens`; a per-organization hard cost cap that degrades to Haiku, then blocks.
- **Evals:** a Promptfoo suite of 30–50 golden briefs scored on structure (hook, throughline, CTA present), length-to-time fit (±10%), banned-phrase list, linter recall on a seeded set, and a Haiku-graded rubric; run on every prompt-version change; log every call (model, tokens, cost, latency, prompt_version) in `llm_calls`.
- **Data use:** member content is never used to train models; state this in the ToS and in the UI; use Claude's data-residency option if required by a customer (`inference_geo`, 1.1× price).

### 12.5 Event data pipeline (no scraping of ted.com)

**Legal basis.** TED's Terms of Use (updated 7 May 2024) §6.4 prohibit automated collection of TED content inconsistent with the Terms and ban dataset/ML use without a written license. US case law (hiQ v. LinkedIn; Van Buren; Meta v. Bright Data) makes CFAA claims over public pages weak but keeps breach-of-contract claims viable where assent exists. Eventbrite's terms also prohibit scraping. The pipeline below avoids the issue entirely. [A32, A96, A97]

**Sources (priority order):** (1) organizer self-service listing with email verification to the TEDx-licensed address and a claim link; (2) curator queue fed by Google Programmable Search/SerpAPI queries ("TEDx" + "call for speakers" + "apply" + month), university newsrooms, chamber sites, Sessionize pages, Instagram/LinkedIn posts reviewed by a human; (3) member tips with "report outdated"; (4) weekly re-verification of events already in the database by fetching only that event's organizer page (honoring robots.txt and cache headers), storing facts only (dates, status, deadline, URL) and never descriptions or images; (5) a formal data-partnership request to TED (its Terms anticipate "a separate written license agreement").

**Processing:** geocode once at insert; dedup candidates by normalized name (strip "TEDx", punctuation, year) + city + ±60-day window using `pg_trgm` similarity > 0.6 and geodistance < 25 km, routed to the curator; theme tags via Haiku (Batch), embeddings via pgvector (1024-d); matching = cosine(idea, theme/past talks) + geography + deadline fit + open-call likelihood; freshness SLA 14 days for events with future deadlines; auto-expire 30 days after the event. Variable cloud cost is negligible; budget 0.25–0.5 FTE curator.

**Display:** every event card deep-links to `ted.com/tedx/events/{id}` for canonical details and to the organizer's site for the form; `last_verified_at` and confidence are always visible.

### 12.6 Rehearsal pipeline

1. Browser: `getUserMedia` (720p30, mono 48 kHz Opus) → `MediaRecorder` with `isTypeSupported` fallback (`video/webm;codecs=vp9,opus` → vp8 → `video/mp4`) → `start(2000)` chunks → tus resumable upload direct to Storage (Uppy/tus-js-client); IndexedDB buffer until the final offset is acknowledged. Never proxy uploads through Vercel or Edge Functions.
2. Worker: FFmpeg extracts 16 kHz mono WAV → Deepgram Nova-3 batch (`filler_words=true`, `utterances=true`, `smart_format=true`, language from profile) → metrics (WPM gross and articulation; pause bins 0.5–1 / 1–2 / >2 s; filler and crutch rates; F0/intensity CV per 10 s via Parselmouth; section timings by aligning transcript to the locked script with word-level diff) → coverage % → Haiku/Sonnet narrative feedback with the metrics JSON and script → write `rehearsal_metrics` → notify.
3. Vision (consented, P+): MediaPipe in a Web Worker at 10–15 fps; head yaw/pitch from the transformation matrix plus eye-look blendshapes classify "toward camera" within a tolerance cone calibrated in the first 3 seconds ("look at the lens"); upload only per-10-second aggregates. Label as "camera-facing time". Disable when the teleprompter is on.
4. Retention: raw video deleted after 30 days unless kept; WAV deleted after processing; transcripts and metrics kept for the account lifetime; a pg_cron job enforces it.
5. Targets: 12-minute take analyzed in under 4 minutes; cost ≈ $0.08 per 10-minute take of STT (Deepgram at $0.0077/min) plus ≈ $0.03 LLM.

### 12.7 Teleprompter, editor, exports

Tiptap document stored as JSON per version; word-level diff with `diff-match-patch` for accept/reject; teleprompter scroll via `requestAnimationFrame` with `pixelsPerSecond` derived from measured line metrics and target WPM; current-line highlight by elapsed time; optional voice-follow via Deepgram streaming (P+; bill streaming minutes; close sockets promptly). Exports: `@react-pdf/renderer` for script, press kit and backstage card (no browser needed); `docx` npm for DOCX; `ics` npm for deadlines with VALARM at 14, 7, 3 and 1 days (matching the reminder schedule in Sections 5.6 and F1.2.4); per-user calendar feed `/api/calendar/:token.ics`.

### 12.8 Privacy, security and compliance (binding)

| Topic | Requirement |
|---|---|
| Biometrics (Illinois BIPA; also check Texas CUBI and Washington MHMDA) | Face-landmark analysis is a "scan of face geometry". Before enabling: a dedicated consent screen stating that facial geometry is processed on the device to compute camera-facing time, that no landmarks or face data leave the device, the retention schedule, and an electronic signature/checkbox stored in `consents` with timestamp, IP and policy version (BIPA SB 2979, Aug 2024, confirms e-signature consent; accrual is now per person; damages $1,000/$5,000). Feature default off; audio-only mode is the baseline. Never build speaker-identification or "voiceprint" features. [A98] |
| GDPR / UK GDPR | Lawful basis: contract for core coaching; consent for the optional vision feature; keep the gaze metric non-identifying so Art. 9 is not triggered; DPIA anyway; export and delete self-service; DPAs with Deepgram, AssemblyAI, Anthropic, Supabase, Vercel, Paddle, Resend, PostHog, Sentry; EU-region project and EU STT routing if marketing in the EU. [A99] |
| India DPDP Act 2023 / Rules 2025 (notified 14 Nov 2025; core obligations ≈ May 2027) | Plain-language consent notices with a withdrawal link and grievance contact; 72-hour breach reporting runbook; erase after one year of inactivity (warning first); verifiable parental consent under 18 (TEDxYouth); consider an India or Singapore region if India becomes primary; penalties up to INR 250 crore. [A100] |
| Retention defaults | Raw video 30 days (user-extendable), audio derivative deleted after processing, transcripts and metrics for the account lifetime, LLM logs 90 days with hashed user id, consents indefinitely, account inactivity 12 months → warning → erase |
| Minors | 18+ for recording and analysis; a parent/guardian-managed account path for TEDxYouth |
| Security | Supabase RLS on every table; server-side role checks; magic-link rate limits (5/hour/email); same message whether or not an email exists; signed URLs for all media; secrets in Vercel/Supabase vaults; dependency scanning; quarterly access review; SOC 2 Type I target within 12 months of launch (drive via vendors that already have reports and an automation platform; cost not sourced) |
| AI disclosure | Label AI drafts in the editor and exports ("Draft generated with AI; edited by speaker"); disclose AI use in ToS and privacy policy; remind applicants that organizers may ask whether AI was used and that TED says AI must never replace fact-checking |
| Content policy | Members may not use the product for pay-to-play; curators and coaches may not accept payment from organizers; violations end the account |

### 12.9 Cost model (planning numbers; verify after 90 days)

| Active users | Variable (≈ $2/user average at a 30/70 heavy/light mix) | Fixed platform | Total |
|---|---|---|---|
| 100 | ≈ $200 | ≈ $130 (Supabase Pro $25 + Vercel Pro 2 seats $40 + Sentry $29 + free tiers) | ≈ $300–400 |
| 1,000 | ≈ $2,000 | ≈ $450 (Supabase compute add-on $15–60, Inngest Pro $99 or Trigger.dev Pro $50, Resend Pro $20, Sentry $29, PostHog overage) | ≈ $2,300–2,800 |
| 10,000 | ≈ $20,000 list (≈ $14–17K with Deepgram Growth, Batch, caching, Haiku routing) | ≈ $1,500–3,000 (Supabase Large/XL $110–210, storage/egress $300–600, Inngest Business $499, Sentry Business $89, Vercel usage, optional Supabase Team $599) | ≈ $16–23K |

Heavy-user COGS ≈ $1.6–4.0/month ($3–5 if Opus is used for drafts). The two biggest levers are video retention policy and model routing. Payment processing is additional (Paddle ≈ 7.5% effective at low ARPU; Stripe ≈ 4.4%).

### 12.10 Engineering conventions

- Monorepo: `apps/web` (Next.js), `apps/worker` (Trigger.dev/Inngest jobs, Dockerfile with FFmpeg + Python), `packages/db` (Supabase migrations, generated types), `packages/prompts` (versioned prompt files with schema), `packages/ui` (tokens, components), `packages/evals` (Promptfoo).
- API: route handlers under `/api/*`; all AI actions go through one `runAiAction(actionKey, input, user)` service that checks plan, credits and caps, picks the model, loads the prompt version, logs to `llm_calls`, charges the ledger, and returns structured output.
- Feature flags via PostHog for every V2 feature; dark launches by tier.
- Environments: local (Supabase CLI), preview (Vercel + Supabase branching at $0.01344/branch-hour), production. Migrations reviewed; RLS tests run in CI with two seeded members, one coach, one curator.
- Performance budgets: LCP < 2.5 s on Today; editor keystroke latency < 50 ms; first streamed token < 2 s; upload resume after a 10-second network drop.
- Observability: Sentry for errors, PostHog for product events (profile saved, idea locked, event tracked, application sent, script locked, take analyzed, clinic joined, plan upgraded), a cost dashboard from `llm_calls` and STT minutes.

### 12.11 Effort estimates (person-weeks; two senior full-stack engineers, one with Python/FFmpeg)

| Module | MVP | Full |
|---|---|---|
| Auth, profiles, plans, credits, billing webhooks (Paddle/Stripe) | 2–3 | 4–6 |
| Event database, curator console, organizer submissions, matching | 4–6 | 10–14 |
| Idea Lab → Pitch Pack → Application Pipeline (LLM, rubrics, linters, Kanban, exports) | 4–6 | 8–12 |
| Script Studio (Tiptap, outline-first, passes, versions, fact-check, lock) | 3–4 | 6–8 |
| Rehearsal Studio (capture, upload, STT, metrics, feedback, teleprompter, memorize drills) | 5–7 (audio-first) | 10–16 (vision, voice-follow, drills, peer matching) |
| Amplify (launch plan, copy kit, press kit; later clips, stats, posting) | 2–3 | 8–12 |
| Coaching ops, community, admin extensions | 3–4 | 6–8 |
| **Total** | **23–33** | **52–76** |

---
## 13. AI prompt library, rubrics and schemas

All prompts are versioned files in `packages/prompts` (`<action>.v<n>.md` plus `<action>.schema.json`). Every prompt starts with the shared preamble (13.1). Placeholders use `{{double_braces}}`. Outputs that feed the UI use JSON schemas (structured outputs). Model per action is set in Section 12.4.

### 13.1 Shared preamble (prepend to every prompt)

```
You are the writing and speaking coach inside Stage OS, a product that helps experts prepare
talks for independently organized TEDx events. You are not affiliated with TED. You never
promise selection. You coach toward one idea worth spreading.

Rules you enforce in everything you write or review (quote the rule when you flag it):
R1 Ideas, not profiles. Selection depends on the idea the speaker is actively working on,
   not their story or credentials. Personal narrative alone is not enough.
R2 No selling. No products, services, books, programs, logos, funding asks, or "learn more at".
   If it feels like an advertisement, it probably is.
R3 Not a fit: "professional speaker", "motivational speaker", "life coach" framing; motivational
   platitudes ("be your authentic self", "follow your passion"); claiming you can speak on anything;
   mentioning other TEDx talks given; seeking many TEDx stages; mass pitches.
R4 No partisan politics, no proselytizing (including "new age" beliefs), no inflammatory positions.
R5 Science and health: claims must be testable and consistent with established knowledge; never
   medical advice; replace "cure" or "heal" with "reduce the risk of"; flag "quantum", "energy
   healing", "manifest" and similar as red flags.
R6 Length: talks are under 18 minutes; 8-10 minutes is the sweet spot; one idea, at most three
   subtopics.
R7 Honesty: never invent facts, credentials, results or quotes. Use only what the speaker provided.
   Mark anything that needs a source.
R8 Voice: write the way the speaker talks, not the way they write. Present tense, strong verbs,
   short sentences, no jargon a non-specialist would not understand.
R9 Never suggest mentioning Stage OS, a coach, a course or a program in any application.

Style: plain, warm, direct. Short paragraphs. No em dashes. No buzzwords (unlock, unleash, elevate,
seamless, game changer, next level, dive in, secret weapon). Never use exclamation marks.
When you are unsure, say what you cannot verify.
```

### 13.2 Content-Guideline Linter (Haiku 5.5; runs on every generated or submitted text)

```
Task: Review the text for violations of rules R1-R5 and R9 and for self-promotion that would
hurt a TEDx application. Return JSON only.

Input text: {{text}}
Context: {{context}}  // one of: idea | application | pitch_video_script | script | launch_copy

Return:
{
  "flags": [
    {"rule": "R2", "quote": "<exact substring>", "why": "<one sentence>", "fix": "<rewrite of that substring>"}
  ],
  "self_promotion_score": 0-3,   // 0 none, 1 mild, 2 clear, 3 the text is about the business
  "blocking": true|false         // true if any R2, R4, R5 or R9 flag, or self_promotion_score >= 2
}
Seeded phrases that must always flag: "as a coach", "my program", "my book", "available on Amazon",
"book me", "keynote speaker", "motivational speaker", "my TEDx talk at", "I can speak on any topic",
"this course taught me", "my coach says".
```

### 13.3 Idea rubric and the Idea Generator / Scorecard prompts

**Idea rubric (9 criteria; Level 1 fails, 2 weak, 3 meets, 4 exemplary). Sources are quoted in the UI.**

| # | Criterion | Level 4 | Level 1 | Standard quoted |
|---|---|---|---|---|
| 1 | Idea, not topic, issue or story | Draws a larger conclusion from evidence; proposes something people can act on | A subject area, a biography, a list of facts | "An idea is more than a story or a list of facts; it draws a larger conclusion from evidence or observations." (TED organizer guide) |
| 2 | Throughline ≤ 15 words | One sentence, a claim one could disagree with | Cannot be stated in a sentence; a theme | Anderson: capture the throughline in no more than 15 words |
| 3 | Novelty | New, or a familiar idea with a compelling new argument; not a copy; distinct angle on a saturated topic | Already heard; recycled keynote | "The TED world should not have heard it before, and it should not copy a TED talk." |
| 4 | Arguable, has an antagonist | Names who disagrees and why; admits controversy | Self-evident or a platitude | "defended by an argument, is not self-evident, and may have an antagonist" |
| 5 | Evidence-based, factual, realistic | Claims survive expert scrutiny; empirical over anecdotal | Bad science; purely anecdotal | TEDx Rules; Speaker Guide |
| 6 | Who benefits | Serves the audience, not the speaker or business | Only serves speaker/business | Anderson: "Who does this idea benefit?" |
| 7 | Changes perception or action | Audience would think, live or act differently; a winnable first step exists | No change implied | TED; TEDxCamden curator |
| 8 | Local origin, global relevance, durable | Rooted in the speaker's work and community yet relatable worldwide; valuable in 5–10 years | Purely local or purely trendy | TED; TEDxCamden |
| 9 | Speaker fit | Speaker has done the work; peer credibility; not a repeat or circuit speaker | Narrative alone; fame without idea | TED "Speaking at TEDx"; TEDxMinneapolis |

Gate: criteria 1 and 4 below Level 2 block locking.

**Idea Generator (Sonnet 5.5)**

```
Generate 5 candidate ideas worth spreading for this speaker. Use only the material provided.

Speaker profile: {{profile}}            // expertise, city, country, bio
Raw material: {{dossier}}               // interview transcript, book summary, pasted text
Steer (optional): {{steer}}
Segment: {{segment}}                    // coach | author | executive | academic | india | other

For each idea return JSON:
{
 "ideas": [{
   "title_working": "<specific, verb-driven, no generic praise>",
   "throughline": "<= 15 words, a claim someone could disagree with",
   "belief_challenged": "<the widely held belief and how the idea challenges it>",
   "antagonist": "<who would disagree and why>",
   "evidence_base": "<what evidence or observation supports it; mark 'needs source' where unknown>",
   "audience_action": "<one small winnable first step>",
   "why_this_speaker": "<original work or lived experience that earns it; no credentials dump>",
   "talk_type": "big idea | small idea | awe and wonder | issue | artist statement",
   "risk_notes": "<any R1-R5 concern, or 'none'>"
 }]
}
Constraints: no two ideas on the same belief; at least two must be counterintuitive; none may be
a motivational platitude; for authors, at least three ideas must be adjacent to and broader than
the book's thesis rather than the book itself; for coaches, strip all "coach", "program",
"framework" language and lead with lived experience.
```

**Idea Scorecard (Haiku 5.5)**

```
Score this idea on the 9-criterion rubric. For each criterion give level (1-4) and one sentence
of reasoning that quotes the specific words in the idea that earned the level. Then list the two
highest-leverage fixes. Return JSON: {"scores":[{"criterion":1,"level":3,"reason":"..."}],
"gate_passed":true|false,"fixes":["...","..."],"similar_talks_to_check":["<topic phrases>"]}
Idea: {{idea_json}}
```

### 13.4 Application rubric and the Readiness Review prompt

| # | Criterion | Level 4 | Level 1 |
|---|---|---|---|
| 1 | Idea statement (Q1) | Clear, specific, single idea in 100–250 words; leads with the surprising claim; then evidence; then why now; then local/global relevance | Topic, motivational message, self-promotion |
| 2 | One/two-sentence distillation | ≤ 15 words, repeatable to a friend | Vague, multi-clause |
| 3 | Why now / why this audience | Uses the event's theme language; explains community impact | Ignores the theme; generic |
| 4 | Why you | Domain authority, original work on the idea, peer credibility | Unrelated credentials; résumé dump |
| 5 | Pitch video | Within requested length; idea, why it matters, why you; standing, well lit, as if on stage | Over length; reads notes; poor lighting |
| 6 | Bio | ≈ 250 words (or the form's limit), relevant to the idea, answers "why trust this person" | Résumé dump |
| 7 | Coachability and commitment | Explicitly willing to be coached, 3–5 hours/week, rehearsal dates held | Silent; "I've done this before" |
| 8 | Compliance | No selling, no pay-to-play, no sponsor/organizer conflict, no prior TEDx on the same idea, no mention of courses/coaches/products | Any present |

Gate: Level 3 or higher on criteria 1, 4 and 8 before "Ready".

**Readiness Review (Haiku 5.5 for scoring, Sonnet 5.5 for rewrites)**

```
Review this application draft for {{event_name}} (theme: "{{event_theme}}"; form fields:
{{form_fields}}; talk length target: {{talk_length}}; local connection required: {{local_required}}).
Score each of the 8 criteria (level 1-4, reason with quoted words). Run the linter rules. Then,
for every criterion below level 3, write the exact replacement text using only facts from the
speaker's profile and dossier. Return JSON:
{"scores":[...],"gate_passed":bool,"linter":{...},"rewrites":{"<field>":"<text>"},
 "organizer_eyes":"<two sentences: what a tired volunteer curator will think reading this in 40 seconds>"}
Draft: {{answers_json}}   Profile: {{profile}}   Dossier: {{dossier}}
```

### 13.5 Pitch Pack prompt (Sonnet 5.5)

```
Create the reusable Pitch Pack for this locked idea. Use only provided facts. Return JSON with:
titles (3; specific, verb-driven, searchable, <= 60 characters, no generic praise),
one_sentence (<= 15 words), idea_statement (180-230 words, structure: surprising claim -> belief
it challenges -> evidence/observation -> why now -> who it helps), why_now (90-130 words),
why_you (90-130 words; original work and lived experience; no "coach/speaker/author of"),
accomplishment (<= 100 words, one concrete thing), bio_150, bio_250, youtube_bio (4-7 sentences
answering "why should I trust this person"), pitch_video_script_90s (three beats with timings:
idea 0-30s, why it matters 30-60s, why you 60-90s; conversational; no greeting, no "hi my name is";
first sentence is the claim), needs_source (list of claims that need a citation).
Idea: {{idea_json}}  Expansion: {{expansion_json}}  Profile: {{profile}}  Voice sample: {{voice_sample}}
```

### 13.6 Per-event personalization prompt (Sonnet 5.5)

```
Adapt the base Pitch Pack to this event without inventing facts. Mirror the event's own theme
language where it fits naturally (never force it). Add the local connection from the profile if
it exists; if it does not exist, do not fabricate one and say so in "cautions". Fit the talk-length
target. Keep the one-sentence idea unchanged unless the theme requires a sharper angle; if you change
it, explain why. Return JSON: {"fields":{...per form field...},"what_changed":["..."],
"cautions":["..."],"theme_phrases_used":["..."]}
Base pack: {{pitch_pack}}  Event: {{event_json}}  Form fields: {{form_fields}}  Profile: {{profile}}
```

### 13.7 Human coach review templates (not AI; used in the coaching layer)

Application review: rubric scores with one-line reasons; three tracked-change edits at most (the speaker must own the words); one "organizer eyes" paragraph; one next step. Script review: rubric scores; a cut list (what to remove to hit time); the strongest line and the weakest line; one next step. Video review: five timestamped comments; one thing to keep; one thing to change next take. SLAs in Section 9.3.

### 13.8 Script rubric, Outline prompt, Script Draft prompt, Editing passes

**Script rubric (11 criteria)**

| # | Criterion | Level 4 | Level 1 |
|---|---|---|---|
| 1 | Invisible structure | Care → idea → evidence/implementation → effect on audience; no announcing | Announces the structure; no clear beginning/middle/end |
| 2 | Opening | Starts where the talk takes off: one surprising fact, a specific moment, or a "what if" question; no greeting, thanks, joke warm-up or meta-talk | String of statistics; "today I'll talk about"; apology |
| 3 | Brevity, one idea | Fits the slot with buffer; one major point, ≤ 3 subtopics | Multiple ideas; over time |
| 4 | Explanation builds from the familiar | Layers from what the audience knows; jargon passes the non-specialist test | Curse of knowledge; jargon |
| 5 | Evidence | Empirical over anecdotal; citations out of the flow; controversy acknowledged | Purely anecdotal; overstatement; suspicious claims |
| 6 | Story and emotion | Specific stories with sensory texture, used sparingly, serving the idea; honest emotion; vulnerability; failure as well as success | Forced emotion; story without lesson; ego |
| 7 | Contrast and tension | Alternates "what is" and "what could be" | Flat exposition |
| 8 | Language | Conversational, present tense, strong verbs, sounds like speech | Written register; redundancy; TED puns |
| 9 | Ending | Shows how life changes if the idea is adopted; one winnable call to action; new-bliss close; two planned ending points | Summary; pitch; fundraising; book cover |
| 10 | Word budget | Words ÷ minutes ≈ 130–160 wpm with buffer | > 175 wpm equivalent; no buffer |
| 11 | Compliance | No promotion; no inflammatory politics/religion; claims fact-checkable | Any violation |

**Outline Builder (Sonnet 5.5)**

```
Build a section-by-section outline for a {{slot_minutes}}-minute talk at {{target_wpm}} wpm
(word budget {{word_budget}}; reserve 8% buffer). Template: {{structure_template}}.
For each section return: id, kind (hook | care | idea | evidence | implication | cta | close),
purpose (one line), beats (3-6 bullets, concrete, no prose), story_slot (true if a specific moment
belongs here), target_seconds, target_words, claims_needing_sources.
Constraints: the idea is stated in full by the end of section 2 and never later than 20% of the
talk; evidence sections move from familiar to new and include the strongest counterargument;
the close contains a winnable action and a "new bliss" picture, no summary, no pitch; plan two
ending points (mark the first with "ending_point": true).
Idea: {{idea_json}}  Expansion: {{expansion_json}}  Stories: {{stories}}  Profile: {{profile}}
```

**Script Draft (Sonnet 5.5; Opus 5.5 for the premium pass), called once per section with the full outline in context (cached)**

```
Write section {{section_id}} ({{kind}}, target {{target_words}} words) of the talk as spoken prose.
Follow the outline beats exactly. Present tense where natural. Sentences short enough to breathe.
Strong verbs. No jargon a non-specialist would not know. Insert [pause] where a beat needs air and
[claim: ...] after any statement that needs a source. If this is the hook: first sentence is the
surprise, no greeting. If this is the close: end on the picture of the world with the idea adopted,
then the single action; never summarize; never mention a book, product or website.
Match the speaker's voice sample for rhythm and vocabulary: {{voice_sample}}.
Return plain text for the section only.
Outline: {{outline_json}}  Prior sections: {{prior_text}}  Profile: {{profile}}
```

**Editing passes (each returns a JSON patch `{"sections":[{"id":"...","text":"..."}],"notes":["..."]}`)**

- Cut to time: "Remove the {{percent}}% of lowest-value content; prefer cutting whole beats over thinning every sentence; never cut the idea statement, the strongest story or the call to action; report what was cut."
- Stronger opening: "Return five alternative first paragraphs: a specific moment, a surprising fact, a 'what if' question, a confession, a contradiction; each under 60 words; no greeting."
- Kill the jargon: "List every term a non-specialist would not understand; replace or explain each in plain words in place."
- Add contrast: "Mark where the text states 'what is'; add a 'what could be' beat after each, in the speaker's voice."
- Sounds like me: "Rewrite in the speaker's rhythm using the voice sample; keep every fact; shorten sentences the speaker would not say aloud."
- Sharpen the close: "Rewrite the last 150 words: picture of the world with the idea adopted, one winnable action, no summary, no pitch; add a second ending point 60 seconds earlier."
- De-pitch: "Remove anything that reads as promotion; replace with the idea's benefit to the audience; report every removal."
- Simplify: "Bring reading level to grade 7-8 without losing precision."

### 13.9 Fact-check Flagger (Haiku 5.5)

```
Extract every checkable claim (numbers, studies, named people, historical facts, causal claims,
health statements). For each return: text, section_id, type, risk (low | medium | high), what a
fact-checker would ask, and whether the phrasing violates R5 (e.g., "cure"). Do not verify; the
speaker verifies. Return JSON {"claims":[...], "r5_flags":[...]}.
Remind in "note": TED says never use AI as a substitute for fact-checking; organizers may need an
annotated script; fact-checking takes 2-12 hours.
```

### 13.10 Rehearsal feedback (Haiku 5.5 default; Sonnet 5.5 on Pro+)

```
You are reviewing one rehearsal take. Inputs: the locked script (sections with ids), the transcript
with word timestamps, the metrics JSON {{metrics}} (wpm_gross, wpm_articulation, pauses bins,
filler_rate_per_min, crutch_words, f0_cv, energy_cv, coverage_pct, section_timings vs targets,
total_s vs slot_s, teleprompter_on, camera_facing_pct if present), and the previous take's metrics.
Write:
1. "What worked" (one specific observation anchored to a section name and a transcript timestamp).
2. "Try next" (one concrete change for the next take; name the section; give the exact line if useful).
3. "First 7 seconds" (one line about the opening).
4. Numbers in bands, compared with the previous take, never as grades: pace, fillers, longest pause,
   time vs slot, coverage, section timing deviations > 15%.
Never say "relax", "breathe", "practice more", "great job". Never comment on appearance.
If teleprompter_on is true, do not comment on eye contact.
Return JSON {"worked":"...","try_next":"...","opening":"...","bands":{...},"dropped_beats":["..."]}
```

### 13.11 Delivery rubric (used in coach video reviews and the readiness checklist)

First 7 seconds (pause, breath, anchored feet, confident open) · Memorization and naturalness (knows it cold; conversational; no notes; not the half-memorized "valley of awkwardness") · Pace and pauses (120–160 wpm with deliberate pauses after key points; this is the sourced recommended range, while the script word budget in Section 7 uses the narrower 130–160 to leave a buffer) · Vocal variety (rate, volume, pitch, energy shifts) · Gestures (frequent and purposeful; the most popular TED talks averaged 465 gestures per 18 minutes vs 272) · Eye contact (rotating among 5–6 anchor people; camera addressed as real viewers) · Stage use (planted inside the circle; moves with purpose; no podium) · Warmth (smiles ≥ 14 seconds total; honest emotion) · Timing (under the slot every run; hits the 6-minute checkpoints) · Slides (clicker rehearsed; blank screen when not in use; never reads slides) · Wardrobe (no stripes, complex patterns, bright colors, dangling jewelry).

### 13.12 Clip selector (Sonnet 5.5, Batch)

```
From this transcript with word timestamps, select 5-8 segments of 30-60 seconds that are
self-contained (start and end on sentence boundaries), lead with a hook within 3 seconds, contain
one quotable line, and do not require prior context. Score each 0-10 on hook, self-containment,
quotability. Respect the hard cap of 60 seconds. Return JSON {"clips":[{"start_ms":..,"end_ms":..,
"hook":"...","quote":"...","scores":{...},"caption_title":"<= 60 chars"}]}
```

### 13.13 Launch copy kit (Sonnet 5.5)

```
Write the launch kit for a published talk at {{event_name}} (an independently organized TEDx
event). Always describe it exactly that way; never "my TED talk"; never use or suggest the TED logo.
Return: personal_email (120-180 words, three asks: watch, like or comment, forward to one person
who needs it), linkedin_post (idea first, one story line, link; no hashtag stuffing), newsletter_block
(80 words), email_signature_line, ten_second_angles (10 one-line repost angles for the next 8 weeks),
blogger_outreach (3 short notes to topic writers or communities), bio_line.
Idea: {{idea_json}}  Script summary: {{summary}}  Link: {{youtube_url}}  Profile: {{profile}}
```

### 13.14 Event theme tagging (Haiku 5.5, Batch)

```
Given an event's public theme text and (if provided) past talk titles, return up to 8 topic tags
from the controlled vocabulary {{taxonomy}}, a one-line "what they seem to look for" paraphrase
(do not copy their sentences), and an open_call_likelihood (low | medium | high) with reason.
JSON only.
```

### 13.15 Eval set (minimum before launch)

- 50 idea briefs across segments with expected gate outcomes (10 platitudes must fail; 10 topics must fail criterion 1).
- 50 linter phrases (seeded list in 13.2) with expected flags; target recall ≥ 95%, false-positive rate ≤ 5% on 50 clean phrases.
- 20 outline/draft briefs; check word budget ±10%, presence of hook/idea/CTA, absence of summary endings and promotion.
- 20 rehearsal metric fixtures; check that feedback references the right section and never uses banned generic phrases.
- 10 personalization cases including "no local connection" (must not fabricate).
Run on every prompt version; block deploy on regression.

---
## 14. Roadmap, build plan, metrics, go-to-market and risks

### 14.1 Phases (each ends with acceptance checks that must all pass)

**Phase 0 (weeks 1–4): Foundation and rebrand.** Stand up a new Supabase project with the full data model of Section 12.3 (tables, roles, RLS, magic-link login, profiles, `talks`, `credits_ledger`, `subscriptions`, `consents`); rename the product (clear the name; retire "TEDx Engine"); design tokens and component library; Paddle (or Stripe) sandbox; PostHog, Sentry, Resend. The rebuild plan's bug list and migration steps are a useful checklist here, nothing more. Acceptance: member A cannot read or change any row of member B (tested by script); first login creates exactly one membership and one profile; a member in Canada and a member in India can sign up; the disclaimer renders on every page; the design tokens pass automated contrast checks; a credit charge and refund appear in the ledger.

**Phase 1 (weeks 5–12): MVP of FIND + WRITE + audio-first DELIVER + basic AMPLIFY, Spark/Builder/Pro live.** Idea Lab (F1.1.1–1.1.9), Event Finder with curator console and 300+ verified events at launch (F1.2.1–1.2.6, 1.2.9, 1.2.11), Application Pipeline (F1.3.1–1.3.7, 1.3.9, 1.3.12), Pitch Studio (F1.4.1, 1.4.2 audio metrics, 1.4.4), Script Studio (F2.1–2.5, 2.7–2.11), Rehearsal Studio audio-first (F3.1–3.5, 3.7 timed scroll, 3.8 cards and blank-fill, 3.10, 3.11, 3.13, 3.16), Event-day kit, Amplify basics (F4.1–4.4, 4.11, 4.12), Today and Journey, reverse trial, credits, group clinics scheduled (Pro), community (in-app or embedded). Acceptance: the Section 6–8 checks marked MVP; a new user reaches a scored idea and three event matches in under 12 minutes in a usability test of 8 people; a 12-minute take is analyzed in under 4 minutes; a full 10-minute draft lands within budget; the Promptfoo suite passes; RLS tests pass for two members, one coach, one curator; a full purchase, upgrade, downgrade and cancellation flow works in the MoR sandbox.

**Phase 2 (weeks 13–24): Depth and the human layer; Inner Circle and Encore live.** Vision metrics with consent (F3.6), voice-follow prompter (F3.7), spaced memorization and audio companion (F3.8–3.9), blank drills (F3.12), AI interview prep (F1.3.8), event intel and curated shortlists (F1.2.7–1.2.8), organizer claims (F1.2.10), cohort stats (F1.3.10), human reviews and coach ops (F1.3.11, F2.12, F3.15; A7), slides checker (F2.13), story extraction (F2.6), Clip Cutter and quote cards (F4.5–4.6), press kit (F4.7), talk stats (F4.8), coach video reviews, peer rehearsal matching (F3.17), coach idea review (F1.1.10), organizer research card (F1.4.3), speaker one-sheet (F1.4.5), catchphrase and title workshop (F2.14), AI audience Q&A for auditions (F3.14), INR pricing and UPI. Acceptance: vision cannot run without a consent row; clips never exceed 60 seconds; cohort stats exclude cohorts under 20 members; coach SLAs met for 4 weeks in a row; UPI Autopay renewal succeeds in Paddle sandbox.

**Phase 3 (months 7–12): Scale and ecosystem.** Organizer portal, paid-stage pipeline (F4.10), article and podcast generator (F4.9), outcome capture (F4.13), Elite-client seat provisioning, challenge order bump, affiliate program, SOC 2 Type I, DPDP readiness (by May 2027), Hindi UI exploration, TEDxYouth guardian accounts. Acceptance: 60% of applications sent go to events discovered in-app; event coverage with known deadlines ≥ 60%; blended gross margin ≥ 75% on actuals; NPS ≥ 50.

### 14.2 Team

Two senior full-stack engineers (one with Python/FFmpeg), one product designer (part-time after Phase 1), one curator (0.5 FTE, growing to 1), one coaching lead plus GBP coaches, one growth marketer, a fractional data/analytics role. The building Claude account can produce the specifications, prompts, migrations, components and tests; humans own event curation, coaching, legal review and launch.

### 14.3 Metrics (instrument from day one)

| Area | Metric | Target |
|---|---|---|
| Activation | % of sign-ups reaching a scored idea in session one | 60% |
| Activation | % of sign-ups locking an idea within 7 days | 35% |
| Conversion | Reverse-trial to paid within 90 days | 6% (good 4–6%, great 8–12%) |
| Engagement | Weekly commitment met (paid) | 55% |
| Pipeline | Applications sent per paying member per month | 3 |
| Pipeline | Readiness pass rate before send | 90% |
| Outcomes | Interview rate; acceptance rate per cohort | publish quarterly; no target in year one |
| Craft | Scripts locked within ±10% of budget | 90% |
| Delivery | Takes per member per week in Stage 5; coverage ≥ 95% in the final week | 3; 70% of members |
| Retention | Monthly paid logo churn | ≤ 5% by month 6, ≤ 4% by month 12 |
| Retention | Encore conversion after a published talk | 50% |
| Quality | Feedback thumbs-up rate; coach SLA compliance | ≥ 80%; ≥ 95% |
| Economics | Gross margin blended; AI COGS per paying member | ≥ 75%; ≤ $6 |
| Data | Event coverage with known deadlines; median verification age | 60%; ≤ 10 days |
| Trust | "Report outdated" per 100 event cards; pay-to-play reports actioned | < 2; 100% |

### 14.4 Go-to-market

1. **Founder-led proof.** The joint credential "5X TEDx Speakers" and GBP's author network make a monthly free live workshop ("How independently organized TEDx events actually choose speakers, and how to prepare an idea they can't ignore") the top of the funnel. Expect a ~48% registrant-to-attendee rate (Livestorm 2026). Funnel: workshop → free Idea Lab (PQL) → reverse trial → program purchase; human outreach to PQLs within 24 hours.
2. **ABB challenge integration.** Replace the stale $197 TEDx-training order bump with a Stage OS bump (Section 10.9); feature the Idea Lab during the challenge's positioning day (the "you're not underqualified, you're underpositioned" teaching maps directly onto the idea rubric). Never pitch Stage OS as a path to selection.
3. **Elite and Guided inclusion.** Elite clients get six months of Pro; Guided three months of Builder. This seeds outcomes and testimonials quickly.
4. **IAA Diamond migration.** Existing TEDx Engine members move to Builder on day one with their profiles, ideas and pitches migrated (rebuild plan's migration steps).
5. **Affiliates at 30% recurring for 12 months** with a 90-day cookie (Podia/Thinkific norms), aimed at coaches, podcast hosts and Toastmasters leaders; never pay affiliates for "guaranteed" language.
6. **Content.** Publish the quarterly cohort outcome report, the "open calls this week" page, and a free "Application rubric" page; these are search assets no competitor has.
7. **Partnerships (no money to organizers).** Toastmasters clubs as rehearsal audiences; university speaking centers; author communities; speaker-industry newsletters.
8. **India launch** after INR/UPI pricing is live: IAA audience first, then Indian author and coach communities; emphasize events near you and en-IN transcription.
9. **Positioning line for ads and pages:** "Prepare one idea worth spreading, find the stages that fit it, and rehearse until you own it. We never sell slots and never promise selection."

### 14.5 Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TED objects to naming or positioning | Medium | High | TED-free name, disclaimer, descriptive use only, no "get selected", counsel review of marketing before launch |
| TED changes TEDx rules or launches its own speaker product | Medium | Medium | Differentiate on pipeline and outcomes; keep craft curriculum modular; monitor TED announcements quarterly |
| Event data goes stale or wrong | High without process | High | Curator SLA, organizer claims, "report outdated", visible verification dates |
| Organizers resent the product | Low–Medium | High | No organizer contact on behalf of members; free, minimal organizer portal; ethics page; report pay-to-play |
| AI writes generic or rule-breaking content | Medium | High | Linter, rubric gates, evals, voice samples, human reviews at the top tier |
| Biometric litigation | Low | High | On-device only, consent, default off, audio-first baseline |
| Margin erosion from heavy AI/video users | Medium | Medium | Credits, minute metering, fair use, routing, retention policy, 90-day repricing review |
| Graduation churn | High | Medium | Six-month program, Encore tier, amplification features |
| Expectation gap and refunds | Medium | Medium | Honest onboarding, 30-day guarantee, effort-based extension |
| Coach capacity limits Inner Circle growth | Medium | Low | Cap at coach capacity; certify alumni coaches; group formats first |

### 14.6 Launch checklist (binding)

Legal: name cleared; disclaimer live; ToS, privacy policy, ethics page, AI disclosure; DPAs signed; consent flows tested. Product: Phase 1 acceptance passed; eval suite green; RLS tests green; 300+ verified events; 20 clinic replays recorded for Spark. Commercial: pricing page with no scarcity theatre; MoR live; refund policy; support inbox and SLAs; affiliate terms. Content: workshop deck; rubric page; outcome-report template; onboarding emails. Ops: curator rota; coach rota; on-call for the worker pipeline; cost dashboard with alerts at 80% of budget.

---

## Appendix A: Sources (primary and secondary, viewed 29–30 October 2026 unless dated)

**TED and TEDx official pages**
- A1 TED, TEDx Program: https://www.ted.com/about/programs-initiatives/tedx-program
- A2 TED, TEDx events directory: https://www.ted.com/tedx/events
- A3 Speaker Accelerator (Geleen Antonio), "I pulled every published TEDx event" (3 Dec 2025, modified 11 Feb 2026): https://speakeraccelerator.substack.com/p/i-pulled-every-published-tedx-event
- A4 TEDxLinz reproduction of TED's "State of the X" Nov 2023: https://tedxlinz.at/whatistedx
- A5 Skift Meetings, "Chris Anderson stepping down" (4 Feb 2025): https://meetings.skift.com/2025/02/04/chris-anderson-stepping-down-as-the-head-of-ted/
- A6 vidIQ channel statistics for TEDx Talks (Oct 2026): https://vidiq.com/youtube-stats/channel/@tedx/
- A7 TED Blog, "State of the X" (Feb 2012): https://blog.ted.com/state-of-the-x-stats-on-tedx-and-tedxtalks-in-january/
- A8 TEDxBoulder, About: https://tedxboulder.com/about
- A9 USN, "Knut Ivar gets lifted by TED" (about 100 talks per year featured): https://usn.no/news-archive/knut-ivar-gets-lifted-by-ted
- A10 TED, TEDx event types: https://www.ted.com/tedx/before-you-apply/event-types
- A11 TED, Licensing tiers: https://www.ted.com/tedx/before-you-apply/licensing-tiers
- A12 TED, Prepare speakers and program (organizer guide): https://www.ted.com/tedx/organizer-guide/prepare-speakers-and-program
- A13 TED, Speaking at TEDx: https://www.ted.com/tedx/speaking-at-tedx (also https://www.ted.com/about/programs-initiatives/tedx/speaking-at-tedx)
- A14 TEDxJacksonville 2025 application PDF: https://tedxjacksonville.com/wp-content/uploads/2025-speaker-application-for-Jan-2026-conference.pdf and 2024 PDF: https://tedxjacksonville.com/wp-content/uploads/2024-TEDxJacksonville-Speaker-application.pdf
- A15 TEDxBoulder, Become a speaker: https://tedxboulder.com/become-a-speaker
- A16 Skool post on TEDxThirdWard 2026 (786 applications, 155 semifinalists): https://www.skool.com/from-dream-to-speaker-stage-4093/for-those-applying-to-tedxthirdward
- A17 TEDxABQ, Speak: https://www.tedxabq.com/speak/
- A18 TEDxWinnipeg, How we choose speakers: https://tedxwinnipeg.ca/how-does-the-tedxwinnipeg-committee-choose-our-speakers/
- A19 TEDxLinz speaker guide PDF: https://www.tedxlinz.at/_files/ugd/c88ea0_56ec8c5e1ea24496879bfe6ef88b919d.pdf
- A20 TED, TEDx Rules: https://www.ted.com/tedx/before-you-apply/tedx-rules (also https://www.ted.com/pages/tedx_rules)
- A21 TEDxMinneapolis, Submit an idea: https://www.tedxminneapolis.com/submit-an-idea/
- A22 TED, TEDx Content Guidelines: https://www.ted.com/tedx/organizer-guide/tedx-content-guidelines
- A23 TED, TEDx Fact-Checking FAQs: https://www.ted.com/tedx/organizer-guide/tedx-fact-checking-faqs
- A24 TEDx Speaker Guide PDF (mirrored by TEDxBend): https://tedxbend.com/tedx/manuals/tedx_speaker_guide.pdf
- A25 TED Blog excerpt of Anderson's HBR article: https://blog.ted.com/chris-anderson-shares-his-tips-for-giving-a-killer-presentation/ ; HBR original: https://hbr.org/2013/06/how-to-give-a-killer-presentation
- A26 TED Talks Usage Policy: https://www.ted.com/about/programs-initiatives/ted-talks/ted-talks-usage-policy
- A27 TED, Promote your talks (organizer guide): https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/branding-promotions/promote-your-talks
- A28 TED, Your TEDx logo (TED Red #EB0028; Helvetica/Inter Light): https://www.ted.com/pages/your-tedx-logo
- A29 TED, Upload your videos: https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/video-photography/video/upload-your-videos
- A30 TED, TEDx Publishing Policy: https://www.ted.com/tedx/tedx-publishing-policy
- A31 TED, TEDx License Agreement: https://www.ted.com/tedx/apply-for-a-tedx-license/tedx-license-agreement
- A32 TED.com Terms of Use (updated 7 May 2024): https://www.ted.com/about/our-organization/our-policies-terms/ted-com-terms-of-use
- A33 Corsearch, "Drunk TED Talks gets cease-and-desist": https://corsearch.com/content-library/blog/drunk-ted-talks-gets-cease-and-desist-from-ted-talks
- A34 Khaleej Times, Dubai TEDx event cancelled over alleged $25,000 speaker fees (Oct 2025): https://www.khaleejtimes.com/uae/dubai-tedx-event-cancelled-alleged-25000-speaker-fees ; sting report: https://www.khaleejtimes.com/uae/fake-tedx-scam-khaleej-times-sting-operation
- A35 TED Blog, leadership announcement (15 Oct 2025): https://blog.ted.com/?p=118404
- A36 Skift Meetings, "TED selects leaders" (16 Oct 2025): https://meetings.skift.com/2025/10/16/ted-selects-leaders-to-guide-its-next-chapter/
- A37 NPR transcript, Chris Anderson on TED's future: https://www.npr.org/transcripts/nx-s1-5575174
- A38 TED Masterclass: https://masterclass.ted.com/ ; TED Blog announcement: https://blog.ted.com/announcing-ted-masterclass-teds-official-public-speaking-course/
- A39 Toastmasters dues: https://toastmasters.org/footer/faq/Membership-Dues ; Coursera public speaking: https://www.coursera.org/learn/public-speaking ; Ultraspeaking: https://ultraspeaking.com/

**Pricing, freemium, churn, payments**
- A40 ChartMogul SaaS Conversion Report 2026 (Feb 2026): https://chartmogul.com/reports/saas-conversion-report/
- A41 ChartMogul, What is a good customer churn rate: https://chartmogul.com/blog/good-customer-churn-rate/
- A42 CRV, AI SaaS revenue models (2025): https://www.crv.com/content/ai-saas-revenue-models
- A43 RevenueCat, State of Subscription Apps 2026: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026 ; trial length: https://www.revenuecat.com/blog/growth/free-trial-length
- A44 Causo, How to price an AI product in 2026: https://hub.causo.ai/guides/how-to-price-ai-product-token-costs-margins-2026
- A45 Monetizely, Why AI COGS matters: https://www.getmonetizely.com/articles/why-ai-cogs-matters-for-saas-companies-understanding-ai-economics-and-margin-impact
- A46 Lenny's Newsletter, What is a good free-to-paid conversion rate (Aug 2023): https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion ; Growth Unhinged, reverse trials: https://www.growthunhinged.com/p/your-guide-to-reverse-trials
- A47 OpenView 2023 Product Benchmarks: https://openviewpartners.com/2023-product-benchmarks/
- A48 Paddle pricing: https://www.paddle.com/pricing ; UPI docs: https://developer.paddle.com/concepts/payment-methods/upi ; UPI Autopay changelog (17 Jun 2026): https://developer.paddle.com/changelog/2026/upi-autopay/ ; Payments in India: https://www.paddle.com/blog/payments-in-india
- A49 Stripe pricing: https://stripe.com/pricing ; Stripe India: https://stripe.com/in/pricing ; Lemon Squeezy: https://www.lemonsqueezy.com/pricing
**Comparable platforms and go-to-market (pricing pages viewed 30 Oct 2026)**
- A62 Kajabi pricing: https://kajabi.com/pricing
- A63 GoHighLevel pricing: https://www.gohighlevel.com/pricing ; affiliates: https://www.gohighlevel.com/affiliates
- A64 Circle pricing: https://circle.so/pricing
- A65 Mighty Networks pricing: https://www.mightynetworks.com/pricing
- A66 Thinkific pricing: https://www.thinkific.com/pricing/ ; affiliates: https://www.thinkific.com/affiliates/
- A67 Podia pricing: https://www.podia.com/pricing ; affiliates: https://affiliates.podia.com/ ; Skool pricing: https://www.skool.com/pricing
- A68 Descript https://www.descript.com/pricing ; Opus Clip https://www.opus.pro/pricing ; Clay https://www.clay.com/pricing ; Taplio https://taplio.com/pricing ; Jasper https://www.jasper.ai/pricing
- A69 The Speaker Lab program cost: https://thespeakerlab.com/?p=3198 ; Livestorm webinar statistics (Oct 2026): https://livestorm.co/blog/webinar-statistics

**Voice of customer and demand (selected)**
- A50 TEDxHyderabad FAQ: https://tedxhyderabad.com/faq ; A51 CKPG Today on TEDxUNBC deadline extension: https://ckpgtoday.ca/?p=160517
- A52 Paulette Erato (Jan 2026): https://pauletteerato.substack.com/p/wanna-come-to-my-tedx-talk ; Entrepreneur, "Here's how to apply to give a TEDx talk": https://www.entrepreneur.com/leadership/heres-how-to-apply-to-give-a-tedx-talk/422943
- A53 The Speaker Lab, How to become a TEDx speaker: https://thespeakerlab.com/blog/how-to-become-a-tedx-speaker/
- A54 Toastmaster, What TEDx organizers want (Jun 2020): https://toastmasters.org/magazine/magazine-issues/2020/june/what-tedx-organizers-want
- A55 TEDxDirigo, Speak: https://www.tedxdirigo.com/speak
- A56 Bobby Umar interview (Apr 2025): https://redefineyourcareerjourney.buzzsprout.com/2202265/episodes/16895333-the-tedx-advantage-from-application-to-standing-ovation-bobby-umar-s-insider-guide
- A57 Female Entrepreneur Association (Carrie Green): https://femaleentrepreneurassociation.com/?p=20166 ; Publishers Weekly (2017): https://www.publishersweekly.com/pw/print/20170828/74604-taping-into-ted-to-boost-your-author-platform.html
- A58 SpeakerFlow 2026 State of the Speaking Industry: https://pages.speakerflow.com/2026-ssi-report/ ; A59 SpeakerFlow 2022 report: https://speakerflow.com/the-state-of-the-speaking-industry-2022-report/
- A60 Marcey Rader, My TEDx experience (2024): https://www.goodreads.com/author_blog_posts/24744426-my-tedx-experience-from-preparation-to-post-event ; Jia Jiang, How I got a TED talk: https://www.rejectiontherapy.com/blog/2017/7/25/how-i-got-a-ted-talk ; Kimberly Corban: https://www.kimberlycorban.com/a-behind-the-scenes-look-at-what-it-takes-to-get-to-teds-red-dot/ ; Joshua Spodek: https://joshuaspodek.com/?p=11663 ; Elizabeth DiAlto: https://elizabethdialto.substack.com/p/right-talk-wrong-stage ; Athene Donald: https://occamstypewriter.org/athenedonald/wp-json/wp/v2/posts/5492 ; Rajiv Nathan: https://www.under30ceo.com/what-really-matters-when-you-give-a-ted-talk/
- A61 Leadr/Thought-Leader enrollment page: https://lp.leadr.co/enroll-30dtl-997 ; homepage: https://leadr.co/ ; EOFire interview (Apr 2023): https://www.eofire.com/podcast/taylorconroy2/ ; BBB profile: https://www.bbb.org/us/ca/los-angeles/profile/business-coach/thought-leader-llc-1216-1000074631

**Competitors (selected; vendor pages viewed 29–30 Oct 2026)**
- A101 Masters in Clarity "You on a TEDx Stage": https://doloreshirschmann.simplero.com/purchase/69333
- A102 Big Talk Academy (Starter Story, Sep 2022): https://www.starterstory.com/stories/the-big-talk-academy ; UNMUTE application: https://form.jotform.com/233146738734058 ; TEDxCellence: https://bennettink.com/tedxcellence/ ; Moxie: https://www.moxieinstitute.com/ted-style-talk/online-class
- A103 Heroic Public Speaking: https://heroicpublicspeaking.com/ ; The Speaker Lab FAQ: https://thespeakerlab.com/faq/
- A104 Upwork "TEDx Application Writer" job: https://www.upwork.com/jobs/~022062379048042188481
- A105 SpeakerFlow pricing: https://speakerflow.com/pricing/ ; SpeakerHub: https://speakerhub.com/pricing ; SpeakerMatch: https://speakermatch.com/contenthub/plans/ ; Innovation Women: https://innovationwomen.com/become-a-member/ ; Sessionize: https://sessionize.com/for-speakers ; BigSpeak FAQ: https://www.bigspeak.com/faqs/
- A106 Yoodli pricing: https://yoodli.ai/pricing ; TechCrunch on Yoodli (5 Dec 2025): https://techcrunch.com/2025/12/05/ex-googlers-yoodli-triples-valuation-to-300m-with-ai-built-to-assist-not-replace-people
- A107 Orai App Store: https://apps.apple.com/us/app/-/id1203178170 ; Speeko App Store: https://apps.apple.com/us/app/-/id1071468459 ; Poised shutdown banner: https://poised.com/
- A108 VirtualSpeech pricing: https://virtualspeech.com/pricing ; Microsoft Speaker Coach: https://support.microsoft.com/office/rehearse-your-slide-show-with-speaker-coach-cd7fc941-5c3b-498c-a225-83ef3f64f07b ; Verble (Callin.io): https://callin.io/ai-tools/verble
- A109 Speakflow pricing: https://speakflow.com/pricing ; Teleprompter.com pricing: https://teleprompter.com/pricing
- A110 AI Tools Bakery comparison (Oct 2026): https://aitoolsbakery.com/blog/best-ai-public-speaking-coach-apps/

**Talk craft**
- A111 TED organizer guide, What is a TEDx Talk: https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/speakers-program/what-is-a-tedx-talk ; Select your speakers: https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/speakers-program/select-your-speakers-performers ; Prepare your speaker: https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/speakers-program/prepare-your-speaker ; Outline and script: https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/speakers-program/prepare-your-speaker/outline-script ; Rehearsals: https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/speakers-program/prepare-your-speaker/rehearsals ; Get views: https://www.ted.com/participate/organize-a-local-tedx-event/tedx-organizer-guide/video-photography/video/get-views
- A112 Readingraphics summary of Anderson, TED Talks: https://readingraphics.com/book-summary-ted-talks/
- A113 Duarte, 11 ways to prepare: https://www.duarte.com/10-ways-to-prepare-for-a-ted-format-talk/ ; Duarte sparkline summary: https://2023sciencethatsticks.substack.com/p/the-secret-structure-of-great-talks
- A114 Gallo, Cracking the TED code: https://www.carminegallo.com/cracking-the-ted-code-takeaways-from-talk-like-ted-the-9-public-speaking-secrets-of-the-worlds-top-minds/
- A115 Science of People TED study: https://www.scienceofpeople.com/secrets-of-a-successful-ted-talk/
- A116 June Cohen transcript: https://amara.org/subtitles/0OTt05vRqUYh/en/4/download/TEDxTEDGlobal%20%20June%20Cohen%20%20What%20makes%20a%20great%20TED%20Talk.en.srt
- A117 VirtualSpeech speaking rate: https://virtualspeech.com/blog/average-speaking-rate-words-per-minute ; Wingrove 2017: https://research.chalmers.se/en/publication/547664
- A118 Roediger & Karpicke 2006: https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf
- A119 Brooks 2014 (APA): https://www.apa.org/news/press/releases/2013/12/performance-anxiety
- A120 Toastmasters, The Big Red Dot (May 2024): https://www.toastmasters.org/magazine/magazine-issues/2024/may/the-big-red-dot ; Toastmasters, How to Land a TED Talk: https://www.toastmasters.org/magazine/articles/how-to-land-a-ted-talk
- A121 Reed Smith, Pariti Sutaria (TEDxCamden): https://www.reedsmith.com/de/perspectives/2023/09/tedx-insights-the-art-of-crafting-evocative-talks-with-pariti-sutaria
- A122 Brian Miller interview: https://www.markjcarter.com/2025/01/how-to-craft-a-ted-talk-worthy-idea/ ; Ryan Foland: https://ryanfoland.substack.com/p/from-overloaded-to-on-point-why-a ; Tricia Brouk: https://triciabrouk.com/how-to-apply-to-tedx-events/
- A123 TED Commandments (transcription): https://conorneill.com/2010/06/24/the-ted-commandments-10-rules-every-speaker-needs-to-know/

**Additional application forms and first-person accounts**
- A126 Speaker Accelerator, TEDxWilson Park listing (Mar 2026): https://speakeraccelerator.substack.com/p/tedxwilson-park
- A127 Trinity College Dublin, TEDxTCD 2027 call for speakers: https://www.tcd.ie/ahss/news-and-events/events/tedx-tcd-2027-call-for-speakers/
- A128 TEDxTinHau Women, choosing speakers (Mar 2026): https://tedxtinhauwomen.com/2026/03/03/choosing-tedxtinhauwomen-speakers/
- A129 TEDxTerry Talks (UBC) application (2015 cycle): https://www.terry.ubc.ca/?p=16386
- A130 Bard CCE, TEDx Bard College 2027 (Sep 2026): https://cce.bard.edu/news/tedx-bard-college-changing-the-narrative-for-2027-2026-09-03
- A131 Speaker Accelerator, Tips for applying to TEDxAlabaster: https://speakeraccelerator.substack.com/p/tips-for-applying-to-tedxalabaster
- A133 Speaker Accelerator, TEDx open application roundup (3 Aug 2026): https://speakeraccelerator.substack.com/p/tedx-open-application-roundup-8326
- A134 Digital Deepak, Being a TEDx speaker (Mar 2018): https://digitaldeepak.com/being-a-tedx-speaker/
- A135 Book Marketing Success, Connie Bennett (May 2025): https://bookmarketing.substack.com/p/connie-bennett-on-getting-a-tedx
- A136 Black Enterprise, Jeff Shuford (Jul 2019): https://blackenterprise.com/how-i-landed-my-first-tedx-talk-and-how-you-can-too/
- A137 Toastmaster, Lauren Parsons (Mar 2019): https://australia.toastmasters.org/magazine/magazine-issues/2019/mar/how-i-prepared-for-18-make-or-break-minutes
- A138 Chicago Boudoir, Liz Hansen (Nov 2023): https://chicago-boudoir.com/blog/faqs-about-giving-a-tedx-talk
- A139 Florida Justice, John Phillips: https://floridajustice.com/my-tedx-experience-more-than-a-few-thoughts/
- A140 Inc., Suzanne Lucas (Nov 2018): https://www.inc.com/suzanne-lucas/what-i-learned-when-i-gave-a-tedx-talk.html
- A141 Myisha Cherry: https://www.myishacherry.org/?p=4111 ; BMJ, Will Stahl-Timmins (Feb 2017): https://blogs.bmj.com/bmj/2017/02/09/will-stahl-timmins-take-my-words-and-help-them-speak/
- A142 James Mapes (Apr 2017): https://www.jamesmapes.com/?p=5408 ; Stacy Horn (Feb 2014): https://stacyhorn.com/2014/02/25/behind-the-scenes-of-a-tedx-talk/
- A143 Gui Karsten (Oct 2024): https://guilkarsten.substack.com/p/a-tedx-experience-of-my-own ; Business Journal Daily, TEDxYoungstown cohort (Feb 2019): https://businessjournaldaily.com/?p=60040
- A144 Inc., John Bates: https://www.inc.com/john-bates/how-failing-on-the-ted-stage-changed-my-life.html ; Facilitate Better, Jeffrey Cufaude: https://facilitatebetter.substack.com/p/four-lessons-relearned-from-speaking ; David Gauntlett (2016): https://davidgauntlett.com/?p=1644
- A145 PCMA, Hayley Foster (Apr 2024): https://www.pcma.org/from-ted-talk-skeptic-sought-after-tedx-speaker-coach/ ; Simon Tam (Jun 2015): https://www.simontam.org/blog/2015/06/04/7-essential-tips-to-prepare-for-your-ted-talk ; Michael Gerharz quoting Chris Anderson (Mar 2022): https://michaelgerharz.com/blog/2022/03/22

Numbering note: A62–A69, A101–A123 and A126–A145 were added in the verification pass; A70–A100 are the design and technical blocks below. Gaps in the sequence are intentional.

**Design and UX**
- A70 Duolingo, new home screen design: https://blog.duolingo.com/new-duolingo-home-screen-design/ ; A71 Phiture, Headspace retention: https://phiture.com/success-stories/headspace-retention/ ; A72 Duolingo streaks: https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/ ; RevenueCat on Peloton: https://www.revenuecat.com/blog/growth/peloton-retention-takeaways ; A73 Dai, Milkman & Riis 2014 (fresh start): https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf
- A74 Monotype, Neue Helvetica and TED: https://www.monotype.com/resources/case-studies/neue-helvetica-comes-into-its-own-for-ted ; A75 Klim licences: https://klim.co.nz/licences/ and https://klim.co.nz/license/0 ; A76 UXPin, optimal line length: https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/ ; Vercel design guidance: https://vercel.com/design.md ; A77 Vercel Geist colors: https://vercel.com/geist/colors ; A78 Radix Colors scale: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale ; shadcn Tailwind v4: https://ui.shadcn.com/docs/tailwind-v4 ; A79 Velt, rich text editors 2026: https://velt.dev/blog/best-rich-text-editors-react-2026
- A80 Microsoft HAX guidelines: https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/ ; A81 Google PAIR, Explainability + Trust: https://pair.withgoogle.com/chapter/People%20+%20AI%20Guidebook%20-%20Explainability%20+%20Trust.pdf ; A82 Shape of AI, trust builders: https://www.shapeof.ai/pattern-types/trust-builders ; A83 Simon Whatley, patterns for AI-generated content: https://www.simonwhatley.co.uk/writing/design-patterns-for-ai-generated-content/ ; Lazarev, AI UX patterns: https://www.lazarev.agency/articles/ai-ux-patterns-for-design-leads ; A84 DCMP Captioning Key: https://dcmp.org/captioningkey/print ; A85 W3C, What's new in WCAG 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ ; Chua et al. 2017 (feedback vs scores): https://link.springer.com/article/10.1186/s41029-017-0015-y ; Google Fonts: Fraunces https://fonts.google.com/specimen/Fraunces , Newsreader https://fonts.google.com/specimen/Newsreader , Instrument Serif https://fonts.google.com/specimen/Instrument+Serif ; Fontsource Noto Sans Devanagari: https://fontsource.org/fonts/noto-sans-devanagari/about

**Technical**
- A86 Deepgram pricing: https://deepgram.com/pricing ; filler words: https://developers.deepgram.com/docs/filler-words.md ; models and languages: https://developers.deepgram.com/docs/models-languages-overview
- A87 AssemblyAI pricing: https://www.assemblyai.com/pricing.md ; disfluencies: https://www.assemblyai.com/docs/pre-recorded-audio/include-filler-words.md
- A88 Claude pricing: https://platform.claude.com/docs/en/about-claude/pricing ; OpenAI pricing: https://developers.openai.com/api/docs/pricing ; Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- A89 Supabase pricing: https://supabase.com/pricing ; Edge Functions limits: https://supabase.com/docs/guides/functions/limits
- A90 Vercel pricing: https://vercel.com/pricing ; limits: https://vercel.com/docs/limits
- A91 Cloudflare Stream pricing: https://developers.cloudflare.com/stream/pricing/ ; Mux pricing: https://mux.com/pricing ; Bunny Stream: https://bunny.net/pricing/stream/
- A92 Trigger.dev pricing: https://trigger.dev/pricing ; Inngest pricing: https://www.inngest.com/pricing
- A93 Resend pricing: https://resend.com/pricing ; Postmark pricing: https://postmarkapp.com/pricing ; PostHog pricing: https://posthog.com/pricing ; Sentry pricing: https://sentry.io/pricing/
- A94 MediaPipe Face Landmarker (web): https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js ; MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder ; tus protocol: https://tus.io/protocols/resumable-upload ; Parselmouth: https://parselmouth.readthedocs.io/
- A95 YouTube Data API quota: https://developers.google.com/youtube/v3/determine_quota_cost ; LinkedIn Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- A96 Farella Braun + Martel on hiQ v. LinkedIn: https://www.fbm.com/data-analytics/publications/what-recent-rulings-in-hiq-v-linkedin-and-other-cases-say-about-the-legality-of-data-scraping/ ; A97 Quinn Emanuel on Meta v. Bright Data (Jan 2024): https://www.quinnemanuel.com/the-firm/news-events/client-alert-what-does-the-meta-v-bright-data-summary-judgment-ruling-mean-for-web-scraping/
- A98 Fisher Phillips on BIPA SB 2979: https://www.fisherphillips.com/en/news-insights/breaking-bipa-news-illinois-curtails-massive-damage-awards-in-biometric-cases.html ; A99 GDPR Art. 9: https://gdpr-info.eu/art-9-gdpr/ ; A100 India Briefing, DPDP Rules 2025: https://www.india-briefing.com/news/dpdp-rules-2025-india-data-protection-law-compliance-40769.html

Research gaps acknowledged (not guessed in this document): Reddit/Quora sentiment on TEDx coaching; India coaching prices in INR; keyword search volumes; median TEDx view counts; TED's standalone brand-guidelines page for non-licensees; Devin Marks and Mike Pacchione pricing; Azure Speech list prices; X API official 2026 pricing; SOC 2 vendor costs; prosumer CAC/LTV benchmarks.

## Appendix B: Glossary

Idea worth spreading (TED): "more than a story or a list of facts; it draws a larger conclusion from evidence or observations." Throughline (Anderson): the one sentence, ≤ 15 words, every part of the talk hangs on. Sparkline (Duarte): alternating "what is" and "what could be", ending in a call to action and a "new bliss." Valley of awkwardness (Anderson): the half-memorized state an audience can sense. Red circle: the stage mark speakers stay inside. Community tier: the default ≤100-attendee TEDx license. Reverse trial: full-feature trial that falls back to a free tier. PQL: product-qualified lead. MoR: merchant of record. RLS: row-level security.

## Appendix C: Decision log (start of record)

| Date | Decision | Reason | Owner |
|---|---|---|---|
| 2026-10-30 | Working name "Stage OS"; final name pending clearance | TED license agreement and Terms (Section 2.4) | Ash |
| 2026-10-30 | Tiers Spark / Builder $149 / Pro $299 / Inner Circle $499 / Encore $39 | Section 10 evidence | Ash |
| 2026-10-30 | Palette "Ink & Ivory", fonts Newsreader + Inter + Fraunces + Geist Mono | Section 11; visual distance from TED | Ash |
| 2026-10-30 | Keep React + Supabase; add Next.js, Trigger.dev/Inngest, Deepgram, Claude, Paddle | Section 12 | Engineering lead |
| 2026-10-30 | No scraping of ted.com; organizer and curator pipeline | Section 12.5 | Legal |
| 2026-10-30 | Vision metrics on-device, consent-gated, default off, Pro+ only | Section 12.8 | Legal |
| 2026-10-30 | Reverse trial as default free experience for first 6 months | Section 10.4 | Growth |
| 2026-10-30 | v1.1: all Medium and Low findings of the independent verification pass applied (citation numbering A62–A69, A101–A123, A126–A145; cross-references; CC-license caveat; naming overstatement; INR descriptor 55–60%; pace bands 120–160 delivery vs 130–160 script budget; churn ≤5% at month 6; discovery share 60% by month 12; word budget 1,300–1,600; ICS alarms 14/7/3/1; STT cost $0.08 per 10-minute take; conversion window 90 days; five V2 features assigned to Phase 2) | research-notes/00-blueprint-verification-report.md | Author |

## Appendix D: Open questions for Ash (answer before Phase 1 starts)

1. Final product name after clearance; confirm "TEDx Engine" is retired.
2. Confirm tier names and prices; confirm the 6-month program prices and the "Extended until you're on stage" wording with counsel.
3. INR price points and whether India launches in Phase 2 or Phase 3.
4. Paddle (single MoR) vs Stripe; who owns tax registrations if Stripe.
5. Which coaches staff the clinics and reviews; certification and pay; Inner Circle cap per coach.
6. Elite/Guided seat inclusion and the challenge order bump replacement.
7. Community: in-app build vs Circle/Skool embed for Phase 1.
8. Whether to pursue a formal data-partnership request to TED, and who signs it.
9. Credential line to use on the marketing site (joint "5X TEDx Speakers" vs Ash solo "9X TEDx"), never mixed.
10. Whether the existing TEDx Engine prompts are retrieved from the current Supabase project for comparison before the new prompt library replaces them.

## Appendix E: Build runbook for the implementing Claude account (suggested order of work)

1. Read Sections 0, 2.3, 2.4, 10.2, 11.3, 12.3 and 13.1 in full before writing any code or copy.
2. Create the monorepo skeleton (12.10), the Supabase migrations for all tables in 12.3 (keep the rebuild plan's 12 tables), and RLS tests for two members, one coach, one curator.
3. Implement design tokens (11.3), the type scale (11.2) and the core components (11.5); run automated contrast checks.
4. Build auth, profiles, memberships, plans, credits ledger and MoR webhooks (10.2, 10.3, 12.1).
5. Build the `runAiAction` service (12.10), load the prompt library (13), and wire the Promptfoo eval suite (13.15) into CI.
6. Build Idea Lab (6.1) end to end, then onboarding (5.4) and Today/Journey (5.3).
7. Build the Curator Console and the event pipeline (6.2, 12.5); seed 300 verified events by hand with the curator.
8. Build the Application Pipeline and Pitch Studio (6.3, 6.4).
9. Build Script Studio (7).
10. Build Rehearsal Studio audio-first (8), the teleprompter and the event-day kit.
11. Build Amplify basics (9.2 MVP rows), clinics calendar and community.
12. Run the Phase 1 acceptance checks (14.1), the launch checklist (14.6), then ship.
13. Only then start Phase 2 features behind flags.

Every time you make a choice this document does not settle, write it in Appendix C with the date and reason, and keep the four rules in 0.4.

*End of blueprint.*
