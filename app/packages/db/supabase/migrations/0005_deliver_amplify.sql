-- One Big Talk: foundation migration 5 of 7
-- DELIVER (text only: beats, drills, spaced schedule, timed runs; deferred run log and plans still get
-- their tables) and AMPLIFY (publication, launch plans, deferred kits). Blueprint v1.5 Sections 8, 9.
-- There is no table for audio, video, transcripts or recordings, and there never will be.

create table public.beats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script_version_id uuid not null references public.script_versions(id) on delete cascade,
  "order" integer not null,
  section_id text,
  text text not null,
  first_words text not null,                       -- first three words, shown in Newsreader
  purpose text,
  target_seconds integer not null default 0,
  stage_note text,                                 -- stage position or gesture, typed by the member
  unique (script_version_id, "order")
);
create index beats_version_idx on public.beats(script_version_id);

create table public.beat_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  beat_id uuid not null references public.beats(id) on delete cascade,
  state public.beat_state not null default 'new',
  interval_days integer not null default 1,        -- expanding: 1, 3, 7, 14; a miss resets to 1
  next_review_at date not null default (now() at time zone 'utc')::date,
  hits integer not null default 0,
  misses integer not null default 0,
  last_reviewed_at timestamptz,
  primary key (user_id, beat_id)
);

-- Spaced schedule (F3.6, 12.6): called by the drill screens with 'hit' or 'miss'
create or replace function public.record_drill_result(p_beat uuid, p_result text)
returns public.beat_progress language plpgsql security definer set search_path = public as $$
declare bp public.beat_progress%rowtype; next_int integer;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.beats b where b.id = p_beat and b.user_id = auth.uid()) then
    raise exception 'NOT_FOUND' using errcode = 'no_data_found';
  end if;
  insert into public.beat_progress (user_id, beat_id) values (auth.uid(), p_beat) on conflict do nothing;
  select * into bp from public.beat_progress where user_id = auth.uid() and beat_id = p_beat for update;
  if p_result = 'hit' then
    next_int := case bp.interval_days when 1 then 3 when 3 then 7 when 7 then 14 else 14 end;
    update public.beat_progress set
      hits = hits + 1,
      interval_days = next_int,
      next_review_at = (now() at time zone 'utc')::date + next_int,
      state = (case when next_int >= 14 then 'cold' when next_int >= 7 then 'known' else 'learning' end)::public.beat_state,
      last_reviewed_at = now()
    where user_id = auth.uid() and beat_id = p_beat returning * into bp;
  elsif p_result = 'miss' then
    update public.beat_progress set
      misses = misses + 1,
      interval_days = 1,
      next_review_at = (now() at time zone 'utc')::date + 1,
      state = 'learning',
      last_reviewed_at = now()
    where user_id = auth.uid() and beat_id = p_beat returning * into bp;
  else
    raise exception 'BAD_RESULT: expected hit or miss' using errcode = 'invalid_parameter_value';
  end if;
  return bp;
end $$;

-- Practice timer saves (F3.7). Feeds measured pace (F2.17). No media, ever.
create table public.timed_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  script_version_id uuid references public.script_versions(id) on delete set null,
  mode public.run_mode not null default 'timer',
  started_at timestamptz not null default now(),
  duration_s integer not null check (duration_s > 0),
  beat_reached integer,
  word_count integer                               -- copied from the script version at save time
);
create index timed_runs_talk_idx on public.timed_runs(talk_id, started_at desc);

-- After three timed runs, the member's measured pace replaces the 150 wpm default (F2.17).
create or replace function public.update_measured_wpm() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer; wpm numeric;
begin
  select count(*), sum(word_count)::numeric / nullif(sum(duration_s), 0) * 60
    into n, wpm
  from public.timed_runs where talk_id = new.talk_id and word_count is not null and mode = 'timer';
  if n >= 3 and wpm is not null then
    update public.talks set measured_wpm = round(wpm)::int where id = new.talk_id;
  end if;
  return new;
end $$;
create trigger timed_runs_measured_wpm after insert on public.timed_runs for each row execute function public.update_measured_wpm();

-- Deferred (owner decision 1 Nov 2026) but created now so the schema is complete: run log,
-- rehearsal plan, live-audience log. Flags keep their screens hidden.
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  timed_run_id uuid references public.timed_runs(id) on delete set null,
  dropped_beat_ids uuid[] not null default '{}',
  forced_note text,
  fix_note text,
  confidence integer check (confidence between 1 and 5),
  summary jsonb,                                   -- Haiku next-drill suggestion (13.10)
  created_at timestamptz not null default now()
);
create table public.rehearsal_plans (
  talk_id uuid primary key references public.talks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.live_audience_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  on_date date not null,
  audience_kind text,
  size integer,
  feedback_line text,
  restatement text,                                -- the listener's one-sentence restatement (v1.4)
  restatement_result jsonb,                        -- landed | drifted, differing words
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- AMPLIFY (9.2). Text in, text out. Official recordings are linked, never stored.
-- ---------------------------------------------------------------
create table public.launch_plans (
  talk_id uuid primary key references public.talks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expected_upload_window daterange,
  organizer_timeline text,
  plan jsonb not null default '[]',                -- dated checklist items {date, text, done}
  copy_kit jsonb not null default '{}',            -- personal_email, linkedin_post, newsletter_block, signature_line, ten_second_angles[], blogger_outreach[], bio_line
  upload_pack jsonb not null default '{}',         -- titles[], description, bio, tags[]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger launch_plans_touch before update on public.launch_plans for each row execute function public.touch_updated_at();

-- Deferred (V2) but schema-complete: clip plans, press kits, talk stats, outcomes
create table public.clip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  clips jsonb not null default '[]',               -- cues and captions only; the member cuts with their own tools
  created_at timestamptz not null default now()
);
create table public.press_kits (
  talk_id uuid primary key references public.talks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null default '{}',
  pdf_path text,
  updated_at timestamptz not null default now()
);
create table public.talk_stats (
  talk_id uuid not null references public.talks(id) on delete cascade,
  on_date date not null,
  views bigint, likes bigint, comments bigint,
  primary key (talk_id, on_date)
);
create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid references public.talks(id) on delete cascade,
  kind text not null,                              -- inquiry, booking, fee_change, press, book_note
  note text,
  amount_cents integer,
  consent_to_share boolean not null default false,
  occurred_at date,
  created_at timestamptz not null default now()
);
