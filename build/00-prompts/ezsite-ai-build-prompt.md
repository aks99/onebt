# ezsite.ai build prompt for One Big Talk

How to use this file: ezsite.ai is strongest at generating a hosted site with a built-in database, forms, a mini CRM and AI widgets, and it is less certain on member authentication, subscription billing and long-running AI jobs. So this prompt is staged. **Stage A** builds everything ezsite.ai can certainly do well: the public site, the two lead magnets, the pricing page with Stripe payment links and the waitlist, plus the honest copy rules. **Stage B** attempts the member application; if ezsite.ai cannot do a step exactly, it must stop and say so, and that step moves to another builder (the apper.io prompt in this folder covers the same scope for a full-stack builder).

Paste Stage A first. When it is live and checked, paste Stage B in pieces. The full specification is in the public repository and every prompt links to it.

Repository: https://github.com/aks99/onebt
Raw files:
- Blueprint: https://raw.githubusercontent.com/aks99/onebt/main/TEDx-OS-Master-Blueprint-v1.15.md
- First-release feature list: https://raw.githubusercontent.com/aks99/onebt/main/MVP-First-Release.md
- Screens and wireframes: https://raw.githubusercontent.com/aks99/onebt/main/TEDx-OS-Screen-Inventory-and-Wireframes.md

---

## Stage A: the public site, lead magnets, pricing and waitlist

```
Build the public website for a product called One Big Talk. Never use "TED" or "TEDx" in the site name, logo, domain, favicon or page titles. The product is a web app that guides experts, coaches, consultants and authors through preparing a talk for an independently organized TEDx event: find one idea worth spreading, discover and apply to the right events, write the talk from the speaker's own brief, memorize it and finish under time, then launch the published talk. It is text only (it never records audio or video), it never promises selection and it never sells a speaking slot.

Full specification for reference: https://raw.githubusercontent.com/aks99/onebt/main/TEDx-OS-Master-Blueprint-v1.15.md (Sections 1, 2.4, 3.6, 10, 11 and screens S0.1 to S0.4 in https://raw.githubusercontent.com/aks99/onebt/main/TEDx-OS-Screen-Inventory-and-Wireframes.md).

PAGES
1. Home. Headline: "One idea. One stage. A system for getting there." Sub-line: "Find the right independently organized TEDx events, write the application, write the talk, memorize it, and launch it." Buttons: "Start free for 3 days" and "See how it works". Under the buttons: "No card. No recording. Nobody can promise you a stage." Four pillar cards: FIND (events open this season, pulled from the events table as a count), WRITE ("Brief, then outline, then script, in your words"), DELIVER ("Memorize cold and finish under time"), AMPLIFY ("Launch the talk the week it goes live"). A journey strip: Position, Discover, Apply, Write, Rehearse, Perform, Amplify. An "Honest numbers" block: "Most open-call city events accept a single-digit percentage of applicants. Members apply to many." A pricing teaser with the three Founding prices and the live count of founding seats left. The promise block (text below). FAQ. Footer with the disclaimer (text below) on every page.
2. Pricing. Two columns: Free ($0: one idea batch and scorecard, top 3 events with dates hidden, one application record, the brief and structure picker, drills on a sample script) and Founding Member (price kept for life while active): $17 a month, $77 for six months (save 25%), $147 for twelve months (save 28%); "Only 30 founding seats. N left." where N is read from a founding_seats table and never faked. Below: "After the 30 founding seats, membership is $97 a month." Two add-ons: "Human application review, $497, returned within 5 business days" and "Human script review, $497, returned within 5 business days". The promise in full. "30-day money-back on your first purchase. Cancel in two clicks." Buttons link to Stripe Payment Links (I will supply four links: monthly, six-month, twelve-month, regular monthly) and a "Start free for 3 days" button that goes to the sign-up form. No countdown timers anywhere.
3. Open calls this week. Three cards from the events table where application_status = open and curator_verified = yes, chosen by freshness and the visitor's country when known: event name, city and country, theme, "Deadline: shown to members". Below: "N more open calls match speakers like you." and an email form "Send me the list". Empty state when none are verified this week: "Calls open in waves in January to March and August to October. Leave your email and we will send the next batch."
4. Idea Test. A single text field: "Your idea in one sentence". On submit, call the AI (Claude Haiku 5.5 if an Anthropic connection is available; otherwise the site's built-in model) with this instruction: "You are an editor for a product that helps experts prepare talks for independently organized TEDx events. Read the sentence. Return five short labelled lines: 1) Idea or topic: say which, in one sentence, quoting the words that decide it. 2) Idea or pitch: does it sell anything (a book, a program, a service)? 3) Who would disagree, and why. 4) What evidence it would need. 5) Two questions the speaker still has to answer. Never give a score, a percentage or any statement about chances of being chosen. Plain, warm, direct; no em dashes; no exclamation marks." Show the result, then an email form: "Get the full Idea Lab free for 3 days". Store sentence, result and email in a leads table.
5. Ethics page: "What we never do": never promise selection, never charge for or sell a slot, never submit an application for you, never contact an organizer for you, never record you, never crawl inside the app; "Paying for public-speaking preparation is allowed. Paying to be chosen is not, and no one can sell it."
6. Sign-up and log-in page (email only, passwordless if the platform supports it; otherwise email and password). Copy: "No password. The link lasts 15 minutes." if passwordless.
7. Terms, privacy, refund policy pages (placeholders with the headings; I will supply text).

THE PROMISE (exact text)
"We do not guarantee that any organizer will choose you. Nobody can. One promise: if you submit 100 ready applications through the app and are not chosen for a TEDx stage, send us the proof and we extend your access free for as long as you keep applying with ready applications every week."

THE DISCLAIMER (exact text, footer of every page, pricing and onboarding)
"One Big Talk is an independent product and is not affiliated with, endorsed by, or sponsored by TED Conferences, LLC. TED and TEDx are trademarks of TED Conferences, LLC. TEDx events are independently organized under license from TED. One Big Talk never charges for, sells, or guarantees speaking slots."

CREDENTIAL LINE (one of these, never both on one page)
Joint: "From 10X TEDx Speakers". Ash alone: "9X TEDx".

DESIGN
Palette "Ink and Ivory": background #FBF8F3, cards #FFFFFF, panels #F3EEE6, text #121A2B, secondary text #3F4A5F, muted #5F6B7E, primary buttons #121A2B with ivory text, gold accent #D9A21B with ink text for highlights and the seats counter. Never vivid red as a brand color, never a black-and-white-with-red look, never Helvetica. Google Fonts: Newsreader for headlines and long reading, Inter for UI text, Fraunces for the wordmark "One Big Talk" (ink on ivory; the O may carry a thin gold ring). 12px card radius, borders over shadows. WCAG 2.2 AA contrast; visible focus; 16px side gutters on phones; no horizontal scroll.

COPY RULES (strict)
Plain, warm, direct. Short paragraphs. No em dashes. No exclamation marks. No buzzwords (unlock, unleash, elevate, seamless, game changer, next level, dive in, secret weapon). Never "get selected", "guaranteed", "TED-approved", "official", "land your TEDx talk". Always "independently organized TEDx event", never "TED talk" for a TEDx talk. Honest numbers only; do not invent member counts, view counts or testimonials. Do not mention a clinic or a community (neither exists yet).

DATABASE TABLES FOR STAGE A
leads (email, source: home | open_calls | idea_test | pricing, idea_sentence, idea_result, country, created_at), events (name, city, country_code, event_date, type, theme, application_status: open | announced | rolling | closed | nomination | invitation_only | stale | unknown, application_deadline, deadline_timezone_status, form_url, last_verified_at, confidence, curator_verified boolean, source), organizers (name, website, public_contact_email, contact_source_url, contact_seen_at, lawful_basis_note), founding_seats (total 30, taken), waitlist (email, wants: founding | regular).
Import: let me upload a CSV into events and organizers from the admin side, and if the platform can connect to a Google Sheet, read the two tabs "events" and "organizers" of one sheet I share, on a weekly schedule, replacing changed rows and marking removed rows as expired (never deleting). Column names are in https://raw.githubusercontent.com/aks99/onebt/main/TEDx-Event-Database-Crawler-Prompt.md, Part C.

ADMIN (behind login, owner only)
A simple table view of leads, events (with an "approve" toggle that sets curator_verified), organizers, founding_seats (editable taken count), and the import screen.

CHECKS BEFORE YOU FINISH
No em dashes or exclamation marks anywhere. The disclaimer is on every page. The seats-left number comes from the database. No page requests camera or microphone. Every page passes 4.5:1 text contrast in the palette above. The Idea Test never outputs a percentage or a statement about chances.
```

## Stage B: the member application (attempt in pieces; stop and tell me if a piece is not possible)

Paste these one at a time. Each piece ends with "If you cannot build this exactly, stop and tell me which part is not possible on this platform." Do not accept a faked or simulated version of any part.

### B1. Accounts, plans, allowances

```
Add member accounts behind the sign-up page. Each member has a profile (expertise in one line, city, country, timezone, target talk date, hometown, alma mater, places lived, travel radius). Plans: free (internal name Spark), founding (monthly, six_month or twelve_month, founding_price = true, price kept for life while active, only while founding_seats.taken < 30), regular ($97 a month). A 3-day trial starts at sign-up with no card: member tools are unlocked for one locked idea and three matched events only; on day four the account returns to free unless a plan was bought. Connect Stripe subscriptions (Checkout and Customer Portal) with webhooks; a duplicate webhook must never grant anything twice; the 31st founding purchase is charged $97 monthly instead and told so before paying. Cancel in two clicks; pause up to 3 months once a year; 30-day money-back on the first purchase; dunning banner on failed payment. Members see allowances in plain words, never credits: 10 idea batches, 15 tailored applications, 5 outlines, 3 script drafts, 30 editing passes a month, with the reset date; when one is used up show "You've used this month's 3 script drafts. Resets 14 Nov." Internally keep a credits ledger: reserve credits when an AI action starts, settle on success, release on failure, with an idempotency key so a retry never charges twice. The fixed AI error message: "That didn't work. You weren't charged a credit. Try again."
If you cannot build this exactly, stop and tell me which part is not possible on this platform.
```

### B2. Idea Lab and Prior Stages

Paste Prompt 2 from `apper-io-build-prompt.md` in this folder, unchanged.

### B3. Event Finder and Curator Console

Paste Prompt 3 from `apper-io-build-prompt.md`, unchanged.

### B4. Application Pipeline and Pitch Studio

Paste Prompt 4 from `apper-io-build-prompt.md`, unchanged.

### B5. Onboarding, Today and Journey

Paste Prompt 5 from `apper-io-build-prompt.md`, unchanged.

### B6. WRITE

Paste Prompt 6 from `apper-io-build-prompt.md`, unchanged. This piece needs streaming AI output and server-side gates (the 500-character minimum and the finalized-outline requirement must be enforced on the server, not only in the page). If the platform cannot enforce them server-side, stop.

### B7. DELIVER core

Paste Prompt 7 from `apper-io-build-prompt.md`, unchanged. All of it is client-side logic with small database writes; no AI except one call to split the script into beats.

### B8. AMPLIFY basics, Me and Admin

Paste Prompt 8 from `apper-io-build-prompt.md`, unchanged.

### B9. Final checks

Paste Prompt 9 from `apper-io-build-prompt.md`, unchanged.

## Notes for the operator (Ash)

- Stage A alone is a complete, honest marketing site with two working lead magnets and the ability to sell founding seats by Stripe Payment Link while the app is built elsewhere. Do not let it mention features that do not exist yet.
- Keys you will supply: Stripe Payment Links (four) for Stage A; Stripe API keys and webhook secret, Anthropic API key, and a Google service account for Stage B.
- If ezsite.ai stops at any Stage B piece, use the apper.io prompt for the member app and keep ezsite.ai for the public site; point the "Start free" buttons at the app's sign-up URL.
