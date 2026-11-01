-- 0009: Idea Lock, Journey, weekly commitment, milestones, activity, fresh-idea check (runbook step 5)
-- Blueprint 5.3, 5.4, 5.7, 6.1 (F1.1.9), 6.5 (F1.5.3). Text only: nothing here stores media.

-- ---------------------------------------------------------------
-- Weekly commitment (5.3 item 2; 5.7). Weeks start on Monday (UTC). One row per member per week.
-- ---------------------------------------------------------------
create table public.week_commitments (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  target integer not null default 3 check (target between 1 and 14),
  completed integer not null default 0 check (completed >= 0),
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
create trigger week_commitments_touch before update on public.week_commitments for each row execute function public.touch_updated_at();

create or replace function public.week_start_of(p_at timestamptz default now()) returns date
language sql immutable as $$ select (date_trunc('week', p_at at time zone 'UTC'))::date $$;

-- Milestones are tied to real artifacts (5.7). Awarded by functions, never typed in by the member.
create table public.milestones (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid references public.talks(id) on delete cascade,
  key text not null check (key in ('idea_locked', 'first_application_sent', 'acceptance_logged', 'outline_finalized', 'script_locked', 'first_run_under_time', 'talk_published')),
  earned_at timestamptz not null default now(),
  meta jsonb not null default '{}',
  unique (user_id, talk_id, key)
);
create index milestones_user_idx on public.milestones(user_id);

-- Activity: what counts toward "this week" (practice block, application sent, idea work).
create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid references public.talks(id) on delete set null,
  kind text not null check (kind in ('idea_batch', 'idea_scored', 'idea_locked', 'prior_stage_logged', 'application_logged', 'application_sent', 'brief_saved', 'outline_finalized', 'script_section', 'practice_block', 'timed_run', 'launch_step')),
  counts_toward_week boolean not null default true,
  created_at timestamptz not null default now()
);
create index activity_log_user_week_idx on public.activity_log(user_id, created_at);

create or replace function public.award_milestone(p_user uuid, p_talk uuid, p_key text, p_meta jsonb default '{}') returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.milestones (user_id, talk_id, key, meta) values (p_user, p_talk, p_key, coalesce(p_meta, '{}'))
  on conflict (user_id, talk_id, key) do nothing;
end $$;
revoke execute on function public.award_milestone(uuid, uuid, text, jsonb) from public, anon, authenticated;

-- Internal: write one activity row and bump this week's completed count (creating the week row if needed).
create or replace function public.record_activity(p_user uuid, p_kind text, p_talk uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_week date := public.week_start_of();
begin
  insert into public.activity_log (user_id, talk_id, kind) values (p_user, p_talk, p_kind) returning id into v_id;
  insert into public.week_commitments (user_id, week_start) values (p_user, v_week) on conflict do nothing;
  update public.week_commitments set completed = completed + 1 where user_id = p_user and week_start = v_week and not paused;
  return v_id;
end $$;
revoke execute on function public.record_activity(uuid, text, uuid) from public, anon, authenticated;

-- Members log their own activity (practice block, application sent, and so on).
create or replace function public.log_activity(p_kind text, p_talk uuid default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_talk is not null and not exists (select 1 from public.talks where id = p_talk and user_id = v_user) then raise exception 'NOT_FOUND'; end if;
  return public.record_activity(v_user, p_kind, p_talk);
end $$;

-- Pause or resume the current week without shame (5.6, 5.7). A paused week never shows as missed.
create or replace function public.set_week_paused(p_paused boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_week date := public.week_start_of();
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  insert into public.week_commitments (user_id, week_start, paused) values (v_user, v_week, p_paused)
  on conflict (user_id, week_start) do update set paused = excluded.paused;
end $$;

create or replace function public.set_week_target(p_target integer) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_week date := public.week_start_of();
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  insert into public.week_commitments (user_id, week_start, target) values (v_user, v_week, p_target)
  on conflict (user_id, week_start) do update set target = excluded.target;
end $$;

-- ---------------------------------------------------------------
-- Idea Lock (F1.1.9). The gate from 13.3: criteria 1 (idea, not topic) and 4 (arguable) below Level 2 block
-- locking, no override. The UI also asks for Level 3 on criteria 1, 4 and 5 and lets the member override
-- that softer bar with a written reason (S3.3). Locking snapshots the profile and moves the talk to Discover.
-- ---------------------------------------------------------------
create or replace function public.idea_lock_check(p_score jsonb, p_override_reason text default null) returns text
language plpgsql immutable as $$
declare v_level int; v_soft_fail text := '';
begin
  if p_score is null or p_score->'scores' is null then return 'IDEA_NOT_SCORED'; end if;
  for v_level in select (s->>'level')::int from jsonb_array_elements(p_score->'scores') s where (s->>'criterion')::int in (1, 4) loop
    if v_level < 2 then return 'IDEA_GATE_FAILED'; end if;
  end loop;
  select string_agg((s->>'criterion'), ',') into v_soft_fail
    from jsonb_array_elements(p_score->'scores') s
    where (s->>'criterion')::int in (1, 4, 5) and (s->>'level')::int < 3;
  if v_soft_fail is not null and v_soft_fail <> '' and coalesce(char_length(trim(p_override_reason)), 0) < 20 then
    return 'IDEA_NEEDS_WORK:' || v_soft_fail;
  end if;
  return 'OK';
end $$;

create or replace function public.lock_idea(p_idea uuid, p_override_reason text default null) returns public.ideas
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_idea public.ideas; v_check text; v_profile jsonb; v_existing uuid;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_idea from public.ideas where id = p_idea and user_id = v_user for update;
  if v_idea.id is null then raise exception 'NOT_FOUND'; end if;
  if v_idea.status = 'locked' then return v_idea; end if;
  if v_idea.status = 'archived' then raise exception 'IDEA_ARCHIVED'; end if;
  select id into v_existing from public.ideas where talk_id = v_idea.talk_id and status = 'locked';
  if v_existing is not null then raise exception 'ANOTHER_IDEA_LOCKED'; end if;
  if not public.trial_limit_check(v_user, 'lock_idea') then raise exception 'TRIAL_LIMIT'; end if;
  v_check := public.idea_lock_check(v_idea.score, p_override_reason);
  if v_check <> 'OK' then raise exception '%', v_check; end if;
  select to_jsonb(p) - 'headshot_path' into v_profile from public.profiles p where p.user_id = v_user;
  update public.ideas set status = 'locked', locked_at = now() where id = p_idea returning * into v_idea;
  update public.talks set idea_id = p_idea, profile_snapshot = v_profile,
    title = coalesce(title, v_idea.title_working),
    stage = case when stage = 'position' then 'discover'::public.talk_stage else stage end
    where id = v_idea.talk_id;
  perform public.award_milestone(v_user, v_idea.talk_id, 'idea_locked', jsonb_build_object('idea_id', p_idea, 'override', p_override_reason is not null));
  perform public.record_activity(v_user, 'idea_locked', v_idea.talk_id);
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (v_user, 'member', 'idea.lock', 'idea', p_idea::text, jsonb_build_object('override_reason', p_override_reason));
  return v_idea;
end $$;

-- Unlocking returns the idea to candidate, clears the talk's idea and marks every downstream artifact stale
-- (7.5). Nothing is deleted. A reason is required so the decision log is honest.
create or replace function public.unlock_idea(p_talk uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_idea uuid;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if coalesce(char_length(trim(p_reason)), 0) < 10 then raise exception 'REASON_REQUIRED'; end if;
  select id into v_idea from public.ideas where talk_id = p_talk and user_id = v_user and status = 'locked';
  if v_idea is null then raise exception 'NOTHING_LOCKED'; end if;
  update public.ideas set status = 'candidate', locked_at = null where id = v_idea;
  update public.talks set idea_id = null, stage = 'position' where id = p_talk and user_id = v_user;
  update public.pitch_packs set stale = true where user_id = v_user and talk_id = p_talk;
  update public.applications set stale = true where user_id = v_user and talk_id = p_talk and status in ('planned', 'researching', 'drafting', 'ready');
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (v_user, 'member', 'idea.unlock', 'idea', v_idea::text, jsonb_build_object('reason', left(p_reason, 300)));
end $$;

-- ---------------------------------------------------------------
-- Fresh-idea check (F1.5.3, rule 5 in 6.5). Compares a prior stage topic with the talk's locked idea.
-- MVP uses trigram similarity plus shared content words; embeddings arrive with the matching engine (step 6).
-- Returns a similarity in 0..1 and whether it crosses the warning line (0.30, Appendix C).
-- ---------------------------------------------------------------
create or replace function public.content_words(p_text text) returns text[]
language sql immutable as $$
  select coalesce(array_agg(distinct w), '{}') from (
    select w from regexp_split_to_table(lower(coalesce(p_text, '')), '[^a-z0-9]+') w
    where char_length(w) > 3 and w not in ('that','this','with','from','when','what','your','they','them','have','will','about','into','than','then','there','their','which','would','could','should','where','while','being','these','those','because','through','every','other','after','before','between','under','over','talk','talks','speak','speaking','how','why','not')
  ) x $$;

create or replace function public.topic_overlap(p_topic text, p_idea_text text) returns real
language plpgsql immutable as $$
declare a text[] := public.content_words(p_topic); b text[] := public.content_words(p_idea_text);
        v_shared int; v_union int; v_jaccard real; v_trgm real;
begin
  if cardinality(a) = 0 or cardinality(b) = 0 then return 0; end if;
  select count(*) into v_shared from unnest(a) x where x = any(b);
  v_union := cardinality(a) + cardinality(b) - v_shared;
  v_jaccard := v_shared::real / greatest(v_union, 1);
  v_trgm := similarity(lower(p_topic), lower(p_idea_text));
  -- shared content words matter more than character shape; either signal alone can cross the line
  return greatest(v_jaccard * 1.6, v_trgm, (v_jaccard + v_trgm) / 2.0)::real;
end $$;

create or replace function public.prior_stage_overlap(p_stage uuid, p_talk uuid)
returns table (idea_id uuid, score real, is_overlap boolean, shared_words text[])
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_topic text; v_idea public.ideas; v_idea_text text;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select topic into v_topic from public.prior_stages where id = p_stage and user_id = v_user;
  if v_topic is null then return; end if;
  select * into v_idea from public.ideas where talk_id = p_talk and user_id = v_user and status = 'locked';
  if v_idea.id is null then return; end if;
  v_idea_text := concat_ws(' ', v_idea.title_working, v_idea.throughline, v_idea.belief_challenged);
  idea_id := v_idea.id;
  score := public.topic_overlap(v_topic, v_idea_text);
  is_overlap := score >= 0.30;
  select coalesce(array_agg(w), '{}') into shared_words from unnest(public.content_words(v_topic)) w where w = any(public.content_words(v_idea_text));
  return next;
end $$;

-- Interview completeness (F1.1.1): eight prompts, each at least 120 characters. Pasted material counts
-- toward the 300-character dossier minimum used by the generator gate (S1.3).
create or replace function public.dossier_char_count(p_dossier uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(char_length(v))::int from public.idea_dossiers d, jsonb_each_text(d.answers) e(k, v) where d.id = p_dossier), 0)
       + coalesce((select char_length(pasted_material) from public.idea_dossiers where id = p_dossier), 0) $$;


-- Beats mastered / total for the locked script version (Today readiness, 5.3 item 5).
create or replace function public.beat_summary(p_talk uuid) returns table (mastered integer, total integer)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where bp.state in ('known', 'cold'))::int, count(*)::int
  from public.scripts s
  join public.script_versions sv on sv.id = s.locked_version_id
  join public.beats b on b.script_version_id = sv.id
  left join public.beat_progress bp on bp.beat_id = b.id and bp.user_id = s.user_id
  where s.talk_id = p_talk and s.user_id = auth.uid()
$$;
grant execute on function public.beat_summary(uuid) to authenticated;

-- ---------------------------------------------------------------
-- RLS for the new tables
-- ---------------------------------------------------------------
alter table public.week_commitments enable row level security;
alter table public.milestones enable row level security;
alter table public.activity_log enable row level security;

create policy week_commitments_own on public.week_commitments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy milestones_own_read on public.milestones for select to authenticated using (user_id = auth.uid());
create policy activity_own_read on public.activity_log for select to authenticated using (user_id = auth.uid());
create policy milestones_admin on public.milestones for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy activity_admin on public.activity_log for select to authenticated using (public.is_admin());

grant select, insert, update on public.week_commitments to authenticated;
grant select on public.milestones, public.activity_log to authenticated;
grant execute on function public.log_activity(text, uuid), public.set_week_paused(boolean), public.set_week_target(integer),
  public.lock_idea(uuid, text), public.unlock_idea(uuid, text), public.prior_stage_overlap(uuid, uuid),
  public.idea_lock_check(jsonb, text), public.topic_overlap(text, text), public.content_words(text), public.week_start_of(timestamptz),
  public.dossier_char_count(uuid) to authenticated;
