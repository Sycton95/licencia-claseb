create table if not exists public.editions (
  id text primary key,
  code text not null unique,
  title text not null,
  status text not null check (status in ('draft', 'active', 'archived')),
  is_active boolean not null default false,
  effective_from date not null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.editions enable row level security;

drop policy if exists "public editions read" on public.editions;
create policy "public editions read"
on public.editions for select
using (true);

drop policy if exists "admins manage editions" on public.editions;
create policy "admins manage editions"
on public.editions for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

alter table public.chapters
  add column if not exists edition_id text references public.editions(id);

alter table public.questions
  add column if not exists edition_id text references public.editions(id),
  add column if not exists public_explanation text;

alter table public.exam_rule_sets
  add column if not exists edition_id text references public.editions(id);

create table if not exists public.editorial_events (
  id text primary key,
  edition_id text not null references public.editions(id),
  question_id text references public.questions(id) on delete cascade,
  actor_email text not null,
  action text not null check (action in ('save', 'save_draft', 'mark_reviewed', 'publish', 'archive', 'seed')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.editorial_events enable row level security;

drop policy if exists "admins manage editorial events" on public.editorial_events;
create policy "admins manage editorial events"
on public.editorial_events for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

insert into public.editions (id, code, title, status, is_active, effective_from)
values ('edition-2026', '2026', 'Libro del Nuevo Conductor Clase B 2026', 'active', true, date '2026-01-01')
on conflict (id) do update
set
  code = excluded.code,
  title = excluded.title,
  status = excluded.status,
  is_active = excluded.is_active,
  effective_from = excluded.effective_from;

update public.chapters
set edition_id = 'edition-2026'
where edition_id is null;

update public.questions
set edition_id = 'edition-2026'
where edition_id is null;

update public.exam_rule_sets
set edition_id = 'edition-2026'
where edition_id is null;

alter table public.chapters
  alter column edition_id set not null;

alter table public.questions
  alter column edition_id set not null;

alter table public.exam_rule_sets
  alter column edition_id set not null;

create unique index if not exists editions_single_active_idx
on public.editions ((is_active))
where is_active = true;
