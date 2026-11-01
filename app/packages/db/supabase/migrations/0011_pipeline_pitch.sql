-- 0011: Application Pipeline and Pitch Studio additions (runbook step 7). Blueprint 6.3, 6.4, 13.4 to 13.6, 10.5.

-- Fields the pipeline needs beyond 0003: the AI text as inserted (for the authorship meter), the follow-up
-- draft and the organizer-stated decision date (restraint rules), feedback request, pitch variant link.
alter table public.applications
  add column if not exists ai_originals jsonb not null default '{}',          -- per field: the AI draft text when it was inserted
  add column if not exists follow_up_draft text,
  add column if not exists decision_date date,                                -- organizer-stated; no follow-up before it
  add column if not exists no_enquiries boolean not null default false,       -- organizer's page says not to enquire
  add column if not exists feedback_requested_at timestamptz,
  add column if not exists readiness_checked_at timestamptz,
  add column if not exists research_completed_at timestamptz;

-- Research step (6.3 quality gate): three answers of at least 20 characters each.
create or replace function public.research_complete(p_answers jsonb) returns boolean
language sql immutable as $$
  select p_answers is not null
     and char_length(trim(coalesce(p_answers->>'theme_in_own_words', ''))) >= 20
     and char_length(trim(coalesce(p_answers->>'past_talk_watched', ''))) >= 20
     and char_length(trim(coalesce(p_answers->>'why_this_audience', ''))) >= 20 $$;

create or replace function public.applications_research_stamp() returns trigger
language plpgsql as $$
begin
  if public.research_complete(new.research_answers) and new.research_completed_at is null then new.research_completed_at := now(); end if;
  if new.status = 'planned' and public.research_complete(new.research_answers) then new.status := 'researching'; end if;
  return new;
end $$;
create trigger applications_research_stamp before insert or update of research_answers on public.applications for each row execute function public.applications_research_stamp();

-- Milestones and activity from the pipeline (5.7): first application sent, acceptance logged.
-- On acceptance the talk takes the event and its date and moves to Write.
create or replace function public.applications_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'applied' and (tg_op = 'INSERT' or old.status is distinct from 'applied') then
    perform public.award_milestone(new.user_id, new.talk_id, 'first_application_sent', jsonb_build_object('application_id', new.id));
    perform public.record_activity(new.user_id, 'application_sent', new.talk_id);
  end if;
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    perform public.award_milestone(new.user_id, new.talk_id, 'acceptance_logged', jsonb_build_object('application_id', new.id));
    update public.talks set event_id = coalesce(new.event_id, event_id), event_date = coalesce(new.event_date, event_date),
      stage = case when stage in ('position', 'discover', 'apply') then 'write'::public.talk_stage else stage end
      where id = new.talk_id;
  end if;
  return new;
end $$;
create trigger applications_after_change after insert or update of status on public.applications for each row execute function public.applications_after_change();

-- Follow-up restraint (F1.3.7 v1.4): one follow-up, never before the decision date, never where the organizer
-- says not to enquire, only for applications made through a public form. The UI mirrors this; the database decides.
create or replace function public.follow_up_allowed(p_app uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare a public.applications; v_form text;
begin
  select * into a from public.applications where id = p_app and user_id = auth.uid();
  if a.id is null then return 'NOT_FOUND'; end if;
  if a.status not in ('applied', 'follow_up_due') then return 'NOT_APPLIED'; end if;
  if a.follow_up_sent_at is not null then return 'ALREADY_SENT'; end if;
  if a.no_enquiries then return 'ORGANIZER_SAYS_NO'; end if;
  if a.decision_date is not null and a.decision_date >= (now() at time zone 'utc')::date then return 'BEFORE_DECISION_DATE'; end if;
  if a.event_id is null then return 'NO_PUBLIC_FORM'; end if;
  select form_url into v_form from public.events where id = a.event_id;
  if v_form is null then return 'NO_PUBLIC_FORM'; end if;
  if a.applied_at is not null and a.applied_at > (now() at time zone 'utc')::date - 14 then return 'TOO_EARLY'; end if;
  return 'OK';
end $$;
grant execute on function public.follow_up_allowed(uuid), public.research_complete(jsonb) to authenticated;

-- Applied applications whose follow-up date has arrived show as follow_up_due (a nightly pass).
create or replace function public.mark_follow_ups_due() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with m as (update public.applications set status = 'follow_up_due'
    where status = 'applied' and follow_up_sent_at is null and follow_up_at is not null and follow_up_at <= (now() at time zone 'utc')::date
      and not no_enquiries and (decision_date is null or decision_date < (now() at time zone 'utc')::date) returning id)
  select count(*) into n from m;
  return n;
end $$;

-- Pitch packs keep the AI text as generated so any field can go back to the AI version (F1.4.1), plus the
-- text-only video kit (F1.4.2). Regenerating inserts a new version; edits change the live version in place.
alter table public.pitch_packs add column if not exists ai_fields jsonb not null default '{}';
alter table public.pitch_packs add column if not exists pitch_kit jsonb not null default '{}';   -- the text-only kit: script length, shot checklist ticks, self-review answers; never a file

-- Pitch pack versions: the newest version is the live one. Regenerating inserts a new version.
create or replace function public.next_pitch_pack_version(p_talk uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(max(version), 0) + 1 from public.pitch_packs where talk_id = p_talk $$;
grant execute on function public.next_pitch_pack_version(uuid) to authenticated;

-- The 100-applications promise: only ready applications sent through a public form count (10.5).
create or replace function public.ready_applications_detail(p_user uuid)
returns table (sent integer, remaining integer, extension_eligible boolean)
language sql stable security definer set search_path = public as $$
  select n, greatest(0, 100 - n), n >= 100 from (select public.ready_applications_sent(p_user) n) x $$;
grant execute on function public.ready_applications_detail(uuid) to authenticated;
