-- 0012: WRITE pillar functions (runbook step 8). Blueprint 7.2 to 7.5, 13.8. Two-step writing is already in
-- 0004 (brief minimum, final outline before any script); this adds finalize, lock and unlock with the gates,
-- the milestones, and the readability snapshot per version.

alter table public.scripts add column if not exists lock_override_reason text;
alter table public.scripts add column if not exists unlocked_at timestamptz;
alter table public.script_versions add column if not exists readability jsonb;      -- {gradeLevel, avgSentenceLength, words, sentences}
alter table public.script_versions add column if not exists quirks jsonb;           -- quirk detector hits

-- Finalize an outline version (7.2 step 2): one final per outline; earlier finals go back to draft.
create or replace function public.finalize_outline(p_version uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v public.outline_versions; v_talk uuid;
begin
  select * into v from public.outline_versions where id = p_version and user_id = auth.uid();
  if v.id is null then raise exception 'NOT_FOUND'; end if;
  update public.outline_versions set status = 'draft' where outline_id = v.outline_id and status = 'final' and id <> p_version;
  update public.outline_versions set status = 'final' where id = p_version;
  select talk_id into v_talk from public.outlines where id = v.outline_id;
  update public.talks set stage = case when stage in ('position', 'discover', 'apply') then 'write'::public.talk_stage else stage end where id = v_talk;
  perform public.award_milestone(auth.uid(), v_talk, 'outline_finalized', jsonb_build_object('outline_version_id', p_version));
  perform public.record_activity(auth.uid(), 'outline_finalized', v_talk);
end $$;

-- Reopen a finalized outline (edits after the script exists are flagged in the UI as "outline changed").
create or replace function public.reopen_outline(p_version uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.outline_versions set status = 'draft' where id = p_version and user_id = auth.uid() and status = 'final';
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

-- Script Lock gate (7.4): Level 3 or higher on criteria 1, 3, 9 and 11, or a written override of 20+ characters.
create or replace function public.script_lock_check(p_rubric jsonb, p_override text default null) returns text
language plpgsql immutable as $$
declare v_fail text;
begin
  if p_rubric is null or p_rubric->'scores' is null then return 'SCRIPT_NOT_SCORED'; end if;
  select string_agg(s->>'criterion', ',') into v_fail from jsonb_array_elements(p_rubric->'scores') s
    where (s->>'criterion')::int in (1, 3, 9, 11) and (s->>'level')::int < 3;
  if v_fail is not null and v_fail <> '' and coalesce(char_length(trim(p_override)), 0) < 20 then return 'SCRIPT_NEEDS_WORK:' || v_fail; end if;
  return 'OK';
end $$;

create or replace function public.lock_script(p_version uuid, p_override text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v public.script_versions; s public.scripts; v_check text;
begin
  select * into v from public.script_versions where id = p_version and user_id = auth.uid();
  if v.id is null then raise exception 'NOT_FOUND'; end if;
  select * into s from public.scripts where id = v.script_id;
  v_check := public.script_lock_check(v.rubric, p_override);
  if v_check <> 'OK' then raise exception '%', v_check; end if;
  update public.scripts set locked_version_id = p_version, locked_at = now(), lock_override_reason = nullif(trim(coalesce(p_override, '')), ''), unlocked_at = null where id = s.id;
  update public.talks set stage = case when stage in ('position', 'discover', 'apply', 'write') then 'rehearse'::public.talk_stage else stage end where id = s.talk_id;
  perform public.award_milestone(auth.uid(), s.talk_id, 'script_locked', jsonb_build_object('script_version_id', p_version, 'override', p_override is not null));
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'member', 'script.lock', 'script_version', p_version::text, jsonb_build_object('override_reason', p_override));
end $$;

-- Unlocking keeps the locked version in history; new versions are flagged post_lock until locked again.
create or replace function public.unlock_script(p_script uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(char_length(trim(p_reason)), 0) < 10 then raise exception 'REASON_REQUIRED'; end if;
  update public.scripts set locked_version_id = null, unlocked_at = now() where id = p_script and user_id = auth.uid() and locked_version_id is not null;
  if not found then raise exception 'NOTHING_LOCKED'; end if;
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'member', 'script.unlock', 'script', p_script::text, jsonb_build_object('reason', left(p_reason, 300)));
end $$;

-- New versions after an unlock are post-lock edits (7.3 F2.10).
create or replace function public.script_versions_post_lock() returns trigger
language plpgsql as $$
declare s public.scripts;
begin
  select * into s from public.scripts where id = new.script_id;
  if s.unlocked_at is not null and s.locked_version_id is null then new.post_lock := true; end if;
  if new.version is null or new.version = 0 then select coalesce(max(version), 0) + 1 into new.version from public.script_versions where script_id = new.script_id; end if;
  return new;
end $$;
create trigger script_versions_post_lock before insert on public.script_versions for each row execute function public.script_versions_post_lock();

create or replace function public.next_outline_version(p_outline uuid) returns integer
language sql stable security definer set search_path = public as $$ select coalesce(max(version), 0) + 1 from public.outline_versions where outline_id = p_outline $$;
create or replace function public.next_script_version(p_script uuid) returns integer
language sql stable security definer set search_path = public as $$ select coalesce(max(version), 0) + 1 from public.script_versions where script_id = p_script $$;

grant execute on function public.finalize_outline(uuid), public.reopen_outline(uuid), public.script_lock_check(jsonb, text), public.lock_script(uuid, text), public.unlock_script(uuid, text),
  public.next_outline_version(uuid), public.next_script_version(uuid) to authenticated;
