-- One Big Talk: foundation migration 4 of 7
-- WRITE: Idea Brief (500-character minimum), outlines with a final gate, scripts written only from a
-- final outline, versions, claims. Blueprint v1.5 Section 7. The gates live here as well as in the API.

create table public.idea_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  version integer not null default 1,
  answers jsonb not null default '{}',             -- keys: idea, belief, story, evidence, action, why_me, not_claiming (optional)
  char_count integer not null default 0,
  completeness jsonb,                              -- Haiku advice (13.3b); never blocks
  is_draft boolean not null default true,          -- autosave rows may be short; a saved brief may not
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (talk_id, version),
  -- The 500-character minimum (7.2) is a hard rule for a saved brief. Autosave drafts are exempt.
  constraint idea_brief_minimum check (is_draft or char_count >= 500)
);
create index idea_briefs_user_idx on public.idea_briefs(user_id);
create trigger idea_briefs_touch before update on public.idea_briefs for each row execute function public.touch_updated_at();

-- Compute char_count from the six (or seven) answers so the client cannot lie about it.
create or replace function public.idea_brief_count() returns trigger
language plpgsql as $$
declare total integer := 0; k text; v text;
begin
  for k, v in select key, value #>> '{}' from jsonb_each(coalesce(new.answers, '{}'::jsonb)) loop
    total := total + char_length(coalesce(v, ''));
  end loop;
  new.char_count := total;
  return new;
end $$;
create trigger idea_briefs_count before insert or update on public.idea_briefs for each row execute function public.idea_brief_count();

create table public.outlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  brief_id uuid references public.idea_briefs(id) on delete set null,
  structure_template text not null default 'ted_four_beat'
    check (structure_template in ('ted_four_beat', 'duarte_sparkline', 'anderson_journey', 'gallo_message_map', 'story_spine')),
  created_at timestamptz not null default now()
);
create index outlines_talk_idx on public.outlines(talk_id);

create table public.outline_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outline_id uuid not null references public.outlines(id) on delete cascade,
  version integer not null,
  doc jsonb not null,                              -- sections[] with talking_points[] (kind, text, source, consent for stories), target_seconds, target_words, ending_point
  status public.outline_status not null default 'draft',
  source public.version_source not null default 'llm',
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (outline_id, version)
);
create index outline_versions_outline_idx on public.outline_versions(outline_id);
create unique index outline_versions_one_final on public.outline_versions(outline_id) where status = 'final';

create or replace function public.outline_version_finalize() returns trigger
language plpgsql as $$
begin
  if new.status = 'final' and new.finalized_at is null then new.finalized_at := now(); end if;
  if new.status = 'draft' then new.finalized_at := null; end if;
  return new;
end $$;
create trigger outline_versions_finalize before insert or update on public.outline_versions for each row execute function public.outline_version_finalize();

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talk_id uuid not null references public.talks(id) on delete cascade,
  outline_version_id uuid not null references public.outline_versions(id) on delete restrict,
  slot_minutes integer not null default 10 check (slot_minutes between 3 and 18),
  target_wpm integer not null default 150,
  locked_version_id uuid,                          -- fk added below
  locked_at timestamptz,
  organizer_script_deadline date,
  created_at timestamptz not null default now()
);
create index scripts_talk_idx on public.scripts(talk_id);

-- The two-step gate (7.1, 12.4): a script can only be created from a FINAL outline version.
create or replace function public.scripts_require_final_outline() returns trigger
language plpgsql as $$
declare st public.outline_status;
begin
  select status into st from public.outline_versions where id = new.outline_version_id;
  if st is distinct from 'final' then
    raise exception 'OUTLINE_NOT_FINAL: finalize your outline before writing the script.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger scripts_final_gate before insert or update of outline_version_id on public.scripts for each row execute function public.scripts_require_final_outline();

create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  version integer not null,
  doc jsonb not null,                              -- Tiptap JSON: sections with kind, targetSeconds; inline marks pause, emphasis, claim
  source public.version_source not null default 'llm',
  pass_key text,                                   -- cut_to_time, stronger_opening, kill_jargon, add_contrast, sounds_like_me, sharpen_close, de_pitch, simplify
  parent_version_id uuid references public.script_versions(id) on delete set null,
  word_count integer not null default 0,
  est_seconds integer not null default 0,
  rubric jsonb,
  coverage jsonb,                                  -- {covered_point_ids:[], uncovered:[{id,why}]}
  post_lock boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (script_id, version)
);
create index script_versions_script_idx on public.script_versions(script_id);

alter table public.scripts add constraint scripts_locked_version_fk foreign key (locked_version_id) references public.script_versions(id) on delete set null;

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script_version_id uuid not null references public.script_versions(id) on delete cascade,
  section_id text,
  text text not null,
  claim_type text,                                 -- number, study, person, history, causal, health
  risk text check (risk in ('low', 'medium', 'high')),
  status public.claim_status not null default 'needs_source',
  source_url text,
  note text,
  r5_flag boolean not null default false,          -- "cure"/"heal" style wording
  overclaim_flag boolean not null default false,   -- always, proves, guarantees, everyone
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index claims_version_idx on public.claims(script_version_id);
create trigger claims_touch before update on public.claims for each row execute function public.touch_updated_at();

-- Staleness propagation (7.5, v1.4): a change to the locked idea, the brief or a prior stage marks
-- downstream artifacts "may be outdated". Nothing is rewritten; submitted applications stay as they are.
create or replace function public.mark_downstream_stale() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_talk uuid; v_user uuid;
begin
  if tg_table_name = 'ideas' then
    if new.status <> 'locked' then return new; end if;
    v_talk := new.talk_id; v_user := new.user_id;
  elsif tg_table_name = 'idea_briefs' then
    if new.is_draft then return new; end if;
    v_talk := new.talk_id; v_user := new.user_id;
  elsif tg_table_name = 'prior_stages' then
    v_user := new.user_id; v_talk := null;
  end if;
  update public.pitch_packs set stale = true where user_id = v_user and (v_talk is null or talk_id = v_talk);
  update public.applications set stale = true where user_id = v_user and (v_talk is null or talk_id = v_talk)
    and status in ('planned', 'researching', 'drafting', 'ready');
  return new;
end $$;
create trigger ideas_stale after update of throughline, belief_challenged, antagonist, evidence_notes, audience_action on public.ideas
  for each row execute function public.mark_downstream_stale();
create trigger briefs_stale after update of answers on public.idea_briefs
  for each row execute function public.mark_downstream_stale();
create trigger prior_stages_stale after insert or update on public.prior_stages
  for each row execute function public.mark_downstream_stale();
