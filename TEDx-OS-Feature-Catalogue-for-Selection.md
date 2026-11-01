# Feature catalogue for selection (blueprint v1.2, 31 October 2026)

Every feature in the blueprint, text-only, with my recommendation for the first release. Mark the last column (Yes / No / Later) and hand the file back; the build starts from the "Yes" rows. IDs match the blueprint sections 5–9. Effort is in person-days for two engineers (S = 1–3, M = 4–8, L = 9–15). "AI" shows whether the feature consumes the member's allowance.

## A. Platform and journey (Section 5)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| P1 | Magic-link login and profile | Email login, allow-list, profile with city, country, expertise, timezone, travel radius | MVP (exists) | no | S | |
| P2 | Talk Record | One spine object per talk; everything hangs off it | MVP | no | S | |
| P3 | Today screen | Next best action, this week's commitment, deadlines, pipeline snapshot, readiness | MVP | no | M | |
| P4 | Journey path | Seven stages with milestone nodes and "you are here" | MVP | no | M | |
| P5 | Onboarding | Path choice (apply / invited / published), three questions, typed idea spark, three matches, expectation screen | MVP | yes (1 batch) | M | |
| P6 | Weekly commitment and nudges | 7-dot week, weekly plan email, mid-week nudge, deadline reminders, fresh-start restarts | MVP (email + in-app) | no | M | |
| P7 | Celebration cards | Share-ready cards for milestones (no TED logo) | V2 | no | S | |
| P8 | Guided vs expert mode | Toggle that hides hand-holding | V2 | no | S | |
| P9 | Notifications settings | Email, in-app, optional SMS for time-critical items | MVP (email, in-app) | no | S | |

## B. FIND: Idea Lab (Section 6.1)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| F1.1.1 | Idea Interview (typed) | Eight written prompts with minimum lengths; builds the dossier | MVP | yes | S | |
| F1.1.2 | Idea Generator | Five candidate ideas with throughline, belief, antagonist, evidence, action | MVP (exists; upgrade prompt) | yes | S | |
| F1.1.3 | Idea Scorecard | Nine-criterion rubric with gates | MVP | yes | S | |
| F1.1.4 | "Has it been done?" | Nearest TED/TEDx talks by title and the "how yours differs" note | MVP (manual list), V2 (YouTube API) | yes | M | |
| F1.1.5 | Throughline Builder | ≤15-word sentence, friend test by form | MVP | yes | S | |
| F1.1.6 | Adjacent-idea mode (authors) | Ideas broader than the book; book-plug linter | MVP | included | S | |
| F1.1.7 | Identity translation (coaches) | Rewrites "coach with a program" framing | MVP | included | S | |
| F1.1.8 | Idea Expansion | Thesis, why it matters, key points, three story candidates | MVP (exists) | yes | S | |
| F1.1.9 | Idea Lock | Freezes one idea per Talk Record | MVP | no | S | |
| F1.1.10 | Coach review of idea (text) | Human note and score within 3 business days | Later (add-on) | no | S + ops | |

## C. FIND: Event Finder (Section 6.2)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| F1.2.0 | Crawler import (Curator Console) | Import the crawler's CSV/JSON, diff, verify, dedup | MVP | no | L | |
| F1.2.1 | Match ranking | Theme similarity + geography + deadline fit + open-call likelihood | MVP | no (batch tagging) | M | |
| F1.2.2 | "Why you match" | Three-line explanation and one caution per event | MVP | no | S | |
| F1.2.3 | Filters | Country, radius, dates, type, status, deadline window, talk length | MVP | no | S | |
| F1.2.4 | Deadline alerts | Email + ICS at 14/7/3/1 days; calendar feed | MVP | no | S | |
| F1.2.5 | Target List | Up to 50 saved events with notes; "Track" creates an application | MVP | no | S | |
| F1.2.6 | Season planner | Application calendar and a 90-day sprint with weekly targets | MVP | no | S | |
| F1.2.7 | Event intel page | Past speakers (links), theme history, form summary, organizer's own words | V2 | no | M | |
| F1.2.8 | Curated shortlist (human) | Curator picks events on request | Later (add-on) | no | ops | |
| F1.2.9 | Open calls this week (public page) | Three open calls, email capture | MVP | no | S | |
| F1.2.10 | Organizer claim | Organizers claim and edit their listing | V2 | no | M | |
| F1.2.11 | Report outdated and tips | Flags and tips to the curator queue | MVP | no | S | |

## D. FIND: Application Pipeline (Section 6.3)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| F1.3.1 | Application record | Fields, answers, status, dates, contacts, notes, outcome | MVP | no | M | |
| F1.3.2 | Form Mapper | Pre-fills each organizer field from the Pitch Pack | MVP | no | M | |
| F1.3.3 | Per-event personalization | Rewrites the pack for this event with a diff; never invents facts | MVP | yes | S | |
| F1.3.4 | Application Readiness Score | Eight-criterion rubric with gates | MVP | yes | S | |
| F1.3.5 | Self-promotion and compliance linter | Flags selling, "coach/speaker" framing, courses, repeated-idea claims (R10) | MVP | yes (cheap) | S | |
| F1.3.6 | Submit assist | Opens the organizer form; copy panel; the member submits | MVP | no | S | |
| F1.3.7 | Follow-up engine | 14-day follow-up draft and reminders | MVP | yes | S | |
| F1.3.8 | Interview and audition prep (typed) | Likely questions, 3-minute pitch script, typed mock Q&A | V2 | yes | M | |
| F1.3.9 | Outcome logging | Accepted/declined, feedback email, re-apply reminder | MVP | yes (email draft) | S | |
| F1.3.10 | Cohort stats | Anonymized funnel in-app and quarterly report | V2 | no | M | |
| F1.3.11 | Human application review | Coach review with tracked changes, 3-day SLA | Later (add-on) | no | ops | |
| F1.3.12 | Export | PDF/DOCX record; CSV pipeline | MVP | no | S | |
| F1.3.13 | 100-applications counter | Tracks ready applications toward the access extension | MVP | no | S | |
| F1.3.14 | Quality gates | Five active drafts max; research step before personalization | MVP | no | S | |

## E. FIND: Pitch Studio and Prior Stages (Sections 6.4, 6.5)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| F1.4.1 | Pitch Pack | Titles, one-sentence idea, idea statement, why now, why you, accomplishment, bios | MVP (exists; upgrade) | yes | M | |
| F1.4.2 | Pitch Video Kit (text) | Script with beats and timings, shot checklist, practice prompter, self-review form; no upload | MVP | yes | S | |
| F1.4.3 | Organizer research card | Public organizer info, past themes, suggested angle, relationship-first message draft | V2 | yes | M | |
| F1.4.4 | Local-connection finder | Events near hometown, alma mater, places lived, travel radius | MVP | no | S | |
| F1.4.5 | Speaker one-sheet PDF | Headshot, idea, bio, prior stages, links | V2 | no | S | |
| F1.5.1 | Prior Stages log (optional) | Month, city, organization, audience size, topic, result line, optional link; no uploads | MVP | no | S | |
| F1.5.2 | Strong-candidate framing | Application-ready sentences from the log; fresh-idea rule enforced | MVP | yes | S | |
| F1.5.3 | Fresh-idea check | Warns when a prior topic overlaps the locked idea; offers two paths | MVP | yes (cheap) | S | |
| F1.5.4 | Stage Ladder suggestions | Optional smaller stages with what each proves | V2 | no | S | |
| F1.5.5 | Experience summary for forms | 60-word paragraph obeying the fresh-idea rule | MVP | yes | S | |

## F. WRITE (Section 7)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| F2.0 | Idea Brief (≥500 characters) | Six prompts, enforced minimum, autosave, completeness advice | MVP | yes (cheap) | S | |
| F2.1 | Talk length and word budget | Slot, pace, word budget, buffer | MVP | no | S | |
| F2.2 | Structure picker | Five templates with time splits and sources | MVP | no | S | |
| F2.3 | Outline Builder with talking points | Editable outline from the brief; Finalize outline gate | MVP | yes | M | |
| F2.4 | Script Draft from the finalized outline | Streamed section by section; coverage of every talking point | MVP | yes | M | |
| F2.5 | Editing passes | Cut to time, stronger opening, kill jargon, add contrast, sounds like me, sharpen close, de-pitch, simplify | MVP (all eight) | yes | M | |
| F2.6 | Story Extraction (typed) | Written interview that produces three story beats | V2 | yes | S | |
| F2.7 | Quirk detector | TED's list of writing quirks | MVP | included | S | |
| F2.8 | Fact-check Flagger | Claim list with status; annotated export | MVP | yes | S | |
| F2.9 | Reading-level and jargon meter | Grade level, sentence length, jargon list | MVP | no | S | |
| F2.10 | Outline Lock and Script Lock | Gates and post-lock flags; organizer script deadline | MVP | no | S | |
| F2.11 | Exports | Script PDF, DOCX, plain text, annotated fact-check, outline PDF | MVP | no | S | |
| F2.12 | Coach script review (text) | Human review with the rubric | Later (add-on) | no | ops | |
| F2.13 | Slides checklist (text) | Slide planner and rules checklist; no upload | V2 | no | S | |
| F2.14 | Catchphrase and title workshop | The repeatable line and five titles | V2 | yes | S | |

## G. DELIVER (Section 8)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| F3.1 | Beat map | Script split into beats with first words, purpose, budget, stage notes; printable | MVP | yes (cheap, once) | M | |
| F3.2 | Drill: read-cover-recite | Show, hide, self-mark | MVP | no | S | |
| F3.3 | Drill: cue cards | First three words per paragraph; printable backup card | MVP | no | S | |
| F3.4 | Drill: blank-fill | 10/30/60% words removed; typed or self-scored | MVP | no | S | |
| F3.5 | Drill: bottom-up chaining | Last beat first, add the previous each round | MVP | no | S | |
| F3.6 | Spaced schedule | Mastery states, expanding intervals, due beats on Today, coverage figure | MVP | no | M | |
| F3.7 | Practice timer | Count-up and count-down with 6-minute checkpoints and ending markers; no recording | MVP | no | S | |
| F3.8 | Prompter (practice mode) | Large scrolling text at target pace; fade mode; mirror | MVP | no | M | |
| F3.9 | Run log and self-assessment | Duration, dropped beats, two notes, trend, next drill | MVP | optional (cheap) | S | |
| F3.10 | Rehearsal plan | TED's calendar to the event, organizer milestones, weekly commitment | MVP | yes (once) | S | |
| F3.11 | Live-audience log | Real-audience rehearsals with one-line feedback | MVP | no | S | |
| F3.12 | Blank-recovery drill | Protocol plus random "you've blanked" prompts in the timer | V2 | no | S | |
| F3.13 | Nerves kit | Reappraisal line, breathing timer, walk-on routine | MVP | no | S | |
| F3.14 | Audition and interview Q&A (typed) | Reuses F1.3.8 for finalist auditions | V2 | yes | S | |
| F3.15 | Coach text review | Written notes on the script and run log | Later (add-on) | no | ops | |
| F3.16 | Readiness checklist | Outline final, script locked, coverage, timed runs, audiences, dress rehearsal | MVP | no | S | |
| F3.17 | Peer rehearsal matching | Pairs members; they meet on their own calls | V2 | no | M | |
| F3.18 | Event-day kit | Backstage card with checkpoints, cue list, recovery lines, logistics | MVP | yes (once) | S | |

## H. AMPLIFY (Section 9)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| F4.1 | Publication tracker | Expected upload window, status, link arrival | MVP | no | S | |
| F4.2 | Upload asset pack | Titles, description, bio and tags for the organizer | MVP | yes | S | |
| F4.3 | Launch plan | Dated checklist: launch team, Monday/Tuesday launch, first 48 hours, weeks 1–8 | MVP | yes | S | |
| F4.4 | Launch copy kit | Email, LinkedIn post, newsletter block, signature line, 10 angles, outreach notes | MVP | yes | S | |
| F4.5 | Clip plan (text) | 5–8 segments with cues, hook, caption and compliant post text; no video editing | V2 | yes | S | |
| F4.6 | Quote cards and carousel text | Text-to-image cards and a seven-slide carousel script | V2 | yes | M | |
| F4.7 | Press kit PDF | One-page kit with prior stages and the official link | V2 | no | S | |
| F4.8 | Talk stats | YouTube link, daily views and comments trend with honest framing | V2 | no | S | |
| F4.9 | Article and podcast pitches | Long-form article and five pitch emails | V2 | yes | S | |
| F4.10 | Paid-stage pipeline | Light CRM for conference outreach | V3 | yes | M | |
| F4.11 | Bio and profile updater | Correct phrasing for LinkedIn, website, signature | MVP | yes (cheap) | S | |
| F4.12 | Second-talk guard | Reminds about serial-applicant and duplicate-talk rules | MVP | no | S | |
| F4.13 | Outcome capture | Inquiries, bookings, fees, press, consented testimonials | V2 | no | S | |

## I. Clinic, community, admin, billing (Sections 9.3–9.5, 10)

| ID | Feature | What it does | My recommendation | AI | Effort | Your choice |
|---|---|---|---|---|---|---|
| C1 | Monthly live Application Clinic | 60-minute webinar, replays 90 days | MVP (calendar + replay links) | no | S + ops | |
| C2 | Quarterly Stage-Ready session | 90 minutes, replays | V2 | no | ops | |
| C3 | Weekly text office hours | Pinned thread answered for one hour | MVP | no | ops | |
| C4 | Add-on reviews and 1:1 calls | Priced per item | Later (decision) | no | ops | |
| K1 | Community spaces by stage | Threads, rituals, moderation rules | MVP (in-app or Circle/Skool embed) | no | M | |
| K2 | Rehearsal buddy matching | Weekly pairing thread | V2 | no | S | |
| A1–A3 | Admin home, access, members | Funnel, plans, member timeline, allowances | MVP | no | M | |
| A4 | Curator Console | Import runs, diff, verify, dedup, organizer records, freshness | MVP | no | L | |
| A5 | AI settings | Prompt versions, routing, allowance prices, evals, caps | MVP | no | M | |
| A6 | Reports | Cohort stats, churn by plan, allowance burn, coverage | V2 (basic in MVP) | no | M | |
| A7 | Billing | Monthly, six-month, twelve-month plans, founding flag, refunds, dunning, INR | MVP | no | M | |
| B1 | Allowances and credit ledger | Plain-language allowances in the UI; internal credits; fair use; caps | MVP | no | M | |
| B2 | 7-day no-card trial | Full access, then Spark | MVP | no | S | |
| B3 | 30-day money-back; pause; cancel in two clicks | | MVP | no | S | |
| B4 | 100-applications access extension | Counter plus a manual approval flow for the extension | MVP | no | S | |

## My suggested first release (the 20 that matter most, if you want a smaller cut)

P1, P2, P3, P5, F1.1.1, F1.1.2, F1.1.3, F1.1.9, F1.2.0, F1.2.1, F1.2.4, F1.3.1, F1.3.3, F1.3.4, F1.3.5, F1.5.1, F2.0, F2.3, F2.4, F3.1 with F3.2–3.7, plus A4, A7, B1 and B2 as the plumbing. Everything else in the "MVP" column can follow in the two weeks after.
