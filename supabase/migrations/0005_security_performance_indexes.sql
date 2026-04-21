-- Foreign-key and policy-supporting indexes for production readiness.
-- These reduce full scans on joins used by RLS policies and admin workflows.

create index if not exists chapters_edition_id_idx
  on public.chapters (edition_id);

create index if not exists questions_edition_id_idx
  on public.questions (edition_id);

create index if not exists questions_chapter_id_idx
  on public.questions (chapter_id);

create index if not exists questions_source_document_id_idx
  on public.questions (source_document_id);

create index if not exists exam_rule_sets_edition_id_idx
  on public.exam_rule_sets (edition_id);

create index if not exists question_options_question_id_idx
  on public.question_options (question_id);

create index if not exists question_media_question_id_idx
  on public.question_media (question_id);

create index if not exists attempt_answers_attempt_id_idx
  on public.attempt_answers (attempt_id);

create index if not exists attempt_answers_question_id_idx
  on public.attempt_answers (question_id);

create index if not exists editorial_events_edition_id_idx
  on public.editorial_events (edition_id);

create index if not exists editorial_events_question_id_idx
  on public.editorial_events (question_id);

create index if not exists ai_runs_edition_id_idx
  on public.ai_runs (edition_id);

create index if not exists ai_suggestions_edition_id_idx
  on public.ai_suggestions (edition_id);

create index if not exists ai_suggestions_target_question_id_idx
  on public.ai_suggestions (target_question_id);

create index if not exists ai_suggestions_ai_run_id_idx
  on public.ai_suggestions (ai_run_id);

create index if not exists ai_suggestions_applied_question_id_idx
  on public.ai_suggestions (applied_question_id);
