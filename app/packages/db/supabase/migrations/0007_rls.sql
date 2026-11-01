-- One Big Talk: foundation migration 7 of 7
-- Row-level security on every table. Blueprint v1.5 Section 12.3:
--   members read and write only rows where user_id is their own;
--   curators write the catalogue (events*, organizers*) and read import provenance;
--   admins everything except login tokens; role checks are server-side functions, never a client flag.
-- Tables with no policy for a role are closed to that role. service_role bypasses RLS (Supabase default).

-- Schema grants (Supabase sets similar defaults; stated here so local tests match production)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
-- anon sees only the public views and the seat counter
revoke all on all tables in schema public from anon;
grant select on public.public_open_calls, public.public_counts to anon, authenticated;
grant execute on function public.founding_seats_remaining() to anon;

-- ---------------------------------------------------------------
-- 1. Member-owned tables: full ownership of own rows
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','memberships','consents','talks','idea_dossiers','ideas','idea_expansions','writing_samples',
    'prior_stages','event_watches','target_list','pitch_packs','pitch_variants','applications','idea_briefs',
    'outlines','outline_versions','scripts','script_versions','claims','beats','beat_progress','timed_runs',
    'runs','rehearsal_plans','live_audience_logs','launch_plans','clip_plans','press_kits','outcomes',
    'clinic_attendance','clinic_questions','event_reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid() or public.is_admin())', t || '_own_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())', t || '_own_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())', t || '_own_delete', t);
  end loop;
end $$;

-- Members may not change their own plan, trial or extension: those columns are written by the billing
-- service (service_role). They can only edit region and paused_until through the API, which also uses
-- service_role. So: members read memberships, nothing else.
drop policy memberships_own_insert on public.memberships;
drop policy memberships_own_update on public.memberships;
drop policy memberships_own_delete on public.memberships;

-- Profiles are created by the new-user trigger; members may update their own, never insert a second or delete.
drop policy profiles_own_insert on public.profiles;
drop policy profiles_own_delete on public.profiles;

-- A talk's "stale" flags, counts_toward_100 and applied dates are set by triggers; fine under own_update.

-- ---------------------------------------------------------------
-- 2. Member read-only tables (written by the service role only)
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['allowances','credits_ledger','llm_calls','subscriptions','invoices','addon_purchases','reviews'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid() or public.is_admin())', t || '_own_select', t);
  end loop;
end $$;

-- talk_stats has no user_id; ownership runs through talks
alter table public.talk_stats enable row level security;
alter table public.talk_stats force row level security;
create policy talk_stats_owner on public.talk_stats for select to authenticated
  using (exists (select 1 from public.talks t where t.id = talk_stats.talk_id and t.user_id = auth.uid()) or public.is_admin());

-- ---------------------------------------------------------------
-- 3. Roles and access: a user sees own row; admins manage
-- ---------------------------------------------------------------
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
create policy user_roles_self on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy user_roles_admin_write on public.user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------
-- 4. Catalogue: every active member reads; curators and admins write
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['events','application_calls','organizers','event_topics','known_talk_titles'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_active_member())', t || '_member_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_curator()) with check (public.is_curator())', t || '_curator_write', t);
  end loop;
end $$;

-- Organizer contact details: curators and admins only. Members never read this table.
do $$
declare t text;
begin
  foreach t in array array['organizer_contacts','import_sources','crawler_runs','event_sources','organizer_claims'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_curator()) with check (public.is_curator())', t || '_curator_only', t);
  end loop;
end $$;

-- Curators read reports to work the ticket queue (members already insert and read their own above)
create policy event_reports_curator on public.event_reports for all to authenticated using (public.is_curator()) with check (public.is_curator());

-- ---------------------------------------------------------------
-- 5. Ops and admin-only tables
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['allowed_emails','audit_log','email_log','eval_runs','stripe_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_only', t);
  end loop;
end $$;
-- stripe_events is written by the webhook handler as service_role; admins may read it. Members never.
drop policy stripe_events_admin_only on public.stripe_events;
create policy stripe_events_admin_read on public.stripe_events for select to authenticated using (public.is_admin());

-- Flags and prompt versions: everyone reads, admins write
do $$
declare t text;
begin
  foreach t in array array['feature_flags','prompt_versions','clinics'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_write', t);
  end loop;
end $$;

-- founding_seats: nobody writes directly except service_role through claim_founding_seat()
alter table public.founding_seats enable row level security;
alter table public.founding_seats force row level security;
create policy founding_seats_read on public.founding_seats for select to authenticated using (true);

-- The materialized view and the public views are readable by members (anon reads the public views only)
grant select on public.cohort_stats to authenticated;
