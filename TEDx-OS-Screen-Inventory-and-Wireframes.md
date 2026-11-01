# Screen inventory, states and low-fidelity wireframes (v1.1, 1 November 2026, aligned to blueprint v1.5)

**What changed in v1.1:** product name One Big Talk; the trial is 3 days limited to one idea and three events; no community screen; the clinic, prompter, run log, rehearsal plan and event-day kit are deferred to after launch and kept here marked DEFERRED so navigation reserves their place; the practice timer saves each run's duration so measured pace works without the run log; applications carry applied, follow-up, outcome and event dates with a quick form for applications already sent; the Curator Console gains a Sources tab for the weekly Google Sheet sync.

For the UI/UX designer and the front-end engineer. Every screen in the first release is listed with its purpose, entry points, primary actions, data, components, states and a low-fidelity wireframe. Screens marked V2 are listed so the navigation reserves space for them, without wireframes. Everything is text-only: no screen requests a camera or microphone, and there is no upload of audio or video anywhere.

Product name: One Big Talk (owner decision 31 Oct 2026), held in a single constant. "Stage OS" in older wireframes below reads as One Big Talk.

## 0. Conventions

### 0.1 The five states every screen must design

| State | Rule |
|---|---|
| Empty | Shows the path with the first node unlocked and one action that takes two minutes or less. Never a blank panel. |
| Loading | Skeleton of the final layout (not a spinner) for data; for AI output, a two-phase indicator that distinguishes "thinking" (pulsing label) from "writing" (streaming text) and never goes more than 800 ms without a visible signal. Always a Stop control while streaming. |
| Error | Inline, specific, recoverable. AI error banner text is fixed: "That didn't work. You weren't charged a credit. Try again." Network errors keep the member's typed text. |
| Gated | The screen renders fully with the gated control visible and labelled (lock icon, "Member" tag) and a one-line reason plus the price. Free members see what they would get, not a wall. Allowance-exhausted is a separate gated variant: "You've used this month's 3 script drafts. Resets 14 Nov." |
| Success | The artifact appears in place, labelled ("AI draft" or "Your words"), with the next action suggested in one line. Milestones get a gold card, no confetti by default, nothing under reduced motion. |

### 0.2 Layout grid and navigation

- Desktop ≥1024 px: left rail 240 px (collapses to 64 px icons), content column max 1,120 px, optional right panel 320 px (rubric, versions, why-this). 12-column grid, 24 px gutters.
- Tablet 768–1023 px: rail collapsed to icons, right panel becomes a sheet.
- Mobile <768 px: bottom tab bar (Today · Journey · Practice · Library · Me); 16 px side gutters; no horizontal scroll; editor and prompter go full-screen.
- Every page: breadcrumb under the top bar (Talk name › Pillar › Screen), a talk switcher in the top bar when the member has more than one Talk Record, ⌘K command palette.

### 0.3 Shared components (names used in the wireframes)

`Rail`, `TopBar`, `NextActionCard`, `WeekDots`, `DeadlineChip`, `StatusBadge`, `RubricChip`, `LinterFlag`, `AIDraftBlock` (label, Why-this, Regenerate-with-steer chips, Versions, Accept/Reject diff), `CharCountField`, `OutlineCard`, `BeatRow`, `DrillCard`, `PracticeTimer`, `Prompter`, `RunLogForm`, `Kanban`, `DataTable`, `EmptyState`, `GateNotice`, `AllowanceMeter`, `Toast`, `Dialog`, `Sheet`, `CommandPalette`.

### 0.4 Wireframe notation

ASCII, desktop width. `[Button]` primary, `(Button)` secondary, `{chip}`, `<input>`, `...` streaming or truncated, `*` locked or gated, `o` empty dot, `●` filled dot, `!` a warning icon (never punctuation in copy). Rail omitted after the first wireframe. Rail items in v1.1: Today, Journey, FIND, WRITE, DELIVER, AMPLIFY, Me (Clinic appears when it ships).

---

## 1. Public screens (visitor)

### S0.1 Landing page

- Purpose: say what the product is in one line, show the four pillars, make the promise honest, start the 3-day trial.
- Entry: ads, the ABB challenge, organic search, the open-calls page.
- Primary actions: Start free (magic link), See pricing, See open calls this week.
- Data: live count of events in the database with open calls this month (public, from a cached view), cohort line ("This month members sent N ready applications"), the standard disclaimer.
- Components: hero, pillar cards, journey strip, proof block, pricing teaser, FAQ accordion, footer with disclaimer.
- States: no empty or gated state; loading shows static copy first and fills counts; error hides the counts rather than showing zeros.

```
+------------------------------------------------------------------+
| Stage OS                              Open calls  Pricing  Log in |
+------------------------------------------------------------------+
|                                                                  |
|   One idea. One stage. A system for getting there.               |
|   Find the right independently organized TEDx events, write     |
|   the application, write the talk, memorize it, and launch it.  |
|                                                                  |
|   [Start free for 3 days]   (See how it works)                   |
|   No card. No recording. Nobody can promise you a stage.        |
|                                                                  |
+------------------------------------------------------------------+
|  FIND            WRITE            DELIVER          AMPLIFY       |
|  312 events      Brief > outline  Memorize cold    Launch the    |
|  open this       > script, in     and finish       talk the week |
|  season          your words       under time       it goes live  |
+------------------------------------------------------------------+
|  The journey: Position o-- Discover o-- Apply o-- Write o--       |
|               Rehearse o-- Perform o-- Amplify                   |
+------------------------------------------------------------------+
|  Honest numbers: most open-call city events accept a single-    |
|  digit percentage of applicants. Members apply to many.         |
|  "This month, members sent 412 ready applications."             |
+------------------------------------------------------------------+
|  Founding Member $17/month . $77/6 months . $147/12 months       |
|  The only promise we make: [read it]                             |
+------------------------------------------------------------------+
|  FAQ  |  Disclaimer: Stage OS is independent and not affiliated  |
|  with TED Conferences, LLC. TEDx events are independently ...   |
+------------------------------------------------------------------+
```

Notes: no red, no Helvetica, no TED logo, no "TED talk" wording. Headline set in Newsreader; body in Inter.

### S0.2 Pricing page

- Purpose: three plans, one decision, the promise in full.
- Actions: Start free; choose monthly, six-month or twelve-month; toggle currency (USD/INR when enabled).
- Data: plan table (Section 10.2), founding-window note, the promise text (Section 10.5), the 30-day money-back note.
- States: loading shows prices from a static config; error has nothing to fail; gated n/a.

```
+------------------------------------------------------------------+
|  Pricing                                   [USD] (INR)           |
+------------------------------------------------------------------+
|  Free                 | Founding Member (price for life)         |
|  $0                   | $17/mo    $77/6 mo (save 25%)            |
|                       | $147/12 mo (save 28%)                    |
|  1 idea batch         | 10 idea batches a month                  |
|  Top 3 events,        | Full catalogue, alerts, 50 targets       |
|  dates hidden         | 15 tailored applications a month         |
|  1 application        | 5 outlines, 3 drafts, 30 passes          |
|  Brief + structure    | Memorization system, prompter, run log   |
|  Drills on a sample   | Launch kit, memorization system          |
|  [Start free]         | [Start 3-day trial]                      |
+------------------------------------------------------------------+
|  Our only promise                                                |
|  We do not guarantee that any organizer will choose you. ...     |
|  (full text, Section 10.5)                                       |
|  30-day money-back on your first purchase. Cancel in two clicks. |
+------------------------------------------------------------------+
```

### S0.3 Open calls this week (public preview)

- Purpose: lead magnet; shows three events with open calls, names and cities, deadlines hidden.
- Actions: Get the full list (email capture → magic link → Spark account).
- Data: three events chosen by freshness and geography (IP country), count of other open calls.
- States: empty (no verified open calls this week) shows "Calls open in waves in January–March and August–October; leave your email"; loading skeleton of three cards; error hides the block.

```
+------------------------------------------------------------------+
|  Open calls this week                                            |
|  +------------------+ +------------------+ +------------------+  |
|  | TEDxWilson Park  | | TEDxCityName     | | TEDxUniversity   |  |
|  | Edinburgh, UK    | | Pune, India      | | Austin, US       |  |
|  | Theme: Thresholds| | Theme: Unfold    | | Theme: Signal    |  |
|  | Deadline: hidden*| | Deadline: hidden*| | Deadline: hidden*|  |
|  +------------------+ +------------------+ +------------------+  |
|  47 more open calls match speakers like you.                     |
|  <email>  [Send me the list]                                     |
+------------------------------------------------------------------+
```

### S0.4 Log in / magic link

- Purpose: passwordless entry; also the trial start.
- Actions: Send link; Resend; Open in app.
- States: sent (shows the address, resend in 30 s), expired link (explains and offers a new one), allow-list refusal (only if the owner enables closed access), error.

```
+----------------------------------+
|  Log in or start free            |
|  <email address>                 |
|  [Send me a link]                |
|  No password. The link lasts     |
|  15 minutes.                     |
+----------------------------------+
   -> Sent state: "Check ash@... . Didn't arrive? (Resend in 28 s)"
```

---

## 2. Onboarding (first session produces an artifact in under 12 minutes)

### S1.1 Pick a path

- Purpose: branch into Apply, Invited or Published.
- Data: creates the Talk Record with `path`.
- States: loading n/a; error retries the create; success goes to S1.2.

```
+------------------------------------------------------------------+
|  What brings you here?                                           |
|  +--------------------+ +--------------------+ +---------------+ |
|  | I want to apply    | | I've been invited  | | My talk is    | |
|  | for a stage        | | to speak           | | published     | |
|  | Full journey       | | Fast track to      | | Launch mode   | |
|  |                    | | writing            | |               | |
|  +--------------------+ +--------------------+ +---------------+ |
+------------------------------------------------------------------+
```

### S1.2 Three questions

- Fields: expertise in one line (≤120 chars), city and country (typeahead), target talk date (month picker, "not sure" allowed). Invited path adds event name, date, slot length.
- States: validation inline; nothing else is asked here (Redundant Entry rule).

### S1.3 Idea spark (typed)

- Purpose: produce the first five candidate ideas.
- Actions: paste a bio, book summary or LinkedIn About; or answer five discovery prompts; Generate.
- Data: `dossier` text (≥300 characters), one idea batch (Spark allowance).
- States: loading = AI two-phase indicator with a Stop control; error = fixed AI banner, text kept; success = five Idea Cards with scores; gated = none on the first batch.

```
+------------------------------------------------------------------+
|  Give the Idea Lab something to work with                        |
|  ( Paste something )   ( Answer five prompts )                   |
|  +------------------------------------------------------------+  |
|  | <paste your bio, a book summary or your LinkedIn About>    |  |
|  |                                                            |  |
|  +------------------------------------------------------------+  |
|  312 / 300 characters minimum                                    |
|  [Find my ideas]          Nothing is recorded. Text only.        |
+------------------------------------------------------------------+
  Loading:  "Reading what you wrote ..."  ->  "Writing idea 3 of 5"  (Stop)
```

### S1.4 Pick one and see the matches

- Purpose: the member chooses one idea and sees three matched events.
- Actions: Pick this idea (locks nothing yet), See why it matches, Track event (creates an application record), Already applied somewhere? (v1.1: a quick form per application: event, applied date defaulting to today and editable, follow-up date if any, outcome so far, event date; creates the record in the right column).
- Data: five Idea Cards (title, throughline, score), three events with match reasons; deadlines hidden on Spark.
- States: loading skeleton for cards then events; error on matching shows ideas and a retry for events; gated = deadline dates on Spark ("in 9 days, upgrade to see the date").

```
+------------------------------------------------------------------+
|  Five ideas, scored. Pick the one you would fight for.           |
|  +----------------------------+  +----------------------------+  |
|  | AI draft . Score 31/36     |  | AI draft . Score 27/36     |  |
|  | Checklists fail when nurses|  | ...                        |  |
|  | can't stop a surgeon       |  |                            |  |
|  | {specific}{arguable}{evid.}|  |                            |  |
|  | (Pick this)  (Why this)    |  |                            |  |
|  +----------------------------+  +----------------------------+  |
|  ... three more ...                                              |
+------------------------------------------------------------------+
|  Three events that match "Checklists fail ..."                   |
|  TEDxWilson Park . Edinburgh . Theme fit 0.82 . Deadline in 9 d* |
|  Why: theme "Thresholds"; 2 past health talks; 600 km away       |
|  (Track)                                                         |
|  ...                                                             |
+------------------------------------------------------------------+
```

### S1.5 Expectation screen

- Purpose: set honest expectations before the Journey opens (Section 3.6).
- Content: acceptance rates in plain words, the 100-applications promise, the time this takes (months), what the product does and does not do (never submits, never contacts organizers, never records).
- Action: I understand, show me my path.
- States: none; must be acknowledged once per account.

---

## 3. Core screens

### S2.1 Today (home)

- Purpose: one next action, this week, deadlines, pipeline, readiness.
- Entry: default after login; bottom tab "Today".
- Actions: do the next action (deep link), swap to the alternative, set or pause this week's commitment, open a deadline.
- Data: next action from the recommender (stage, deadlines, allowance, last activity), week commitment and completions, next three deadlines, pipeline counts, readiness fields (outline final, script locked, fit to time, last timed run vs slot, beats mastered/total).
- Components: `NextActionCard`, `WeekDots`, `DeadlineChip`, pipeline mini-bar, readiness list.
- States: empty (new member) = the next action is "Finish your Idea Spark (4 min)" and the path strip; loading = skeleton in the same layout; error = each block fails independently with a retry; gated = none; missed week = "Fresh start" variant that resets the target without shame.

```
+------+-----------------------------------------------------------+
| Rail | Today                      Talk: Checklists v  (⌘K)        |
| Today| +-------------------------------------------------------+ |
| Journ| | NEXT                                   12 min          | |
| FIND | | Draft the Why-now paragraph for TEDxWilson Park        | |
| WRITE| | because your idea is locked and the deadline is in 9 d | |
| DELIV| | [Start]      or: Add a prior stage (3 min)             | |
| AMPLI| +-------------------------------------------------------+ |
| Me   | THIS WEEK  ● ● o o o o o   2 of 3 blocks   (Pause week)    |
|      | DEADLINES                                                  |
|      |  TEDxWilson Park   9 d   {ICS}   TEDxPune  21 d   {ICS}    |
|      | PIPELINE  planned 4 . applied 2 . follow-up 1 . accepted 0 |
|      | READINESS  outline final ✓  script locked ✗  fit: n/a      |
|      |            beats mastered 0/0                              |
+------+-----------------------------------------------------------+
```

### S2.2 Journey

- Purpose: the seven-stage path with milestones and "you are here".
- Actions: open any unlocked stage; see what unlocks the next; view milestones earned.
- Data: stage states (locked, available, in progress, done), milestone nodes, per-pillar rings.
- States: empty = Stage 1 unlocked only; loading skeleton; error retry; gated = stages are never gated, individual features inside them are.

```
+------------------------------------------------------------------+
|  Your path                                                       |
|   (1) Position ●=====(2) Discover ●=====(3) Apply ◐-----(4) Write|
|    idea locked    3 tracked         2 applied      brief 0/500   |
|                                                    o-----(5) Reh.|
|   (7) Amplify o-----(6) Perform o---------------------- you are  |
|                                                         here ^   |
|  Milestones: Idea locked (28 Oct) . First application sent (30)  |
|  Applications: Wilson Park applied 30 Oct . follow-up 13 Nov     |
|  Pune applied 2 Nov . Leeds declined 28 Oct . (Log one I sent)    |
+------------------------------------------------------------------+
```

---

## 4. FIND

### S3.1 Idea Lab home

- Purpose: list ideas for this talk, generate more, lock one.
- Actions: New batch (allowance), Interview me (typed), Open card, Lock idea, Compare two.
- Data: ideas with score, status (candidate, locked, archived), batch count used/allowed.
- Components: idea grid, `AllowanceMeter` ("3 of 10 batches used"), `EmptyState`.
- States: empty = "Start the Idea Interview (8 prompts, 6 min)" and "Paste something"; loading skeleton; error banner; gated = batches exhausted on Spark ("1 batch on Free. Members get 10 a month"); success = locked idea pinned at top with a gold card.

```
+------------------------------------------------------------------+
|  Idea Lab                    3 of 10 batches used   [New batch]   |
|  (Interview me)  (Paste something)                               |
|  LOCKED  Checklists fail when nurses can't stop a surgeon  31/36 |
|  ------------------------------------------------------------    |
|  Candidates                                                      |
|  +------------------+ +------------------+ +------------------+  |
|  | Why hospitals ...| | The 3 am rule .. | | ...              |  |
|  | 27/36  (Open)    | | 24/36  (Open)    | |                  |  |
|  +------------------+ +------------------+ +------------------+  |
+------------------------------------------------------------------+
```

### S3.2 Idea Interview (typed)

- Purpose: eight written prompts that build the dossier.
- Fields: eight `CharCountField`s with minimums (60–200 characters each), autosave, progress "5 of 8".
- States: partial saves resume; error keeps text; gated none; success = "Generate ideas from this interview".

```
+------------------------------------------------------------------+
|  Idea Interview            5 of 8 answered    Saved 12 s ago     |
|  3. What do people in your field get wrong, and who disagrees?   |
|  +------------------------------------------------------------+  |
|  | <text>                                                     |  |
|  +------------------------------------------------------------+  |
|  184 / 120 minimum                                               |
|  (Back)                                    [Next prompt]         |
+------------------------------------------------------------------+
```

### S3.3 Idea Card

- Purpose: one idea in full: throughline, belief challenged, antagonist, evidence, action, nine-criterion scorecard, "has it been done" list, expansion.
- Actions: Edit any field (Your words), Rescore, Expand, Throughline builder, Has it been done?, Lock idea, Archive.
- Data: idea fields, scorecard with Level chips and the quoted standard, nearest talks list with "how yours differs", expansion (thesis, why it matters, key points, three story candidates).
- Components: `AIDraftBlock` per field, `RubricChip` row, right panel "Why this".
- States: loading per block; error per block; gated = Rescore and Expand after the Spark one-time use; success = lock sets the gold banner and sends the member to the Event Finder; lock blocked below Level 3 on Specific, Arguable and Evidence ("Fix these two criteria, then lock") with an override reason field.

```
+---------------------------------------------+--------------------+
|  Idea: Checklists fail when ...   {locked}  | SCORECARD  31/36   |
|  Throughline (AI draft . Your words)        | Specific     L4    |
|  "Safety checklists fail when the most      | Arguable     L3    |
|   junior person can't stop the room."       | Evidence     L3    |
|  (Regenerate: shorter . more personal)      | Fresh        L4    |
|  Belief it challenges ...                   | ...                |
|  Who disagrees ...                          | Why these scores   |
|  Evidence you have ...                      +--------------------+
|  HAS IT BEEN DONE?  3 nearest talks  . how yours differs ...     |
|  [Lock this idea]   (Expand)  (Archive)                          |
+------------------------------------------------------------------+
```

### S3.4 Event Finder (list)

- Purpose: ranked, filterable catalogue.
- Actions: filter (country, radius, dates, type, status, deadline window, slot length), sort (match, deadline, distance), Track, Save to targets, Report outdated, Open event.
- Data: events with match score, three-line "why you match" and one caution, deadline, status, last verified date.
- Components: filter bar, `DataTable` or card list, `DeadlineChip`, map toggle (V2).
- States: empty (no matches) = loosen one filter suggestion; loading skeleton rows; error retry; gated = Spark sees the top 3 with deadline dates hidden and filters disabled but visible; stale = events not verified in 60 days show a "verify" badge.

```
+------------------------------------------------------------------+
|  Event Finder     {UK}{within 800 km}{Jan–Jun 2027}{open calls}  |
|  Sort: match v                              48 events . 12 open  |
|  +------------------------------------------------------------+  |
|  | TEDxWilson Park . Edinburgh . 14 Mar 2027 . OPEN . 9 d left|  |
|  | Match 0.82 . Why: theme Thresholds; past health talks;     |  |
|  | 600 km. Caution: 8-minute slots only.   Verified 4 d ago   |  |
|  | [Track] (Save) (Report outdated)                           |  |
|  +------------------------------------------------------------+  |
|  | TEDxPune . Pune . 2 May 2027 . OPENS SOON . Match 0.74 ... |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### S3.5 Event detail

- Purpose: everything known about one event, with sources.
- Data: name, city, venue, date, licence type, theme and theme history, call status and deadline (organizer local time and member time), form link and field summary, slot length, past speakers (links), organizer's own words (quoted with source URL), public contact method if the organizer posted one, source URLs and last_verified.
- Actions: Track (creates an application record), Add to calendar, Report outdated, Suggest a tip, Open the organizer form (external).
- States: loading skeleton; error retry; gated = deadline date and form link on Spark; unverified = banner "Last verified 70 days ago. Check the organizer site."

```
+------------------------------------------------------------------+
|  TEDxWilson Park                                   [Track event]  |
|  Edinburgh, UK . Sat 14 Mar 2027 . Standard licence . 100 seats  |
|  CALL OPEN . closes 9 Nov 2027 23:59 GMT (10 Nov 05:29 IST) {ICS}|
|  Theme 2027: Thresholds . 2026: Undercurrents . 2025: Kindling   |
|  Form asks for: bio (150 w), idea (1 sentence), why this talk,   |
|  past speaking, links, 90-s video (optional)   (Open the form)   |
|  In the organizer's words: "We look for ideas that change how    |
|  Edinburgh sees itself."  source: tedxwilsonpark.com/speak       |
|  Past speakers: 2026 . 12 talks . 2 health . (list)              |
|  Sources: ted.com/tedx/events/xxxxx . organizer site . verified  |
|  4 d ago by curator                      (Report outdated)       |
+------------------------------------------------------------------+
```

### S3.6 Applications board

- Purpose: pipeline across events.
- Actions: drag or move between columns (keyboard alternative), open, add from the Event Finder, filter by deadline, export CSV.
- Data: applications by status (planned, drafting, ready, applied, follow-up, interview, accepted, declined), deadline per card, readiness level per card, counter toward 100 ready applications.
- Components: `Kanban` with move buttons, `StatusBadge`, counter strip, quality-gate notice (five active drafts max).
- States: empty = "Track an event to start your first application"; loading skeleton columns; error retry; gated = Spark one record (second "Track" opens the upgrade sheet); limit = sixth draft blocked with the reason ("Finish or park one of your 5 drafts first").

```
+------------------------------------------------------------------+
|  Applications          Ready applications sent: 2 of 100   (CSV) |
|  PLANNED(4)  DRAFTING(2)  READY(1)  APPLIED(2)  FOLLOW-UP(1) ... |
|  +--------+  +--------+   +--------+ +--------+  +--------+      |
|  |Pune    |  |Wilson  |   |Austin  | |Leeds   |  |Delhi   |      |
|  |21 d    |  |9 d  L2 |   |14 d L3 | |sent 3 d|  |due Fri |      |
|  +--------+  +--------+   +--------+ +--------+  +--------+      |
|  |...     |  |...     |                                          |
+------------------------------------------------------------------+
```

### S3.7 Application detail

- Purpose: write one application: research, mapped fields, personalization, readiness, submit assist, follow-up, outcome.
- Layout: left = the organizer's fields pre-filled from the Pitch Pack; right panel = readiness rubric, linter flags, research card (V2), follow-up and outcome.
- Actions: Research first (required step: three checkboxes the member completes by reading the event page), Personalize for this event (allowance), accept or reject the diff per field, Check readiness, Mark Applied (asks "Did you submit on the organizer's form?" and sets the applied date to today, editable later), set the follow-up date (default 14 days later), Draft follow-up and mark it sent, Log outcome (accepted, declined, withdrawn, with the date; acceptance asks for the event date and organizer milestones).
- Data: application record, mapped fields, versions, readiness scores, linter flags, dates, contacts, outcome.
- States: empty = fields pre-filled from the Pitch Pack if it exists, else "Build your Pitch Pack first (8 min)"; loading per field while personalizing (streaming with Stop); error banner per field; gated = Personalize after 15 tailored applications this month; readiness below Level 3 on any gated criterion shows "Not ready yet" and keeps Mark Applied enabled with a confirmation ("Mark as applied anyway? It will not count toward your 100."); success = Applied with the follow-up date set.

```
+-------------------------------------------+----------------------+
|  TEDxWilson Park application   {drafting} | READINESS   L3 . L2  |
|  Step 1 Research  ✓ read page ✓ theme     | One idea      L4     |
|         ✓ past speakers                   | Fit to theme  L2 !   |
|  Step 2 Fields (from your Pitch Pack)     | Why you       L3     |
|  Bio (150 words)        Your words . edit | Compliance    L4     |
|  +---------------------------------------+| ...                  |
|  | Ash is ... (142 words)                || LINTER               |
|  +---------------------------------------+| ! "my course" line 3 |
|  One-sentence idea      AI-assisted       | FOLLOW-UP            |
|  +---------------------------------------+| Draft on 23 Nov      |
|  | Safety checklists fail when ...       || OUTCOME  (log)       |
|  +---------------------------------------+|                      |
|  Why this talk for TEDxWilson Park        |                      |
|  [Personalize for this event] 7 of 15 left|                      |
|  Step 3 Submit: (Open the organizer form) [Mark as applied]      |
+-------------------------------------------+----------------------+
```

### S3.8 Pitch Pack

- Purpose: the reusable application material.
- Sections: five titles, one-sentence idea, 100-word idea statement, why now, why you, accomplishment paragraph (uses Prior Stages), 50/100/150-word bios, links, the pitch-video script (text) with timings and self-review form.
- Actions: Generate (allowance), edit in place, regenerate with steer, mark "Your words", copy any block, export one-sheet (V2).
- States: empty = "Generate from your locked idea and interview" (requires a locked idea); loading streaming per block; error per block; gated = Spark gets the first generation only; stale = banner when the idea or Prior Stages changed after generation ("Regenerate the accomplishment paragraph").

```
+------------------------------------------------------------------+
|  Pitch Pack                                  [Generate all]      |
|  Titles (5)                AI draft  (Regenerate: plainer)       |
|   1. The person who can't say stop  2. ...                       |
|  One-sentence idea         Your words                            |
|  Idea statement (100 w)    AI draft                              |
|  Why now                   AI draft                              |
|  Why you                   AI draft . uses Prior Stages (2)      |
|  Bios 50 / 100 / 150       AI draft                              |
|  Pitch video script (90 s) AI draft . 3 beats . timings          |
|   Self-review after you film on your phone: (open form)          |
|  Links                     Your words                            |
+------------------------------------------------------------------+
```

### S3.9 Prior Stages

- Purpose: optional log of earlier speaking, turned into strong-candidate sentences.
- Fields per entry: month and year, city, organization or event, approximate audience size, what you spoke about (one line), result (one line, optional), public link (optional). No uploads.
- Actions: Add stage, Generate framing (allowance), Experience summary for forms, Fresh-idea check.
- Rules shown in the UI: "This idea stays fresh. We describe your other talks as other topics." The fresh-idea check warns when a prior topic overlaps the locked idea and offers two paths.
- States: empty = "Optional. If you have spoken before, log it here. If not, your idea carries the application."; loading; error; gated = framing and summary are Member features (log is free); warning = overlap detected card.

```
+------------------------------------------------------------------+
|  Prior stages (optional)                       [Add a stage]     |
|  Mar 2025 . Mumbai . Hospital leadership summit . 400 . Leading  |
|  hospital teams . "invited back"                      (edit)     |
|  Sep 2024 . Pune . Nurses' association . 60 . Safety culture     |
|  ! This topic overlaps your locked idea. Choose: describe it as  |
|    adjacent ground (recommended) or change the idea's angle.     |
|  ------------------------------------------------------------    |
|  Strong-candidate framing (AI draft)                             |
|  "I have spoken to audiences of 40 to 400 on adjacent subjects   |
|   ... I would like a TEDx stage to be the first."    (Copy)      |
|  Experience summary for forms (60 w)              (Generate)     |
+------------------------------------------------------------------+
```

---

## 5. WRITE

### S4.1 Idea Brief

- Purpose: the member's own words, six prompts, combined minimum 500 characters.
- Fields: (a) the idea in your own words, (b) the belief it challenges and who disagrees, (c) the story only you can tell, (d) the evidence, (e) what the audience should do or see differently, (f) why you.
- Actions: Save (disabled under 500 combined; the counter explains), Check completeness (Haiku, never blocks), Continue to outline.
- States: empty = the six prompts with examples under each; autosave "Saved"; loading for completeness check; error keeps text; gated = none (free feature); server refusal of 499 characters shows the same message as the client.

```
+------------------------------------------------------------------+
|  Idea Brief                 Combined 412 / 500 minimum  Saved    |
|  Write in your own words. The outline is built only from this.   |
|  a) The idea, in your words                                      |
|  +------------------------------------------------------------+  |
|  | <text>                                                     |  |
|  +------------------------------------------------------------+  |
|  b) The belief it challenges, and who disagrees      (thin) ! |  |
|  ... c) d) e) f) ...                                             |
|  Completeness: b) and d) are thin. Add who disagrees and one     |
|  number you can source.                   (Check again)          |
|  [Save brief]*  88 more characters needed    (Continue to outline)|
+------------------------------------------------------------------+
```

### S4.2 Outline Builder

- Purpose: AI outline with talking points from the brief, edited by the member, finalized before any script.
- Layout: structure picker on first visit; then sections as `OutlineCard`s (purpose line, 3–6 talking points, story slot, time and word budget); total time bar at the top.
- Actions: Pick structure, Generate outline (allowance 5/month), edit any line, add/delete/reorder points (drag with keyboard alternative), Regenerate a section with a steer, Finalize outline, Unfinalize (creates a new draft version).
- States: empty = structure picker with the five templates and sources; loading = sections stream in with a Stop; error banner; gated = Spark sees the picker and a gated Generate; over-budget = time bar turns to the warning token with the overrun in seconds; final = cards lock with a gold "Final v2" badge and the Script button activates.

```
+------------------------------------------------------------------+
|  Outline . TED four-beat . 10 min   [=========|--] 9:40 / 10:00  |
|  Draft v2 (edited)                     [Finalize outline]        |
|  +------------------------------------------------------------+  |
|  | 1 Make them care . 1:30 . Story slot: the 3 am shift        |  |
|  |  . The night a checklist was read and nobody could stop it  |  |
|  |  . Sensory detail: the monitor tone, the silence           |  |
|  |  . Name the feeling without naming the idea yet            |  |
|  |  (+ point)  (Regenerate: more personal)   drag / move      |  |
|  +------------------------------------------------------------+  |
|  | 2 The idea . 1:00 . "checklists fail when ..."              |  |
|  |  . ...                                                      |  |
|  +------------------------------------------------------------+  |
|  ... 3 Evidence . 4 Implementation . 5 Effect and close ...     |
+------------------------------------------------------------------+
```

### S4.3 Script Studio

- Purpose: write the script from the finalized outline; passes; rubric; locks; exports.
- Layout: editor centre (Tiptap sections with time budgets), right panel tabs: Rubric, Versions, Claims, Outline coverage. Focus mode hides everything but the text.
- Actions: Write the script from my finalized outline (allowance 3/month; disabled until an outline is final), Stop, Editing passes menu (eight), accept/reject diffs, Lock script, Unlock, Export (PDF, DOCX, text, annotated fact-check).
- Data: script versions, word count and estimated seconds per section, rubric levels, covered and uncovered talking points, claims.
- States: empty = "Finalize your outline first" with a link (if none is final) or the Write button; loading = streaming section by section with coverage ticks appearing; error = banner, partial text kept as a version; gated = Write and passes on Spark, allowance exhausted after 3 drafts; lock blocked below Level 3 on Structure, Brevity, Ending, Compliance with an override reason; post-lock edits flagged.

```
+-------------------------------------------+----------------------+
|  Script Studio . v7 . 1,480 w . 9:52      | Rubric  Versions     |
|  [Write from finalized outline v2]* used  | Claims  Coverage     |
|  Passes v  (Cut to time)(Stronger opening)| Structure    L3      |
|  ---------------------------------------- | One idea     L4      |
|  1 Make them care            1:28 / 1:30  | Ending       L2 !    |
|  It is three in the morning and the       | Compliance   L4      |
|  checklist has just been read aloud ...   | ...                  |
|  [claim: 1 in 10 surgical deaths] needs   | Coverage 17/18 points|
|  a source                                 | Uncovered: 4.3 the   |
|  2 The idea                  0:58 / 1:00  | cost figure          |
|  ...                                      |                      |
|  [Lock script]*  Ending needs Level 3   (Export v)               |
+-------------------------------------------+----------------------+
```

### S4.4 Fact-check panel and Slides checklist

- Fact-check: a list of claims with status (needs source, source added, verified by me), source URL field, note; export annotated PDF. States: empty = "Extract claims" button; loading; error; gated = Member.
- Slides checklist (V2): rules list and a slide-by-slide planner table (slide, what it shows, words on it, credit); no uploads.

---

## 6. DELIVER (text-based)

### S5.1 Memorize (beat map and drill picker)

- Purpose: the locked script as beats with mastery states, due beats today, drill picker.
- Actions: Build beat map (once per locked version), edit a beat's first words or stage note, start a drill (read-cover-recite, cue cards, blank-fill, chaining), print beat map or cue cards.
- Data: beats (first three words, purpose, budget seconds, stage note), mastery (new, learning, known, cold), next review, coverage %.
- States: empty = "Lock a script to build your beat map" or the Build button; loading; error; gated = Spark drills run on a sample script only; due = "6 beats due today" chip.

```
+------------------------------------------------------------------+
|  Memorize . v7 locked . 24 beats . 9 cold . 6 due today          |
|  Coverage [=======------] 58%                   (Print beat map) |
|  DRILLS  [Read-cover-recite] (Cue cards) (Blank-fill) (Chaining) |
|  +------------------------------------------------------------+  |
|  | 1 "It is three ..."   care   0:28  ● ● ● o  known  due 3 Nov|  |
|  | 2 "The checklist ..." care   0:30  ● ● o o  learning  today |  |
|  | 3 "Nobody in that ..."idea   0:24  ● o o o  new      today  |  |
|  | ...                                                         |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### S5.2 Drill

- Purpose: one card per beat, two large targets.
- Variants: read-cover-recite (show, hide, self-mark), cue cards (first three words, reveal), blank-fill (10/30/60% removed, typed or self-scored), bottom-up chaining (last beat first, add the previous each round).
- Actions: Got it (G), Missed (M), Reveal, Skip, End drill.
- States: loading n/a (client-side); end = summary with beats moved up or down and the next due date; reduced motion = no flips, instant swaps.

```
+------------------------------------------------------------------+
|  Blank-fill 30% . beat 3 of 6 due                      (End)     |
|                                                                  |
|        Nobody in that ____ could ____ the ____ , and the         |
|        checklist ____ exactly as ____ .                          |
|                                                                  |
|        (Reveal)                                                  |
|     [ Got it  G ]                        [ Missed  M ]           |
+------------------------------------------------------------------+
```

### S5.3 Practice timer

- Purpose: time a full or partial run; no recording.
- Modes: count-up (learn the real length), count-down (to the slot) with 6-minute checkpoint ticks and two ending-point markers; shows the beat the member should be on at each checkpoint.
- Actions: Start/pause (space), Reset, Finish → saves the run's duration, the beat reached and the script version to `timed_runs` (this is what feeds measured pace, F2.17); the full Run log with self-assessment (S5.5) is deferred. Mark "blanked" belongs to the deferred recovery drill.
- States: idle, running, paused, finished (opens S5.5 pre-filled); reduced motion = no pulse.

```
+------------------------------------------------------------------+
|  Practice timer . count-down to 10:00                  (Esc)     |
|                                                                  |
|                        04:12                                     |
|   |------●------|------------|------------|---|---|              |
|   0   care   6:00 evidence  implication  end1 end2 10:00         |
|   You should be on: 2 "The checklist ..."                        |
|                                                                  |
|   [Pause  space]   (Reset)              [Finish and save]        |
+------------------------------------------------------------------+
```

### S5.4 Prompter (practice mode) DEFERRED (owner decision 1 Nov 2026; built after launch behind a flag)

- Purpose: large scrolling text at target pace, fade mode to wean off the text.
- Controls: play/pause (space), ±5% speed, wpm field (110–190), mirror, fade level (0/10/30/60/100%), eye-line marker, font size.
- States: idle shows the first lines; running scrolls; paused; end; reduced motion = step scroll by paragraph; gated = Member (Spark sees a sample).

```
+------------------------------------------------------------------+
|  (black background)                           150 wpm  fade 30%  |
|                                                                  |
|            ----------- eye line -----------                      |
|            It is three in the morning and                        |
|            the ____ has just been read                           |
|            aloud. Nobody in that ____                            |
|            could ____ the surgeon ...                            |
|                                                                  |
|  space pause . [ - ] [ + ] speed . M mirror . F fade . Esc       |
+------------------------------------------------------------------+
```

### S5.5 Run log DEFERRED (owner decision 1 Nov 2026)

- Purpose: 30-second self-assessment after each run; trend.
- Fields: duration (pre-filled), dropped beats (tap on a compact beat map), "what felt forced" (one line), "fix next" (one line), confidence 1–5.
- Actions: Save, Get next drill (Haiku summary, optional, 1 credit), View trend.
- States: empty = "No runs yet. Time a run first"; loading for the summary; error; gated none for logging, summary is Member; trend shows duration vs slot and dropped beats per run (sparkline with a text alternative).

```
+------------------------------------------------------------------+
|  Log this run                                                    |
|  Duration  <09:48>  slot 10:00   under by 12 s                   |
|  Dropped beats  [1][2][3]...[24]  tapped: 7, 15                  |
|  What felt forced  <the close>                                   |
|  Fix next          <land ending point 1 cleanly>                 |
|  Confidence  o o ● o o                                           |
|  [Save]   (Save and suggest the next drill)                      |
|  TREND  runs 6 . last 5: 10:40 10:21 10:05 9:58 9:48 . dropped   |
|  5 4 4 2 2                                                       |
+------------------------------------------------------------------+
```

### S5.6 Rehearsal plan DEFERRED (owner decision 1 Nov 2026)

- Purpose: calendar from today to the event with TED's milestones and the organizer's deadlines.
- Actions: Generate (once, 5 credits), edit dates, add a live-audience rehearsal, set the weekly commitment from the plan, export ICS.
- States: empty = needs an event date; loading; error; gated = Member; behind = red-free warning token "2 milestones behind" with a replan button.

### S5.7 Event-day kit DEFERRED (owner decision 1 Nov 2026)

- Purpose: printable backstage card and logistics.
- Content: checkpoints with beat names, cue list, recovery lines, two ending points, nerves routine, logistics (call time, tech check, contact), the "do not" list (no selling from stage, no logo on slides).
- Actions: Generate (2 credits), edit, print, save to phone (PDF).
- States: empty = needs a locked script and an event date; loading; error; gated = Member.

```
+------------------------------------------------------------------+
|  Event-day kit . TEDxWilson Park . Sat 14 Mar                    |
|  BACKSTAGE CARD (print)                                          |
|   0:00 "It is three ..."   6:00 "So here is ..."  9:20 end 1     |
|   Recovery line: "Let me say that plainly."                      |
|   Breathe 4-7-8 twice . walk on, plant, look, then speak         |
|  LOGISTICS  call 13:30 . tech check 14:10 . contact: Priya (org) |
|  DO NOT  mention the book price . use the TED logo . run past    |
|  10:00                                                           |
|  [Print]  (Download PDF)                                         |
+------------------------------------------------------------------+
```

---

## 7. AMPLIFY

### S6.1 Launch plan and copy kit

- Purpose: dated launch checklist once the talk's upload window is known; copy for every channel.
- Actions: Set expected upload window, Generate plan (5), Generate copy kit (15), edit, copy, mark done, paste the official link when it arrives.
- Data: publication status, plan items with dates, copy blocks (email, LinkedIn post, newsletter block, signature line, 10 angles, outreach notes), bio updater lines.
- States: empty = "Log your event date and expected upload window"; loading streaming; error; gated = Member; link-arrived = all copy blocks get the official link inserted and the "@TEDx tag and independently organized" phrasing check runs.

```
+------------------------------------------------------------------+
|  Launch . talk published 2 Apr . official link: (paste)          |
|  PLAN                              COPY KIT                      |
|  ✓ Launch team list (20 names)     Email to list     AI draft    |
|  o Mon 6 Apr 09:00 post            LinkedIn post     AI draft    |
|  o First 48 h: reply to every      Newsletter block  AI draft    |
|    comment                         Signature line    Your words  |
|  o Week 2: article pitch           10 angles         AI draft    |
|  Bio updater: "spoke at TEDxWilson Park 2027, an independently   |
|  organized TEDx event"                                (Copy)     |
+------------------------------------------------------------------+
```

### S6.2 Press kit and quote cards (V2)

- One-page press kit PDF; quote cards from text; carousel script; clip plan from the pasted transcript. No video editing.

### S6.3 Talk stats (V2)

- Official YouTube link, daily views and comments trend with honest framing ("median TEDx talk reaches a few thousand views; the launch week decides most of it").

---

## 8. Clinic (deferred) and account

### S7.1 Clinic DEFERRED (owner decision 1 Nov 2026; no public copy mentions a clinic until it exists; office hours deleted)

- Purpose: calendar of live sessions, replays, office-hours thread.
- Actions: Add to calendar, Join live (Member), Watch replay (90 days), Submit an anonymized application for review (Member, optional), typed questions by form.
- States: empty = next session date and a replay list; loading; error; gated = Join live and most replays on Spark (one replay free).

```
+------------------------------------------------------------------+
|  Clinic                                                          |
|  NEXT  Application Clinic . Thu 6 Nov 18:00 IST . 60 min         |
|        [Join live]  (Add to calendar)  (Submit mine anonymously)  |
|  REPLAYS (90 days)  Oct clinic . Sep clinic* . Stage-Ready Q3*   |
|  QUESTIONS  (Ask by form)                                        |
+------------------------------------------------------------------+
```

### S7.2 Community: removed (owner decision 31 Oct 2026). No screen, no rail item, no tables.

### S7.3 Me (profile, plan, allowances, notifications, AI, data)

- Tabs: Profile, Plan and billing, Allowances, Notifications, AI, Preferences (guided/expert mode, timezone), Data (export, delete).
- Plan tab: current plan, founding badge, renewal date, change period, pause, cancel in two clicks, money-back status, the 100-applications counter and "request extension" (opens a form that asks for proof).
- Allowances tab: each allowance as a meter with the reset date.
- States: loading; error; billing-failed banner (dunning) with Update card; paused banner.

```
+------------------------------------------------------------------+
|  Me . Plan                                                       |
|  Founding Member . $77 / 6 months . renews 14 Apr 2027           |
|  Price kept for life while active   (Change period) (Pause)      |
|  (Cancel)  Money-back until 14 Nov                               |
|  Ready applications: 2 of 100   (Request the extension)          |
|  ALLOWANCES (reset 14 Nov)                                       |
|   Idea batches   [===-------] 3/10   Tailored apps [=====-----]   |
|   Outlines       [==--------] 1/5    Script drafts [===-------]   |
|   Passes         [=---------] 3/30                               |
+------------------------------------------------------------------+
```

### S7.4 Upgrade sheet (modal used by every gated control)

- Content: what this control does, the plan price, the three periods, the promise line, Start 3-day trial (if unused; one idea, three events) or Choose a period; "Not now" always visible.
- States: trial available, trial used, dunning (fix billing instead), region (INR when enabled).

```
+----------------------------------------------+
|  Write the script from your finalized outline |
|  Members get 3 full drafts a month, 5         |
|  outlines and 30 editing passes.              |
|  ( $17 / mo )  ( $77 / 6 mo )  ( $147 / 12 mo)|
|  [Start 3-day free trial]      (Not now)      |
|  We don't guarantee a stage. One promise ...  |
+----------------------------------------------+
```

---

## 9. Admin (role-gated)

### S8.1 Admin home

- Funnel by stage (Idea locked → Brief written → Outline final → Applied → Interview → Accepted → Script locked → Published), MRR, allowances consumed, AI cost by action, clinic attendance. Charts with text alternatives.

### S8.2 Members

- `DataTable` with search, plan, founding flag, region, last active, allowance usage, prior-stages count, 100-counter; member drawer with the Talk Record timeline, ledger, notes, access state (invited, active, paused, removed), extension approval.

```
+------------------------------------------------------------------+
|  Members   <search>  {plan v}{region v}{active in 30 d}  (Export)|
|  Name        Plan       Since    Last   Batches Drafts Ready/100 |
|  A. Goel     Founding6  14 Oct   today  3/10    1/3    2         |
|  ...                                                             |
|  > Drawer: timeline . ledger . notes . access . extension (ok)   |
+------------------------------------------------------------------+
```

### S8.3 Curator Console (events)

- Purpose: turn crawler output into a verified catalogue.
- Tabs: Sources (v1.1: the Google Sheet the app syncs from weekly: sheet id, the events and organizers tabs, schedule, last synced, Sync now, service-account status, column map check), Import runs (a weekly sheet sync or a CSV/JSON upload; run summary: new, changed, unchanged, expired, errors), Diff (field-level changes against the current record with accept/reject), Verify queue (events sorted by staleness and member interest), Dedup candidates (pg_trgm + distance, merge or keep), Organizers (contact fields with source URL, date seen, lawful-basis note, removal requests), Tickets (report outdated, tips), Theme tagging (Haiku suggestions, bulk accept).
- States: empty = "Connect the Google Sheet or import the first crawler run"; loading per tab; error per row with retry; conflict = two edits to one record show both; removal request = red-free "remove within 7 days" timer.

```
+------------------------------------------------------------------+
|  Curator Console . Import runs . Diff . Verify . Dedup .         |
|  Organizers . Tickets . Tags                                     |
|  RUN 2026-11-02 . 3,912 events . new 61 . changed 418 . err 9    |
|  +------------------------------------------------------------+  |
|  | TEDxWilson Park  deadline  2026-11-09 -> 2026-11-16  (✓)(x)  |  |
|  | TEDxPune         theme     (none) -> "Unfold"        (✓)(x)  |  |
|  | TEDxNewOne       NEW . confidence 0.7 . 2 sources    (✓)(x)  |  |
|  +------------------------------------------------------------+  |
|  [Accept all high-confidence]   (Open verify queue: 212 stale)   |
+------------------------------------------------------------------+
```

### S8.4 AI settings

- Prompt versions per function (view, diff, activate), model routing table, credit price per action, allowance sizes per plan, eval results (Promptfoo pass rate per prompt), cost caps (per member, per day), global AI switch.

### S8.5 Billing

- Subscriptions by period, founding flags, refunds, dunning queue, INR pricing switch, add-on purchases (later), extension approvals log.

### S8.6 Access and Reports

- Access: allow-list, invites, roles (member, coach, curator, admin), seat provisioning. Reports: cohort outcomes, churn by plan and period, allowance burn, event coverage by country.

---

## 10. Global patterns the designer must deliver once

1. `AIDraftBlock`: label ("AI draft", "AI-assisted", "Your words"), Why-this popover tied to the member's inputs, Regenerate-with-steer chips, Versions, Accept/Reject diff per paragraph, thumbs-down with "not right" reason, Stop while streaming.
2. `GateNotice`: inline, never a full-page wall; one line of reason, the price, Not now.
3. `AllowanceMeter`: used and allowed, reset date, 80% courtesy state, exhausted state.
4. `CharCountField`: live counter with the minimum, explains why Save is disabled.
5. `EmptyState`: path strip, first node unlocked, one two-minute action.
6. AI error banner (fixed text), network error with text preserved, offline indicator in the editor.
7. Milestone card: gold variant, share-ready image without the TED logo, no confetti under reduced motion.
8. Print stylesheet: beat map, cue cards, backstage card, script PDF (large type, section headers, cue marks).
9. Keyboard map: ⌘K palette; G/M in drills; space in timer and prompter; Esc leaves full-screen; move buttons on every drag surface.
10. Mobile: Today, Journey, Memorize, Drill, Timer, Prompter and Run log must be complete on a phone; editors and the Curator Console can be desktop-first with a read-only mobile view.

## 11. Acceptance checks for the UI (run before Phase 1 sign-off)

- Every screen above renders all five states from a Storybook story.
- No screen requests camera or microphone; no file-upload control accepts audio or video types.
- Contrast ≥4.5:1 for text and ≥3:1 for UI on every token pair in light and dark.
- Target size ≥24×24 px with 8 px spacing on drills, timer and prompter controls.
- 200% zoom keeps the editor usable; prompter and timer work at 320 px width.
- Reduced motion disables scrolling animation (step scroll), flips and celebrations.
- The Idea Brief refuses 499 characters client-side with the explaining message.
- "Write the script" is disabled until an outline version is final, and the gate copy says so.
- Deadline dates render in both the organizer's and the member's timezone.
- No em dashes, exclamation marks, "get selected", "guaranteed", "TED talk" (for a TEDx talk) or TED logos anywhere in the UI copy.
