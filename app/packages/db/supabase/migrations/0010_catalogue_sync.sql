-- 0010: Curator Console sync, diff review, verify queue, deadline reminders, calendar feed, email capture
-- (runbook step 6). Blueprint 6.2, 12.5, S8.3, F1.2.4, F1.2.9, F1.2.16. The app never crawls.

-- ---------------------------------------------------------------
-- Field-level diff items from a sync or upload (S8.3 Diff tab). Auto items were applied on import;
-- pending items wait for a curator; a rejected item changes nothing.
-- ---------------------------------------------------------------
create table public.import_diffs (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.crawler_runs(id) on delete cascade,
  entity text not null check (entity in ('event', 'organizer', 'call')),
  record_key text not null,                        -- tedx_event_id, organizer external id or call_id
  field text not null,                             -- '*' means a new record
  before jsonb,
  after jsonb,
  confidence numeric(3,2),
  status text not null default 'pending' check (status in ('pending', 'auto', 'accepted', 'rejected')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index import_diffs_run_idx on public.import_diffs(run_id, status);
create index import_diffs_pending_idx on public.import_diffs(status) where status = 'pending';

-- Public email capture for "Open calls this week" and the Idea Test (F1.2.9, F1.2.14). Anyone may insert
-- their own address; only admins read. Consent text is stored with the row.
create table public.email_captures (
  id bigint generated always as identity primary key,
  email citext not null,
  source text not null check (source in ('open_calls', 'idea_test', 'landing', 'pricing')),
  consent_text text not null,
  created_at timestamptz not null default now(),
  unique (email, source)
);

-- Per-member calendar feed token (F1.2.4 "per-user calendar feed URL").
create table public.calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now()
);

-- Reminders fire once per interval (6.2 acceptance check) and never when disabled.
create table public.reminder_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  days_before integer not null check (days_before in (14, 7, 3, 1)),
  deadline date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, event_id, days_before, deadline)
);

alter table public.profiles add column if not exists deadline_reminders boolean not null default true;
-- One contact record per organizer so a sync can upsert it.
create unique index if not exists organizer_contacts_one_per_org on public.organizer_contacts(organizer_id);

-- ---------------------------------------------------------------
-- Expire catalogue rows missing from the sheet. Never deletes; tracked applications keep their notes
-- and show "event cancelled" (the status is read from events.expired).
-- ---------------------------------------------------------------
create or replace function public.expire_events_missing(p_run uuid, p_source uuid, p_present_keys text[]) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_curator() then raise exception 'permission denied'; end if;
  with gone as (
    update public.events e set expired = true, expired_at = now(), crawler_run_id = p_run
    where e.source = 'google_sheet' and not e.expired and e.tedx_event_id is not null
      and not (e.tedx_event_id = any(p_present_keys))
      and exists (select 1 from public.import_sources s where s.id = p_source and s.kind = 'google_sheet')
    returning e.id)
  select count(*) into n from gone;
  return n;
end $$;

-- Auto-expire 30 days after the event date (6.2 freshness SLA). Run by the weekly sync.
create or replace function public.expire_past_events() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with gone as (update public.events set expired = true, expired_at = now()
    where not expired and event_date is not null and event_date < (now() at time zone 'utc')::date - 30 returning id)
  select count(*) into n from gone;
  return n;
end $$;

-- Calls not re-verified within 14 days with a future deadline become stale, not open (6.2 status rules).
create or replace function public.mark_stale_calls() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with s as (update public.events set application_status = 'stale'
    where not expired and application_status = 'open' and application_deadline >= (now() at time zone 'utc')::date
      and coalesce(last_verified_at, status_seen_at, created_at) < now() - interval '14 days' returning id)
  select count(*) into n from s;
  return n;
end $$;

-- Verify queue (S8.3): sorted by staleness and member interest.
create or replace view public.verify_queue as
select e.id, e.tedx_event_id, e.name, e.city, e.country_code, e.event_date, e.application_status, e.application_deadline,
       e.curator_verified, e.needs_review, e.confidence, e.last_verified_at,
       coalesce(w.n, 0) + coalesce(t.n, 0) as interest,
       greatest(0, extract(day from now() - coalesce(e.last_verified_at, e.created_at)))::int as stale_days
from public.events e
left join (select event_id, count(*) n from public.event_watches group by event_id) w on w.event_id = e.id
left join (select event_id, count(*) n from public.target_list group by event_id) t on t.event_id = e.id
where not e.expired and (e.event_date is null or e.event_date >= (now() at time zone 'utc')::date - 30)
  and (not e.curator_verified or e.needs_review or e.last_verified_at is null or e.last_verified_at < now() - interval '14 days'
       or (e.application_deadline is not null and e.application_deadline between (now() at time zone 'utc')::date and (now() at time zone 'utc')::date + 45));

-- A curator verifies an event: clears review, stamps the time and who.
create or replace function public.verify_event(p_event uuid, p_status public.call_status default null, p_deadline date default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_curator() then raise exception 'permission denied'; end if;
  update public.events set curator_verified = true, needs_review = false, verified_by = auth.uid(), last_verified_at = now(),
    application_status = coalesce(p_status, application_status), application_deadline = coalesce(p_deadline, application_deadline),
    status_seen_at = case when p_status is not null then now() else status_seen_at end
    where id = p_event;
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'curator', 'event.verify', 'event', p_event::text, jsonb_build_object('status', p_status, 'deadline', p_deadline, 'note', left(coalesce(p_note, ''), 300)));
end $$;

-- Merge a duplicate into a kept event: move watches, targets, applications and sources; expire the duplicate.
create or replace function public.merge_events(p_keep uuid, p_dup uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_curator() then raise exception 'permission denied'; end if;
  if p_keep = p_dup then raise exception 'SAME_EVENT'; end if;
  update public.event_watches w set event_id = p_keep where event_id = p_dup and not exists (select 1 from public.event_watches x where x.user_id = w.user_id and x.event_id = p_keep);
  delete from public.event_watches where event_id = p_dup;
  update public.target_list t set event_id = p_keep where event_id = p_dup and not exists (select 1 from public.target_list x where x.user_id = t.user_id and x.event_id = p_keep);
  delete from public.target_list where event_id = p_dup;
  update public.applications a set event_id = p_keep where event_id = p_dup and not exists (select 1 from public.applications x where x.user_id = a.user_id and x.event_id = p_keep and x.cycle_year = a.cycle_year);
  update public.application_calls set event_id = p_keep where event_id = p_dup;
  update public.event_topics et set event_id = p_keep where event_id = p_dup and not exists (select 1 from public.event_topics x where x.event_id = p_keep and x.tag = et.tag);
  delete from public.event_topics where event_id = p_dup;
  update public.events set expired = true, expired_at = now(), needs_review = false where id = p_dup;
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'curator', 'event.merge', 'event', p_keep::text, jsonb_build_object('duplicate', p_dup));
end $$;

-- ---------------------------------------------------------------
-- Deadline reminders (F1.2.4): who needs which reminder today. The email layer sends and logs.
-- Covers tracked events (target list) and open applications; respects the member switch; once per interval.
-- ---------------------------------------------------------------
create or replace function public.deadline_reminders_due(p_today date default (now() at time zone 'utc')::date)
returns table (user_id uuid, event_id uuid, event_name text, deadline date, days_before integer)
language sql stable security definer set search_path = public as $$
  with interested as (
    select t.user_id, t.event_id from public.target_list t
    union select a.user_id, a.event_id from public.applications a where a.event_id is not null and a.status in ('planned', 'researching', 'drafting', 'ready')
  )
  select i.user_id, e.id, e.name, e.application_deadline, d.days
  from interested i
  join public.events e on e.id = i.event_id and not e.expired and e.application_deadline is not null
  join public.profiles p on p.user_id = i.user_id and p.deadline_reminders
  join lateral (values (14), (7), (3), (1)) d(days) on e.application_deadline - p_today = d.days
  where public.has_member_access(i.user_id)
    and not exists (select 1 from public.reminder_log r where r.user_id = i.user_id and r.event_id = e.id and r.days_before = d.days and r.deadline = e.application_deadline)
$$;

-- Calendar feed by token: the member's tracked deadlines (F1.2.4, S3.5 Add to calendar).
create or replace function public.calendar_feed(p_token text)
returns table (event_id uuid, event_name text, deadline date, city text, country_code char(2), event_url text)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.application_deadline, e.city, e.country_code, e.event_url
  from public.calendar_tokens ct
  join (select t.user_id, t.event_id from public.target_list t
        union select a.user_id, a.event_id from public.applications a where a.event_id is not null and a.status in ('planned', 'researching', 'drafting', 'ready', 'applied')) i on i.user_id = ct.user_id
  join public.events e on e.id = i.event_id and not e.expired and e.application_deadline is not null
  where ct.token = p_token and public.has_member_access(ct.user_id)
$$;

create or replace function public.my_calendar_token() returns text
language plpgsql security definer set search_path = public as $$
declare v uuid := auth.uid(); t text;
begin
  if v is null then raise exception 'NOT_AUTHENTICATED'; end if;
  insert into public.calendar_tokens (user_id) values (v) on conflict (user_id) do nothing;
  select token into t from public.calendar_tokens where user_id = v;
  return t;
end $$;

-- Members report an outdated listing or send a tip (F1.2.11); credited in the activity log.
create or replace function public.report_event(p_event uuid, p_kind public.report_kind, p_url text default null, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid := auth.uid(); id uuid;
begin
  if v is null then raise exception 'NOT_AUTHENTICATED'; end if;
  insert into public.event_reports (event_id, user_id, kind, url, note) values (p_event, v, p_kind, left(p_url, 500), left(p_note, 1000)) returning event_reports.id into id;
  return id;
end $$;

-- ---------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------
alter table public.import_diffs enable row level security;
alter table public.import_diffs force row level security;
create policy import_diffs_curator on public.import_diffs for all to authenticated using (public.is_curator()) with check (public.is_curator());

alter table public.email_captures enable row level security;
alter table public.email_captures force row level security;
create policy email_captures_insert on public.email_captures for insert to anon, authenticated with check (true);
create policy email_captures_admin on public.email_captures for select to authenticated using (public.is_admin());

alter table public.calendar_tokens enable row level security;
alter table public.calendar_tokens force row level security;
create policy calendar_tokens_own on public.calendar_tokens for select to authenticated using (user_id = auth.uid());

alter table public.reminder_log enable row level security;
alter table public.reminder_log force row level security;
create policy reminder_log_admin on public.reminder_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.import_diffs to authenticated;
grant insert on public.email_captures to anon, authenticated;
grant usage, select on sequence public.email_captures_id_seq to anon, authenticated;
grant select on public.email_captures to authenticated;
grant select on public.calendar_tokens to authenticated;
grant select on public.verify_queue to authenticated;
grant select, insert, update, delete on public.reminder_log to authenticated;
grant execute on function public.expire_events_missing(uuid, uuid, text[]), public.expire_past_events(), public.mark_stale_calls(), public.verify_event(uuid, public.call_status, date, text),
  public.merge_events(uuid, uuid), public.my_calendar_token(), public.report_event(uuid, public.report_kind, text, text) to authenticated;
grant execute on function public.calendar_feed(text) to anon, authenticated;
revoke execute on function public.deadline_reminders_due(date) from public, anon, authenticated;
