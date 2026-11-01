-- One Big Talk: foundation migration 1 of 7
-- Extensions, enums, role helpers. Blueprint v1.5 Sections 12.1, 12.3, 12.5.
-- House rule: this product is text only. No table here stores audio or video.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists citext;
create extension if not exists vector;

-- ---------------------------------------------------------------
-- Enums (one place, so the API and the UI share the vocabulary)
-- ---------------------------------------------------------------
create type public.plan_kind as enum ('spark', 'founding', 'regular');
create type public.billing_period as enum ('monthly', 'six_month', 'twelve_month');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired');
create type public.access_state as enum ('invited', 'active', 'paused', 'removed');
create type public.app_role as enum ('member', 'coach', 'curator', 'admin');
create type public.talk_path as enum ('apply', 'invited', 'published');
create type public.talk_stage as enum ('position', 'discover', 'apply', 'write', 'rehearse', 'perform', 'amplify');
create type public.idea_status as enum ('candidate', 'locked', 'archived');
create type public.event_type as enum ('standard', 'university', 'youth', 'salon', 'women', 'business', 'ed', 'play', 'live', 'internal', 'library', 'countdown', 'studio', 'other');
-- Section 6.2 status rules (v1.4): a call status is a separate fact from an event's existence.
create type public.call_status as enum ('open', 'announced', 'rolling', 'closed', 'nomination', 'invitation_only', 'stale', 'unknown');
create type public.tz_status as enum ('stated', 'inferred', 'unknown');
create type public.ai_policy as enum ('allowed', 'restricted', 'prohibited', 'unknown');
create type public.record_source as enum ('crawler', 'organizer', 'curator', 'user_tip', 'google_sheet');
create type public.import_kind as enum ('csv_upload', 'google_sheet');
create type public.pipeline_status as enum ('planned', 'researching', 'drafting', 'ready', 'applied', 'follow_up_due', 'interview', 'accepted', 'declined', 'withdrawn', 'reapply');
create type public.application_outcome as enum ('accepted', 'declined', 'withdrawn');
create type public.version_source as enum ('user', 'llm', 'coach');
create type public.outline_status as enum ('draft', 'final');
create type public.claim_status as enum ('needs_source', 'source_added', 'verified_by_member', 'firsthand_account', 'narrowed');
create type public.story_consent as enum ('named_with_permission', 'pseudonymized', 'composite');
create type public.beat_state as enum ('new', 'learning', 'known', 'cold');
create type public.run_mode as enum ('timer', 'prompter', 'live_audience');
create type public.publication_state as enum ('not_delivered', 'delivered', 'awaiting_upload', 'in_review', 'published', 'not_approved', 'limited');
create type public.ledger_status as enum ('reserved', 'settled', 'released');
create type public.review_kind as enum ('application_review', 'script_review');
create type public.review_status as enum ('purchased', 'assigned', 'in_progress', 'returned', 'refunded');
create type public.report_kind as enum ('outdated', 'tip', 'pay_to_play');

-- ---------------------------------------------------------------
-- Roles: a server-side table, never a client flag (Section 12.3)
-- ---------------------------------------------------------------
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',
  access public.access_state not null default 'active',
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = 'admin' and r.access = 'active'
  )
$$;

create or replace function public.is_curator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('curator', 'admin') and r.access = 'active'
  )
$$;

create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.access = 'active'
  )
$$;

-- Haversine distance in kilometres. Used instead of PostGIS (decision logged in Appendix C):
-- the only geographic needs are a 25 km dedup radius and a travel-radius filter.
create or replace function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else 2 * 6371 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    ))
  end
$$;

-- updated_at helper
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
