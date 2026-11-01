-- One Big Talk: migration 15 (runbook step 12, admin screens A1 to A3 and A5 to A7; blueprint v1.17 Section 9.5)
-- Every function here is security definer and refuses unless public.is_admin(); every write lands in audit_log.
-- Aggregates only where the screen shows aggregates; member rows carry no draft content, ever.

create or replace function public.assert_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = 'insufficient_privilege'; end if;
  if not public.is_admin() then raise exception 'ADMIN_ONLY: this needs an active admin role' using errcode = 'insufficient_privilege'; end if;
end $$;

-- Monthly value of a subscription: six and twelve month prices spread over their months.
create or replace function public.monthly_value_cents(p_amount integer, p_period public.billing_period) returns integer
language sql immutable as $$
  select case p_period when 'monthly' then p_amount when 'six_month' then round(p_amount / 6.0)::int else round(p_amount / 12.0)::int end
$$;

-- A1 Admin home: the funnel by stage (members who reached each step), money and usage this month.
create or replace function public.admin_funnel()
returns table (step text, members integer) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
  select 'Signed up', (select count(*)::int from public.profiles)
  union all select 'Idea locked', (select count(distinct user_id)::int from public.milestones where key = 'idea_locked')
  union all select 'Brief written', (select count(distinct user_id)::int from public.idea_briefs where not is_draft)
  union all select 'Outline final', (select count(distinct user_id)::int from public.milestones where key = 'outline_finalized')
  union all select 'Applied', (select count(distinct user_id)::int from public.applications where applied_at is not null)
  union all select 'Interview', (select count(distinct user_id)::int from public.applications where status = 'interview' or outcome in ('accepted', 'declined'))
  union all select 'Accepted', (select count(distinct user_id)::int from public.milestones where key = 'acceptance_logged')
  union all select 'Script locked', (select count(distinct user_id)::int from public.milestones where key = 'script_locked')
  union all select 'Published', (select count(distinct user_id)::int from public.milestones where key = 'talk_published');
end $$;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_month date := date_trunc('month', now() at time zone 'utc')::date;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'members_by_plan', (select coalesce(jsonb_object_agg(plan, n), '{}') from (select plan::text, count(*) n from public.memberships group by plan) m),
    'trials_active', (select count(*) from public.memberships where plan = 'spark' and trial_ends_at > now()),
    'active_subscriptions', (select count(*) from public.subscriptions where status in ('active', 'trialing', 'past_due')),
    'mrr_cents', (select coalesce(sum(public.monthly_value_cents(amount_cents, billing_period)), 0) from public.subscriptions where status in ('active', 'past_due')),
    'past_due', (select count(*) from public.subscriptions where status = 'past_due'),
    'founding_seats_remaining', public.founding_seats_remaining(),
    'founding_active', (select count(*) from public.memberships where founding_price and plan <> 'spark'),
    'allowances_this_month', (select jsonb_build_object(
        'idea_batches', coalesce(sum(idea_batches_used), 0), 'tailored_applications', coalesce(sum(tailored_applications_used), 0),
        'outlines', coalesce(sum(outlines_used), 0), 'script_drafts', coalesce(sum(script_drafts_used), 0), 'editing_passes', coalesce(sum(editing_passes_used), 0))
      from public.allowances where period_start = v_month),
    'ai_cost_this_month', (select coalesce(jsonb_agg(jsonb_build_object('action', action_key, 'calls', calls, 'cost_usd', cost, 'errors', errors) order by cost desc), '[]')
      from (select action_key, count(*) calls, round(sum(cost_usd)::numeric, 4) cost, count(*) filter (where status <> 'ok') errors
            from public.llm_calls where created_at >= v_month group by action_key) c),
    'ai_cost_total_usd', (select coalesce(round(sum(cost_usd)::numeric, 2), 0) from public.llm_calls where created_at >= v_month),
    'credits_settled_this_month', (select coalesce(sum(credits), 0) from public.credits_ledger where status = 'settled' and created_at >= v_month),
    'reviews_open', (select count(*) from public.reviews where status in ('purchased', 'assigned', 'in_progress')),
    'reviews_overdue', (select count(*) from public.reviews where status in ('purchased', 'assigned', 'in_progress') and due_at < (now() at time zone 'utc')::date),
    'events_total', (select count(*) from public.events),
    'events_verified', (select count(*) from public.events where last_verified_at is not null),
    'events_with_deadline', (select count(*) from public.events where application_deadline is not null)
  ) into v;
  return v;
end $$;

-- A2 Access and A3 Members: one row per member with plan, role, stage, counts and usage (no content).
create or replace function public.admin_members(p_query text default null, p_limit integer default 100)
returns table (user_id uuid, email text, display_name text, role text, access text, plan text, billing_period text, founding_price boolean, trial_ends_at timestamptz,
               plan_ends_at timestamptz, extension_active boolean, region text, stage text, path text, ideas_locked integer, prior_stages integer,
               applications_sent integer, ready_applications integer, credits_this_month bigint, last_activity_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare v_month date := date_trunc('month', now() at time zone 'utc')::date;
begin
  perform public.assert_admin();
  return query
  select u.id, u.email::text, p.display_name, r.role::text, r.access::text, m.plan::text, m.billing_period::text, m.founding_price, m.trial_ends_at,
         m.plan_ends_at, m.extension_active, coalesce(m.region, p.country_code::text),
         (select t.stage::text from public.talks t where t.user_id = u.id and t.archived_at is null order by t.created_at desc limit 1),
         (select t.path::text from public.talks t where t.user_id = u.id and t.archived_at is null order by t.created_at desc limit 1),
         (select count(*)::int from public.ideas i where i.user_id = u.id and i.status = 'locked'),
         (select count(*)::int from public.prior_stages s where s.user_id = u.id),
         (select count(*)::int from public.applications a where a.user_id = u.id and a.applied_at is not null),
         public.ready_applications_sent(u.id),
         (select coalesce(sum(l.credits), 0) from public.credits_ledger l where l.user_id = u.id and l.status = 'settled' and l.created_at >= v_month),
         (select max(al.created_at) from public.activity_log al where al.user_id = u.id),
         u.created_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.user_roles r on r.user_id = u.id
  left join public.memberships m on m.user_id = u.id
  where p_query is null or btrim(p_query) = '' or u.email ilike '%' || p_query || '%' or p.display_name ilike '%' || p_query || '%'
  order by u.created_at desc limit greatest(1, least(p_limit, 500));
end $$;

-- A3 Members: the Talk Record timeline (milestones and activity kinds with dates; never the text of a draft).
create or replace function public.admin_member_timeline(p_user uuid)
returns table (at timestamptz, kind text, label text, talk_id uuid) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
  select ms.earned_at, 'milestone'::text, ms.key::text, ms.talk_id from public.milestones ms where ms.user_id = p_user
  union all
  select al.created_at, 'activity'::text, al.kind::text, al.talk_id from public.activity_log al where al.user_id = p_user
  order by 1 desc limit 300;
end $$;

-- A3 Members: this month's allowances for one member.
create or replace function public.admin_member_allowances(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_month date := date_trunc('month', now() at time zone 'utc')::date;
begin
  perform public.assert_admin();
  select to_jsonb(a) - 'user_id' into v from public.allowances a where a.user_id = p_user and a.period_start = v_month;
  return coalesce(v, '{}'::jsonb);
end $$;

-- Admin writes. Each one audits.
create or replace function public.admin_set_role(p_user uuid, p_role public.app_role, p_access public.access_state) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_user = auth.uid() and (p_role <> 'admin' or p_access <> 'active') then raise exception 'CANNOT_DEMOTE_SELF' using errcode = 'check_violation'; end if;
  insert into public.user_roles (user_id, role, access, granted_by) values (p_user, p_role, p_access, auth.uid())
  on conflict (user_id) do update set role = excluded.role, access = excluded.access, granted_by = auth.uid(), granted_at = now();
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'admin', 'set_role', 'user', p_user::text, jsonb_build_object('role', p_role, 'access', p_access));
end $$;

create or replace function public.admin_set_plan(p_user uuid, p_plan public.plan_kind, p_period public.billing_period default null, p_founding boolean default null, p_ends_at timestamptz default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  insert into public.memberships (user_id, plan, billing_period, founding_price, plan_started_at, plan_ends_at)
    values (p_user, p_plan, p_period, coalesce(p_founding, false), now(), p_ends_at)
  on conflict (user_id) do update set plan = excluded.plan, billing_period = coalesce(excluded.billing_period, public.memberships.billing_period),
    founding_price = coalesce(p_founding, public.memberships.founding_price), plan_started_at = now(), plan_ends_at = coalesce(p_ends_at, public.memberships.plan_ends_at);
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'admin', 'set_plan', 'membership', p_user::text, jsonb_build_object('plan', p_plan, 'period', p_period, 'founding', p_founding, 'ends_at', p_ends_at, 'note', left(coalesce(p_note, ''), 200)));
end $$;

-- B4: the 100-applications access extension (10.5), granted by hand after the count is checked.
create or replace function public.admin_grant_extension(p_user uuid, p_until timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.memberships set extension_active = true, extension_until = p_until where user_id = p_user;
  if not found then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'admin', 'grant_extension', 'membership', p_user::text, jsonb_build_object('until', p_until, 'ready_applications', public.ready_applications_sent(p_user)));
end $$;

-- A5 AI settings: flags, prompt versions with their last eval, recent eval runs.
create or replace function public.admin_ai_settings() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'flags', (select coalesce(jsonb_agg(to_jsonb(f) order by f.key), '[]') from public.feature_flags f),
    'prompt_versions', (select coalesce(jsonb_agg(to_jsonb(p) order by p.action_key, p.version), '[]') from public.prompt_versions p),
    'eval_runs', (select coalesce(jsonb_agg(to_jsonb(e) order by e.ran_at desc), '[]') from (select * from public.eval_runs order by ran_at desc limit 50) e),
    'cost_by_model_30d', (select coalesce(jsonb_agg(jsonb_build_object('model', model, 'calls', calls, 'cost_usd', cost)), '[]')
      from (select model, count(*) calls, round(sum(cost_usd)::numeric, 4) cost from public.llm_calls where created_at >= now() - interval '30 days' group by model) c)
  ) into v;
  return v;
end $$;

create or replace function public.admin_set_flag(p_key text, p_enabled boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  update public.feature_flags set enabled = p_enabled, updated_at = now() where key = p_key;
  if not found then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'admin', 'set_flag', 'feature_flag', p_key, jsonb_build_object('enabled', p_enabled));
end $$;

create or replace function public.admin_activate_prompt(p_action text, p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if not exists (select 1 from public.prompt_versions where action_key = p_action and version = p_version) then raise exception 'NOT_FOUND' using errcode = 'no_data_found'; end if;
  update public.prompt_versions set active = false where action_key = p_action and active;
  update public.prompt_versions set active = true, activated_at = now(), activated_by = auth.uid() where action_key = p_action and version = p_version;
  insert into public.audit_log (actor_id, actor_role, action, resource_type, resource_id, details)
    values (auth.uid(), 'admin', 'activate_prompt', 'prompt_version', p_action || '.' || p_version, '{}');
end $$;

-- A7 Billing: subscriptions with the member's email, recent invoices, add-ons and reviews, the seat counter.
create or replace function public.admin_billing() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'founding_seats_remaining', public.founding_seats_remaining(),
    'subscriptions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'email', u.email, 'status', s.status, 'plan', s.plan, 'period', s.billing_period, 'founding', s.founding_price,
        'amount_cents', s.amount_cents, 'monthly_cents', public.monthly_value_cents(s.amount_cents, s.billing_period), 'period_end', s.current_period_end, 'cancel_at', s.cancel_at, 'canceled_at', s.canceled_at) order by s.created_at desc), '[]')
      from (select * from public.subscriptions order by created_at desc limit 200) s join auth.users u on u.id = s.user_id),
    'invoices', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'email', u.email, 'amount_paid_cents', i.amount_paid_cents, 'tax_cents', i.tax_cents, 'refunded_cents', i.refunded_cents, 'status', i.status, 'paid_at', i.paid_at, 'url', i.hosted_invoice_url) order by i.created_at desc), '[]')
      from (select * from public.invoices order by created_at desc limit 100) i join auth.users u on u.id = i.user_id),
    'addons', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'email', u.email, 'kind', a.kind, 'amount_cents', a.amount_cents, 'purchased_at', a.purchased_at, 'refunded_at', a.refunded_at,
        'review_status', (select r.status from public.reviews r where r.purchase_id = a.id limit 1), 'due_at', (select r.due_at from public.reviews r where r.purchase_id = a.id limit 1)) order by a.purchased_at desc), '[]')
      from public.addon_purchases a join auth.users u on u.id = a.user_id),
    'revenue_this_month_cents', (select coalesce(sum(amount_paid_cents - refunded_cents), 0) from public.invoices where paid_at >= date_trunc('month', now())),
    'tax_this_month_cents', (select coalesce(sum(tax_cents), 0) from public.invoices where paid_at >= date_trunc('month', now())),
    'refunds_this_month_cents', (select coalesce(sum(refunded_cents), 0) from public.invoices where created_at >= date_trunc('month', now()))
  ) into v;
  return v;
end $$;

-- A6 Reports: cohort outcomes, churn by plan and period, allowance burn, event coverage. Aggregates only.
create or replace function public.admin_reports() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_month date := date_trunc('month', now() at time zone 'utc')::date;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'outcomes', (select jsonb_build_object('applied', count(*) filter (where applied_at is not null), 'interview', count(*) filter (where status = 'interview' or outcome in ('accepted', 'declined')),
        'accepted', count(*) filter (where outcome = 'accepted'), 'declined', count(*) filter (where outcome = 'declined'), 'withdrawn', count(*) filter (where outcome = 'withdrawn'),
        'ready_sent', count(*) filter (where applied_at is not null and readiness_checked_at is not null)) from public.applications),
    'churn', (select coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'period', billing_period, 'total', total, 'canceled', canceled, 'churn_pct', case when total > 0 then round(canceled * 100.0 / total, 1) else 0 end)), '[]')
      from (select plan, billing_period, count(*) total, count(*) filter (where status in ('canceled', 'expired')) canceled from public.subscriptions group by plan, billing_period) c),
    'allowance_burn', (select jsonb_build_object('members_with_usage', count(*),
        'idea_batches_pct', round(100.0 * coalesce(sum(idea_batches_used), 0) / nullif(sum(idea_batches_allowed), 0), 1),
        'outlines_pct', round(100.0 * coalesce(sum(outlines_used), 0) / nullif(sum(outlines_allowed), 0), 1),
        'script_drafts_pct', round(100.0 * coalesce(sum(script_drafts_used), 0) / nullif(sum(script_drafts_allowed), 0), 1),
        'editing_passes_pct', round(100.0 * coalesce(sum(editing_passes_used), 0) / nullif(sum(editing_passes_allowed), 0), 1),
        'tailored_applications_pct', round(100.0 * coalesce(sum(tailored_applications_used), 0) / nullif(sum(tailored_applications_allowed), 0), 1))
      from public.allowances where period_start = v_month),
    'event_coverage', (select jsonb_build_object('total', count(*), 'verified', count(*) filter (where last_verified_at is not null),
        'with_deadline', count(*) filter (where application_deadline is not null), 'open_calls', count(*) filter (where application_status = 'open'),
        'stale_60d', count(*) filter (where last_verified_at < now() - interval '60 days'),
        'deadline_coverage_pct', round(100.0 * count(*) filter (where application_deadline is not null) / nullif(count(*), 0), 1)) from public.events),
    'practice_this_week', (select jsonb_build_object('members_with_runs', count(distinct user_id), 'runs', count(*)) from public.timed_runs where started_at >= public.week_start_of()),
    'discovered_in_app_pct', (select round(100.0 * count(*) filter (where event_id is not null) / nullif(count(*) filter (where applied_at is not null), 0), 1) from public.applications where applied_at is not null)
  ) into v;
  return v;
end $$;

-- Recent audit rows for the admin screens.
create or replace function public.admin_audit(p_limit integer default 100)
returns table (id bigint, at timestamptz, actor_email text, actor_role text, action text, resource_type text, resource_id text, details jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query select a.id, a.created_at, u.email::text, a.actor_role::text, a.action, a.resource_type, a.resource_id, a.details
    from public.audit_log a left join auth.users u on u.id = a.actor_id order by a.created_at desc limit greatest(1, least(p_limit, 500));
end $$;

grant execute on function public.assert_admin(), public.monthly_value_cents(integer, public.billing_period), public.admin_funnel(), public.admin_overview(),
  public.admin_members(text, integer), public.admin_member_timeline(uuid), public.admin_member_allowances(uuid),
  public.admin_set_role(uuid, public.app_role, public.access_state), public.admin_set_plan(uuid, public.plan_kind, public.billing_period, boolean, timestamptz, text),
  public.admin_grant_extension(uuid, timestamptz), public.admin_ai_settings(), public.admin_set_flag(text, boolean), public.admin_activate_prompt(text, text),
  public.admin_billing(), public.admin_reports(), public.admin_audit(integer) to authenticated;
