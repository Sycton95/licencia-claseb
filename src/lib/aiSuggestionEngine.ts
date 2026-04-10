import { SOURCE_PREPARATION } from '../data/sourcePreparation.js';
import { getQuestionWarnings } from './editorialDiagnostics.js';
import type { ContentCatalog, Question } from '../types/content.js';
import type {
  AiRun,
  AiSuggestion,
  AiSuggestionType,
  SourcePreparationChunk,
} from '../types/ai.js';

function nowIso() {
  return new Date().toISOString();
}

function buildSuggestionId(prefix: string, key: string) {
  return `${prefix}-${key}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function normalizePromptFingerprint(prompt: string) {
  return prompt.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildPromptRewrite(question: Question) {
  const cleaned = question.prompt
    .replace(/^seg[uú]n el manual,\s*/i, '')
    .replace(/^en el enfoque de sistema seguro,\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned === question.prompt) {
    return question.prompt;
  }

  const firstChar = cleaned.charAt(0);
  const normalized =
    firstChar === '¿'
      ? cleaned
      : `${firstChar.toUpperCase()}${cleaned.slice(1)}`;

  return normalized;
}

function buildNewQuestionSuggestion(
  catalog: ContentCatalog,
  chunk: SourcePreparationChunk,
  actorEmail: string,
  aiRunId: string,
): AiSuggestion | null {
  const candidate = chunk.candidateQuestion;

  if (!candidate) {
    return null;
  }

  const existingFingerprints = new Set(
    catalog.questions.map((question) => normalizePromptFingerprint(question.prompt)),
  );

  if (existingFingerprints.has(normalizePromptFingerprint(candidate.prompt))) {
    return null;
  }

  const createdAt = nowIso();
  const dedupeKey = `new-question:${chunk.id}`;

  return {
    id: buildSuggestionId('ai', dedupeKey),
    editionId: chunk.editionId,
    chapterId: chunk.chapterId,
    sourceDocumentId: chunk.sourceDocumentId,
    sourceReference: chunk.referenceLabel,
    suggestionType: 'new_question',
    status: 'pending',
    prompt: candidate.prompt,
    selectionMode: candidate.selectionMode,
    instruction: candidate.instruction,
    suggestedOptions: candidate.options,
    suggestedCorrectAnswers: candidate.correctOptionIndexes,
    publicExplanation: candidate.publicExplanation,
    reviewNotes: candidate.reviewNotes,
    groundingExcerpt: chunk.groundingSummary,
    rationale: chunk.rationale,
    confidence: 0.73,
    provider: 'heuristic',
    dedupeKey,
    aiRunId,
    createdBy: actorEmail,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildRewriteSuggestion(
  question: Question,
  actorEmail: string,
  aiRunId: string,
): AiSuggestion | null {
  const rewrittenPrompt = buildPromptRewrite(question);

  if (rewrittenPrompt === question.prompt) {
    return null;
  }

  const createdAt = nowIso();
  const dedupeKey = `rewrite:${question.id}`;

  return {
    id: buildSuggestionId('ai', dedupeKey),
    editionId: question.editionId,
    chapterId: question.chapterId,
    sourceDocumentId: question.sourceDocumentId,
    sourceReference: question.sourceReference ?? `Pág. ${question.sourcePage}`,
    suggestionType: 'rewrite',
    status: 'pending',
    prompt: rewrittenPrompt,
    selectionMode: question.selectionMode,
    instruction: question.instruction,
    suggestedOptions: question.options.map((option) => option.text),
    suggestedCorrectAnswers: question.options
      .map((option, index) => (option.isCorrect ? index : -1))
      .filter((value) => value >= 0),
    publicExplanation: question.publicExplanation,
    reviewNotes:
      'Sugerencia de reescritura: reducir framing metadiscursivo para dejar un stem más directo.',
    groundingExcerpt:
      question.publicExplanation ??
      question.explanation ??
      `Referencia: ${question.sourceReference ?? `Pág. ${question.sourcePage}`}.`,
    rationale:
      'El prompt actual incluye framing redundante y puede expresarse de manera más directa sin alterar el contenido.',
    confidence: 0.58,
    provider: 'heuristic',
    dedupeKey,
    targetQuestionId: question.id,
    aiRunId,
    createdBy: actorEmail,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildFlagSuggestion(
  question: Question,
  title: string,
  detail: string,
  actorEmail: string,
  aiRunId: string,
): AiSuggestion {
  const createdAt = nowIso();
  const dedupeKey = `flag:${question.id}:${title.toLowerCase().replace(/\s+/g, '-')}`;

  return {
    id: buildSuggestionId('ai', dedupeKey),
    editionId: question.editionId,
    chapterId: question.chapterId,
    sourceDocumentId: question.sourceDocumentId,
    sourceReference: question.sourceReference ?? `Pág. ${question.sourcePage}`,
    suggestionType: 'flag',
    status: 'pending',
    prompt: question.prompt,
    selectionMode: question.selectionMode,
    instruction: question.instruction,
    suggestedOptions: question.options.map((option) => option.text),
    suggestedCorrectAnswers: question.options
      .map((option, index) => (option.isCorrect ? index : -1))
      .filter((value) => value >= 0),
    publicExplanation: question.publicExplanation,
    reviewNotes: title,
    groundingExcerpt: detail,
    rationale: 'La heurística editorial detectó un riesgo que requiere revisión manual.',
    confidence: 0.81,
    provider: 'heuristic',
    dedupeKey,
    targetQuestionId: question.id,
    aiRunId,
    createdBy: actorEmail,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildCoverageGapSuggestions(
  catalog: ContentCatalog,
  actorEmail: string,
  aiRunId: string,
): AiSuggestion[] {
  const preparedChapterIds = new Set(SOURCE_PREPARATION.map((chunk) => chunk.chapterId));
  const createdAt = nowIso();

  return catalog.chapters
    .filter((chapter) => {
      const questionCount = catalog.questions.filter(
        (question) => question.chapterId === chapter.id && question.status !== 'archived',
      ).length;

      return questionCount === 0 || !preparedChapterIds.has(chapter.id);
    })
    .map((chapter) => {
      const dedupeKey = `coverage-gap:${chapter.id}`;

      return {
        id: buildSuggestionId('ai', dedupeKey),
        editionId: chapter.editionId,
        chapterId: chapter.id,
        sourceReference: chapter.code,
        suggestionType: 'coverage_gap' as AiSuggestionType,
        status: 'pending',
        prompt: `Preparar grounding adicional para ${chapter.code}: ${chapter.title}.`,
        suggestedOptions: [],
        suggestedCorrectAnswers: [],
        groundingExcerpt: chapter.description,
        rationale:
          'El capítulo no tiene todavía una base suficiente de chunks preparados o preguntas activas para generar más contenido con trazabilidad.',
        confidence: 0.92,
        provider: 'heuristic',
        dedupeKey,
        aiRunId,
        createdBy: actorEmail,
        createdAt,
        updatedAt: createdAt,
      };
    });
}

export function buildAiRun(editionId: string, actorEmail: string): AiRun {
  return {
    id: `ai-run-${Date.now()}`,
    editionId,
    actorEmail,
    provider: 'heuristic',
    runType: 'suggestion_refresh',
    status: 'completed',
    summary: {
      generatedCount: 0,
      newQuestionCount: 0,
      rewriteCount: 0,
      flagCount: 0,
      coverageGapCount: 0,
    },
    createdAt: nowIso(),
  };
}

export function buildDraftQuestionFromSuggestion(
  suggestion: AiSuggestion,
  actorEmail: string,
): Question | null {
  if (
    (suggestion.suggestionType !== 'new_question' && suggestion.suggestionType !== 'rewrite') ||
    !suggestion.chapterId ||
    !suggestion.sourceDocumentId ||
    !suggestion.selectionMode ||
    !suggestion.instruction ||
    suggestion.suggestedOptions.length < 2 ||
    suggestion.suggestedCorrectAnswers.length === 0
  ) {
    return null;
  }

  const baseQuestionId =
    suggestion.targetQuestionId ??
    `ai-${suggestion.id}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const now = nowIso();

  return {
    id: baseQuestionId,
    editionId: suggestion.editionId,
    chapterId: suggestion.chapterId,
    week: 1,
    prompt: suggestion.prompt,
    selectionMode: suggestion.selectionMode,
    instruction: suggestion.instruction,
    sourceDocumentId: suggestion.sourceDocumentId,
    sourcePage: 1,
    sourceReference: suggestion.sourceReference,
    explanation: suggestion.publicExplanation,
    publicExplanation: suggestion.publicExplanation,
    status: 'draft',
    isOfficialExamEligible: false,
    doubleWeight: false,
    reviewNotes: suggestion.reviewNotes,
    createdBy: actorEmail,
    updatedBy: actorEmail,
    reviewedAt: undefined,
    publishedAt: undefined,
    options: suggestion.suggestedOptions.map((text, index) => ({
      id: `${baseQuestionId}-opt-${String.fromCharCode(97 + index)}`,
      label: String.fromCharCode(65 + index),
      text,
      isCorrect: suggestion.suggestedCorrectAnswers.includes(index),
      order: index + 1,
    })),
    media: [],
  };
}

export function generateAiSuggestions(catalog: ContentCatalog, actorEmail: string) {
  const editionId = catalog.activeEdition?.id ?? catalog.examRuleSet.editionId;
  const aiRun = buildAiRun(editionId, actorEmail);
  const suggestions: AiSuggestion[] = [];

  for (const chunk of SOURCE_PREPARATION.filter((item) => item.editionId === editionId)) {
    const suggestion = buildNewQuestionSuggestion(catalog, chunk, actorEmail, aiRun.id);

    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  for (const question of catalog.questions) {
    const rewriteSuggestion = buildRewriteSuggestion(question, actorEmail, aiRun.id);

    if (rewriteSuggestion) {
      suggestions.push(rewriteSuggestion);
    }

    for (const warning of getQuestionWarnings(question, catalog.questions)) {
      suggestions.push(buildFlagSuggestion(question, warning.title, warning.detail, actorEmail, aiRun.id));
    }
  }

  suggestions.push(...buildCoverageGapSuggestions(catalog, actorEmail, aiRun.id));

  aiRun.summary = {
    generatedCount: suggestions.length,
    newQuestionCount: suggestions.filter((item) => item.suggestionType === 'new_question').length,
    rewriteCount: suggestions.filter((item) => item.suggestionType === 'rewrite').length,
    flagCount: suggestions.filter((item) => item.suggestionType === 'flag').length,
    coverageGapCount: suggestions.filter((item) => item.suggestionType === 'coverage_gap').length,
  };

  return {
    run: aiRun,
    suggestions,
    sourcePreparation: SOURCE_PREPARATION.filter((item) => item.editionId === editionId),
  };
}
