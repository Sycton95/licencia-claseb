import { SEED_CONTENT } from '../../src/data/seedContent.js';
import {
  sanitizeQuestionPayload,
  validateQuestionAction,
} from '../../src/lib/contentValidation.js';
import type {
  ContentCatalog,
  EditorialAction,
  EditorialEvent,
  Question,
} from '../../src/types/content.js';

type SupabaseClient = any;

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

function mapQuestionToV1Rows(question: Question) {
  const rows = mapQuestionToLegacyRows(question);

  return {
    ...rows,
    question: {
      ...rows.question,
      edition_id: question.editionId,
      public_explanation: question.publicExplanation ?? null,
    },
  };
}

export function applyEditorialAction(
  question: Question,
  actorEmail: string,
  action: EditorialAction,
  notes?: string,
) {
  const now = new Date().toISOString();

  const nextQuestion = sanitizeQuestionPayload({
    ...question,
    updatedBy: actorEmail,
  });

  if (action === 'save_draft') {
    nextQuestion.status = 'draft';
    nextQuestion.publishedAt = undefined;
  }

  if (action === 'mark_reviewed') {
    nextQuestion.status = 'reviewed';
    nextQuestion.reviewedAt = nextQuestion.reviewedAt ?? now;
    nextQuestion.publishedAt = undefined;
  }

  if (action === 'publish') {
    nextQuestion.status = 'published';
    nextQuestion.reviewedAt = nextQuestion.reviewedAt ?? now;
    nextQuestion.publishedAt = now;
  }

  if (action === 'archive') {
    nextQuestion.status = 'archived';
  }

  if (action === 'save') {
    if (nextQuestion.status === 'reviewed' && !nextQuestion.reviewedAt) {
      nextQuestion.reviewedAt = now;
    }

    if (nextQuestion.status === 'published') {
      nextQuestion.reviewedAt = nextQuestion.reviewedAt ?? now;
      nextQuestion.publishedAt = nextQuestion.publishedAt ?? now;
    }
  }

  const validationErrors = validateQuestionAction(nextQuestion, action);

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join('\n'));
  }

  return {
    question: nextQuestion,
    event: buildEditorialEvent(nextQuestion, actorEmail, action, notes),
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

export async function hasV1Schema(client: SupabaseClient) {
  const response = await client.from('editions').select('id').limit(1);
  return !response.error;
}

async function saveQuestionRows(
  client: SupabaseClient,
  rows: ReturnType<typeof mapQuestionToLegacyRows> | ReturnType<typeof mapQuestionToV1Rows>,
) {
  const upsertQuestionResult = await client.from('questions').upsert(rows.question).select('id').single();

  if (upsertQuestionResult.error) {
    throw upsertQuestionResult.error;
  }

  const deleteOptionsResult = await client.from('question_options').delete().eq('question_id', rows.question.id);

  if (deleteOptionsResult.error) {
    throw deleteOptionsResult.error;
  }

  const deleteMediaResult = await client.from('question_media').delete().eq('question_id', rows.question.id);

  if (deleteMediaResult.error) {
    throw deleteMediaResult.error;
  }

  if (rows.options.length > 0) {
    const insertOptionsResult = await client.from('question_options').insert(rows.options);

    if (insertOptionsResult.error) {
      throw insertOptionsResult.error;
    }
  }

  if (rows.media.length > 0) {
    const insertMediaResult = await client.from('question_media').insert(rows.media);

    if (insertMediaResult.error) {
      throw insertMediaResult.error;
    }
  }
}

export async function saveQuestionWithSchema(
  client: SupabaseClient,
  question: Question,
  event: EditorialEvent,
  useV1Schema: boolean,
) {
  const rows = useV1Schema ? mapQuestionToV1Rows(question) : mapQuestionToLegacyRows(question);
  await saveQuestionRows(client, rows);

  if (useV1Schema) {
    const eventResult = await client.from('editorial_events').upsert({
      id: event.id,
      edition_id: event.editionId,
      question_id: event.questionId ?? null,
      actor_email: event.actorEmail,
      action: event.action,
      notes: event.notes ?? null,
      created_at: event.createdAt,
    });

    if (eventResult.error) {
      throw eventResult.error;
    }
  }
}

async function seedV1Catalog(client: SupabaseClient, catalog: ContentCatalog) {
  const editionResult = await client.from('editions').upsert(
    catalog.editions.map((edition) => ({
      id: edition.id,
      code: edition.code,
      title: edition.title,
      status: edition.status,
      is_active: edition.isActive,
      effective_from: edition.effectiveFrom,
      archived_at: edition.archivedAt ?? null,
    })),
  );

  if (editionResult.error) {
    throw editionResult.error;
  }

  const chapterResult = await client.from('chapters').upsert(
    catalog.chapters.map((chapter) => ({
      id: chapter.id,
      edition_id: chapter.editionId,
      code: chapter.code,
      title: chapter.title,
      description: chapter.description,
      display_order: chapter.order,
      is_active: chapter.isActive,
    })),
  );

  if (chapterResult.error) {
    throw chapterResult.error;
  }

  const sourcesResult = await client.from('source_documents').upsert(
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

  if (sourcesResult.error) {
    throw sourcesResult.error;
  }

  const ruleResult = await client.from('exam_rule_sets').upsert({
    code: catalog.examRuleSet.code,
    edition_id: catalog.examRuleSet.editionId,
    question_count: catalog.examRuleSet.questionCount,
    max_points: catalog.examRuleSet.maxPoints,
    passing_points: catalog.examRuleSet.passingPoints,
    double_weight_count: catalog.examRuleSet.doubleWeightCount,
    exam_duration_minutes: catalog.examRuleSet.examDurationMinutes ?? null,
  });

  if (ruleResult.error) {
    throw ruleResult.error;
  }

  for (const question of catalog.questions) {
    const event =
      catalog.editorialEvents.find((item) => item.questionId === question.id) ??
      buildEditorialEvent(question, question.updatedBy, 'seed');
    await saveQuestionWithSchema(client, question, event, true);
  }
}

async function seedLegacyCatalog(client: SupabaseClient, catalog: ContentCatalog) {
  const chapterResult = await client.from('chapters').upsert(
    catalog.chapters.map((chapter) => ({
      id: chapter.id,
      code: chapter.code,
      title: chapter.title,
      description: chapter.description,
      display_order: chapter.order,
      is_active: chapter.isActive,
    })),
  );

  if (chapterResult.error) {
    throw chapterResult.error;
  }

  const sourcesResult = await client.from('source_documents').upsert(
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

  if (sourcesResult.error) {
    throw sourcesResult.error;
  }

  const ruleResult = await client.from('exam_rule_sets').upsert({
    code: catalog.examRuleSet.code,
    question_count: catalog.examRuleSet.questionCount,
    max_points: catalog.examRuleSet.maxPoints,
    passing_points: catalog.examRuleSet.passingPoints,
    double_weight_count: catalog.examRuleSet.doubleWeightCount,
    exam_duration_minutes: catalog.examRuleSet.examDurationMinutes ?? null,
  });

  if (ruleResult.error) {
    throw ruleResult.error;
  }

  for (const question of catalog.questions) {
    await saveQuestionRows(client, mapQuestionToLegacyRows(question));
  }
}

export async function seedCatalogWithSchema(client: SupabaseClient, replace = false) {
  const v1 = await hasV1Schema(client);
  const countResponse = await client
    .from('questions')
    .select('id', { count: 'exact', head: true });

  if (countResponse.error) {
    throw countResponse.error;
  }

  if (!replace && (countResponse.count ?? 0) > 0) {
    return { seeded: false as const, reason: 'already-seeded' as const, schema: v1 ? 'v1' : 'legacy' };
  }

  if (v1) {
    await seedV1Catalog(client, SEED_CONTENT);
  } else {
    await seedLegacyCatalog(client, SEED_CONTENT);
  }

  return { seeded: true as const, schema: v1 ? 'v1' : 'legacy' };
}

export async function checkSupabaseHealth(client: SupabaseClient) {
  const publicCheck = await client.from('source_documents').select('id').limit(1);

  if (publicCheck.error) {
    return {
      ok: false,
      databaseReachable: false,
      schema: 'unknown',
      error: publicCheck.error.message,
    };
  }

  return {
    ok: true,
    databaseReachable: true,
    schema: (await hasV1Schema(client)) ? 'v1' : 'legacy',
    error: null,
  };
}
