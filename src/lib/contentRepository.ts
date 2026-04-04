import { SEED_CONTENT } from '../data/seedContent';
import { SOURCE_PREPARATION } from '../data/sourcePreparation';
import { buildDraftQuestionFromSuggestion, generateAiSuggestions } from './aiSuggestionEngine';
import {
  sanitizeQuestionPayload,
  validateQuestionAction,
} from './contentValidation';
import { loadLocalCatalog, saveLocalCatalog, saveLocalQuestion } from './localContentStore';
import {
  loadLocalAiWorkspace,
  updateLocalAiSuggestion,
  upsertLocalAiRun,
  upsertLocalAiSuggestions,
} from './localAiStore';
import { isSupabaseConfigured, supabase } from './supabase';
import type {
  Chapter,
  ContentCatalog,
  Edition,
  EditorialAction,
  EditorialEvent,
  ExamRuleSet,
  Question,
  QuestionMedia,
  QuestionOption,
  SourceDocument,
} from '../types/content';
import type { AiSuggestion, AiWorkspace } from '../types/ai';

type BaseQuestionRow = {
  id: string;
  chapter_id: string;
  week: number;
  prompt: string;
  selection_mode: Question['selectionMode'];
  instruction: string;
  source_document_id: string;
  source_page: number;
  source_reference: string | null;
  explanation: string | null;
  public_explanation?: string | null;
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

type V1QuestionRow = BaseQuestionRow & {
  edition_id: string;
};

type LegacyQuestionRow = BaseQuestionRow;

type EditionRow = {
  id: string;
  code: string;
  title: string;
  status: Edition['status'];
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

const PUBLIC_SITE_FALLBACK_URL = 'https://licencia-claseb.vercel.app';

function toAdminRedirectUrl(value: string) {
  return new URL('/admin', value).toString();
}

function getAdminRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_ADMIN_URL?.trim();

  if (configuredUrl) {
    return toAdminRedirectUrl(configuredUrl);
  }

  return toAdminRedirectUrl(PUBLIC_SITE_FALLBACK_URL);
}

function getActiveEdition(catalog: ContentCatalog) {
  return catalog.activeEdition ?? catalog.editions.find((edition) => edition.isActive) ?? null;
}

function mapQuestionRow(row: BaseQuestionRow, editionId: string): Question {
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
    editionId,
    chapterId: row.chapter_id,
    week: row.week,
    prompt: row.prompt,
    selectionMode: row.selection_mode,
    instruction: row.instruction,
    sourceDocumentId: row.source_document_id,
    sourcePage: row.source_page,
    sourceReference: row.source_reference ?? undefined,
    explanation: row.explanation ?? undefined,
    publicExplanation: row.public_explanation ?? row.explanation ?? undefined,
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

function mapQuestionToLegacyRows(question: Question) {
  return {
    question: {
      id: question.id,
      chapter_id: question.chapterId,
      week: question.week,
      prompt: question.prompt,
      selection_mode: question.selectionMode,
      instruction: question.instruction,
      source_document_id: question.sourceDocumentId,
      source_page: question.sourcePage,
      source_reference: question.sourceReference ?? null,
      explanation: question.explanation ?? null,
      status: question.status,
      is_official_exam_eligible: question.isOfficialExamEligible,
      double_weight: question.doubleWeight,
      review_notes: question.reviewNotes ?? null,
      created_by: question.createdBy,
      updated_by: question.updatedBy,
      reviewed_at: question.reviewedAt ?? null,
      published_at: question.publishedAt ?? null,
    },
    options: question.options.map((option) => ({
      id: option.id,
      question_id: question.id,
      label: option.label,
      text: option.text,
      is_correct: option.isCorrect,
      display_order: option.order,
    })),
    media: question.media.map((item) => ({
      id: item.id,
      question_id: question.id,
      type: item.type,
      url: item.url,
      alt_text: item.altText,
      source_attribution: item.sourceAttribution ?? null,
      display_order: item.order,
    })),
  };
}

function buildEditorialEvent(
  question: Question,
  actorEmail: string,
  action: EditorialAction,
  notes?: string,
): EditorialEvent {
  return {
    id: `event-${question.id}-${action}-${Date.now()}`,
    editionId: question.editionId,
    questionId: question.id,
    actorEmail,
    action,
    notes,
    createdAt: new Date().toISOString(),
  };
}

function normalizeCatalog(catalog: ContentCatalog): ContentCatalog {
  const activeEdition = getActiveEdition(catalog) ?? SEED_CONTENT.activeEdition;
  const activeEditionId = activeEdition?.id ?? SEED_CONTENT.activeEdition?.id ?? 'edition-2026';

  return {
    ...catalog,
    activeEdition,
    chapters: catalog.chapters.filter((chapter) => chapter.editionId === activeEditionId),
    questions: catalog.questions.filter((question) => question.editionId === activeEditionId),
    examRuleSet:
      catalog.examRuleSet.editionId === activeEditionId
        ? catalog.examRuleSet
        : { ...catalog.examRuleSet, editionId: activeEditionId },
    editorialEvents: catalog.editorialEvents.filter(
      (event) => event.editionId === activeEditionId,
    ),
  };
}

async function getRemoteCatalogV1(): Promise<ContentCatalog> {
  if (!supabase) {
    throw new Error('Supabase no est√° configurado.');
  }

  const editionResponse = await supabase.from('editions').select('*').order('effective_from', {
    ascending: false,
  });

  if (editionResponse.error) {
    throw editionResponse.error;
  }

  const editions: Edition[] = (editionResponse.data ?? []).map((edition: EditionRow) => ({
    id: edition.id,
    code: edition.code,
    title: edition.title,
    status: edition.status,
    isActive: edition.is_active,
    effectiveFrom: edition.effective_from,
    archivedAt: edition.archived_at ?? undefined,
  }));

  const activeEdition = editions.find((edition) => edition.isActive) ?? editions[0];

  if (!activeEdition) {
    throw new Error('No hay una edici√≥n activa configurada en Supabase.');
  }

  const [chapterResponse, sourceResponse, ruleResponse, questionResponse, eventResponse] =
    await Promise.all([
      supabase
        .from('chapters')
        .select('*')
        .eq('edition_id', activeEdition.id)
        .order('display_order'),
      supabase.from('source_documents').select('*').order('year', { ascending: false }),
      supabase
        .from('exam_rule_sets')
        .select('*')
        .eq('edition_id', activeEdition.id)
        .single(),
      supabase
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
      supabase.from('editorial_events').select('*').eq('edition_id', activeEdition.id).order('created_at', {
        ascending: false,
      }),
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

  const chapters: Chapter[] = (chapterResponse.data ?? []).map((chapter) => ({
    id: chapter.id,
    editionId: chapter.edition_id,
    code: chapter.code,
    title: chapter.title,
    description: chapter.description,
    order: chapter.display_order,
    isActive: chapter.is_active,
  }));

  const sourceDocuments: SourceDocument[] = (sourceResponse.data ?? []).map((source) => ({
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

  const questions = (questionResponse.data ?? []).map((row) =>
    mapQuestionRow(row as V1QuestionRow, (row as V1QuestionRow).edition_id),
  );

  const editorialEvents: EditorialEvent[] = eventResponse.error
    ? []
    : (eventResponse.data ?? []).map((event: EditorialEventRow) => ({
        id: event.id,
        editionId: event.edition_id,
        questionId: event.question_id ?? undefined,
        actorEmail: event.actor_email,
        action: event.action,
        notes: event.notes ?? undefined,
        createdAt: event.created_at,
      }));

  return normalizeCatalog({
    editions,
    activeEdition,
    chapters,
    sourceDocuments,
    examRuleSet,
    questions,
    editorialEvents,
  });
}

async function getRemoteCatalogLegacy(): Promise<ContentCatalog> {
  if (!supabase) {
    throw new Error('Supabase no est√° configurado.');
  }

  const [chapterResponse, sourceResponse, ruleResponse, questionResponse] = await Promise.all([
    supabase.from('chapters').select('*').order('display_order'),
    supabase.from('source_documents').select('*').order('year', { ascending: false }),
    supabase.from('exam_rule_sets').select('*').eq('code', 'class-b-current').single(),
    supabase
      .from('questions')
      .select(
        `
          id,
          chapter_id,
          week,
          prompt,
          selection_mode,
          instruction,
          source_document_id,
          source_page,
          source_reference,
          explanation,
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
      .order('published_at', { ascending: true }),
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

  const activeEdition = SEED_CONTENT.activeEdition ?? SEED_CONTENT.editions[0];
  const activeEditionId = activeEdition?.id ?? 'edition-2026';

  const chapters: Chapter[] = (chapterResponse.data ?? []).map((chapter) => ({
    id: chapter.id,
    editionId: activeEditionId,
    code: chapter.code,
    title: chapter.title,
    description: chapter.description,
    order: chapter.display_order,
    isActive: chapter.is_active,
  }));

  const sourceDocuments: SourceDocument[] = (sourceResponse.data ?? []).map((source) => ({
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
    editionId: activeEditionId,
    questionCount: ruleResponse.data.question_count,
    maxPoints: ruleResponse.data.max_points,
    passingPoints: ruleResponse.data.passing_points,
    doubleWeightCount: ruleResponse.data.double_weight_count,
    examDurationMinutes: ruleResponse.data.exam_duration_minutes ?? undefined,
  };

  const questions = (questionResponse.data ?? []).map((row) =>
    mapQuestionRow(row as LegacyQuestionRow, activeEditionId),
  );

  return normalizeCatalog({
    editions: SEED_CONTENT.editions,
    activeEdition,
    chapters,
    sourceDocuments,
    examRuleSet,
    questions,
    editorialEvents: [],
  });
}

async function getRemoteCatalog(): Promise<ContentCatalog> {
  try {
    return await getRemoteCatalogV1();
  } catch {
    return getRemoteCatalogLegacy();
  }
}

async function getSessionAccessToken() {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

async function requestAdminApi<TResponse>(
  path: string,
  body: Record<string, unknown> = {},
): Promise<TResponse> {
  const accessToken = await getSessionAccessToken();

  if (!accessToken) {
    throw new Error('Debes iniciar sesiÛn como admin para realizar esta acciÛn.');
  }

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let payload: {
    error?: string;
    [key: string]: unknown;
  } = {};

  if (rawText) {
    try {
      payload = JSON.parse(rawText) as {
        error?: string;
        [key: string]: unknown;
      };
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const fallbackMessage = rawText
      ? `La operaciÛn admin fallÛ con ${response.status}. ${rawText.slice(0, 240)}`
      : `La operaciÛn admin fallÛ con ${response.status}.`;
    throw new Error(payload.error ?? fallbackMessage);
  }

  return payload as TResponse;
}

async function saveQuestionDirect(question: Question, event?: EditorialEvent) {
  if (!supabase) {
    throw new Error('Supabase no est√° configurado.');
  }

  const { question: questionRow, options, media } = mapQuestionToLegacyRows(question);

  const upsertQuestionResult = await supabase.from('questions').upsert(questionRow).select('id').single();

  if (upsertQuestionResult.error) {
    throw upsertQuestionResult.error;
  }

  const deleteOptionsResult = await supabase.from('question_options').delete().eq('question_id', question.id);

  if (deleteOptionsResult.error) {
    throw deleteOptionsResult.error;
  }

  const deleteMediaResult = await supabase.from('question_media').delete().eq('question_id', question.id);

  if (deleteMediaResult.error) {
    throw deleteMediaResult.error;
  }

  if (options.length > 0) {
    const insertOptionsResult = await supabase.from('question_options').insert(options);

    if (insertOptionsResult.error) {
      throw insertOptionsResult.error;
    }
  }

  if (media.length > 0) {
    const insertMediaResult = await supabase.from('question_media').insert(media);

    if (insertMediaResult.error) {
      throw insertMediaResult.error;
    }
  }

  if (event) {
    saveLocalQuestion(question, event);
  }

  return question;
}

async function seedRemoteContentDirect() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para sembrar el contenido remoto.');
  }

  const questionCountResponse = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true });

  if (questionCountResponse.error) {
    throw questionCountResponse.error;
  }

  if ((questionCountResponse.count ?? 0) > 0) {
    return { seeded: false, reason: 'already-seeded' as const };
  }

  const catalog = SEED_CONTENT;

  const insertChaptersResult = await supabase.from('chapters').upsert(
    catalog.chapters.map((chapter) => ({
      id: chapter.id,
      code: chapter.code,
      title: chapter.title,
      description: chapter.description,
      display_order: chapter.order,
      is_active: chapter.isActive,
    })),
  );

  if (insertChaptersResult.error) {
    throw insertChaptersResult.error;
  }

  const insertSourcesResult = await supabase.from('source_documents').upsert(
    catalog.sourceDocuments.map((source) => ({
      id: source.id,
      title: source.title,
      issuer: source.issuer,
      year: source.year,
      url: source.url,
      type: source.type,
      official: source.official,
    })),
  );

  if (insertSourcesResult.error) {
    throw insertSourcesResult.error;
  }

  const insertRuleResult = await supabase.from('exam_rule_sets').upsert({
    code: catalog.examRuleSet.code,
    question_count: catalog.examRuleSet.questionCount,
    max_points: catalog.examRuleSet.maxPoints,
    passing_points: catalog.examRuleSet.passingPoints,
    double_weight_count: catalog.examRuleSet.doubleWeightCount,
    exam_duration_minutes: catalog.examRuleSet.examDurationMinutes ?? null,
  });

  if (insertRuleResult.error) {
    throw insertRuleResult.error;
  }

  for (const question of catalog.questions) {
    await saveQuestionDirect(question);
  }

  return { seeded: true as const };
}

export async function getContentCatalog(): Promise<ContentCatalog> {
  if (!isSupabaseConfigured) {
    return normalizeCatalog(loadLocalCatalog());
  }

  try {
    return await getRemoteCatalog();
  } catch {
    return normalizeCatalog(loadLocalCatalog());
  }
}

export async function getPublishedCatalog() {
  const catalog = await getContentCatalog();

  return {
    ...catalog,
    questions: catalog.questions.filter((question) => question.status === 'published'),
  };
}

export async function getAiWorkspace(): Promise<AiWorkspace> {
  if (!isSupabaseConfigured || import.meta.env.DEV) {
    const workspace = loadLocalAiWorkspace();
    const catalog = await getContentCatalog();

    return {
      ...workspace,
      sourcePreparation: SOURCE_PREPARATION.filter(
        (item) => item.editionId === (catalog.activeEdition?.id ?? catalog.examRuleSet.editionId),
      ),
    };
  }

  return requestAdminApi<{ workspace: AiWorkspace }>('/api/admin/ai-suggestions', {
    operation: 'list',
  }).then((payload) => payload.workspace);
}

export async function generateAiWorkspace() {
  if (!isSupabaseConfigured || import.meta.env.DEV) {
    const catalog = await getContentCatalog();
    const actorEmail = (await getCurrentSession())?.user.email ?? 'local-admin';
    const result = generateAiSuggestions(catalog, actorEmail);

    upsertLocalAiRun(result.run);
    upsertLocalAiSuggestions(result.suggestions);

    return getAiWorkspace();
  }

  return requestAdminApi<{ workspace: AiWorkspace }>('/api/admin/ai-suggestions', {
    operation: 'generate',
  }).then((payload) => payload.workspace);
}

export async function transitionAiSuggestion(
  suggestionId: string,
  status: AiSuggestion['status'],
  reviewNotes?: string,
) {
  if (!isSupabaseConfigured || import.meta.env.DEV) {
    updateLocalAiSuggestion(suggestionId, (current) => ({
      ...current,
      status,
      reviewNotes: reviewNotes ?? current.reviewNotes,
      updatedAt: new Date().toISOString(),
    }));

    return getAiWorkspace();
  }

  await requestAdminApi<{ suggestion: AiSuggestion }>('/api/admin/ai-suggestions', {
    operation: 'transition',
    suggestionId,
    status,
    reviewNotes,
  });

  return getAiWorkspace();
}

export async function createDraftFromAiSuggestion(suggestion: AiSuggestion) {
  if (!isSupabaseConfigured || import.meta.env.DEV) {
    const actorEmail = (await getCurrentSession())?.user.email ?? 'local-admin';
    const draftQuestion = buildDraftQuestionFromSuggestion(suggestion, actorEmail);

    if (!draftQuestion) {
      throw new Error('La sugerencia seleccionada no se puede convertir en draft.');
    }

    await saveQuestion(draftQuestion, 'save_draft', 'Draft creado desde sugerencia AI.');
    updateLocalAiSuggestion(suggestion.id, (current) => ({
      ...current,
      status: 'applied',
      appliedQuestionId: draftQuestion.id,
      updatedAt: new Date().toISOString(),
    }));

    return {
      question: draftQuestion,
      workspace: await getAiWorkspace(),
    };
  }

  const payload = await requestAdminApi<{ question: Question }>('/api/admin/ai-suggestions', {
    operation: 'createDraft',
    suggestionId: suggestion.id,
  });

  return {
    question: payload.question,
    workspace: await getAiWorkspace(),
  };
}

export async function markAiSuggestionApplied(suggestionId: string, questionId: string) {
  if (!isSupabaseConfigured || import.meta.env.DEV) {
    updateLocalAiSuggestion(suggestionId, (current) => ({
      ...current,
      status: 'applied',
      appliedQuestionId: questionId,
      updatedAt: new Date().toISOString(),
    }));

    return getAiWorkspace();
  }

  await requestAdminApi<{ suggestion: AiSuggestion }>('/api/admin/ai-suggestions', {
    operation: 'markApplied',
    suggestionId,
    questionId,
  });

  return getAiWorkspace();
}

export async function saveQuestion(
  question: Question,
  action: EditorialAction = 'save',
  notes?: string,
) {
  const sanitizedQuestion = sanitizeQuestionPayload(question);
  const validationErrors = validateQuestionAction(sanitizedQuestion, action);

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  if (!isSupabaseConfigured || !supabase) {
    const event = buildEditorialEvent(
      sanitizedQuestion,
      sanitizedQuestion.updatedBy || 'local-admin',
      action,
      notes,
    );
    saveLocalQuestion(sanitizedQuestion, event);
    return { question: sanitizedQuestion, event };
  }

  if (import.meta.env.DEV) {
    const event = buildEditorialEvent(
      sanitizedQuestion,
      sanitizedQuestion.updatedBy || 'local-admin',
      action,
      notes,
    );
    await saveQuestionDirect(sanitizedQuestion, event);
    return { question: sanitizedQuestion, event };
  }

  return requestAdminApi<{ question: Question; event: EditorialEvent }>('/api/admin/questions', {
    question: sanitizedQuestion,
    action,
    notes,
  });
}

export async function seedRemoteContent() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para sembrar el contenido remoto.');
  }

  if (import.meta.env.DEV) {
    return seedRemoteContentDirect();
  }

  return requestAdminApi<{ seeded: boolean; reason?: string }>('/api/admin/seed', {
    replace: false,
  });
}

export async function requestAdminMagicLink(email: string) {
  if (!supabase) {
    throw new Error('Supabase no est√° configurado.');
  }

  const response = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAdminRedirectUrl(),
    },
  });

  if (response.error) {
    throw response.error;
  }
}

export async function getCurrentSession() {
  if (!supabase) {
    return null;
  }

  const response = await supabase.auth.getSession();
  return response.data.session;
}

export async function signOutAdmin() {
  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

export async function isCurrentUserAdmin() {
  if (!supabase) {
    return false;
  }

  const response = await supabase.rpc('is_current_user_admin');

  if (response.error) {
    throw response.error;
  }

  return Boolean(response.data);
}

export function saveLocalCatalogSnapshot(catalog: ContentCatalog) {
  saveLocalCatalog(normalizeCatalog(catalog));
}

