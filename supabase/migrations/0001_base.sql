create extension if not exists pgcrypto;

create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id text primary key,
  code text not null,
  title text not null,
  description text not null,
  display_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.source_documents (
  id text primary key,
  title text not null,
  issuer text not null,
  year integer not null,
  url text not null,
  type text not null,
  official boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_rule_sets (
  code text primary key,
  question_count integer not null,
  max_points integer not null,
  passing_points integer not null,
  double_weight_count integer not null,
  exam_duration_minutes integer,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id text primary key,
  chapter_id text not null references public.chapters(id),
  week integer not null,
  prompt text not null,
  selection_mode text not null check (selection_mode in ('single', 'multiple')),
  instruction text not null,
  source_document_id text not null references public.source_documents(id),
  source_page integer not null,
  source_reference text,
  explanation text,
  status text not null check (status in ('draft', 'reviewed', 'published', 'archived')),
  is_official_exam_eligible boolean not null default false,
  double_weight boolean not null default false,
  review_notes text,
  created_by text not null,
  updated_by text not null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_options (
  id text primary key,
  question_id text not null references public.questions(id) on delete cascade,
  label text not null,
  text text not null,
  is_correct boolean not null default false,
  display_order integer not null
);

create table if not exists public.question_media (
  id text primary key,
  question_id text not null references public.questions(id) on delete cascade,
  type text not null check (type in ('image')),
  url text not null,
  alt_text text not null,
  source_attribution text,
  display_order integer not null default 1
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('practice', 'exam')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score integer not null default 0,
  passed boolean,
  config_snapshot jsonb not null default '{}'::jsonb
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id text not null references public.questions(id),
  selected_option_ids text[] not null default '{}',
  points_earned integer not null default 0,
  is_correct boolean not null default false
);

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_allowlist
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.admin_allowlist enable row level security;
alter table public.chapters enable row level security;
alter table public.source_documents enable row level security;
alter table public.exam_rule_sets enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_media enable row level security;

drop policy if exists "public chapters read" on public.chapters;
create policy "public chapters read"
on public.chapters for select
using (true);

drop policy if exists "public sources read" on public.source_documents;
create policy "public sources read"
on public.source_documents for select
using (true);

drop policy if exists "public exam rules read" on public.exam_rule_sets;
create policy "public exam rules read"
on public.exam_rule_sets for select
using (true);

drop policy if exists "public published questions read" on public.questions;
create policy "public published questions read"
on public.questions for select
using (status = 'published' or public.is_current_user_admin());

drop policy if exists "public published options read" on public.question_options;
create policy "public published options read"
on public.question_options for select
using (
  exists (
    select 1
    from public.questions
    where public.questions.id = question_options.question_id
      and (public.questions.status = 'published' or public.is_current_user_admin())
  )
);

drop policy if exists "public published media read" on public.question_media;
create policy "public published media read"
on public.question_media for select
using (
  exists (
    select 1
    from public.questions
    where public.questions.id = question_media.question_id
      and (public.questions.status = 'published' or public.is_current_user_admin())
  )
);

drop policy if exists "admins manage allowlist" on public.admin_allowlist;
create policy "admins manage allowlist"
on public.admin_allowlist for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "admins manage chapters" on public.chapters;
create policy "admins manage chapters"
on public.chapters for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "admins manage sources" on public.source_documents;
create policy "admins manage sources"
on public.source_documents for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "admins manage exam rules" on public.exam_rule_sets;
create policy "admins manage exam rules"
on public.exam_rule_sets for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "admins manage questions" on public.questions;
create policy "admins manage questions"
on public.questions for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "admins manage options" on public.question_options;
create policy "admins manage options"
on public.question_options for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists "admins manage media" on public.question_media;
create policy "admins manage media"
on public.question_media for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());
