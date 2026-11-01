# Step 6: Curator Console, Google Sheet sync, Event Finder and matching

Runbook step 6 of Appendix E (blueprint v1.11). Built 1 November 2026. Sections: 6.2 Event Finder (F1.2.0 to F1.2.6, F1.2.9, F1.2.11, F1.2.12, F1.2.16), 12.5 event data pipeline, 5.6 deadline reminders. Screens S0.3, S3.4, S3.5, S8.3.

The app never crawls. It reads a Google Sheet a person maintains (or a CSV the curator uploads), diffs it against the catalogue, publishes what the owner marked verified, queues the rest for a curator, and expires what the sheet no longer lists. Members see facts and links, never TED's descriptions or images, and never an organizer's contact details.

## 1. What was built

| Area | Files | What it does |
|---|---|---|
| Database | `app/packages/db/supabase/migrations/0010_catalogue_sync.sql` | `import_diffs`, `email_captures`, `calendar_tokens`, `reminder_log`; `profiles.deadline_reminders`; `expire_events_missing()`, `expire_past_events()`, `mark_stale_calls()`, `verify_queue` view, `verify_event()`, `merge_events()`, `deadline_reminders_due()`, `calendar_feed()`, `my_calendar_token()`, `report_event()`; RLS and grants; one contact row per organizer |
| Database tests | `app/packages/db/tests/rls_and_gates.sql` (step6 block) | 29 new checks; 142 in total, all green |
| CSV and sheet parsing | `lib/catalogue/csv.ts` | RFC 4180 parser; sheet values to rows |
| Column maps and normalization | `lib/catalogue/normalize.ts` | The crawler's three files (C.1 to C.3) with aliases, required columns, dates, booleans, country codes, statuses (`invite_only` to `invitation_only`, `nominations_only` to `nomination`), timezone status, R6 contact rule, row problems |
| Diff rules | `lib/catalogue/diff.ts` | Field-level diff, auto versus pending, run summary, missing keys |
| Import pipeline | `lib/catalogue/import.ts` | `runImport()`: parse, diff, apply, queue, expire, record diffs and the run; `decideDiff()` for the Diff tab |
| Google Sheets | `lib/catalogue/sheets.ts` | Service-account JWT (RS256, read-only scope), token exchange, tab read, sheet id from a link; no SDK |
| Sync | `lib/catalogue/sync.ts` | `syncSource()` for one sheet, `syncAllEnabled()` for the weekly job |
| Matching | `lib/catalogue/matching.ts` | Eligibility first, four score parts, three "why" lines and one caution, `rankEvents()` into apply and watch |
| Finder loader | `lib/catalogue/load.ts` | One RLS read for the catalogue slice, idea, profile, tags, member state; filters |
| Calendar | `lib/catalogue/ics.ts`, `app/api/calendar/[token]/route.ts` | All-day VEVENTs with alarms at 14, 7, 3, 1 days; per-member feed URL |
| Email | `lib/email/send.ts`, `app/api/cron/reminders/route.ts` | Resend sender with `email_log`; reminder copy; daily job that sends what `deadline_reminders_due()` returns and logs once per interval |
| Weekly job | `app/api/cron/sheet-sync/route.ts` | Syncs every enabled sheet source, expires past events, marks stale calls; CRON_SECRET |
| Curator Console | `app/(app)/curate/page.tsx`, `actions.ts`, `components/curate/CuratorControls.tsx`, `lib/roles.ts` | Tabs: Sources (sheet, service-account email, Sync now, CSV upload), Import runs, Diff (accept, reject, accept all high-confidence), Verify (status, deadline, note, source links), Dedup (merge or keep both), Organizers (contact with source and date, removal request), Tickets, Tags (Haiku suggestions from a controlled vocabulary, accept) |
| Event Finder | `app/(app)/find/events/page.tsx`, `actions.ts`, `components/events/EventCard.tsx` | Ranked list in Apply and Watch, filters (name, country, city, type, status, deadline window, dates, talk length), season planner, Track, Save, Watch, Report outdated; free members see the top three with dates hidden and filters disabled |
| Event detail | `app/(app)/find/events/[eventId]/page.tsx`, `components/events/CalendarLink.tsx` | The call (status with evidence and source, deadline chip, form link for members, form fields, talk length, pitch video and local-connection facts, organizer's words, AI policy), the event (place, dates, licence, theme history, topics, past speakers link, organizer links), contact via the organizer's channel only, sources and verified date, add deadlines to calendar |
| Targets | `app/(app)/find/targets/page.tsx`, `components/events/TargetRow.tsx` | Up to 50 saved events with priority and private note; Track; Remove; calendar link |
| Public page | `app/open-calls/page.tsx`, `components/public/EmailCapture.tsx`, `app/api/public/email-capture/route.ts` | Three verified open calls without deadline dates, email capture with consent text, disclaimer |
| Shell | `components/AppShell.tsx`, `app/(app)/layout.tsx` | Curator Console link for staff; Targets in the FIND strip; staff without a talk still get the shell |
| Unit tests | `tests/catalogue.test.ts` | 24 tests; 87 in the web package in total |
| Env | `app/.env.example` | `GOOGLE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, `EMAIL_FROM` |

## 2. Rules carried into code

- Status rules (6.2 v1.4): a status is a fact with a source URL, a seen date and who verified it. A model never sets or suggests one here; the tagging action's schema has no status field. "Spaces available" is a ticket label stored as `status_label`, never a call status. A call not re-verified in 14 days with a future deadline becomes `stale` (`mark_stale_calls`). Events expire 30 days after the event date.
- Publish rules (Appendix C v1.11): verified rows publish; unverified new rows are hidden until verified; high-confidence field changes apply except status and deadline; a blank cell never erases; a missing row expires.
- Eligibility first (F1.2.1): closed, invitation-only, nomination, stale, passed deadline, expired, or a local-connection rule the member does not meet moves the event to Watch. An unknown constraint is a caution, never a pass. An invitation-only event never shows Track.
- Deadline display (v1.4): date only when the timezone is unknown; the chip shows the verified date and the source type; free members see "N days left, date shown to members".
- Privacy (12.5, 12.8): organizer contacts live in a curator-only table with source URL, seen date and lawful-basis note; members read "contact via the organizer's published channel"; a removal request deletes the contact at once and starts the 7-day timer; the app never sends anything to an organizer.
- Reminders fire once per interval and never when disabled (SQL checks); the email states the date and points to the organizer's page for the time of day.
- Trial and caps: three tracked events on the trial, 50 targets, one application per event per cycle, all enforced in the database and reflected as inline gates.

## 3. Web and mobile

Phone-first as in step 5. Filters are a two-column grid at 390px and six columns at 1024px; the console tabs scroll sideways in their own strip; the verify row stacks its controls on phones. Screenshot script: no horizontal scroll at 390px or 1280px (`event-finder-phone.png`, `event-finder-desktop.png`, `curator-phone.png`, `curator-desktop.png`).

## 4. Acceptance checks

| Check (6.2 acceptance checks, S8.3, screen inventory Section 11) | Result |
|---|---|
| Events in the next 7 days are shown | pass: the finder lists events with `event_date >= today` or no date; nothing hides near events |
| "Why you match" is correct for test profiles | pass: unit tests cover same city, same country, abroad, theme words, deadline fit, travel radius, unknown local rule, stale verification |
| An event marked invitation-only never shows an "Apply" CTA | pass: `EventCard` hides Track for invitation-only, nomination, closed and expired; `trackEvent` refuses server-side too |
| Deadline reminders fire once per interval and never when disabled | pass: `step6: a sent reminder is not due again`, `step6: reminders never fire when disabled` |
| An import run never creates duplicates | pass: events upsert on `tedx_event_id`; same-name, same-area events are flagged by `event_dedup_candidates` for the Dedup tab; merge moves member rows (`step6: merge moves the watch to the kept event`) |
| Deleting an event cascades to tracked applications as "event cancelled" without deleting notes | pass by design: events are expired, never deleted; cards and targets show "event cancelled or past"; application rows and notes stay |
| Sheet sync: verified rows publish, others queue, removed rows expire | pass: diff unit tests; `step6: missing row is expired, present row kept`; crawler-sourced rows untouched by a sheet sync |
| A status or deadline change from an unverified row waits for a person | pass: `diff rules` unit test |
| Organizer contact needs source and date (R6) | pass: `toOrganizer` drops the contact and reports it |
| Members cannot expire, verify or merge; cannot read diffs or the audit log | pass: four SQL checks |
| Anonymous visitor can leave an email, cannot read captures | pass: two SQL checks |
| Calendar feed lists tracked deadlines by token only | pass: three SQL checks; ICS unit test (four alarms, 75-octet lines) |
| Free plan sees top three, dates hidden, filters disabled but visible | pass: `EventsPage` with `has_member_access` |
| Season planner numbers trace | pass: 62% of 2026 events in Q1 (research-notes/03); windows close 3 to 7 months out (blueprint 2.x, A15 to A128) |
| Copy lint and no-capture guard | clean |
| Typecheck, unit tests, production build | pass (87 tests; 26 routes) |

## 5. Not in this step

- The live Google Sheet and service account are the owner's to create (START-HERE "Owner runs himself"). The code is ready: paste the sheet link in Sources, share the sheet with the email shown, press Sync now.
- Weekly plan email and mid-week nudge (5.6) ship with the ops step; the sender and `email_log` are in place.
- Watch alerts on diff events (F1.2.12) are stored as watches now; the alert email joins the reminders job in the ops step when the diff items carry the event id (they carry the key; the join is one query).
- Embedding similarity (pgvector) waits for the embedding provider decision (Appendix C).
- Geocoding missing lat/lng on import (12.5) is left to the crawler (Nominatim) for now; the matcher works without coordinates using city, region and country.
- Event intel page, organizer claim and public event status pages are V2.

## 6. How to run

```
PGHOST=/tmp PGPORT=5499 PGUSER=postgres bash app/packages/db/scripts/local-test.sh
cd app/apps/web && npx vitest run && npx tsc --noEmit && npx next build
cd app && node tools/copy-lint/check.mjs && node packages/ui/scripts/check-no-capture.mjs
```

Scheduling (Vercel): `vercel.json` crons `0 6 * * 1` for `/api/cron/sheet-sync` and `0 7 * * *` for `/api/cron/reminders`, each with `Authorization: Bearer $CRON_SECRET`. Any other host can call the same two URLs on the same schedule.
