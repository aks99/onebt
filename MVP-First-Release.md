# One Big Talk: first release (decided 1 November 2026)

Source of truth for scope: `TEDx-OS-Feature-Decisions.xlsx` (column L) and blueprint v1.5 Section 14.1. This file is a readable export of the same decisions. Counts: MVP 82, Keep (after launch) 23, Defer (behind flags, later) 15, Delete 7.

## In the first release (MVP)

### A. Platform and journey

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| P1 | Magic-link login and profile | Email login, profile with city, country, expertise, timezone, travel radius; no passwords, no puzzles | no | S |
| P2 | Talk Record (a typed file) | One spine object per talk; idea, events, applications, outline, script, drills, launch all hang off it. 'Record' means a database record the member types into; nothing is ever recorded in audio or video | no | S |
| P3 | Today screen | Next best action, this week's commitment, deadlines, pipeline snapshot, readiness | no | M |
| P4 | Journey path | Seven stages with milestone nodes and a 'you are here' marker | no | M |
| P5 | Onboarding | Path choice (apply / invited / published), three questions, typed idea spark, three matches, expectation screen | yes (1 batch) | M |
| P6 | Weekly commitment and nudges | 7-dot week, weekly plan email, mid-week nudge, deadline reminders, fresh-start restart after a missed week | no | M |
| P9 | Notifications settings | Email and in-app in the first release; SMS for time-critical items deferred | no | S |

### B. FIND: Idea Lab

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| F1.1.1 | Idea Interview (typed) | Eight written prompts with minimum lengths; builds the dossier later prompts read | yes | S |
| F1.1.2 | Idea Generator | Five candidate ideas with throughline, belief challenged, antagonist, evidence base, audience action | yes | S |
| F1.1.3 | Idea Scorecard | Nine-criterion rubric, Level 1 to 4, quoted standard, gates on 'idea not topic' and 'arguable' | yes | S |
| F1.1.4 | Has it been done? | Nearest TED/TEDx talks by title from a curated index; 'how yours must differ' note | yes | M |
| F1.1.5 | Throughline Builder | One sentence of 15 words or fewer; friend test by a one-question form to 3 contacts | yes | S |
| F1.1.6 | Adjacent-idea mode (authors) | Ideas broader than the book's thesis; book-plug linter | included | S |
| F1.1.7 | Identity translation (coaches) | Rewrites 'coach with a program' into 'person with a lived-experience idea' | included | S |
| F1.1.8 | Idea Expansion | Thesis, why it matters, key points, three story candidates, evidence to find | yes | S |
| F1.1.9 | Idea Lock | Freezes one idea per Talk Record; later stages read only the locked idea | no | S |

### C. FIND: Event Finder

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| F1.2.0 | Crawler import (Curator Console) | Import the crawler's CSV/JSON, diff against the catalogue, verify, dedup, organizer records, freshness board | no | L |
| F1.2.1 | Match ranking | Eligibility first (closed, invitation-only, passed deadline, unmet local requirement go to 'watch'); then theme similarity + geography + deadline fit + open-call likelihood | no (batch tagging) | M |
| F1.2.2 | Why you match | Three-line explanation and one caution per event | no | S |
| F1.2.3 | Filters | Country, radius, dates, type, status, deadline window, talk length | no | S |
| F1.2.4 | Deadline alerts | Email + ICS at 14/7/3/1 days; personal calendar feed | no | S |
| F1.2.5 | Target List | Save up to 50 events with notes and priority; 'Track' creates a planned application | no | S |
| F1.2.6 | Season planner | Application calendar (62% of events in Q1) and a 90-day sprint with weekly targets | no | S |
| F1.2.9 | Open calls this week (public page) | Three open calls, deadlines hidden, email capture | no | S |
| F1.2.11 | Report outdated and tips | One-click flag and member tips to the curator queue | no | S |
| F1.2.12 | Watch alerts | Watch any event; alert when a call opens, a deadline appears or moves, a theme is published, a call closes | no | S |
| F1.2.14 | Idea Test (public) | No-login page: one sentence in, a Haiku read-out (idea or topic, idea or pitch, who disagrees, evidence needed, two open questions); never an acceptance score; email capture | yes (cheap) | S |
| F1.2.16 | Google Sheet sync (weekly) | Weekly scheduled pull of your Google Sheet (events and organizers tabs) through the Sheets API with a service account, plus Sync now; same diff, dedup and verify pipeline as a CSV upload; rows marked curator_verified publish directly; removed rows expire | no | M |

### D. FIND: Application Pipeline

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| F1.3.1 | Application record | Fields, answers per form, status, applied date (defaults to today, editable), follow-up date and sent flag, outcome with date (accepted, declined, withdrawn), event date, contacts, notes; 'Log an application I already sent' quick form from onboarding, the Journey and the board; one per member per event per cycle | no | M |
| F1.3.2 | Form Mapper | Pre-fills each organizer field from the Pitch Pack; curator-added custom fields | no | M |
| F1.3.3 | Per-event personalization | Rewrites the pack for this event with a diff; theme language, local connection, length; never invents facts | yes | S |
| F1.3.4 | Application Readiness Score | Eight-criterion rubric with gates on idea statement, why-you and compliance | yes | S |
| F1.3.5 | Self-promotion and compliance linter | Flags selling, coach/speaker framing, courses, this product, and repeated-idea claims (R10) | yes (cheap) | S |
| F1.3.6 | Submit assist | Opens the organizer form; copy panel per answer; member submits; marks Applied | no | S |
| F1.3.7 | Follow-up engine | One follow-up draft 14 days after applying; never before a stated decision date or where the page says not to enquire; public-form applications only | yes | S |
| F1.3.9 | Outcome logging | Accepted, declined or withdrawn with the date and a reason; event date and organizer milestones captured on acceptance; feedback-request email draft; re-apply reminder; dates shown on the Journey node | yes (email draft) | S |
| F1.3.12 | Export | Application record as PDF/DOCX; pipeline as CSV | no | S |
| F1.3.13 | 100-applications counter | Counts ready applications marked Applied; progress toward the access extension | no | S |
| F1.3.14 | Quality gates | Five active drafts max; research step before personalization; AI drafting off where the organizer prohibits it | no | S |
| F1.3.15 | Authorship meter | 'Your words: 91%' on every application and script, from version sources; exportable note for organizers who ask about AI | no | S |

### E. FIND: Pitch Studio and Prior Stages

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| F1.4.1 | Pitch Pack | Titles, one-sentence idea, idea statement, why now, why you, accomplishment, bios, 90-second pitch-video script | yes | M |
| F1.4.2 | Pitch Video Kit (text) | Script with beats and timings, shot checklist, practice prompter, self-review form; member films on their own device; nothing uploaded | yes | S |
| F1.4.4 | Local-connection finder | Events near hometown, alma mater, places lived, travel radius | no | S |
| F1.5.1 | Prior Stages log (optional) | Month, city, organization, audience size, topic, result line, optional link; no uploads | no | S |
| F1.5.2 | Strong-candidate framing | Application-ready sentences from the log; fresh-idea rule enforced | yes | S |
| F1.5.3 | Fresh-idea check | Warns when a prior topic overlaps the locked idea; offers two paths | yes (cheap) | S |
| F1.5.5 | Experience summary for forms | 60-word speaking-experience paragraph obeying the fresh-idea rule | yes | S |

### F. WRITE

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| F2.0 | Idea Brief (500 characters minimum) | Six prompts plus optional 'what I am not claiming or selling'; enforced minimum; autosave; completeness advice | yes (cheap) | S |
| F2.1 | Talk length and word budget | Slot, pace, word budget, buffer | no | S |
| F2.2 | Structure picker | Five templates (TED four-beat, Duarte sparkline, Anderson journey, Gallo map, Story spine) with time splits and sources | no | S |
| F2.3 | Outline Builder with talking points | Editable outline from the brief; sections, 3 to 6 talking points, story slots, budgets; Finalize outline gate | yes | M |
| F2.4 | Script Draft from the finalized outline | Streamed section by section; covers every talking point or lists it as uncovered; refused unless the outline is final | yes | M |
| F2.5 | Editing passes | Cut to time, stronger opening, kill jargon, add contrast, sounds like me, sharpen close, de-pitch, simplify | yes | M |
| F2.7 | Quirk detector | TED's own list of writing quirks (talking about the talk, apologizing, TED puns, forced emotion) | included | S |
| F2.8 | Fact-check Flagger | Claim list with statuses (needs source, source added, verified by me, firsthand account, narrowed); overclaim words; annotated export | yes | S |
| F2.9 | Reading-level and jargon meter | Grade level, sentence length, jargon list with plain alternatives | no | S |
| F2.10 | Outline Lock and Script Lock | Gates and post-lock flags; organizer script deadline reminder | no | S |
| F2.11 | Exports | Script PDF (large type, cue marks), DOCX, plain text, annotated fact-check, outline PDF | no | S |
| F2.15 | Story consent chips | Each story talking point and beat: named with permission / pseudonymized / composite; linter flags a composite told as one person | no | S |
| F2.17 | Measured pace | After three timed runs the member's own wpm replaces the 150 default in the word budget and prompter | no | S |

### G. DELIVER (text only)

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| F3.1 | Beat map | Script split into beats with first words, purpose, time budget, stage note; printable | yes (cheap, once) | M |
| F3.2 | Drill: read-cover-recite | Show, hide, self-mark; misses come back sooner | no | S |
| F3.3 | Drill: cue cards | First three words per paragraph; printable backup card | no | S |
| F3.4 | Drill: blank-fill | 10 / 30 / 60% of words removed; typed or self-scored | no | S |
| F3.5 | Drill: bottom-up chaining | Last beat first, add the previous each round | no | S |
| F3.6 | Spaced schedule | Mastery states, expanding intervals (1, 3, 7, 14 days), due beats on Today, coverage figure | no | M |
| F3.7 | Practice timer | Count-up and count-down with 6-minute checkpoints and two ending markers; no recording | no | S |

### H. AMPLIFY

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| F4.1 | Publication tracker | States: delivered, awaiting upload, in TED review, published, not approved or limited; launch dates count from the real URL | no | S |
| F4.2 | Upload asset pack | Titles, description, bio and tags for the organizer | yes | S |
| F4.3 | Launch plan | Dated checklist: launch team, Monday/Tuesday launch, first 48 hours, weeks 1 to 8 | yes | S |
| F4.4 | Launch copy kit | Email, LinkedIn post, newsletter block, signature line, 10 angles, outreach notes; compliant phrasing | yes | S |
| F4.11 | Bio and profile updater | Correct phrasing for LinkedIn, website, signature ('an independently organized TEDx event') | yes (cheap) | S |
| F4.12 | Second-talk guard | Reminds about serial-applicant and duplicate-talk rules; offers a new idea path only | no | S |

### I. Clinic, add-ons, admin, billing

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| A1-A3 | Admin home, access, members | Funnel by stage, plans, member timeline, allowances, 100-counter, extension approval | no | M |
| A4 | Curator Console | Import runs, diff, verify queue with flag rules, dedup, organizer records with lawful-basis note, tickets, tags | no | L |
| A5 | AI settings | Prompt versions, routing, credit prices, allowance sizes, eval results, cost caps, global AI switch | no | M |
| A7 | Billing (Stripe) | Monthly, six-month, twelve-month plans; 30-seat founding counter; $97 regular; refunds; dunning; add-on purchases; Stripe Tax amounts | no | M |
| B1 | Allowances and credit ledger | Plain-language allowances in the UI; internal credits reserved, settled, released; idempotent retries; fair use; caps | no | M |
| B2 | 3-day no-card trial (1 idea, 3 events) | Member tools unlocked for 3 days, limited to one locked idea and the three matched events; then Free | no | S |
| B3 | 30-day money-back; pause; cancel in two clicks | Refund on the first purchase, pause up to 3 months once a year, no retention dark patterns | no | S |
| B4 | 100-applications access extension | Counter plus a manual approval flow with proof | no | S |
| B5 | Founding seat counter (30) | Server-side count of founding purchases; pricing page shows the true seats remaining; the 31st buyer pays $97 | no | S |

## Keep: build after launch

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| P7 | Celebration cards | Share-ready milestone cards (no TED logo) | no | S |
| P8 | Guided vs expert mode | Toggle that hides hand-holding | no | S |
| F1.2.7 | Event intel page | Past speakers (links), theme history, form summary, organizer's own words | no | M |
| F1.2.10 | Organizer claim | Organizers claim and edit their listing, post or close the call; free, no member data | no | M |
| F1.2.15 | Event status pages (public) | One indexable facts-only page per event with status, verified date, source link, disclaimer; auto-expires | no | M |
| F1.3.8 | Interview and audition prep (typed) | Likely questions, 3-minute spoken-pitch script, typed mock Q&A | yes | M |
| F1.3.10 | Cohort stats | Anonymized funnel in-app and a quarterly public report | no | M |
| F1.3.11 | Human application review (add-on, $497) | A coach reviews one application with tracked changes and the rubric; 5-business-day SLA (1 Nov) | no | ops |
| F1.4.3 | Organizer research card | Public organizer info, past themes, suggested angle, relationship-first message the member sends personally | yes | M |
| F1.4.5 | Speaker one-sheet PDF | Headshot, idea, bio, prior stages, links | no | S |
| F1.5.4 | Stage Ladder suggestions | Optional smaller stages (Toastmasters, PechaKucha, lunch-and-learns) with what each proves | no | S |
| F2.6 | Story Extraction (typed) | Written interview that produces three story beats; mines a pasted manuscript for authors | yes | S |
| F2.12 | Human script review (add-on, $497) | A coach reviews the locked script with the rubric and a cut list; 5-business-day SLA | no | ops |
| F2.13 | Slides checklist (text) | Rules checklist and slide-by-slide planner; no upload | no | S |
| F2.14 | Catchphrase and title workshop | The repeatable line and five titles using TED's title rules | yes | S |
| F2.16 | Redaction tool | Tag a client or patient name as confidential once; replaced consistently in brief, outline, script, exports and AI inputs | no | M |
| F4.5 | Clip plan (text) | 5 to 8 segments with cues, hook, caption and compliant post text; no video editing | yes | S |
| F4.6 | Quote cards and carousel text | Text-to-image cards and a seven-slide carousel script | yes | M |
| F4.7 | Press kit PDF | One-page kit with prior stages and the official link | no | S |
| F4.8 | Talk stats | YouTube link; daily views and comments trend with honest framing | no | S |
| F4.9 | Article and podcast pitches | Long-form article and five pitch emails that link the talk | yes | S |
| F4.13 | Outcome capture | Inquiries, bookings, fees, press, consented testimonials | no | S |
| A6 | Reports | Cohort outcomes, churn by plan and period, allowance burn, event coverage | no | M |

## Defer: behind flags, when demand or data says so

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| F1.1.10 | Coach review of idea (text) | Human note and score within 3 business days | no | S + ops |
| F1.2.8 | Curated shortlist (human) | A curator hand-picks events on request | no | ops |
| F1.2.13 | Organizer AI policy | Per-event ai_policy (allowed / restricted / prohibited / unknown) with source; where prohibited, AI drafting is off inside that application | no | S |
| F3.8 | Prompter (practice mode) | Large scrolling text at target pace; fade mode; mirror | no | M |
| F3.9 | Run log and self-assessment | Duration, dropped beats, two notes, confidence; trend; next drill | optional (cheap) | S |
| F3.10 | Rehearsal plan | TED's calendar to the event, organizer milestones, weekly commitment | yes (once) | S |
| F3.11 | Live-audience log with restatement check | Log real-audience rehearsals and the listener's one-sentence restatement of the idea; Haiku shows 'landed' or 'drifted' | optional (cheap) | S |
| F3.12 | Blank-recovery drill | Protocol plus random 'you have blanked' prompts in the timer | no | S |
| F3.13 | Nerves kit | Reappraisal line ('I am excited'), breathing timer, walk-on routine | no | S |
| F3.14 | Audition and interview Q&A (typed) | Reuses F1.3.8 for finalist auditions | yes | S |
| F3.16 | Readiness checklist | Outline final, script locked, coverage 95%, last three runs under the slot, 4+ live audiences, dress rehearsal date | no | S |
| F3.18 | Event-day kit | Backstage card with checkpoints, cue list, recovery lines, two ending points, logistics, the do-not list | yes (once) | S |
| F4.10 | Paid-stage pipeline | Light CRM for conference and association outreach with fee guidance | yes | M |
| C1 | Monthly live Application Clinic | 60-minute webinar; calendar, join link, replays for 90 days; typed questions by form | no | S + ops |
| C2 | Quarterly Stage-Ready session | 90 minutes on memorization, timing and event day; replays | no | ops |

## Deleted from the blueprint

| ID | Feature | What it does | AI | Effort |
|---|---|---|---|---|
| P10 | Coach-only mode (per talk) | The AI asks, scores, lints and flags but never inserts text; switches on automatically where an organizer prohibits AI-written content | no | S |
| F3.15 | Coach text review of script and run log | Written notes on the locked script and the run log | no | ops |
| F3.17 | Peer rehearsal matching | Pairs members to rehearse for each other | no | M |
| C3 | Weekly text office hours | Pinned thread answered for one hour | no | ops |
| C4 | 1:1 call (add-on) | 45-minute call | no | ops |
| K1 | Community spaces by stage | Threads, rituals, moderation | no | M |
| K2 | Rehearsal buddy matching | Weekly pairing thread | no | S |
