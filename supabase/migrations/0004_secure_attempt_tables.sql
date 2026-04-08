alter table public.quiz_attempts enable row level security;
alter table public.attempt_answers enable row level security;

drop policy if exists "no public quiz attempts access" on public.quiz_attempts;
create policy "no public quiz attempts access"
on public.quiz_attempts for all
using (false)
with check (false);

drop policy if exists "no public attempt answers access" on public.attempt_answers;
create policy "no public attempt answers access"
on public.attempt_answers for all
using (false)
with check (false);
