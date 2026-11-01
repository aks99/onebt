# TEDx event and organizer database: Claude Code crawler prompt (31 October 2026; revised the same day for blueprint v1.4: two optional fields added, `ai_policy` and `call_opens_on`, and one status rule made explicit. A run started with the earlier text still imports; the new columns are optional.)

This file has three parts. Part A is what to read and decide before running anything. Part B is the prompt to paste into Claude Code, verbatim. Part C is the schema, the weekly routine and the import into the Curator Console.

The crawler runs on your machine, not in the app. The app never crawls (blueprint v1.2, Section 12.5 and non-negotiable 4).

---

## Part A. Read before running

### A.1 What this produces

Four files per run in a dated folder: `events.csv`, `organizers.csv`, `application_calls.csv`, `sources.jsonl`, plus `run_report.md`. The Curator Console imports `events.csv`, `organizers.csv` and `application_calls.csv`; `sources.jsonl` is the audit trail (every fact with the URL and the date it was seen).

### A.2 The legal position, stated plainly

- TED's Terms of Use (updated 7 May 2024), section 6.4, prohibit automated collection of TED content in a manner inconsistent with the Terms and bar dataset use without a written license. The directory and event pages are public, and recent US case law (hiQ v. LinkedIn, Van Buren, Meta v. Bright Data) makes computer-fraud claims over public pages weak, but a breach-of-contract claim stays possible where the Terms apply, and TED enforces its rules.
- Organizer email addresses are personal data under GDPR, UK GDPR and India's DPDP Act. Collecting an address an organization posted publicly for the purpose it was posted for (speaker enquiries) is defensible; building a mailing list from it and sending bulk commercial email is a separate, regulated act (CAN-SPAM, PECR, GDPR consent or legitimate-interest tests).
- TED's own guidance to speakers: only contact events that publish a public application form on their official TED.com event page or other official digital channels.

What this means for the crawler, as binding rules written into the prompt below: respect robots.txt; identify the crawler with a contact email; one request every 2.5 seconds with caching; stop on 403 or 429; never log in; store facts, not page copies or TED's descriptions; store contact details only when the organization posted them publicly on its own site or official profile, with the source URL and the date; never guess, infer or pattern-generate email addresses; never use people-search or email-finder services; never scrape individuals' profiles; never send any message.

What this means for you: send a data-partnership request to TED (the Terms contemplate a written license) and keep the letter on file; if TED objects, stop the crawler and keep the catalogue going from organizer submissions, member tips and curator research. Any outreach to organizers by your team needs a documented lawful basis, an unsubscribe path, and must never be sent from the app or on a member's behalf.

### A.3 Decisions to make before the first run (fill in the config block in the prompt)

| Setting | Recommended | Your value |
|---|---|---|
| `CONTACT_EMAIL` in the User-Agent | a monitored address on your product domain | |
| `REQUEST_DELAY_SECONDS` | 2.5 (3.0 for organizer sites) | |
| `SCOPE` | upcoming events only (not past) | |
| `COUNTRIES_PRIORITY` | US, IN, GB, CA, AU first; everything else after | |
| `ORGANIZER_SITE_DEPTH` | at most 6 pages per organizer site | |
| `WEB_SEARCH_FOR_CONTACTS` | yes, official channels only | |
| `STORE_PERSON_NAMES` | only when posted with a role as the speaker contact | |
| `RUN_MODE` | `full` for the first run, `incremental` weekly after | |

### A.4 Environment

- Claude Code on your machine with Python 3.11+ available; it will install `requests`, `requests-cache`, `beautifulsoup4`, `lxml`, `playwright` (only if pages need JavaScript), `tldextract`, `python-dateutil`, `pandas`.
- A working folder, for example `G:\TEDx OS\event-db\`. Each run writes to `runs\YYYY-MM-DD\`; `state\` keeps the checkpoint and the previous run for diffs.
- Expect the first full run to take 4–8 hours at the polite rate (about 2,200 directory entries, 44 directory pages, up to 2,200 event pages, then organizer sites). Let it run; it checkpoints and resumes.

---

## Part B. The prompt (paste into Claude Code as the first message)

```
You are building and running a polite, auditable crawler that produces a database of upcoming
independently organized TEDx events and their organizers' publicly posted application details.
The output feeds a product that helps speakers find and apply to events. The product itself
never crawls; you are producing files that a human curator will import and verify.

Work in the folder: G:\TEDx OS\event-db\
Config (change nothing else without asking me):
  CONTACT_EMAIL = "<your monitored address>"
  USER_AGENT = "OneBigTalk-EventCatalogue/1.0 (+mailto:<CONTACT_EMAIL>; polite crawler; 1 req / 2.5 s)"
  REQUEST_DELAY_SECONDS = 2.5          # ted.com
  ORGANIZER_DELAY_SECONDS = 3.0        # organizer sites
  MAX_PAGES_PER_ORGANIZER_SITE = 6
  SCOPE = "upcoming"
  COUNTRIES_PRIORITY = ["US","IN","GB","CA","AU"]
  RUN_MODE = "full"                    # or "incremental"
  TODAY = <today's date>

BINDING RULES (do not relax any of them; if a rule blocks progress, stop and tell me)
R1  Fetch and obey robots.txt for every host before any other request to that host. If a path is
    disallowed for our user agent or for *, do not fetch it; record "robots_disallowed" in the log.
R2  One request at a time, never parallel to the same host, with the delays above, plus a
    random 0–1 s jitter. Cache every response (requests-cache, 7-day expiry) so re-runs do not
    re-fetch unchanged pages. Send If-Modified-Since / ETag when the cache has them.
R3  On HTTP 403 or 429 from any host: stop all requests to that host for this run, log it, and
    continue with other hosts. Two 403/429 hosts in a row on ted.com: stop the whole run and
    report to me.
R4  Never log in, never create an account, never bypass a wall, never use a proxy or rotate
    user agents, never run a headless browser against ted.com unless the directory pages contain
    no event data without JavaScript (check the raw HTML first; if you must render, keep the same
    delays and the same user agent).
R5  Store facts, never page copies. Do not store TED's event descriptions, images, logos or any
    text beyond: event name, type, status label, date(s), city, region, country, venue name,
    TED event URL, organizer website URL, theme name, and short evidence snippets of at most 200
    characters quoted only to justify a status or a deadline.
R6  Contact details: store an email, phone, form URL or social handle only when it is posted
    publicly by the organization on its own website or its official social profile for public
    contact, and always with source_url and seen_at. Prefer role addresses (speakers@, info@,
    hello@). Store a person's name only when the organization posted it with a role as the
    speaker or general contact. Never guess, infer or pattern-generate addresses, never use
    email-finder or people-search services, never scrape personal profiles, never collect from
    data-broker sites, never store addresses found in leaked or aggregated lists.
R7  Never send any email, message, form submission or social interaction. Read only.
R8  Every stored fact carries source_url, seen_at (ISO 8601 UTC) and confidence (0–1).
R9  Checkpoint after every 25 records to state/checkpoint.json; on restart, resume from it.
R10 Keep a log at runs/<date>/crawl.log with one line per request: time, host, path, status,
    cache hit, bytes. Keep a problems list for anything you could not resolve.

PHASE 0: RECONNAISSANCE (report to me before continuing)
0.1 Fetch https://www.ted.com/robots.txt and summarize what applies to /tedx/events.
0.2 Fetch https://www.ted.com/tedx/events (page 1) and one event page linked from it. From the
    raw HTML, map the exact selectors or embedded JSON for: event id, name, event type
    (Standard, Youth, Salon, University, TEDxPlay, other), status label (Spaces available, Sold
    out, Invite only, other), start date, end date if present, city, region, country, venue,
    organizer website link, theme, social links, "apply" or "speaker" links if any. Note the
    pagination form (expected: 50 per page, ?page=N, about 44 pages for ~2,164 upcoming events
    as of 30 Oct 2026; verify).
0.3 If the listing renders only with JavaScript, say so and propose the minimum Playwright
    approach that keeps R2–R4. Wait for my go-ahead.
0.4 Write the field map to state/field_map.json and show it to me.

PHASE 1: DIRECTORY (ted.com listing)
1.1 Page through the upcoming-events listing in order. For each entry capture: tedx_event_id,
    event_name, event_url, event_type, status_label, start_date, end_date, city, region,
    country_code (ISO 3166-1 alpha-2; resolve from the listed country name), venue, listed_at.
1.2 Stop when a page returns no new entries or the page count is exhausted. Write
    runs/<date>/directory.csv and report counts by country and type.

PHASE 2: EVENT PAGES (ted.com, one per event)
2.1 For each directory entry, fetch the event page and capture: theme, organizer_website_url,
    social_links (official handles only), slot or format notes if stated, speaker-application
    link if the page shows one, last_modified if the response has it. Do not store the
    description text (R5).
2.2 Order: COUNTRIES_PRIORITY first, then by start_date ascending. Checkpoint per R9.
2.3 Write runs/<date>/events_stage2.csv.

PHASE 3: ORGANIZER SITES (the organizer's own domain)
3.1 For each event with an organizer_website_url, fetch robots.txt, then the home page, then
    at most MAX_PAGES_PER_ORGANIZER_SITE pages chosen by link text and path in this priority:
    speakers / speak / apply / nominate / call-for-speakers / speaker-application / about /
    contact / team / press / faq. Also parse the footer of the home page.
3.2 Capture for application_calls: call_status (open, announced, rolling, closed, invite_only,
    nominations_only, unknown) with an evidence snippet of at most 200 characters and its
    source_url. "Spaces available" on the TED directory page means tickets, never a speaker
    vacancy; a form that still loads after its stated deadline is "closed", not "open"; a page
    that announces a future opening date is "announced"; a previous edition's form never sets
    this edition's status;
    application_form_url (Google Forms, Typeform, Sessionize, Airtable, native form, or an
    email instruction); call_opens_on (date, if the page announces a future opening); deadline
    (date and timezone if stated; "rolling" if stated); ai_policy (allowed, restricted,
    prohibited, unknown) with a snippet of at most 200 characters when the organizer states a
    rule about AI-written applications (some events require applicants to affirm their content
    was not AI-generated); theme and
    the organizer's own stated criteria as a snippet of at most 200 characters; slot lengths;
    requirements (video required? bio length? idea statement length?); past_speakers_url;
    event_edition_year.
3.3 Capture for organizers: organizer_name (the organizing body as named on the site),
    website_domain, public_contact_email (R6), public_contact_role, public_contact_name (R6),
    contact_form_url, social handles (Instagram, LinkedIn page, Facebook page, X/Twitter,
    YouTube channel), city, country_code, licensee_name only if the site states it publicly
    with a role.
3.4 If the TED page had no organizer website, run at most two web searches per event in this
    form: "<event name>" official site OR Instagram OR LinkedIn. Accept only results whose
    name matches the event name and whose page identifies itself as the official event or
    organizing team. Record the query and the accepted result in sources.jsonl. Do not search
    for named individuals' emails. Do not open people-search, email-finder or data-broker
    sites; if a result is one of those, skip it.
3.5 Respect R2 and R3 on every organizer host. Many sites are Wix, Squarespace, WordPress or
    Google Sites; parse mailto: links, visible text emails on contact pages, Instagram bio
    text only via the official page if it renders without login, and LinkedIn company pages
    only via the public "about" section if it renders without login. If a page requires login,
    skip it.

PHASE 4: NORMALIZE, DEDUPLICATE, SCORE
4.1 Normalize names: strip "TEDx", years, punctuation and whitespace into name_key. Dedup
    organizers by website_domain, else by name_key + country. Dedup events by tedx_event_id;
    flag likely duplicates by name_key + city + start_date within 60 days as needs_review.
4.2 Confidence: directory fields 1.0; event-page fields 0.9; organizer-site fields 0.8;
    official social profile 0.6; web-search-identified site 0.5 until a curator confirms;
    anything ambiguous 0.3 with needs_review = true.
4.3 Dates to ISO 8601; timezones as IANA names when stated or inferable from city with
    confidence 0.7; keep the original string in raw_date.
4.4 Geocode city+country with a free service that allows it (Nominatim with our user agent,
    1 request per second, cached) or leave lat/lng empty for the app to geocode on import.

PHASE 5: OUTPUT AND REPORT
5.1 Write runs/<date>/events.csv, organizers.csv, application_calls.csv, sources.jsonl using
    the schema in the file "TEDx-Event-Database-Crawler-Prompt.md", Part C.
5.2 Write runs/<date>/run_report.md: counts (events, with organizer site, with contact, calls
    open/closed/unknown, by country, by type), robots-disallowed hosts, 403/429 hosts, parse
    failures, needs_review counts, run duration, request counts and cache hit rate, and a list
    of 20 random records for spot-checking.
5.3 QA before you declare done: every row has source_url and seen_at; no email appears that was
    not found on a page in sources.jsonl; no row contains description text longer than 200
    characters; all dates parse; tedx_event_id is unique; country codes are valid; a sample of
    10 open calls re-opened in a browser match what the CSV says.

PHASE 6: INCREMENTAL MODE (weekly)
6.1 With RUN_MODE = "incremental": re-crawl the directory fully (cheap), fetch event pages only
    for new ids or ids whose listing changed, re-fetch organizer application pages only for
    events with start_date in the next 10 months, skip organizers fetched in the last 14 days
    unless their event is within 60 days, and write a diff file runs/<date>/diff.csv with
    added, changed (field, old, new) and removed records against state/previous_run/.
6.2 Expire events whose start_date is more than 30 days in the past (mark expired = true; do
    not delete).

HOW TO WORK WITH ME
- After Phase 0, stop and show me the robots summary and the field map.
- After Phase 1, show the counts and continue only if they look right.
- Report every 500 records with counts and problems.
- If any rule R1–R10 would be violated by continuing, stop and ask.
- Do not summarize TED's pages to me in prose beyond the facts captured; I do not need the text.
```

---

## Part C. Schema, weekly routine, import

### C.1 events.csv

| Column | Type | Notes |
|---|---|---|
| tedx_event_id | string | From the TED event URL; primary key |
| event_name | string | As listed |
| name_key | string | Normalized for dedup |
| event_url | url | ted.com/tedx/events/{id} |
| event_type | enum | standard, youth, salon, university, play, other |
| status_label | string | Spaces available, Sold out, Invite only, other |
| start_date | date | ISO |
| end_date | date | ISO, optional |
| raw_date | string | Original text |
| timezone | string | IANA, optional |
| city | string | |
| region | string | State or province, optional |
| country_code | string | ISO alpha-2 |
| venue | string | Name only |
| lat, lng | number | Optional |
| theme | string | Name only |
| organizer_id | string | FK to organizers.csv |
| organizer_website_url | url | |
| social_links | json | Official handles |
| speaker_link_on_ted_page | url | Optional |
| first_seen_at, last_seen_at | datetime | |
| last_modified | datetime | Optional |
| confidence | number | 0–1 |
| needs_review | bool | |
| expired | bool | |
| source_urls | json | List |

### C.2 organizers.csv

| Column | Notes |
|---|---|
| organizer_id | website_domain or name_key+country |
| organizer_name | The organizing body |
| website_domain, website_url | |
| public_contact_email | Role address preferred; only if publicly posted (R6) |
| public_contact_role | speakers, info, press, general |
| public_contact_name | Only when posted with a role |
| contact_form_url | |
| instagram, linkedin_page, facebook_page, x_handle, youtube_channel | Official only |
| city, country_code | |
| licensee_name | Only if stated publicly with a role |
| contact_source_url, contact_seen_at | Mandatory when any contact field is filled |
| confidence, needs_review | |
| removal_requested_at | Filled by the curator if the organizer asks |

### C.3 application_calls.csv

| Column | Notes |
|---|---|
| call_id | tedx_event_id + edition_year |
| tedx_event_id | FK |
| edition_year | |
| call_status | open, announced, rolling, closed, invite_only, nominations_only, unknown |
| call_opens_on | Date, optional (v1.4) |
| ai_policy, ai_policy_snippet, ai_policy_source_url | allowed, restricted, prohibited, unknown; snippet ≤200 characters; optional (v1.4) |
| status_evidence | ≤200 characters |
| status_source_url, status_seen_at | |
| application_form_url | |
| form_type | google_forms, typeform, sessionize, airtable, native, email, other |
| deadline, deadline_timezone, deadline_raw | |
| criteria_snippet | ≤200 characters, organizer's own words |
| slot_lengths | e.g. "6, 10, 14" |
| video_required | bool or unknown |
| requirements_notes | Short |
| past_speakers_url | |
| confidence, needs_review | |

### C.4 sources.jsonl

One line per fact: `{ "record_type": "event|organizer|call", "record_id": "...", "field": "...", "value": "...", "source_url": "...", "seen_at": "...", "method": "directory|event_page|organizer_site|social|web_search", "query": "optional" }`.

### C.5 Weekly routine (owner, 20 minutes)

1. Run with `RUN_MODE = "incremental"` on the same weekday.
2. Open `run_report.md`; check the 403/429 list is empty and the needs_review count is sane.
3. Paste the three CSVs into the Google Sheet tabs (or upload them in Curator Console → Import runs); the weekly sync picks them up, or press Sync now. Review the Diff tab; accept high-confidence changes in bulk; work the Verify queue for events with deadlines in the next 45 days.
4. Handle removal requests within 7 days (Organizers tab).
5. Keep `state/previous_run/` for diffs; archive runs older than 90 days.

### C.6 Import mapping (Curator Console)

**Google Sheet route (1 Nov 2026, owner decision).** The app syncs weekly from one Google Sheet you own, with two tabs named `events` and `organizers` whose header rows are the column names in C.1 and C.2 (optional columns may be left out), plus an `application_calls` tab (C.3) if you keep calls separately. After each crawler run, paste or import the CSVs into those tabs (or have the crawler write to the sheet with gspread; same columns). Add one column `curator_verified` (yes/no): rows marked yes publish to members on the next sync; the rest go to the Verify queue. Delete a row to expire the event (the app never hard-deletes). Share the sheet with the app's service-account email shown in Curator Console → Sources. CSV upload stays available as a fallback.

`events.csv` → `events` (geocode missing lat/lng on import; theme tagging by Haiku in Batch); `organizers.csv` → `organizers` and `organizer_contacts` (with `lawful_basis = "publicly posted for contact"` and the source fields); `application_calls.csv` → `application_calls`; `sources.jsonl` → `event_sources`. Every imported record gets `verified_by = null` until a curator confirms; the member UI shows `last_verified_at` and the confidence band.

### C.7 If TED objects

Stop the crawler the same day, keep the files you already have (they contain facts, not TED content), reply in writing, and switch the catalogue to organizer submissions, member tips and curator research as described in blueprint Section 12.5. Keep the data-partnership request on file either way.
