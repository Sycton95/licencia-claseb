create table if not exists public.ai_runs (
  id text primary key,
  edition_id text not null references public.editions(id) on delete cascade,
  actor_email text not null,
  provider text not null check (provider in ('heuristic')),
  run_type text not null check (run_type in ('suggestion_refresh')),
  status text not null check (status in ('completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_runs enable row level security;

drop policy if exists "admins manage ai runs" on public.ai_runs;
create policy "admins manage ai runs"
on public.ai_runs for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create table if not exists public.ai_suggestions (
  id text primary key,
  edition_id text not null references public.editions(id) on delete cascade,
  chapter_id text references public.chapters(id) on delete set null,
  source_document_id text references public.source_documents(id) on delete set null,
  source_reference text not null,
  suggestion_type text not null check (suggestion_type in ('new_question', 'rewrite', 'flag', 'coverage_gap')),
  status text not null check (status in ('pending', 'accepted', 'rejected', 'applied', 'deferred')),
  prompt text not null,
  selection_mode text check (selection_mode in ('single', 'multiple')),
  instruction text,
  suggested_options jsonb not null default '[]'::jsonb,
  suggested_correct_answers jsonb not null default '[]'::jsonb,
  public_explanation text,
  review_notes text,
  grounding_excerpt text not null,
  rationale text not null,
  confidence numeric(4,3) not null default 0.5,
  provider text not null check (provider in ('heuristic')),
  dedupe_key text not null unique,
  target_question_id text references public.questions(id) on delete set null,
  ai_run_id text references public.ai_runs(id) on delete set null,
  applied_question_id text references public.questions(id) on delete set null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_suggestions enable row level security;

drop policy if exists "admins manage ai suggestions" on public.ai_suggestions;
create policy "admins manage ai suggestions"
on public.ai_suggestions for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create index if not exists ai_suggestions_status_idx on public.ai_suggestions (status, suggestion_type);
create index if not exists ai_suggestions_chapter_idx on public.ai_suggestions (chapter_id, source_document_id);
