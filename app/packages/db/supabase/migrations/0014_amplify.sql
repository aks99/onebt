-- One Big Talk: migration 14 (runbook step 10, AMPLIFY basics; blueprint v1.15 Section 9.2 F4.1 to F4.4, F4.11, F4.12)
-- Publication tracker with the realistic states, the launch plan dated from the confirmed public link, the copy kit,
-- the upload pack and the bio lines as text the member edits and copies. The app never touches video: the only
-- media reference anywhere is the official link the member pastes.

-- An event name typed by the member when the talk is not tied to a catalogue event (invited and published paths).
alter table public.talks add column if not exists event_name_manual text;

-- Only the official public link counts (YouTube, where TEDx talks are published, or TED's own site).
create or replace function public.is_official_talk_url(p text) returns boolean
language sql immutable as $$
  select p is not null and p ~* '^https://(www\.)?(youtube\.com/watch\?v=[A-Za-z0-9_-]{6,}|youtu\.be/[A-Za-z0-9_-]{6,}|youtube\.com/shorts/[A-Za-z0-9_-]{6,}|(www\.)?ted\.com/talks/[A-Za-z0-9_-]+)'
$$;

-- F4.1 Publication tracker. States: not_delivered -> delivered -> awaiting_upload -> in_review -> published,
-- or not_approved / limited. The launch plan's dates count from the confirmed public URL (set here), never from
-- an assumed number of weeks. Publishing awards the milestone and moves the talk to Amplify.
create or replace function public.set_publication(p_talk uuid, p_state public.publication_state, p_url text default null,
  p_organizer_timeline text default null, p_window_start date default null, p_window_end date default null, p_event_name text default null)
returns public.talks language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); t public.talks%rowtype;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  select * into t from public.talks where id = p_talk and user_id = v_user;
  if not found then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  if p_state = 'published' and not public.is_official_talk_url(p_url) then
    raise exception 'OFFICIAL_LINK_REQUIRED: paste the official YouTube or TED link; the launch plan is dated from it' using errcode = 'check_violation';
  end if;
  if p_state <> 'published' and p_url is not null and not public.is_official_talk_url(p_url) then
    raise exception 'OFFICIAL_LINK_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_window_start is not null and p_window_end is not null and p_window_end < p_window_start then
    raise exception 'BAD_WINDOW' using errcode = 'check_violation';
  end if;
  update public.talks set
    publication = p_state,
    published_url = case when p_state = 'published' then p_url else coalesce(p_url, published_url) end,
    published_at = case when p_state = 'published' and published_at is null then now() when p_state <> 'published' then null else published_at end,
    event_name_manual = coalesce(nullif(btrim(p_event_name), ''), event_name_manual),
    stage = case when p_state = 'published' then 'amplify'::public.talk_stage when p_state in ('delivered', 'awaiting_upload', 'in_review') and stage in ('rehearse', 'perform') then 'perform'::public.talk_stage else stage end
  where id = p_talk returning * into t;
  insert into public.launch_plans (talk_id, user_id, expected_upload_window, organizer_timeline)
    values (p_talk, v_user, case when p_window_start is not null then daterange(p_window_start, coalesce(p_window_end, p_window_start), '[]') end, p_organizer_timeline)
  on conflict (talk_id) do update set
    expected_upload_window = coalesce(case when p_window_start is not null then daterange(p_window_start, coalesce(p_window_end, p_window_start), '[]') end, public.launch_plans.expected_upload_window),
    organizer_timeline = coalesce(p_organizer_timeline, public.launch_plans.organizer_timeline);
  if p_state = 'published' then
    perform public.award_milestone(v_user, p_talk, 'talk_published', jsonb_build_object('url', p_url));
  end if;
  return t;
end $$;

-- F4.3 Launch plan items: [{when, text, phase, done}]. The whole list is saved (edits, dating, reordering);
-- marking one item done logs a launch step toward the week.
create or replace function public.save_launch_plan(p_talk uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.talks where id = p_talk and user_id = v_user) then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'BAD_PLAN' using errcode = 'invalid_parameter_value'; end if;
  insert into public.launch_plans (talk_id, user_id, plan) values (p_talk, v_user, p_items)
  on conflict (talk_id) do update set plan = excluded.plan;
end $$;

create or replace function public.set_launch_item_done(p_talk uuid, p_index integer, p_done boolean) returns integer
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_plan jsonb; v_done integer;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  select plan into v_plan from public.launch_plans where talk_id = p_talk and user_id = v_user;
  if v_plan is null then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  if p_index < 0 or p_index >= jsonb_array_length(v_plan) then raise exception 'BAD_INDEX' using errcode = 'invalid_parameter_value'; end if;
  v_plan := jsonb_set(v_plan, array[p_index::text, 'done'], to_jsonb(p_done));
  update public.launch_plans set plan = v_plan where talk_id = p_talk;
  if p_done then perform public.record_activity(v_user, 'launch_step', p_talk); end if;
  select count(*) into v_done from jsonb_array_elements(v_plan) i where (i->>'done')::boolean;
  return v_done;
end $$;

-- F4.2 and F4.4: the upload pack and the copy kit are JSON blocks the member edits; one function saves either.
create or replace function public.save_launch_text(p_talk uuid, p_kind text, p_value jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.talks where id = p_talk and user_id = v_user) then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  if p_kind not in ('copy_kit', 'upload_pack') then raise exception 'BAD_KIND' using errcode = 'invalid_parameter_value'; end if;
  insert into public.launch_plans (talk_id, user_id) values (p_talk, v_user) on conflict (talk_id) do nothing;
  if p_kind = 'copy_kit' then update public.launch_plans set copy_kit = p_value where talk_id = p_talk;
  else update public.launch_plans set upload_pack = p_value where talk_id = p_talk; end if;
end $$;

-- F4.12 Second-talk guard: how many of this member's talks are published (the guard shows when it is above zero).
create or replace function public.published_talk_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.talks where user_id = auth.uid() and publication = 'published'
$$;

grant execute on function public.is_official_talk_url(text), public.set_publication(uuid, public.publication_state, text, text, date, date, text),
  public.save_launch_plan(uuid, jsonb), public.set_launch_item_done(uuid, integer, boolean), public.save_launch_text(uuid, text, jsonb),
  public.published_talk_count() to authenticated;
