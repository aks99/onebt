-- One Big Talk: migration 8
-- Billing and allowance functions used by the API (runAiAction, Stripe webhooks, Me screen).
-- Blueprint v1.7 Sections 10.3, 10.4, 12.10. All functions are security definer and check auth.uid()
-- or are restricted to service_role by grants at the end of this file.

-- ---------------------------------------------------------------
-- Trial (3 days, one locked idea, three events; owner decision 1 Nov 2026)
-- ---------------------------------------------------------------
create or replace function public.is_trial_active(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select m.plan = 'spark' and m.trial_ends_at > now() from public.memberships m where m.user_id = p_user), false)
$$;

create or replace function public.has_member_access(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select (m.plan in ('founding', 'regular') and (m.plan_ends_at is null or m.plan_ends_at > now()) and (m.paused_until is null or m.paused_until < now()))
        or (m.plan = 'spark' and m.trial_ends_at > now())
        or (m.extension_active and (m.extension_until is null or m.extension_until > now()))
    from public.memberships m where m.user_id = p_user), false)
$$;

-- Trial limits: one locked idea and three tracked events (target list or applications with an event).
create or replace function public.trial_limit_check(p_user uuid, p_kind text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_trial_active(p_user) then return true; end if;
  if p_kind = 'lock_idea' then
    select count(*) into n from public.ideas where user_id = p_user and status = 'locked';
    return n < 1;
  elsif p_kind = 'track_event' then
    select count(distinct event_id) into n from (
      select event_id from public.target_list where user_id = p_user
      union select event_id from public.applications where user_id = p_user and event_id is not null) x;
    return n < 3;
  end if;
  return true;
end $$;

-- ---------------------------------------------------------------
-- Allowances: consume one unit of a named allowance for the current month. Returns the row.
-- Raises ALLOWANCE_EXHAUSTED with the reset date in the message (shown to the member in plain words).
-- ---------------------------------------------------------------
create or replace function public.consume_allowance(p_user uuid, p_key text) returns public.allowances
language plpgsql security definer set search_path = public as $$
declare a public.allowances%rowtype; ps date := date_trunc('month', now() at time zone 'utc')::date;
        allowed integer; used integer; col text;
begin
  perform public.ensure_allowance_row(p_user);
  select * into a from public.allowances where user_id = p_user and period_start = ps for update;
  case p_key
    when 'idea_batch' then allowed := a.idea_batches_allowed; used := a.idea_batches_used; col := 'idea_batches_used';
    when 'tailored_application' then allowed := a.tailored_applications_allowed; used := a.tailored_applications_used; col := 'tailored_applications_used';
    when 'outline' then allowed := a.outlines_allowed; used := a.outlines_used; col := 'outlines_used';
    when 'script_draft' then allowed := a.script_drafts_allowed; used := a.script_drafts_used; col := 'script_drafts_used';
    when 'editing_pass' then allowed := a.editing_passes_allowed; used := a.editing_passes_used; col := 'editing_passes_used';
    else raise exception 'UNKNOWN_ALLOWANCE: %', p_key using errcode = 'invalid_parameter_value';
  end case;
  if used >= allowed then
    raise exception 'ALLOWANCE_EXHAUSTED: you have used this month''s % %. Resets %.', allowed, replace(p_key, '_', ' ') || 's', to_char(a.resets_at, 'DD Mon')
      using errcode = 'check_violation';
  end if;
  execute format('update public.allowances set %I = %I + 1 where user_id = $1 and period_start = $2', col, col) using p_user, ps;
  select * into a from public.allowances where user_id = p_user and period_start = ps;
  return a;
end $$;

-- Fair-use counters for "unlimited" items (scorecards 60, readiness 60, framing 20, fact-check 10).
create or replace function public.consume_fair_use(p_user uuid, p_key text, p_cap integer) returns integer
language plpgsql security definer set search_path = public as $$
declare ps date := date_trunc('month', now() at time zone 'utc')::date; col text; cur integer;
begin
  perform public.ensure_allowance_row(p_user);
  col := 'fair_use_' || p_key || '_used';
  execute format('select %I from public.allowances where user_id = $1 and period_start = $2 for update', col) into cur using p_user, ps;
  if cur >= p_cap then
    raise exception 'FAIR_USE_REACHED: this month''s fair-use limit of % for % is reached.', p_cap, replace(p_key, '_', ' ') using errcode = 'check_violation';
  end if;
  execute format('update public.allowances set %I = %I + 1 where user_id = $1 and period_start = $2', col, col) using p_user, ps;
  return cur + 1;
end $$;

-- ---------------------------------------------------------------
-- Credits: reserve on start, settle on success, release on failure; idempotent by key (12.10 v1.4)
-- ---------------------------------------------------------------
create or replace function public.reserve_credits(p_user uuid, p_action text, p_credits integer, p_idempotency_key text, p_talk uuid default null)
returns public.credits_ledger language plpgsql security definer set search_path = public as $$
declare row public.credits_ledger%rowtype;
begin
  select * into row from public.credits_ledger where user_id = p_user and idempotency_key = p_idempotency_key;
  if found then return row; end if;   -- a retry returns the existing reservation, never a second charge
  insert into public.credits_ledger (user_id, talk_id, action_key, credits, status, idempotency_key)
  values (p_user, p_talk, p_action, p_credits, 'reserved', p_idempotency_key) returning * into row;
  return row;
end $$;

create or replace function public.settle_credits(p_ledger_id bigint, p_llm_call uuid default null) returns public.credits_ledger
language plpgsql security definer set search_path = public as $$
declare row public.credits_ledger%rowtype;
begin
  update public.credits_ledger set status = 'settled', settled_at = now(), llm_call_id = coalesce(p_llm_call, llm_call_id)
  where id = p_ledger_id and status = 'reserved' returning * into row;
  if not found then select * into row from public.credits_ledger where id = p_ledger_id; end if;
  return row;
end $$;

create or replace function public.release_credits(p_ledger_id bigint, p_note text default null) returns public.credits_ledger
language plpgsql security definer set search_path = public as $$
declare row public.credits_ledger%rowtype;
begin
  update public.credits_ledger set status = 'released', settled_at = now(), note = coalesce(p_note, note)
  where id = p_ledger_id and status = 'reserved' returning * into row;
  if not found then select * into row from public.credits_ledger where id = p_ledger_id; end if;
  return row;
end $$;

-- Monthly settled credits per member (for the cost dashboard and the per-member cap, 12.4)
create or replace function public.credits_settled_this_month(p_user uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(credits), 0)::int from public.credits_ledger
  where user_id = p_user and status = 'settled' and created_at >= date_trunc('month', now() at time zone 'utc')
$$;

-- ---------------------------------------------------------------
-- Founding seats: a seat claimed at checkout is released if the checkout expires unpaid
-- (decision logged in Appendix C, v1.8). Both functions are service_role only.
-- ---------------------------------------------------------------
create or replace function public.release_founding_seat() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.founding_seats set taken = greatest(taken - 1, 0), updated_at = now() where id = true;
end $$;

create table public.founding_seat_reservations (
  checkout_session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_tier public.plan_kind not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text check (resolution in ('paid', 'expired', 'released'))
);
alter table public.founding_seat_reservations enable row level security;
alter table public.founding_seat_reservations force row level security;
create policy fsr_admin_read on public.founding_seat_reservations for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------
-- Apply a paid plan (called by the Stripe webhook as service_role)
-- ---------------------------------------------------------------
create or replace function public.apply_paid_plan(p_user uuid, p_plan public.plan_kind, p_period public.billing_period, p_founding boolean, p_period_end timestamptz)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.memberships set
    plan = p_plan,
    billing_period = p_period,
    founding_price = p_founding,
    plan_started_at = coalesce(plan_started_at, now()),
    plan_ends_at = p_period_end,
    paused_until = null,
    updated_at = now()
  where user_id = p_user;
  perform public.ensure_allowance_row(p_user);
end $$;

-- Lapse: when a subscription ends, the member returns to Spark. The founding price is lost if the lapse
-- exceeds 30 days (10.10); the webhook handler decides and passes p_keep_founding.
create or replace function public.lapse_plan(p_user uuid, p_keep_founding boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.memberships set plan = 'spark', billing_period = null, founding_price = case when p_keep_founding then founding_price else false end,
    plan_ends_at = now(), updated_at = now()
  where user_id = p_user;
  perform public.ensure_allowance_row(p_user);
end $$;

-- ---------------------------------------------------------------
-- Grants: members may call the read-only checks; everything that moves money, credits or plans is
-- service_role only (the API runs those with the service key after its own checks).
-- ---------------------------------------------------------------
revoke execute on function public.consume_allowance(uuid, text) from public, authenticated, anon;
revoke execute on function public.consume_fair_use(uuid, text, integer) from public, authenticated, anon;
revoke execute on function public.reserve_credits(uuid, text, integer, text, uuid) from public, authenticated, anon;
revoke execute on function public.settle_credits(bigint, uuid) from public, authenticated, anon;
revoke execute on function public.release_credits(bigint, text) from public, authenticated, anon;
revoke execute on function public.release_founding_seat() from public, authenticated, anon;
revoke execute on function public.claim_founding_seat(uuid) from public, authenticated, anon;
revoke execute on function public.apply_paid_plan(uuid, public.plan_kind, public.billing_period, boolean, timestamptz) from public, authenticated, anon;
revoke execute on function public.lapse_plan(uuid, boolean) from public, authenticated, anon;
grant execute on function public.is_trial_active(uuid), public.has_member_access(uuid), public.trial_limit_check(uuid, text), public.credits_settled_this_month(uuid) to authenticated;
