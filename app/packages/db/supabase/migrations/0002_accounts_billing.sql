-- One Big Talk: foundation migration 2 of 7
-- Accounts, memberships, founding seats, trial, Stripe mirrors, allowances, credit ledger,
-- LLM call log, email and audit logs, consents. Blueprint v1.5 Sections 10, 12.3, 12.10.

-- Carried over from the legacy foundation: allow-list (closed access is optional, off by default).
create table public.allowed_emails (
  email citext primary key,
  note text,
  added_by uuid references auth.users(id),
  added_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  expertise_line text check (char_length(expertise_line) <= 120),
  city text,
  region text,
  country_code char(2),
  timezone text not null default 'UTC',
  target_talk_month date,                       -- first of month; null = "not sure"
  segment text check (segment in ('coach', 'author', 'executive', 'academic', 'india', 'other')),
  headshot_path text,                           -- Supabase Storage path (an image, never audio or video)
  hometown text,
  alma_mater text,
  places_lived text[] not null default '{}',
  travel_radius_km integer check (travel_radius_km between 0 and 20000),
  expectation_acknowledged_at timestamptz,      -- Section 3.6 screen, once per account
  guided_mode boolean not null default true,     -- Section 5.8
  ai_enabled boolean not null default true,      -- Me -> AI global switch
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- The single founding counter. One row. 30 seats, server-counted (Section 10.1 rule 7).
create table public.founding_seats (
  id boolean primary key default true check (id),  -- forces a single row
  total integer not null default 30,
  taken integer not null default 0 check (taken >= 0 and taken <= total),
  updated_at timestamptz not null default now()
);
insert into public.founding_seats (id, total, taken) values (true, 30, 0);

create table public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan public.plan_kind not null default 'spark',
  billing_period public.billing_period,
  founding_price boolean not null default false,
  region text,
  plan_started_at timestamptz,
  plan_ends_at timestamptz,
  -- 3-day trial, no card, limited to one locked idea and three events (Section 10.4, owner decision 1 Nov 2026)
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  trial_used boolean not null default false,
  paused_until timestamptz,
  extension_active boolean not null default false,   -- the 100-applications access extension (10.5)
  extension_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plan = 'spark' or billing_period is not null)
);
create trigger memberships_touch before update on public.memberships for each row execute function public.touch_updated_at();

-- Mirrors of Stripe objects. Stripe is the source of truth; webhooks write here (Section 10.6, 12.10).
create table public.subscriptions (
  id text primary key,                          -- Stripe subscription id
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  status public.subscription_status not null,
  plan public.plan_kind not null,
  billing_period public.billing_period not null,
  founding_price boolean not null default false,
  price_id text not null,
  amount_cents integer not null,
  currency char(3) not null default 'usd',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  last_event_id text,                           -- idempotency: the newest Stripe event applied
  last_event_created timestamptz,               -- ordering: ignore older events
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions(user_id);
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();

create table public.invoices (
  id text primary key,                          -- Stripe invoice id
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id text references public.subscriptions(id) on delete set null,
  amount_paid_cents integer not null,
  tax_cents integer not null default 0,         -- from Stripe Tax
  currency char(3) not null default 'usd',
  status text not null,
  hosted_invoice_url text,
  paid_at timestamptz,
  refunded_cents integer not null default 0,
  created_at timestamptz not null default now()
);
create index invoices_user_idx on public.invoices(user_id);

-- Processed webhook events, so a duplicate delivery never applies twice (Section 12.10).
create table public.stripe_events (
  id text primary key,
  type text not null,
  created timestamptz not null,
  processed_at timestamptz not null default now()
);

-- The two $497 add-ons (owner decision 31 Oct 2026); 5-business-day SLA for both (1 Nov 2026).
create table public.addon_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.review_kind not null,
  amount_cents integer not null default 49700,
  stripe_payment_intent_id text unique,
  purchased_at timestamptz not null default now(),
  refunded_at timestamptz
);

-- Member-facing allowances, one row per member per calendar month (Section 10.3). Members see
-- plain words ("tailored applications left this month: 12 of 15"), never credits.
create table public.allowances (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,                   -- first day of the month in UTC
  idea_batches_allowed integer not null default 0,
  idea_batches_used integer not null default 0,
  tailored_applications_allowed integer not null default 0,
  tailored_applications_used integer not null default 0,
  outlines_allowed integer not null default 0,
  outlines_used integer not null default 0,
  script_drafts_allowed integer not null default 0,
  script_drafts_used integer not null default 0,
  editing_passes_allowed integer not null default 0,
  editing_passes_used integer not null default 0,
  fair_use_scorecards_used integer not null default 0,     -- cap 60
  fair_use_expansions_used integer not null default 0,     -- counted with scorecards
  fair_use_readiness_used integer not null default 0,      -- cap 60
  fair_use_framing_used integer not null default 0,        -- cap 20
  fair_use_factcheck_used integer not null default 0,      -- cap 10
  resets_at timestamptz not null,
  primary key (user_id, period_start)
);

-- Internal, append-only credit ledger. Reserve on start, settle on success, release on failure.
-- The idempotency key makes a retry or a refresh harmless (Section 12.10, v1.4).
create table public.credits_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid,                                  -- fk added after talks exists
  action_key text not null,                      -- e.g. 'idea_batch', 'script_draft'
  credits integer not null check (credits >= 0),
  status public.ledger_status not null default 'reserved',
  idempotency_key text not null,
  llm_call_id uuid,
  note text,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (user_id, idempotency_key)
);
create index credits_ledger_user_idx on public.credits_ledger(user_id, created_at desc);

-- Every model call (Section 12.4). Retained 90 days with a hashed user id by a scheduled job.
create table public.llm_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_hash text,                                -- kept after user_id is nulled by retention
  talk_id uuid,
  action_key text not null,
  model text not null,                           -- 'claude-sonnet-5-5' | 'claude-haiku-5-5'
  prompt_version text not null,                  -- e.g. 'outline.v1'
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cost_usd numeric(10,6) not null default 0,
  latency_ms integer,
  credits_charged integer not null default 0,
  status text not null default 'ok',             -- ok | error | blocked_by_linter | gate_refused
  error_code text,                               -- BRIEF_TOO_SHORT, OUTLINE_NOT_FINAL, ...
  created_at timestamptz not null default now()
);
create index llm_calls_created_idx on public.llm_calls(created_at desc);
create index llm_calls_user_idx on public.llm_calls(user_id, created_at desc);

create table public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  to_email citext not null,
  template text not null,                        -- weekly_plan, deadline_14d, magic_link, ...
  subject text,
  provider_message_id text,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role public.app_role,
  action text not null,
  resource_type text not null,
  resource_id text,
  details jsonb not null default '{}',           -- never full draft content, never secrets
  created_at timestamptz not null default now()
);

create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                            -- terms, privacy, ai_disclosure, testimonial, marketing
  version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);
create index consents_user_idx on public.consents(user_id, kind);

-- ---------------------------------------------------------------
-- New-user bootstrap: exactly one profile, one membership, one role, one allowance row,
-- and the 3-day trial started (Phase 0 acceptance: "first login creates exactly one
-- membership and one profile").
-- ---------------------------------------------------------------
create or replace function public.allowance_defaults(p public.plan_kind, trialing boolean)
returns table (idea_batches int, tailored int, outlines int, drafts int, passes int)
language sql immutable as $$
  select case when p in ('founding','regular') or trialing then 10 else 1 end,
         case when p in ('founding','regular') or trialing then 15 else 0 end,
         case when p in ('founding','regular') or trialing then 5 else 0 end,
         case when p in ('founding','regular') or trialing then 3 else 0 end,
         case when p in ('founding','regular') or trialing then 30 else 0 end
$$;

create or replace function public.ensure_allowance_row(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m public.memberships%rowtype;
  d record;
  ps date := date_trunc('month', now() at time zone 'utc')::date;
begin
  select * into m from public.memberships where user_id = p_user;
  select * into d from public.allowance_defaults(m.plan, coalesce(m.trial_ends_at > now(), false));
  insert into public.allowances (user_id, period_start, idea_batches_allowed, tailored_applications_allowed,
    outlines_allowed, script_drafts_allowed, editing_passes_allowed, resets_at)
  values (p_user, ps, d.idea_batches, d.tailored, d.outlines, d.drafts, d.passes,
    (ps + interval '1 month') at time zone 'utc')
  on conflict (user_id, period_start) do update set
    idea_batches_allowed = excluded.idea_batches_allowed,
    tailored_applications_allowed = excluded.tailored_applications_allowed,
    outlines_allowed = excluded.outlines_allowed,
    script_drafts_allowed = excluded.script_drafts_allowed,
    editing_passes_allowed = excluded.editing_passes_allowed;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.user_roles (user_id, role, access) values (new.id, 'member', 'active') on conflict do nothing;
  insert into public.memberships (user_id, plan, trial_started_at, trial_ends_at, trial_used)
  values (new.id, 'spark', now(), now() + interval '3 days', true)
  on conflict do nothing;
  perform public.ensure_allowance_row(new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Founding seat purchase: atomic. Returns the price tier the buyer actually gets.
-- Called by the Stripe checkout session creator (service role) before the price is shown.
-- ---------------------------------------------------------------
create or replace function public.claim_founding_seat(p_user uuid)
returns public.plan_kind language plpgsql security definer set search_path = public as $$
declare
  s public.founding_seats%rowtype;
begin
  select * into s from public.founding_seats where id = true for update;
  if s.taken < s.total then
    update public.founding_seats set taken = taken + 1, updated_at = now() where id = true;
    return 'founding';
  end if;
  return 'regular';
end $$;

create or replace function public.founding_seats_remaining() returns integer
language sql stable security definer set search_path = public as $$
  select greatest(total - taken, 0) from public.founding_seats where id = true
$$;
