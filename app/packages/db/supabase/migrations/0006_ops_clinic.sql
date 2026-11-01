-- One Big Talk: foundation migration 6 of 7
-- Clinic (deferred, schema kept), add-on reviews, prompt versions, feature flags, eval runs,
-- the anonymized cohort view and the public views the marketing pages read.
-- Blueprint v1.5 Sections 9.3, 9.5, 12.3, 13.15. No community tables exist by owner decision.

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('application_clinic', 'stage_ready')),
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  join_url text,
  replay_url text,
  replay_expires_at timestamptz,
  host_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.clinic_attendance (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_live boolean not null default false,
  watched_replay_at timestamptz,
  primary key (clinic_id, user_id)
);
create table public.clinic_questions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  anonymized_application_id uuid references public.applications(id) on delete set null,
  created_at timestamptz not null default now()
);

-- The two $497 add-ons. 5-business-day SLA for both.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid not null references public.addon_purchases(id) on delete restrict,
  kind public.review_kind not null,
  application_id uuid references public.applications(id) on delete set null,
  script_version_id uuid references public.script_versions(id) on delete set null,
  status public.review_status not null default 'purchased',
  reviewer_id uuid references auth.users(id),
  due_at date not null,
  returned_at timestamptz,
  rubric jsonb,
  notes jsonb,                                     -- tracked-change edits (max three), organizer-eyes paragraph, one next step
  created_at timestamptz not null default now()
);
create index reviews_user_idx on public.reviews(user_id);

create or replace function public.business_days_from(d date, n integer) returns date
language plpgsql immutable as $$
declare cur date := d; added integer := 0;
begin
  while added < n loop
    cur := cur + 1;
    if extract(isodow from cur) < 6 then added := added + 1; end if;
  end loop;
  return cur;
end $$;

-- Prompt library versions (13); the files live in packages/prompts, this table records what is active.
create table public.prompt_versions (
  action_key text not null,                        -- idea_generator, idea_scorecard, linter, ...
  version text not null,                           -- 'v1'
  model text not null,
  file_path text not null,
  schema_path text,
  credits integer not null default 0,
  active boolean not null default false,
  eval_pass_rate numeric(5,2),
  activated_at timestamptz,
  activated_by uuid references auth.users(id),
  primary key (action_key, version)
);
create unique index prompt_versions_one_active on public.prompt_versions(action_key) where active;

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  plans public.plan_kind[] not null default '{}',  -- empty = all plans when enabled
  note text,
  updated_at timestamptz not null default now()
);
-- Deferred features ship dark (owner decision 1 Nov 2026)
insert into public.feature_flags (key, enabled, note) values
  ('sms_notifications', false, 'P9 SMS deferred'),
  ('organizer_ai_policy_gate', false, 'F1.2.13 deferred; field imported, gate off'),
  ('prompter', false, 'F3.8 deferred'),
  ('run_log', false, 'F3.9 deferred'),
  ('rehearsal_plan', false, 'F3.10 deferred'),
  ('live_audience_log', false, 'F3.11 deferred'),
  ('blank_recovery_drill', false, 'F3.12 deferred'),
  ('nerves_kit', false, 'F3.13 deferred'),
  ('audition_qa', false, 'F3.14 deferred'),
  ('readiness_checklist', false, 'F3.16 deferred'),
  ('event_day_kit', false, 'F3.18 deferred'),
  ('clinic', false, 'C1 and C2 deferred; no public copy mentions a clinic'),
  ('coach_idea_review', false, 'F1.1.10 deferred'),
  ('curated_shortlist', false, 'F1.2.8 deferred'),
  ('paid_stage_pipeline', false, 'F4.10 deferred'),
  ('event_status_pages', false, 'F1.2.15 V2'),
  ('event_intel', false, 'F1.2.7 V2'),
  ('organizer_claims', false, 'F1.2.10 V2'),
  ('cohort_stats', false, 'F1.3.10 V2'),
  ('interview_prep', false, 'F1.3.8 V2'),
  ('story_extraction', false, 'F2.6 V2'),
  ('slides_checklist', false, 'F2.13 V2'),
  ('title_workshop', false, 'F2.14 V2'),
  ('redaction_tool', false, 'F2.16 V2'),
  ('clip_plan', false, 'F4.5 V2'),
  ('quote_cards', false, 'F4.6 V2'),
  ('press_kit', false, 'F4.7 V2'),
  ('talk_stats', false, 'F4.8 V2'),
  ('article_pitches', false, 'F4.9 V2'),
  ('outcome_capture', false, 'F4.13 V2');

create table public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  action_key text not null,
  prompt_version text not null,
  suite text not null,
  passed integer not null,
  failed integer not null,
  report_path text,
  git_sha text,
  ran_at timestamptz not null default now()
);

-- Anonymized cohort funnel (F1.3.10, V2). Excludes cohorts under 20 members at query time.
create materialized view public.cohort_stats as
select date_trunc('month', a.created_at)::date as cohort_month,
       count(distinct a.user_id) as members,
       count(*) filter (where a.status in ('applied','follow_up_due','interview','accepted','declined','reapply')) as applications_sent,
       count(*) filter (where a.status in ('interview','accepted')) as interviews,
       count(*) filter (where a.outcome = 'accepted') as acceptances
from public.applications a
group by 1
having count(distinct a.user_id) >= 20;

-- Public, column-limited views for the marketing pages (anon can read these, never the tables)
create view public.public_open_calls as
select e.id, e.name, e.city, e.country_code, e.theme, e.event_date, e.application_status, e.last_verified_at
from public.events e
where e.curator_verified and not e.expired and e.application_status = 'open'
  and (e.application_deadline is null or e.application_deadline >= (now() at time zone 'utc')::date);

create view public.public_counts as
select (select count(*) from public.events e where e.curator_verified and not e.expired and e.application_status = 'open') as open_calls,
       (select public.founding_seats_remaining()) as founding_seats_remaining;
