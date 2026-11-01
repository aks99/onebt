-- One Big Talk: foundation migration 3 of 7
-- The Talk Record spine, Idea Lab, Prior Stages, the event catalogue (crawler and Google Sheet fed),
-- the Application Pipeline and Pitch Studio. Blueprint v1.5 Sections 5.1, 6.1 to 6.5, 12.3, 12.5.
-- "Record" means a database record the member types into. Nothing here is recorded.

-- ---------------------------------------------------------------
-- The spine
-- ---------------------------------------------------------------
create table public.talks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  path public.talk_path not null default 'apply',
  stage public.talk_stage not null default 'position',
  idea_id uuid,                                   -- fk added below
  slot_minutes integer not null default 10 check (slot_minutes between 3 and 18),
  target_wpm integer not null default 150 check (target_wpm between 110 and 190),
  measured_wpm integer check (measured_wpm between 60 and 260),   -- from timed runs (F2.17)
  event_id uuid,                                  -- once accepted; fk added below
  event_date date,
  publication public.publication_state not null default 'not_delivered',
  published_url text,
  published_at timestamptz,
  profile_snapshot jsonb,                         -- frozen at Idea Lock
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index talks_user_idx on public.talks(user_id);
create trigger talks_touch before update on public.talks for each row execute function public.touch_updated_at();

alter table public.credits_ledger add constraint credits_ledger_talk_fk foreign key (talk_id) references public.talks(id) on delete set null;
alter table public.llm_calls add constraint llm_calls_talk_fk foreign key (talk_id) references public.talks(id) on delete set null;

-- ---------------------------------------------------------------
-- Idea Lab (6.1)
-- ---------------------------------------------------------------
create table public.idea_dossiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid references public.talks(id) on delete cascade,
  answers jsonb not null default '{}',            -- eight typed prompts, each >= 120 chars (checked in API and here)
  pasted_material text,                           -- bio, book summary, LinkedIn About
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idea_dossiers_user_idx on public.idea_dossiers(user_id);
create trigger idea_dossiers_touch before update on public.idea_dossiers for each row execute function public.touch_updated_at();

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  dossier_id uuid references public.idea_dossiers(id) on delete set null,
  batch_id uuid,                                  -- the generation batch this idea came from
  status public.idea_status not null default 'candidate',
  title_working text,
  throughline text check (throughline is null or array_length(regexp_split_to_array(trim(throughline), '\s+'), 1) <= 15),
  belief_challenged text,
  antagonist text,
  evidence_notes text,
  audience_action text,
  why_this_speaker text,
  talk_type text,
  risk_notes text,
  score jsonb,                                    -- {"scores":[{"criterion":1,"level":3,"reason":"..."}],"gate_passed":true,...}
  similar_talks jsonb,                            -- "Has it been done?" results
  source public.version_source not null default 'llm',
  locked_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ideas_talk_idx on public.ideas(talk_id);
create index ideas_user_idx on public.ideas(user_id);
create unique index ideas_one_locked_per_talk on public.ideas(talk_id) where status = 'locked';
create trigger ideas_touch before update on public.ideas for each row execute function public.touch_updated_at();

alter table public.talks add constraint talks_idea_fk foreign key (idea_id) references public.ideas(id) on delete set null;

create table public.idea_expansions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  thesis text,
  why_it_matters text,
  key_points jsonb not null default '[]',
  story_candidates jsonb not null default '[]',   -- [{moment, sensory_detail, change}]
  evidence_to_find jsonb not null default '[]',
  contrast jsonb,                                 -- what is / what could be
  source public.version_source not null default 'llm',
  created_at timestamptz not null default now()
);
create index idea_expansions_idea_idx on public.idea_expansions(idea_id);

-- Curator-maintained title index for "Has it been done?" (F1.1.4, manual list in the first release)
create table public.known_talk_titles (
  id bigint generated always as identity primary key,
  title text not null,
  speaker text,
  event_name text,
  year integer,
  url text,                                        -- link only, never re-hosted
  topic_tags text[] not null default '{}',
  title_embedding vector(1024),
  added_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index known_talk_titles_trgm on public.known_talk_titles using gin (title gin_trgm_ops);

-- Writing samples for the "sounds like me" pass (7.1); typed or pasted, never recorded
create table public.writing_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 200 and 20000),
  source text not null default 'pasted',
  created_at timestamptz not null default now()
);
create index writing_samples_user_idx on public.writing_samples(user_id);

-- ---------------------------------------------------------------
-- Prior Stages (6.5): optional, described, never uploaded
-- ---------------------------------------------------------------
create table public.prior_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month integer check (month between 1 and 12),
  year integer check (year between 1950 and 2100),
  city text,
  country_code char(2),
  organization text not null,
  audience_size integer check (audience_size >= 0),
  topic text not null,                            -- one line; the fresh-idea check compares it to the locked idea
  result_line text,
  link text,                                      -- optional public link; never a file
  topic_embedding vector(1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prior_stages_user_idx on public.prior_stages(user_id);
create trigger prior_stages_touch before update on public.prior_stages for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Event catalogue (6.2, 12.5). Facts only: never TED's descriptions, images or logos.
-- ---------------------------------------------------------------
create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,                        -- organizer_id from the crawler (domain or name_key+country)
  name text not null,
  name_key text,
  website_domain text,
  website_url text,
  city text,
  country_code char(2),
  instagram text, linkedin_page text, facebook_page text, x_handle text, youtube_channel text,
  licensee_name text,                              -- only if stated publicly with a role
  confidence numeric(3,2) check (confidence between 0 and 1),
  needs_review boolean not null default false,
  removal_requested_at timestamptz,
  removal_due_at timestamptz,                      -- set by trigger: removal_requested_at + 7 days
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizers_domain_idx on public.organizers(website_domain);
create trigger organizers_touch before update on public.organizers for each row execute function public.touch_updated_at();
create or replace function public.organizers_removal_due() returns trigger
language plpgsql as $$
begin
  new.removal_due_at := case when new.removal_requested_at is null then null else new.removal_requested_at + interval '7 days' end;
  return new;
end $$;
create trigger organizers_removal_due before insert or update of removal_requested_at on public.organizers for each row execute function public.organizers_removal_due();

-- Contact details are personal data. Stored only when publicly posted, with source and date.
-- Members never see this table; they see "contact via the organizer's published channel".
create table public.organizer_contacts (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(id) on delete cascade,
  public_contact_email citext,
  public_contact_role text,                        -- speakers, info, press, general
  public_contact_name text,                        -- only when posted with a role
  contact_form_url text,
  contact_source_url text not null,
  contact_seen_at timestamptz not null,
  lawful_basis_note text not null default 'publicly posted for contact',
  created_at timestamptz not null default now()
);
create index organizer_contacts_org_idx on public.organizer_contacts(organizer_id);

create table public.import_sources (
  id uuid primary key default gen_random_uuid(),
  kind public.import_kind not null,
  label text not null,
  google_sheet_id text,
  events_tab text default 'events',
  organizers_tab text default 'organizers',
  calls_tab text default 'application_calls',
  schedule_cron text default '0 6 * * 1',          -- weekly, Monday 06:00 UTC
  service_account_email text,
  enabled boolean not null default true,
  last_synced_at timestamptz,
  last_status text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.crawler_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.import_sources(id) on delete set null,
  kind public.import_kind not null,
  run_label text,                                  -- e.g. the crawler's dated folder
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_total integer not null default 0,
  rows_new integer not null default 0,
  rows_changed integer not null default 0,
  rows_unchanged integer not null default 0,
  rows_expired integer not null default 0,
  rows_error integer not null default 0,
  report jsonb not null default '{}',
  triggered_by uuid references auth.users(id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  tedx_event_id text unique,                       -- from the TED event URL (primary key in the crawler)
  name text not null,
  name_key text,                                   -- normalized: strip TEDx, year, punctuation
  event_url text,
  organizer_id uuid references public.organizers(id) on delete set null,
  organizer_website_url text,
  event_type public.event_type not null default 'other',
  status_label text,                               -- the directory's own label (Spaces available, Sold out...). Tickets, never a speaker vacancy.
  event_date date,
  end_date date,
  raw_date text,
  timezone text,
  city text,
  region text,
  country_code char(2),
  venue text,
  lat double precision,
  lng double precision,
  theme text,                                      -- name only, in the curator's or organizer's words
  theme_history jsonb not null default '[]',
  attendee_tier text,
  application_status public.call_status not null default 'unknown',
  call_opens_on date,
  application_deadline date,
  deadline_time time,
  deadline_timezone text,
  deadline_timezone_status public.tz_status not null default 'unknown',
  deadline_raw text,
  status_evidence text check (status_evidence is null or char_length(status_evidence) <= 200),
  status_source_url text,
  status_seen_at timestamptz,
  form_url text,
  form_type text,
  form_fields jsonb not null default '[]',         -- [{key,label,limit_type,limit,required}]
  pitch_video_required boolean,
  local_connection_required boolean,
  talk_length_target text,
  criteria_snippet text check (criteria_snippet is null or char_length(criteria_snippet) <= 200),
  ai_policy public.ai_policy not null default 'unknown',
  ai_policy_snippet text check (ai_policy_snippet is null or char_length(ai_policy_snippet) <= 200),
  ai_policy_source_url text,
  past_speakers_url text,
  social_links jsonb not null default '{}',
  theme_embedding vector(1024),
  source public.record_source not null default 'crawler',
  crawler_run_id uuid references public.crawler_runs(id) on delete set null,
  confidence numeric(3,2) check (confidence between 0 and 1),
  needs_review boolean not null default false,
  curator_verified boolean not null default false,
  verified_by uuid references auth.users(id),
  last_verified_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expired boolean not null default false,
  expired_at timestamptz,
  source_urls jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_date_idx on public.events(event_date);
create index events_country_idx on public.events(country_code, city);
create index events_status_idx on public.events(application_status, application_deadline);
create index events_name_trgm on public.events using gin (name_key gin_trgm_ops);
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();

alter table public.talks add constraint talks_event_fk foreign key (event_id) references public.events(id) on delete set null;

-- Per-edition call records straight from the crawler's application_calls.csv (C.3)
create table public.application_calls (
  id uuid primary key default gen_random_uuid(),
  call_id text unique,                             -- tedx_event_id + edition_year
  event_id uuid not null references public.events(id) on delete cascade,
  edition_year integer,
  call_status public.call_status not null default 'unknown',
  call_opens_on date,
  status_evidence text check (status_evidence is null or char_length(status_evidence) <= 200),
  status_source_url text,
  status_seen_at timestamptz,
  application_form_url text,
  form_type text,
  deadline date,
  deadline_timezone text,
  deadline_raw text,
  criteria_snippet text check (criteria_snippet is null or char_length(criteria_snippet) <= 200),
  slot_lengths text,
  video_required boolean,
  requirements_notes text,
  past_speakers_url text,
  ai_policy public.ai_policy not null default 'unknown',
  ai_policy_snippet text check (ai_policy_snippet is null or char_length(ai_policy_snippet) <= 200),
  ai_policy_source_url text,
  confidence numeric(3,2),
  needs_review boolean not null default false,
  crawler_run_id uuid references public.crawler_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index application_calls_event_idx on public.application_calls(event_id);
create trigger application_calls_touch before update on public.application_calls for each row execute function public.touch_updated_at();

-- Every stored fact carries its source (sources.jsonl)
create table public.event_sources (
  id bigint generated always as identity primary key,
  record_type text not null check (record_type in ('event', 'organizer', 'call')),
  record_id text not null,
  field text not null,
  value text,
  source_url text not null,
  seen_at timestamptz not null,
  method text,                                     -- directory | event_page | organizer_site | social | web_search | google_sheet
  query text,
  crawler_run_id uuid references public.crawler_runs(id) on delete set null
);
create index event_sources_record_idx on public.event_sources(record_type, record_id);

create table public.event_topics (
  event_id uuid not null references public.events(id) on delete cascade,
  tag text not null,
  suggested_by text not null default 'haiku',      -- haiku | curator
  accepted boolean not null default false,
  primary key (event_id, tag)
);

create table public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  kind public.report_kind not null,
  url text,
  note text,
  status text not null default 'open',             -- open | resolved | dismissed
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.organizer_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  claimant_email citext not null,
  status text not null default 'pending',          -- pending | verified | rejected
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Watch alerts (F1.2.12) and the Target List (F1.2.5)
create table public.event_watches (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table public.target_list (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  talk_id uuid references public.talks(id) on delete cascade,
  priority integer not null default 2 check (priority between 1 and 3),
  note text,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

-- Members may save at most 50 targets (F1.2.5)
create or replace function public.enforce_target_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.target_list where user_id = new.user_id) >= 50 then
    raise exception 'TARGET_LIMIT_REACHED: you can keep up to 50 target events. Remove one to add another.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger target_list_limit before insert on public.target_list for each row execute function public.enforce_target_limit();

-- ---------------------------------------------------------------
-- Pitch Studio (6.4)
-- ---------------------------------------------------------------
create table public.pitch_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  version integer not null default 1,
  fields jsonb not null default '{}',              -- titles[], one_sentence, idea_statement, why_now, why_you, accomplishment, bio_150, bio_250, youtube_bio, pitch_video_script_90s, links, needs_source[]
  field_sources jsonb not null default '{}',       -- per field: 'llm' | 'user'
  stale boolean not null default false,            -- staleness propagation (7.5, v1.4)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (talk_id, version)
);
create index pitch_packs_user_idx on public.pitch_packs(user_id);
create trigger pitch_packs_touch before update on public.pitch_packs for each row execute function public.touch_updated_at();

create table public.pitch_variants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pitch_pack_id uuid not null references public.pitch_packs(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  fields jsonb not null default '{}',
  what_changed jsonb not null default '[]',
  cautions jsonb not null default '[]',
  theme_phrases_used jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index pitch_variants_user_idx on public.pitch_variants(user_id);

-- ---------------------------------------------------------------
-- Application Pipeline (6.3). One application per member per event per cycle.
-- ---------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,   -- null for a manually logged event
  event_name_manual text,                          -- when the event is not in the catalogue
  cycle_year integer not null default extract(year from now())::int,
  status public.pipeline_status not null default 'planned',
  pitch_variant_id uuid references public.pitch_variants(id) on delete set null,
  answers jsonb not null default '{}',             -- per organizer field
  answer_sources jsonb not null default '{}',      -- per field: user | llm
  research_answers jsonb,                          -- the three Researching questions
  readiness jsonb,                                 -- rubric result
  readiness_passed boolean not null default false,
  applied_at date,                                 -- defaults to today when marked applied; editable (v1.5)
  follow_up_at date,
  follow_up_sent_at timestamptz,
  next_action_at date,
  outcome public.application_outcome,
  outcome_at date,
  outcome_reason text,
  event_date date,
  organizer_contacts jsonb not null default '[]',  -- user-entered
  notes text,
  rejection_reason text,
  reapply_at date,
  counts_toward_100 boolean not null default false,
  authorship jsonb not null default '{}',          -- {typed_chars, ai_kept_chars, by_field:{...}}
  stale boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (event_id is not null or event_name_manual is not null)
);
create unique index applications_one_per_cycle on public.applications(user_id, event_id, cycle_year) where event_id is not null;
create index applications_user_idx on public.applications(user_id, status);
create index applications_talk_idx on public.applications(talk_id);
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

-- Quality gates (6.3, binding):
--  * at most five applications in Drafting or Ready at once
--  * personalization only after the Researching step (enforced in the API; the research_answers column is the evidence)
--  * marking Applied sets applied_at to today when not given, and a 14-day follow-up
--  * counts_toward_100 only when readiness passed before Applied
create or replace function public.applications_gates() returns trigger
language plpgsql as $$
declare
  active_drafts integer;
begin
  if new.status in ('drafting', 'ready') and (tg_op = 'INSERT' or old.status not in ('drafting', 'ready')) then
    select count(*) into active_drafts from public.applications
      where user_id = new.user_id and status in ('drafting', 'ready') and id <> new.id;
    if active_drafts >= 5 then
      raise exception 'DRAFT_LIMIT_REACHED: finish or park one of your 5 drafts first.' using errcode = 'check_violation';
    end if;
  end if;

  if new.status = 'ready' and not new.readiness_passed then
    raise exception 'NOT_READY: this application has not passed the readiness check yet.' using errcode = 'check_violation';
  end if;

  if new.status = 'applied' and (tg_op = 'INSERT' or old.status <> 'applied') then
    new.applied_at := coalesce(new.applied_at, (now() at time zone 'utc')::date);
    new.follow_up_at := coalesce(new.follow_up_at, new.applied_at + 14);
    new.counts_toward_100 := new.readiness_passed and new.event_id is not null;
  end if;

  if new.outcome is not null and new.outcome_at is null then
    new.outcome_at := (now() at time zone 'utc')::date;
  end if;
  return new;
end $$;
create trigger applications_gates before insert or update on public.applications for each row execute function public.applications_gates();

-- The 100-applications counter (F1.3.13, 10.5)
create or replace function public.ready_applications_sent(p_user uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.applications
  where user_id = p_user and counts_toward_100 and status in ('applied', 'follow_up_due', 'interview', 'accepted', 'declined', 'reapply')
$$;

-- Dedup candidates for the Curator Console (12.5): similar normalized name, same city, dates within 60 days, within 25 km
create or replace function public.event_dedup_candidates(p_event uuid)
returns table (candidate_id uuid, similarity real, km double precision, days_apart integer)
language sql stable security definer set search_path = public as $$
  select e2.id,
         similarity(e1.name_key, e2.name_key) as similarity,
         public.distance_km(e1.lat, e1.lng, e2.lat, e2.lng) as km,
         abs(e1.event_date - e2.event_date) as days_apart
  from public.events e1
  join public.events e2 on e2.id <> e1.id
  where e1.id = p_event
    and similarity(e1.name_key, e2.name_key) > 0.6
    and (e1.city = e2.city or coalesce(public.distance_km(e1.lat, e1.lng, e2.lat, e2.lng), 0) < 25)
    and (e1.event_date is null or e2.event_date is null or abs(e1.event_date - e2.event_date) <= 60)
  order by similarity desc
$$;
