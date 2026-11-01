-- One Big Talk: migration 13 (runbook step 9, DELIVER core; blueprint v1.14 Section 8, F3.1 to F3.7)
-- Beat map built only from the locked script version and verified word for word; four drills record hits
-- and misses through record_drill_result (0005); the practice timer saves durations that feed measured pace.
-- Nothing here stores or references audio, video or a recording. The app has not heard anything.

-- Two new activity kinds: building the beat map and a drill block (a drill session of any length).
alter table public.activity_log drop constraint activity_log_kind_check;
alter table public.activity_log add constraint activity_log_kind_check check (kind in ('idea_batch', 'idea_scored', 'idea_locked', 'prior_stage_logged', 'application_logged', 'application_sent', 'brief_saved', 'outline_finalized', 'script_section', 'practice_block', 'timed_run', 'launch_step', 'beat_map_built', 'drill_block'));

-- Whitespace-normalized text for the word-for-word check.
create or replace function public.normalize_ws(p text) returns text
language sql immutable as $$ select regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g') $$;

-- First three words of a beat, verbatim (shown in Newsreader on the beat rows and on cue cards).
create or replace function public.first_words(p text, p_n integer default 3) returns text
language sql immutable as $$
  select array_to_string((regexp_split_to_array(public.normalize_ws(p), ' '))[1:p_n], ' ')
$$;

-- F3.1 Beat map. p_beats: [{order, section_id, text, first_words, purpose, target_seconds}].
-- The beats together must reproduce the locked script exactly, in order. Rebuilding replaces the beats and
-- their progress for that version (the UI confirms first). Every beat starts new and due today.
create or replace function public.build_beat_map(p_version uuid, p_beats jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_script public.scripts%rowtype; v_doc jsonb; v_script_text text; v_beats_text text; n integer;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  select s.* into v_script from public.scripts s join public.script_versions sv on sv.script_id = s.id
    where sv.id = p_version and s.user_id = v_user;
  if not found then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  if v_script.locked_version_id is distinct from p_version then
    raise exception 'SCRIPT_NOT_LOCKED: the beat map is built from the locked version' using errcode = 'check_violation';
  end if;
  if p_beats is null or jsonb_typeof(p_beats) <> 'array' or jsonb_array_length(p_beats) = 0 then
    raise exception 'BEATS_EMPTY' using errcode = 'invalid_parameter_value';
  end if;
  select doc into v_doc from public.script_versions where id = p_version;
  select public.normalize_ws(string_agg(s->>'text', ' ' order by ord)) into v_script_text
    from jsonb_array_elements(v_doc->'sections') with ordinality as t(s, ord);
  select public.normalize_ws(string_agg(b->>'text', ' ' order by (b->>'order')::int)) into v_beats_text
    from jsonb_array_elements(p_beats) b;
  if v_script_text is distinct from v_beats_text then
    raise exception 'BEATS_MISMATCH: the beats must reproduce the script word for word' using errcode = 'check_violation';
  end if;
  delete from public.beats where script_version_id = p_version and user_id = v_user;
  insert into public.beats (user_id, script_version_id, "order", section_id, text, first_words, purpose, target_seconds)
  select v_user, p_version, (b->>'order')::int, b->>'section_id', b->>'text',
         coalesce(nullif(btrim(b->>'first_words'), ''), public.first_words(b->>'text')),
         left(coalesce(b->>'purpose', ''), 40), greatest(1, coalesce((b->>'target_seconds')::int, 1))
  from jsonb_array_elements(p_beats) b;
  get diagnostics n = row_count;
  insert into public.beat_progress (user_id, beat_id) select v_user, id from public.beats where script_version_id = p_version;
  perform public.record_activity(v_user, 'beat_map_built', v_script.talk_id);
  return n;
end $$;

-- The member edits a beat's first words (the cue) or attaches a stage or gesture note.
create or replace function public.update_beat(p_beat uuid, p_first_words text default null, p_stage_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.beats where id = p_beat and user_id = v_user) then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  if p_first_words is not null and length(btrim(p_first_words)) = 0 then raise exception 'CUE_REQUIRED: the cue needs at least one word' using errcode = 'check_violation'; end if;
  update public.beats set
    first_words = coalesce(left(btrim(p_first_words), 60), first_words),
    stage_note = case when p_stage_note is null then stage_note else nullif(left(btrim(p_stage_note), 200), '') end
  where id = p_beat;
end $$;

-- Summary for Today and Journey: mastered (known or cold), total, and due today (F3.6).
drop function if exists public.beat_summary(uuid);
create or replace function public.beat_summary(p_talk uuid) returns table (mastered integer, total integer, due integer)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where bp.state in ('known', 'cold'))::int,
         count(*)::int,
         count(*) filter (where bp.beat_id is null or bp.next_review_at <= (now() at time zone 'utc')::date)::int
  from public.scripts s
  join public.script_versions sv on sv.id = s.locked_version_id
  join public.beats b on b.script_version_id = sv.id
  left join public.beat_progress bp on bp.beat_id = b.id and bp.user_id = s.user_id
  where s.talk_id = p_talk and s.user_id = auth.uid()
$$;

-- The beat map with progress for the locked version of a talk (one query for the Memorize screen).
create or replace function public.beat_map(p_talk uuid)
returns table (id uuid, "order" integer, section_id text, text text, first_words text, purpose text, target_seconds integer, stage_note text,
               state public.beat_state, next_review_at date, interval_days integer, hits integer, misses integer, due boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b."order", b.section_id, b.text, b.first_words, b.purpose, b.target_seconds, b.stage_note,
         coalesce(bp.state, 'new'::public.beat_state), coalesce(bp.next_review_at, (now() at time zone 'utc')::date),
         coalesce(bp.interval_days, 1), coalesce(bp.hits, 0), coalesce(bp.misses, 0),
         (bp.beat_id is null or bp.next_review_at <= (now() at time zone 'utc')::date)
  from public.scripts s
  join public.beats b on b.script_version_id = s.locked_version_id
  left join public.beat_progress bp on bp.beat_id = b.id and bp.user_id = s.user_id
  where s.talk_id = p_talk and s.user_id = auth.uid()
  order by b."order"
$$;

-- F3.7 Practice timer save. The duration comes from the on-screen timer; nothing is recorded.
-- Count-up and count-down both save as mode 'timer'; 'prompter' stays behind its flag (F3.8 deferred).
create or replace function public.save_timed_run(p_talk uuid, p_duration_s integer, p_beat_reached integer default null, p_mode text default 'timer')
returns public.timed_runs language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_talk public.talks%rowtype; v_version uuid; v_words integer; r public.timed_runs%rowtype;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  select * into v_talk from public.talks where id = p_talk and user_id = v_user;
  if not found then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  if p_duration_s is null or p_duration_s <= 0 then raise exception 'RUN_NEEDS_DURATION: a run is saved with its duration' using errcode = 'check_violation'; end if;
  if p_mode not in ('timer', 'prompter') then raise exception 'BAD_MODE' using errcode = 'invalid_parameter_value'; end if;
  if p_mode = 'prompter' and not exists (select 1 from public.feature_flags where key = 'prompter' and enabled) then
    raise exception 'FEATURE_OFF: the prompter arrives after launch' using errcode = 'check_violation';
  end if;
  select s.locked_version_id, sv.word_count into v_version, v_words
    from public.scripts s left join public.script_versions sv on sv.id = s.locked_version_id
    where s.talk_id = p_talk and s.user_id = v_user limit 1;
  insert into public.timed_runs (user_id, talk_id, script_version_id, mode, duration_s, beat_reached, word_count)
    values (v_user, p_talk, v_version, p_mode::public.run_mode, p_duration_s, p_beat_reached, v_words) returning * into r;
  perform public.record_activity(v_user, 'timed_run', p_talk);
  if p_duration_s <= v_talk.slot_minutes * 60 and v_version is not null then
    perform public.award_milestone(v_user, p_talk, 'first_run_under_time', jsonb_build_object('duration_s', p_duration_s, 'slot_minutes', v_talk.slot_minutes));
  end if;
  return r;
end $$;

-- Recent runs with the pace they imply (for the timer screen and the measured-pace note).
create or replace function public.recent_runs(p_talk uuid, p_limit integer default 10)
returns table (id uuid, started_at timestamptz, duration_s integer, beat_reached integer, word_count integer, wpm integer, under_slot boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.started_at, r.duration_s, r.beat_reached, r.word_count,
         case when r.word_count is not null and r.duration_s > 0 then round(r.word_count::numeric / r.duration_s * 60)::int end,
         r.duration_s <= t.slot_minutes * 60
  from public.timed_runs r join public.talks t on t.id = r.talk_id
  where r.talk_id = p_talk and r.user_id = auth.uid() and r.mode = 'timer'
  order by r.started_at desc limit p_limit
$$;

grant execute on function public.normalize_ws(text), public.first_words(text, integer), public.build_beat_map(uuid, jsonb),
  public.update_beat(uuid, text, text), public.beat_summary(uuid), public.beat_map(uuid),
  public.save_timed_run(uuid, integer, integer, text), public.recent_runs(uuid, integer) to authenticated;
