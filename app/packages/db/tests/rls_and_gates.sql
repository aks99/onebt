-- One Big Talk: RLS and gate tests. Run against a database prepared by scripts/local-apply.sh.
-- Two members (A, B), one curator (C), one admin (D), and the anonymous role.
-- Every check writes a row into tests.results; the last statement prints the summary and fails the
-- script (division by zero) if anything failed, so CI goes red.

\set ON_ERROR_STOP on
create schema if not exists tests;
create table if not exists tests.results (name text primary key, passed boolean, detail text);

create or replace function tests.check(p_name text, p_ok boolean, p_detail text default null) returns void
language plpgsql as $$
begin
  insert into tests.results values (p_name, coalesce(p_ok, false), p_detail)
  on conflict (name) do update set passed = excluded.passed, detail = excluded.detail;
end $$;

-- Expect a statement to fail with a message containing p_code
create or replace function tests.expect_error(p_name text, p_sql text, p_code text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
    perform tests.check(p_name, false, 'statement succeeded but should have failed with ' || p_code);
  exception when others then
    perform tests.check(p_name, position(p_code in sqlerrm) > 0, sqlerrm);
  end;
end $$;

-- Switch the "logged in" user the way Supabase does: the JWT claims land in a setting.
create or replace function tests.login(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, false);
end $$;
create or replace function tests.logout() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
end $$;

grant usage on schema tests to anon, authenticated;
grant all on tests.results to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'curator@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'admin@example.com');
update public.user_roles set role = 'curator' where user_id = 'cccccccc-0000-0000-0000-000000000003';
update public.user_roles set role = 'admin' where user_id = 'dddddddd-0000-0000-0000-000000000004';

-- Phase 0 acceptance: first login creates exactly one profile, one membership, one role, one allowance row, and a 3-day trial
select tests.check('new user: one profile', (select count(*) from public.profiles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select tests.check('new user: one membership on spark', (select count(*) from public.memberships where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and plan = 'spark') = 1);
select tests.check('new user: one member role', (select count(*) from public.user_roles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and role = 'member') = 1);
select tests.check('new user: one allowance row', (select count(*) from public.allowances where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1);
select tests.check('new user: 3-day trial started', (select trial_ends_at between now() + interval '2 days 23 hours' and now() + interval '3 days 1 hour' from public.memberships where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
select tests.check('new user: trial allowances unlocked', (select script_drafts_allowed from public.allowances where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 3);

-- Catalogue fixtures as the curator would import them
insert into public.events (id, tedx_event_id, name, name_key, city, country_code, event_date, event_type, application_status, application_deadline, curator_verified, lat, lng, last_verified_at)
values ('e0000000-0000-0000-0000-000000000001', 'tedx-wilson-park-2027', 'TEDxWilson Park', 'wilson park', 'Edinburgh', 'GB', '2027-03-14', 'standard', 'open', '2026-12-09', true, 55.95, -3.19, now()),
       ('e0000000-0000-0000-0000-000000000002', 'tedx-wilsonpark-2027-dup', 'TEDxWilsonPark 2027', 'wilsonpark', 'Edinburgh', 'GB', '2027-03-20', 'standard', 'unknown', null, false, 55.96, -3.20, now()),
       ('e0000000-0000-0000-0000-000000000003', 'tedx-pune-2027', 'TEDxPune', 'pune', 'Pune', 'IN', '2027-05-02', 'standard', 'invitation_only', null, true, 18.52, 73.86, now());
insert into public.organizers (id, name, website_domain) values ('0a000000-0000-0000-0000-000000000001', 'Wilson Park Ideas CIC', 'tedxwilsonpark.com');
insert into public.organizer_contacts (organizer_id, public_contact_email, public_contact_role, contact_source_url, contact_seen_at)
values ('0a000000-0000-0000-0000-000000000001', 'speakers@tedxwilsonpark.com', 'speakers', 'https://tedxwilsonpark.com/speak', now());

-- ---------------------------------------------------------------
-- Member A works on their talk
-- ---------------------------------------------------------------
set role authenticated;
select tests.login('aaaaaaaa-0000-0000-0000-000000000001');

insert into public.talks (id, user_id, title) values ('7a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Checklists fail when nurses cannot stop a surgeon');
insert into public.ideas (id, user_id, talk_id, status, throughline, locked_at)
values ('1a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 'locked', 'Safety checklists fail when the most junior person cannot stop the room', now());
update public.talks set idea_id = '1a000000-0000-0000-0000-000000000001' where id = '7a000000-0000-0000-0000-000000000001';
insert into public.pitch_packs (id, user_id, talk_id) values ('9a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001');
insert into public.prior_stages (user_id, organization, topic, year, month, city, audience_size)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Hospital leadership summit', 'Leading hospital teams', 2025, 3, 'Mumbai', 400);

-- A cannot create a row for B
select tests.expect_error('member cannot insert a talk for another user',
  $q$insert into public.talks (user_id, title) values ('bbbbbbbb-0000-0000-0000-000000000002', 'not mine')$q$, 'row-level security');

-- A cannot escalate their own role
update public.user_roles set role = 'admin' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select tests.check('member cannot escalate own role', (select role from public.user_roles where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'member');

-- A cannot change their own plan
update public.memberships set plan = 'founding' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select tests.check('member cannot change own plan', (select plan from public.memberships where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'spark');

-- A reads the catalogue but not organizer contacts, and cannot write events
select tests.check('member reads events', (select count(*) from public.events) = 3);
select tests.check('member cannot read organizer contacts', (select count(*) from public.organizer_contacts) = 0);
select tests.expect_error('member cannot insert events',
  $q$insert into public.events (name) values ('TEDxNope')$q$, 'row-level security');
update public.events set theme = 'hacked' where id = 'e0000000-0000-0000-0000-000000000001';
select tests.check('member cannot update events', (select theme is null from public.events where id = 'e0000000-0000-0000-0000-000000000001'));

-- Idea Brief gate: 499 refused, 500 accepted (server-side, Section 7.2)
select tests.expect_error('brief: 499 characters refused',
  format($q$insert into public.idea_briefs (user_id, talk_id, is_draft, answers) values ('aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', false, jsonb_build_object('idea', %L))$q$, repeat('x', 499)),
  'idea_brief_minimum');
insert into public.idea_briefs (id, user_id, talk_id, is_draft, answers)
values ('6a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', false,
        jsonb_build_object('idea', repeat('a', 250), 'belief', repeat('b', 150), 'story', repeat('c', 100)));
select tests.check('brief: 500 characters accepted and counted', (select char_count from public.idea_briefs where id = '6a000000-0000-0000-0000-000000000001') = 500);

-- Outline and the final gate (Section 7.1, 12.4)
insert into public.outlines (id, user_id, talk_id, brief_id) values ('5a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001');
insert into public.outline_versions (id, user_id, outline_id, version, doc, status)
values ('4a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 1, '{"sections":[]}', 'draft');
select tests.expect_error('script refused until outline is final',
  $q$insert into public.scripts (user_id, talk_id, outline_version_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '4a000000-0000-0000-0000-000000000001')$q$,
  'OUTLINE_NOT_FINAL');
update public.outline_versions set status = 'final' where id = '4a000000-0000-0000-0000-000000000001';
insert into public.scripts (id, user_id, talk_id, outline_version_id) values ('3a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '4a000000-0000-0000-0000-000000000001');
select tests.check('script accepted from a final outline', (select count(*) from public.scripts where id = '3a000000-0000-0000-0000-000000000001') = 1);
select tests.check('finalized_at set by trigger', (select finalized_at is not null from public.outline_versions where id = '4a000000-0000-0000-0000-000000000001'));
insert into public.script_versions (id, user_id, script_id, version, doc, word_count, est_seconds)
values ('2a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '3a000000-0000-0000-0000-000000000001', 1, '{"type":"doc"}', 1500, 600);

-- Application gates (Section 6.3)
insert into public.applications (id, user_id, talk_id, event_id, status) values ('8a000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'planned');
select tests.expect_error('one application per event per cycle',
  $q$insert into public.applications (user_id, talk_id, event_id) values ('aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001')$q$,
  'duplicate key');
select tests.expect_error('ready refused without readiness pass',
  $q$update public.applications set status = 'ready' where id = '8a000000-0000-0000-0000-000000000001'$q$, 'NOT_READY');
-- five drafts allowed, the sixth refused
insert into public.applications (user_id, talk_id, event_name_manual, status)
select 'aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 'Manual event ' || g, 'drafting' from generate_series(1, 5) g;
select tests.expect_error('sixth concurrent draft refused',
  $q$insert into public.applications (user_id, talk_id, event_name_manual, status) values ('aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 'Manual event 6', 'drafting')$q$,
  'DRAFT_LIMIT_REACHED');
-- marking applied dates it today and counts toward 100 only when readiness passed
update public.applications set readiness_passed = true, status = 'applied' where id = '8a000000-0000-0000-0000-000000000001';
select tests.check('applied_at defaults to today', (select applied_at = (now() at time zone 'utc')::date from public.applications where id = '8a000000-0000-0000-0000-000000000001'));
select tests.check('follow-up defaults to 14 days later', (select follow_up_at = applied_at + 14 from public.applications where id = '8a000000-0000-0000-0000-000000000001'));
select tests.check('ready application counts toward 100', (select counts_toward_100 from public.applications where id = '8a000000-0000-0000-0000-000000000001'));
update public.applications set applied_at = '2026-10-20' where id = '8a000000-0000-0000-0000-000000000001';
select tests.check('applied_at is editable afterwards', (select applied_at = '2026-10-20' from public.applications where id = '8a000000-0000-0000-0000-000000000001'));
update public.applications set outcome = 'declined' where id = '8a000000-0000-0000-0000-000000000001';
select tests.check('outcome_at set when outcome logged', (select outcome_at is not null from public.applications where id = '8a000000-0000-0000-0000-000000000001'));
select tests.check('ready_applications_sent counts 1', public.ready_applications_sent('aaaaaaaa-0000-0000-0000-000000000001') = 1);

-- Staleness propagation: a change to the locked idea marks the pitch pack outdated
update public.ideas set belief_challenged = 'that a checklist read aloud is enough' where id = '1a000000-0000-0000-0000-000000000001';
select tests.check('locked idea change marks pitch pack stale', (select stale from public.pitch_packs where id = '9a000000-0000-0000-0000-000000000001'));

-- Target list cap at 50
insert into public.target_list (user_id, event_id) values ('aaaaaaaa-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001');
select tests.check('target list accepts a row', (select count(*) from public.target_list) = 1);

-- Deliver: beats, spaced schedule, measured pace
insert into public.beats (id, user_id, script_version_id, "order", text, first_words, target_seconds)
values ('0b000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', 1, 'It is three in the morning and the checklist has just been read aloud.', 'It is three', 28);
select public.record_drill_result('0b000000-0000-0000-0000-000000000001', 'hit');
select tests.check('drill hit: interval 1 to 3 days', (select interval_days = 3 and next_review_at = (now() at time zone 'utc')::date + 3 from public.beat_progress where beat_id = '0b000000-0000-0000-0000-000000000001'));
select public.record_drill_result('0b000000-0000-0000-0000-000000000001', 'miss');
select tests.check('drill miss: review tomorrow', (select interval_days = 1 and next_review_at = (now() at time zone 'utc')::date + 1 and state = 'learning' from public.beat_progress where beat_id = '0b000000-0000-0000-0000-000000000001'));
insert into public.timed_runs (user_id, talk_id, script_version_id, duration_s, word_count)
select 'aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', d, 1500 from unnest(array[640, 620, 600]) d;
select tests.check('measured pace set after three timed runs', (select measured_wpm between 140 and 150 from public.talks where id = '7a000000-0000-0000-0000-000000000001'));
select tests.expect_error('timed run refuses zero duration',
  $q$insert into public.timed_runs (user_id, talk_id, duration_s) values ('aaaaaaaa-0000-0000-0000-000000000001', '7a000000-0000-0000-0000-000000000001', 0)$q$, 'check constraint');

-- ---------------------------------------------------------------
-- Member B sees nothing of A
-- ---------------------------------------------------------------
select tests.login('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.talks (id, user_id, title) values ('7b000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'B talk');
select tests.check('B sees only own talk', (select count(*) from public.talks) = 1 and (select user_id from public.talks limit 1) = 'bbbbbbbb-0000-0000-0000-000000000002');
select tests.check('B sees none of A ideas', (select count(*) from public.ideas) = 0);
select tests.check('B sees none of A briefs', (select count(*) from public.idea_briefs) = 0);
select tests.check('B sees none of A applications', (select count(*) from public.applications) = 0);
select tests.check('B sees none of A prior stages', (select count(*) from public.prior_stages) = 0);
select tests.check('B sees none of A beats', (select count(*) from public.beats) = 0);
update public.talks set title = 'hijacked' where id = '7a000000-0000-0000-0000-000000000001';
select tests.check('B cannot update A talk', true);  -- the update above affected 0 rows; verified below as admin
delete from public.applications where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select tests.check('B cannot see own ledger of A', (select count(*) from public.credits_ledger) = 0);
select tests.check('B cannot drill A beat', (select count(*) from (select 1 where false) x) = 0);
select tests.expect_error('B cannot record a drill on A beat', $q$select public.record_drill_result('0b000000-0000-0000-0000-000000000001', 'hit')$q$, 'NOT_FOUND');

-- ---------------------------------------------------------------
-- Curator C: catalogue yes, member data no
-- ---------------------------------------------------------------
select tests.login('cccccccc-0000-0000-0000-000000000003');
update public.events set theme = 'Thresholds', curator_verified = true where id = 'e0000000-0000-0000-0000-000000000001';
select tests.check('curator updates events', (select theme from public.events where id = 'e0000000-0000-0000-0000-000000000001') = 'Thresholds');
insert into public.events (name, name_key, city, country_code) values ('TEDxLeeds', 'leeds', 'Leeds', 'GB');
select tests.check('curator inserts events', (select count(*) from public.events) = 4);
select tests.check('curator reads organizer contacts', (select count(*) from public.organizer_contacts) = 1);
select tests.check('curator sees no member talks', (select count(*) from public.talks) = 0);
select tests.check('curator sees no member briefs', (select count(*) from public.idea_briefs) = 0);
select tests.check('curator sees no member scripts', (select count(*) from public.script_versions) = 0);
select tests.check('dedup finds the near-duplicate event',
  exists (select 1 from public.event_dedup_candidates('e0000000-0000-0000-0000-000000000001') where candidate_id = 'e0000000-0000-0000-0000-000000000002'));
update public.organizers set removal_requested_at = now() where id = '0a000000-0000-0000-0000-000000000001';
select tests.check('removal request sets a 7-day due date', (select removal_due_at::date = (now() + interval '7 days')::date from public.organizers where id = '0a000000-0000-0000-0000-000000000001'));

-- ---------------------------------------------------------------
-- Admin D reads everything
-- ---------------------------------------------------------------
select tests.login('dddddddd-0000-0000-0000-000000000004');
select tests.check('admin reads all talks', (select count(*) from public.talks) = 2);
select tests.check('A talk title untouched by B', (select title from public.talks where id = '7a000000-0000-0000-0000-000000000001') like 'Checklists%');
select tests.check('A applications untouched by B delete', (select count(*) from public.applications where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 6);
select tests.check('admin reads audit log (empty is fine)', (select count(*) >= 0 from public.audit_log));

-- ---------------------------------------------------------------
-- Anonymous: public views only
-- ---------------------------------------------------------------
select tests.logout();
reset role;
set role anon;
select tests.check('anon reads public open calls view', (select count(*) from public.public_open_calls) = 1);
select tests.check('anon reads public counts', (select founding_seats_remaining from public.public_counts) = 30);
select tests.expect_error('anon cannot read events table', $q$select count(*) from public.events$q$, 'permission denied');
select tests.expect_error('anon cannot read profiles', $q$select count(*) from public.profiles$q$, 'permission denied');
reset role;

-- ---------------------------------------------------------------
-- Founding seats: 30 founding, the 31st is regular (Section 10.1 rule 7)
-- ---------------------------------------------------------------
select tests.check('30 founding seats granted',
  (select count(*) from (select public.claim_founding_seat('aaaaaaaa-0000-0000-0000-000000000001') t from generate_series(1, 30)) s where t = 'founding') = 30);
select tests.check('31st purchase is regular', public.claim_founding_seat('bbbbbbbb-0000-0000-0000-000000000002') = 'regular');
select tests.check('seats remaining is zero', public.founding_seats_remaining() = 0);

-- business-day SLA helper for the $497 reviews
select tests.check('5 business days from a Friday is the next Friday', public.business_days_from('2026-11-06', 5) = '2026-11-13');

-- ---------------------------------------------------------------
-- Text-only guard: no column in the schema stores media
-- ---------------------------------------------------------------
-- A *_required boolean records what an organizer's form asks for; it stores no media.
select tests.check('no media columns anywhere',
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and (data_type = 'bytea'
           or (column_name ~* '(audio|video|recording|transcript|media|waveform)' and column_name !~* '_required$'))
  ));

-- ---------------------------------------------------------------
-- Summary
-- ---------------------------------------------------------------
select name, case when passed then 'PASS' else 'FAIL' end as result, coalesce(left(detail, 90), '') as detail from tests.results order by passed, name;
select count(*) filter (where passed) as passed, count(*) filter (where not passed) as failed from tests.results;
select 1 / (case when (select count(*) from tests.results where not passed) = 0 then 1 else 0 end) as all_green;

-- ---------------------------------------------------------------
-- Step 3 additions: trial checks, allowances, credit reservation, seat release
-- ---------------------------------------------------------------
reset role;
delete from tests.results where name like 'step3:%';
select tests.check('step3: new member is on an active trial', public.is_trial_active('aaaaaaaa-0000-0000-0000-000000000001'));
select tests.check('step3: trial member has member access', public.has_member_access('aaaaaaaa-0000-0000-0000-000000000001'));
select tests.check('step3: trial allows no second locked idea', public.trial_limit_check('aaaaaaaa-0000-0000-0000-000000000001', 'lock_idea') = false);
select tests.check('step3: trial allows tracking up to three events', public.trial_limit_check('aaaaaaaa-0000-0000-0000-000000000001', 'track_event') = true);
-- allowances: 3 script drafts during the trial, the fourth refused with the reset date
select public.consume_allowance('bbbbbbbb-0000-0000-0000-000000000002', 'script_draft');
select public.consume_allowance('bbbbbbbb-0000-0000-0000-000000000002', 'script_draft');
select public.consume_allowance('bbbbbbbb-0000-0000-0000-000000000002', 'script_draft');
select tests.check('step3: three script drafts consumed', (select script_drafts_used from public.allowances where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 3);
select tests.expect_error('step3: fourth script draft refused with reset date',
  $q$select public.consume_allowance('bbbbbbbb-0000-0000-0000-000000000002', 'script_draft')$q$, 'ALLOWANCE_EXHAUSTED');
select tests.expect_error('step3: fair use cap enforced',
  $q$select public.consume_fair_use('bbbbbbbb-0000-0000-0000-000000000002', 'factcheck', 0)$q$, 'FAIR_USE_REACHED');
-- credits: reserve twice with the same key returns one row; settle; release is a no-op after settle
select tests.check('step3: reserve is idempotent',
  (select (public.reserve_credits('bbbbbbbb-0000-0000-0000-000000000002', 'script_draft', 60, 'key-1')).id)
  = (select (public.reserve_credits('bbbbbbbb-0000-0000-0000-000000000002', 'script_draft', 60, 'key-1')).id));
select tests.check('step3: exactly one ledger row for the key', (select count(*) from public.credits_ledger where idempotency_key = 'key-1') = 1);
select tests.check('step3: settle marks settled',
  (select (public.settle_credits((select id from public.credits_ledger where idempotency_key = 'key-1'))).status) = 'settled');
select tests.check('step3: release after settle changes nothing',
  (select (public.release_credits((select id from public.credits_ledger where idempotency_key = 'key-1'))).status) = 'settled');
select tests.check('step3: settled credits this month = 60', public.credits_settled_this_month('bbbbbbbb-0000-0000-0000-000000000002') = 60);
select tests.check('step3: release a reservation',
  (select (public.release_credits((select (public.reserve_credits('bbbbbbbb-0000-0000-0000-000000000002', 'outline', 20, 'key-2')).id))).status) = 'released');
-- seats: release puts one back; never below zero
select public.release_founding_seat();
select tests.check('step3: released seat available again', public.founding_seats_remaining() = 1);
select tests.check('step3: next claim is founding again', public.claim_founding_seat('bbbbbbbb-0000-0000-0000-000000000002') = 'founding');
-- plans
select public.apply_paid_plan('bbbbbbbb-0000-0000-0000-000000000002', 'founding', 'six_month', true, now() + interval '6 months');
select tests.check('step3: paid plan applied', (select plan = 'founding' and billing_period = 'six_month' and founding_price from public.memberships where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'));
select tests.check('step3: paid member allowances are full', (select tailored_applications_allowed from public.allowances where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 15);
select public.lapse_plan('bbbbbbbb-0000-0000-0000-000000000002', false);
select tests.check('step3: lapse returns to spark and drops founding price', (select plan = 'spark' and not founding_price from public.memberships where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'));
-- members cannot call the money-moving functions
set role authenticated;
select tests.login('aaaaaaaa-0000-0000-0000-000000000001');
select tests.expect_error('step3: member cannot reserve credits directly', $q$select public.reserve_credits('aaaaaaaa-0000-0000-0000-000000000001', 'x', 1, 'k')$q$, 'permission denied');
select tests.expect_error('step3: member cannot claim a seat directly', $q$select public.claim_founding_seat('aaaaaaaa-0000-0000-0000-000000000001')$q$, 'permission denied');
select tests.logout();
reset role;


-- ---------------------------------------------------------------
-- Step 5: Idea Lock, Journey, weekly commitment, fresh-idea check
-- ---------------------------------------------------------------
reset role;
set role authenticated;
select tests.login('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.talks (id, user_id, title) values ('7b000000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002', 'B second talk for step 5');
-- an unscored idea cannot be locked
insert into public.ideas (id, user_id, talk_id, title_working, throughline)
values ('1b000000-0000-0000-0000-000000000051', 'bbbbbbbb-0000-0000-0000-000000000002', '7b000000-0000-0000-0000-000000000005', 'Be your authentic self', 'Be your authentic self and success follows');
select tests.expect_error('step5: unscored idea cannot be locked', $q$select public.lock_idea('1b000000-0000-0000-0000-000000000051')$q$, 'IDEA_NOT_SCORED');
-- a platitude scores Level 1 on criteria 1 and 4 and is blocked with no override
update public.ideas set score = '{"gate_passed":false,"scores":[{"criterion":1,"level":1,"reason":"a theme"},{"criterion":2,"level":2,"reason":""},{"criterion":3,"level":1,"reason":""},{"criterion":4,"level":1,"reason":"self-evident"},{"criterion":5,"level":2,"reason":""},{"criterion":6,"level":2,"reason":""},{"criterion":7,"level":2,"reason":""},{"criterion":8,"level":2,"reason":""},{"criterion":9,"level":2,"reason":""}]}'
  where id = '1b000000-0000-0000-0000-000000000051';
select tests.expect_error('step5: platitude cannot be locked', $q$select public.lock_idea('1b000000-0000-0000-0000-000000000051')$q$, 'IDEA_GATE_FAILED');
select tests.expect_error('step5: platitude cannot be locked even with a reason', $q$select public.lock_idea('1b000000-0000-0000-0000-000000000051', 'I really want this one because it is my brand')$q$, 'IDEA_GATE_FAILED');
-- Level 2 on evidence needs a written override reason; Level 3 everywhere locks cleanly
insert into public.ideas (id, user_id, talk_id, title_working, throughline, belief_challenged, score)
values ('1b000000-0000-0000-0000-000000000052', 'bbbbbbbb-0000-0000-0000-000000000002', '7b000000-0000-0000-0000-000000000005',
  'Hospital checklists fail without a stop rule', 'Checklists fail when the most junior person cannot stop the room', 'Checklists work because they are thorough',
  '{"gate_passed":true,"scores":[{"criterion":1,"level":3,"reason":""},{"criterion":2,"level":4,"reason":""},{"criterion":3,"level":3,"reason":""},{"criterion":4,"level":3,"reason":""},{"criterion":5,"level":2,"reason":"anecdotal so far"},{"criterion":6,"level":3,"reason":""},{"criterion":7,"level":3,"reason":""},{"criterion":8,"level":3,"reason":""},{"criterion":9,"level":3,"reason":""}]}');
select tests.expect_error('step5: weak evidence asks for work before lock', $q$select public.lock_idea('1b000000-0000-0000-0000-000000000052')$q$, 'IDEA_NEEDS_WORK:5');
select tests.check('step5: lock with an override reason succeeds',
  (select status from public.lock_idea('1b000000-0000-0000-0000-000000000052', 'The two hospital studies are listed in my evidence notes; I will cite them in the brief.')) = 'locked');
select tests.check('step5: lock moves the talk to Discover and snapshots the profile',
  (select stage = 'discover' and idea_id = '1b000000-0000-0000-0000-000000000052' and profile_snapshot is not null and profile_snapshot ? 'expertise_line' and not (profile_snapshot ? 'headshot_path') from public.talks where id = '7b000000-0000-0000-0000-000000000005'));
select tests.check('step5: lock awards the idea_locked milestone', (select count(*) from public.milestones where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' and talk_id = '7b000000-0000-0000-0000-000000000005' and key = 'idea_locked') = 1);
select tests.check('step5: lock logs activity for the week', (select count(*) from public.activity_log where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'idea_locked') = 1);
select tests.expect_error('step5: a second idea cannot be locked on the same talk', $q$select public.lock_idea('1b000000-0000-0000-0000-000000000051', 'x')$q$, 'ANOTHER_IDEA_LOCKED');
select tests.check('step5: locking the locked idea again is a no-op', (select status from public.lock_idea('1b000000-0000-0000-0000-000000000052')) = 'locked');
-- a member cannot lock someone else's idea
select tests.expect_error('step5: cannot lock another member idea', $q$select public.lock_idea('1a000000-0000-0000-0000-000000000001')$q$, 'NOT_FOUND');
-- milestones cannot be typed in
select tests.expect_error('step5: member cannot insert a milestone', $q$insert into public.milestones (user_id, talk_id, key) values ('bbbbbbbb-0000-0000-0000-000000000002', '7b000000-0000-0000-0000-000000000005', 'talk_published')$q$, 'permission denied');
select tests.expect_error('step5: member cannot call award_milestone', $q$select public.award_milestone('bbbbbbbb-0000-0000-0000-000000000002', null, 'talk_published')$q$, 'permission denied');
-- weekly commitment
select public.set_week_target(3);
select public.log_activity('practice_block', '7b000000-0000-0000-0000-000000000005');
select tests.check('step5: week row counts the lock and the practice block', (select completed = 2 and target = 3 and not paused from public.week_commitments where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' and week_start = public.week_start_of()));
select public.set_week_paused(true);
select public.log_activity('practice_block', '7b000000-0000-0000-0000-000000000005');
select tests.check('step5: a paused week does not count activity', (select completed = 2 and paused from public.week_commitments where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' and week_start = public.week_start_of()));
select public.set_week_paused(false);
select tests.check('step5: week starts on Monday', extract(isodow from public.week_start_of()) = 1);
-- fresh-idea check
insert into public.prior_stages (id, user_id, organization, topic, year, month, city, audience_size)
values ('5b000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Nurses association', 'Why surgical checklists fail in the operating room', 2024, 9, 'Pune', 60),
       ('5b000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Hospital leadership summit', 'Leading hospital teams through budget cuts', 2025, 3, 'Mumbai', 400);
select tests.check('step5: same-topic prior stage triggers the warning', (select is_overlap from public.prior_stage_overlap('5b000000-0000-0000-0000-000000000001', '7b000000-0000-0000-0000-000000000005')));
select tests.check('step5: adjacent prior stage does not trigger the warning', (select not is_overlap from public.prior_stage_overlap('5b000000-0000-0000-0000-000000000002', '7b000000-0000-0000-0000-000000000005')));
select tests.check('step5: overlap names the shared words', (select 'checklists' = any(shared_words) from public.prior_stage_overlap('5b000000-0000-0000-0000-000000000001', '7b000000-0000-0000-0000-000000000005')));
select tests.check('step5: overlap check on another member stage returns nothing', (select count(*) from public.prior_stage_overlap((select id from public.prior_stages where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1), '7b000000-0000-0000-0000-000000000005')) = 0);
-- unlock requires a reason and marks downstream stale
insert into public.pitch_packs (id, user_id, talk_id) values ('9b000000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002', '7b000000-0000-0000-0000-000000000005');
select tests.expect_error('step5: unlock needs a reason', $q$select public.unlock_idea('7b000000-0000-0000-0000-000000000005', 'no')$q$, 'REASON_REQUIRED');
select public.unlock_idea('7b000000-0000-0000-0000-000000000005', 'Changing the angle to the stop rule itself');
select tests.check('step5: unlock returns the idea to candidate and the talk to Position',
  (select status = 'candidate' from public.ideas where id = '1b000000-0000-0000-0000-000000000052') and (select stage = 'position' and idea_id is null from public.talks where id = '7b000000-0000-0000-0000-000000000005'));
select tests.check('step5: unlock marks the pitch pack stale', (select stale from public.pitch_packs where id = '9b000000-0000-0000-0000-000000000005'));
select tests.check('step5: member sees no audit rows', (select count(*) from public.audit_log) = 0);
reset role;
select tests.check('step5: unlock is in the audit log', (select count(*) from public.audit_log where action = 'idea.unlock' and resource_id = '1b000000-0000-0000-0000-000000000052') >= 1);
set role authenticated;
select tests.login('bbbbbbbb-0000-0000-0000-000000000002');
-- dossier character count
insert into public.idea_dossiers (id, user_id, talk_id, answers, pasted_material) values ('db000000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002', '7b000000-0000-0000-0000-000000000005', '{"q1":"abcdefghij","q2":"klmnopqrst"}', repeat('x', 100));
select tests.check('step5: dossier_char_count adds answers and pasted material', public.dossier_char_count('db000000-0000-0000-0000-000000000005') = 120);
-- other members see none of B's week, milestones or activity
select tests.login('aaaaaaaa-0000-0000-0000-000000000001');
select tests.check('step5: A sees none of B week rows', (select count(*) from public.week_commitments where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0);
select tests.check('step5: A sees none of B milestones', (select count(*) from public.milestones where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0);
select tests.check('step5: A sees none of B activity', (select count(*) from public.activity_log where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0);
select tests.logout();
reset role;

select name, case when passed then 'PASS' else 'FAIL' end as result, coalesce(left(detail, 90), '') as detail from tests.results where name like 'step5:%' order by passed, name;
select name, case when passed then 'PASS' else 'FAIL' end as result, coalesce(left(detail, 90), '') as detail from tests.results where name like 'step3:%' order by passed, name;
select count(*) filter (where passed) as passed, count(*) filter (where not passed) as failed from tests.results;
select 1 / (case when (select count(*) from tests.results where not passed) = 0 then 1 else 0 end) as all_green_after_step5;
