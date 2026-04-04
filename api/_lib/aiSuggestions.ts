import { SOURCE_PREPARATION } from '../../src/data/sourcePreparation.js';
import {
  buildDraftQuestionFromSuggestion,
  generateAiSuggestions,
} from '../../src/lib/aiSuggestionEngine.js';
import { applyEditorialAction, saveQuestionWithSchema } from './catalogPersistence.js';
import type {
  Chapter,
  ContentCatalog,
  EditorialEvent,
  ExamRuleSet,
  Question,
  QuestionMedia,
  QuestionOption,
  SourceDocument,
} from '../../src/types/content.js';
import type { AiRun, AiSuggestion, AiWorkspace } from '../../src/types/ai.js';

type SupabaseClient = any;

type QuestionRow = {
  id: string;
  edition_id: string;
  chapter_id: string;
  week: number;
  prompt: string;
  selection_mode: Question['selectionMode'];
  instruction: string;
  source_document_id: string;
  source_page: number;
  source_reference: string | null;
  explanation: string | null;
  public_explanation: string | null;
  status: Question['status'];
  is_official_exam_eligible: boolean;
  double_weight: boolean;
  review_notes: string | null;
  created_by: string;
  updated_by: string;
  reviewed_at: string | null;
  published_at: string | null;
  question_options: Array<{
    id: string;
    label: string;
    text: string;
    is_correct: boolean;
    display_order: number;
  }>;
  question_media: Array<{
    id: string;
    type: QuestionMedia['type'];
    url: string;
    alt_text: string;
    source_attribution: string | null;
    display_order: number;
  }>;
};

type EditionRow = {
  id: string;
  code: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  is_active: boolean;
  effective_from: string;
  archived_at: string | null;
};

type EditorialEventRow = {
  id: string;
  edition_id: string;
  question_id: string | null;
  actor_email: string;
  action: EditorialEvent['action'];
  notes: string | null;
  created_at: string;
};

type AiRunRow = {
  id: string;
  edition_id: string;
  actor_email: string;
  provider: AiRun['provider'];
  run_type: AiRun['runType'];
  status: AiRun['status'];
  summary: AiRun['summary'];
  created_at: string;
};

type AiSuggestionRow = {
  id: string;
  edition_id: string;
  chapter_id: string | null;
  source_document_id: string | null;
  source_reference: string;
  suggestion_type: AiSuggestion['suggestionType'];
  status: AiSuggestion['status'];
  prompt: string;
  selection_mode: AiSuggestion['selectionMode'] | null;
  instruction: string | null;
  suggested_options: string[] | null;
  suggested_correct_answers: number[] | null;
  public_explanation: string | null;
  review_notes: string | null;
  grounding_excerpt: string;
  rationale: string;
  confidence: number;
  provider: AiSuggestion['provider'];
  dedupe_key: string;
  target_question_id: string | null;
  ai_run_id: string | null;
  applied_question_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapQuestionRow(row: QuestionRow): Question {
  const options: QuestionOption[] = [...row.question_options]
    .sort((left, right) => left.display_order - right.display_order)
    .map((option) => ({
      id: option.id,
      label: option.label,
      text: option.text,
      isCorrect: option.is_correct,
      order: option.display_order,
    }));

  const media: QuestionMedia[] = [...row.question_media]
    .sort((left, right) => left.display_order - right.display_order)
    .map((item) => ({
      id: item.id,
      questionId: row.id,
      type: item.type,
      url: item.url,
      altText: item.alt_text,
      sourceAttribution: item.source_attribution ?? undefined,
      order: item.display_order,
    }));

  return {
    id: row.id,
    editionId: row.edition_id,
    chapterId: row.chapter_id,
    week: row.week,
    prompt: row.prompt,
    selectionMode: row.selection_mode,
    instruction: row.instruction,
    sourceDocumentId: row.source_document_id,
    sourcePage: row.source_page,
    sourceReference: row.source_reference ?? undefined,
    explanation: row.explanation ?? undefined,
    publicExplanation: row.public_explanation ?? undefined,
    status: row.status,
    isOfficialExamEligible: row.is_official_exam_eligible,
    doubleWeight: row.double_weight,
    reviewNotes: row.review_notes ?? undefined,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    reviewedAt: row.reviewed_at ?? undefined,
    publishedAt: row.published_at ?? undefined,
    options,
    media,
  };
}

function mapAiRunRow(row: AiRunRow): AiRun {
  return {
    id: row.id,
    editionId: row.edition_id,
    actorEmail: row.actor_email,
    provider: row.provider,
    runType: row.run_type,
    status: row.status,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

function mapAiSuggestionRow(row: AiSuggestionRow): AiSuggestion {
  return {
    id: row.id,
    editionId: row.edition_id,
    chapterId: row.chapter_id ?? undefined,
    sourceDocumentId: row.source_document_id ?? undefined,
    sourceReference: row.source_reference,
    suggestionType: row.suggestion_type,
    status: row.status,
    prompt: row.prompt,
    selectionMode: row.selection_mode ?? undefined,
    instruction: row.instruction ?? undefined,
    suggestedOptions: row.suggested_options ?? [],
    suggestedCorrectAnswers: row.suggested_correct_answers ?? [],
    publicExplanation: row.public_explanation ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    groundingExcerpt: row.grounding_excerpt,
    rationale: row.rationale,
    confidence: Number(row.confidence),
    provider: row.provider,
    dedupeKey: row.dedupe_key,
    targetQuestionId: row.target_question_id ?? undefined,
    aiRunId: row.ai_run_id ?? undefined,
    appliedQuestionId: row.applied_question_id ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAiRunToRow(run: AiRun) {
  return {
    id: run.id,
    edition_id: run.editionId,
    actor_email: run.actorEmail,
    provider: run.provider,
    run_type: run.runType,
    status: run.status,
    summary: run.summary,
    created_at: run.createdAt,
  };
}

function mapAiSuggestionToRow(suggestion: AiSuggestion) {
  return {
    id: suggestion.id,
    edition_id: suggestion.editionId,
    chapter_id: suggestion.chapterId ?? null,
    source_document_id: suggestion.sourceDocumentId ?? null,
    source_reference: suggestion.sourceReference,
    suggestion_type: suggestion.suggestionType,
    status: suggestion.status,
    prompt: suggestion.prompt,
    selection_mode: suggestion.selectionMode ?? null,
    instruction: suggestion.instruction ?? null,
    suggested_options: suggestion.suggestedOptions,
    suggested_correct_answers: suggestion.suggestedCorrectAnswers,
    public_explanation: suggestion.publicExplanation ?? null,
    review_notes: suggestion.reviewNotes ?? null,
    grounding_excerpt: suggestion.groundingExcerpt,
    rationale: suggestion.rationale,
    confidence: suggestion.confidence,
    provider: suggestion.provider,
    dedupe_key: suggestion.dedupeKey,
    target_question_id: suggestion.targetQuestionId ?? null,
    ai_run_id: suggestion.aiRunId ?? null,
    applied_question_id: suggestion.appliedQuestionId ?? null,
    created_by: suggestion.createdBy,
    created_at: suggestion.createdAt,
    updated_at: suggestion.updatedAt,
  };
}

export async function loadCatalogV1(client: SupabaseClient): Promise<ContentCatalog> {
  const editionResponse = await client.from('editions').select('*').order('effective_from', {
    ascending: false,
  });

  if (editionResponse.error) {
    throw editionResponse.error;
  }

  const editions: ContentCatalog['editions'] = (editionResponse.data ?? []).map((edition: EditionRow) => ({
    id: edition.id,
    code: edition.code,
    title: edition.title,
    status: edition.status,
    isActive: edition.is_active,
    effectiveFrom: edition.effective_from,
    archivedAt: edition.archived_at ?? undefined,
  }));

  const activeEdition = editions.find((edition) => edition.isActive) ?? editions[0] ?? null;

  if (!activeEdition) {
    throw new Error('No hay una edición activa configurada.');
  }

  const [chapterResponse, sourceResponse, ruleResponse, questionResponse, eventResponse] =
    await Promise.all([
      client.from('chapters').select('*').eq('edition_id', activeEdition.id).order('display_order'),
      client.from('source_documents').select('*').order('year', { ascending: false }),
      client.from('exam_rule_sets').select('*').eq('edition_id', activeEdition.id).single(),
      client
        .from('questions')
        .select(
          `
            id,
            edition_id,
            chapter_id,
            week,
            prompt,
            selection_mode,
            instruction,
            source_document_id,
            source_page,
            source_reference,
            explanation,
            public_explanation,
            status,
            is_official_exam_eligible,
            double_weight,
            review_notes,
            created_by,
            updated_by,
            reviewed_at,
            published_at,
            question_options (
              id,
              label,
              text,
              is_correct,
              display_order
            ),
            question_media (
              id,
              type,
              url,
              alt_text,
              source_attribution,
              display_order
            )
          `,
        )
        .eq('edition_id', activeEdition.id)
        .order('published_at', { ascending: true }),
      client
        .from('editorial_events')
        .select('*')
        .eq('edition_id', activeEdition.id)
        .order('created_at', { ascending: false }),
    ]);

  if (chapterResponse.error) {
    throw chapterResponse.error;
  }

  if (sourceResponse.error) {
    throw sourceResponse.error;
  }

  if (ruleResponse.error) {
    throw ruleResponse.error;
  }

  if (questionResponse.error) {
    throw questionResponse.error;
  }

  if (eventResponse.error) {
    throw eventResponse.error;
  }

  const chapters: Chapter[] = (chapterResponse.data ?? []).map((chapter: any) => ({
    id: chapter.id,
    editionId: chapter.edition_id,
    code: chapter.code,
    title: chapter.title,
    description: chapter.description,
    order: chapter.display_order,
    isActive: chapter.is_active,
  }));

  const sourceDocuments: SourceDocument[] = (sourceResponse.data ?? []).map((source: any) => ({
    id: source.id,
    title: source.title,
    issuer: source.issuer,
    year: source.year,
    url: source.url,
    type: source.type,
    official: source.official,
  }));

  const examRuleSet: ExamRuleSet = {
    code: ruleResponse.data.code,
    editionId: ruleResponse.data.edition_id,
    questionCount: ruleResponse.data.question_count,
    maxPoints: ruleResponse.data.max_points,
    passingPoints: ruleResponse.data.passing_points,
    doubleWeightCount: ruleResponse.data.double_weight_count,
    examDurationMinutes: ruleResponse.data.exam_duration_minutes ?? undefined,
  };

  const questions = (questionResponse.data ?? []).map((row: QuestionRow) => mapQuestionRow(row));
  const editorialEvents: EditorialEvent[] = (eventResponse.data ?? []).map((event: EditorialEventRow) => ({
    id: event.id,
    editionId: event.edition_id,
    questionId: event.question_id ?? undefined,
    actorEmail: event.actor_email,
    action: event.action,
    notes: event.notes ?? undefined,
    createdAt: event.created_at,
  }));

  return {
    editions,
    activeEdition,
    chapters,
    sourceDocuments,
    examRuleSet,
    questions,
    editorialEvents,
  };
}

export async function loadAiWorkspace(client: SupabaseClient, editionId: string): Promise<AiWorkspace> {
  if (!(await hasAiSchema(client))) {
    return {
      suggestions: [],
      runs: [],
      sourcePreparation: SOURCE_PREPARATION.filter((item) => item.editionId === editionId),
    };
  }

  const [suggestionResponse, runResponse] = await Promise.all([
    client.from('ai_suggestions').select('*').eq('edition_id', editionId).order('updated_at', { ascending: false }),
    client.from('ai_runs').select('*').eq('edition_id', editionId).order('created_at', { ascending: false }),
  ]);

  if (suggestionResponse.error) {
    throw suggestionResponse.error;
  }

  if (runResponse.error) {
    throw runResponse.error;
  }

  return {
    suggestions: (suggestionResponse.data ?? []).map((row: AiSuggestionRow) => mapAiSuggestionRow(row)),
    runs: (runResponse.data ?? []).map((row: AiRunRow) => mapAiRunRow(row)),
    sourcePreparation: SOURCE_PREPARATION.filter((item) => item.editionId === editionId),
  };
}

export async function hasAiSchema(client: SupabaseClient) {
  const response = await client.from('ai_suggestions').select('id').limit(1);
  return !response.error;
}

export async function generateAndPersistAiSuggestions(
  client: SupabaseClient,
  actorEmail: string,
): Promise<AiWorkspace> {
  if (!(await hasAiSchema(client))) {
    throw new Error('Falta aplicar la migración 0003_ai_suggestions.sql en Supabase.');
  }

  const catalog = await loadCatalogV1(client);
  const { run, suggestions } = generateAiSuggestions(catalog, actorEmail);

  const runResult = await client.from('ai_runs').upsert(mapAiRunToRow(run));

  if (runResult.error) {
    throw runResult.error;
  }

  if (suggestions.length > 0) {
    const suggestionRows = suggestions.map(mapAiSuggestionToRow);
    const suggestionResult = await client.from('ai_suggestions').upsert(suggestionRows, {
      onConflict: 'dedupe_key',
    });

    if (suggestionResult.error) {
      throw suggestionResult.error;
    }
  }

  return loadAiWorkspace(client, catalog.activeEdition?.id ?? catalog.examRuleSet.editionId);
}

export async function updateAiSuggestionStatus(
  client: SupabaseClient,
  suggestionId: string,
  status: AiSuggestion['status'],
  reviewNotes?: string,
) {
  if (!(await hasAiSchema(client))) {
    throw new Error('La tabla ai_suggestions todavía no existe en Supabase.');
  }

  const result = await client
    .from('ai_suggestions')
    .update({
      status,
      review_notes: reviewNotes ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)
    .select('*')
    .single();

  if (result.error) {
    throw result.error;
  }

  return mapAiSuggestionRow(result.data as AiSuggestionRow);
}

export async function markAiSuggestionApplied(
  client: SupabaseClient,
  suggestionId: string,
  questionId: string,
) {
  if (!(await hasAiSchema(client))) {
    throw new Error('La tabla ai_suggestions todavía no existe en Supabase.');
  }

  const result = await client
    .from('ai_suggestions')
    .update({
      status: 'applied',
      applied_question_id: questionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', suggestionId)
    .select('*')
    .single();

  if (result.error) {
    throw result.error;
  }

  return mapAiSuggestionRow(result.data as AiSuggestionRow);
}

export async function getAiSuggestion(client: SupabaseClient, suggestionId: string) {
  if (!(await hasAiSchema(client))) {
    throw new Error('La tabla ai_suggestions todavía no existe en Supabase.');
  }

  const result = await client.from('ai_suggestions').select('*').eq('id', suggestionId).single();

  if (result.error) {
    throw result.error;
  }

  return mapAiSuggestionRow(result.data as AiSuggestionRow);
}

export async function createDraftQuestionFromAiSuggestion(
  client: SupabaseClient,
  suggestionId: string,
  actorEmail: string,
) {
  const suggestion = await getAiSuggestion(client, suggestionId);
  const questionDraft = buildDraftQuestionFromSuggestion(suggestion, actorEmail);

  if (!questionDraft) {
    throw new Error('La sugerencia seleccionada no se puede convertir directamente en draft.');
  }

  const result = applyEditorialAction(questionDraft, actorEmail, 'save_draft', 'Draft creado desde sugerencia AI.');
  await saveQuestionWithSchema(client, result.question, result.event, true);
  await markAiSuggestionApplied(client, suggestionId, result.question.id);

  return {
    question: result.question,
    event: result.event,
    suggestionId,
  };
}
