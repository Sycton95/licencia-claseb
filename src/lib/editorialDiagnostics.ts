import type { AiSuggestion } from '../types/ai.js';
import type { Chapter, Question, SourceDocument } from '../types/content.js';

export type EditorialDiagnosticSeverity = 'critical' | 'warning';
export type EditorialDiagnosticCategory =
  | 'source_reference'
  | 'answer_format'
  | 'duplicate_prompt'
  | 'weak_distractor'
  | 'instruction_mismatch';

export type EditorialDiagnostic = {
  id: string;
  entityType: 'question' | 'suggestion';
  entityId: string;
  category: EditorialDiagnosticCategory;
  severity: EditorialDiagnosticSeverity;
  title: string;
  detail: string;
  referenceTargetId?: string;
  referenceTargetType?: 'question' | 'suggestion';
};

export type EditorialWarning = {
  id: string;
  questionId: string;
  title: string;
  detail: string;
};

export type ChapterCoverageRow = {
  chapterId: string;
  chapterCode: string;
  chapterTitle: string;
  total: number;
  published: number;
  reviewedPending: number;
};

export type SourceCoverageRow = {
  sourceDocumentId: string;
  title: string;
  total: number;
  missingReferenceCount: number;
};

export type ReviewTask = {
  id: string;
  questionId: string;
  prompt: string;
  chapterId: string;
  severity: EditorialDiagnosticSeverity;
  category: EditorialDiagnosticCategory;
  title: string;
  detail: string;
};

export type ReviewSummary = {
  total: number;
  critical: number;
  warning: number;
  duplicatePromptCount: number;
  weakDistractorCount: number;
  instructionMismatchCount: number;
  answerFormatCount: number;
};

type OptionLike = {
  text: string;
  isCorrect: boolean;
};

type ReviewableEntity = {
  id: string;
  entityType: 'question' | 'suggestion';
  prompt: string;
  instruction: string;
  selectionMode: 'single' | 'multiple';
  sourceReference?: string;
  sourcePage?: number;
  options: OptionLike[];
};

function normalizeText(value: string | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function similarity(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

export function hasClearSourceReference(question: Pick<Question, 'sourceReference'>) {
  return Boolean(question.sourceReference?.trim());
}

export function getCorrectOptionCount(question: Pick<Question, 'options'>) {
  return question.options.filter((option) => option.isCorrect).length;
}

function buildDiagnostic(
  entity: ReviewableEntity,
  category: EditorialDiagnosticCategory,
  severity: EditorialDiagnosticSeverity,
  title: string,
  detail: string,
  reference?: Pick<EditorialDiagnostic, 'referenceTargetId' | 'referenceTargetType'>,
) {
  return {
    id: `${entity.entityType}-${entity.id}-${category}-${normalizeText(title).replace(/\s+/g, '-')}`,
    entityType: entity.entityType,
    entityId: entity.id,
    category,
    severity,
    title,
    detail,
    ...reference,
  } satisfies EditorialDiagnostic;
}

function buildQuestionReviewable(question: Question): ReviewableEntity {
  return {
    id: question.id,
    entityType: 'question',
    prompt: question.prompt,
    instruction: question.instruction,
    selectionMode: question.selectionMode,
    sourceReference: question.sourceReference,
    sourcePage: question.sourcePage,
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  };
}

function buildSuggestionReviewable(suggestion: AiSuggestion): ReviewableEntity | null {
  if (
    suggestion.suggestionType === 'coverage_gap' ||
    suggestion.suggestedOptions.length === 0 ||
    !suggestion.selectionMode ||
    !suggestion.instruction
  ) {
    return null;
  }

  return {
    id: suggestion.id,
    entityType: 'suggestion',
    prompt: suggestion.prompt,
    instruction: suggestion.instruction,
    selectionMode: suggestion.selectionMode,
    sourceReference: suggestion.sourceReference,
    options: suggestion.suggestedOptions.map((text, index) => ({
      text,
      isCorrect: suggestion.suggestedCorrectAnswers.includes(index),
    })),
  };
}

function getDuplicateDiagnostics(
  entity: ReviewableEntity,
  peers: ReviewableEntity[],
) {
  const diagnostics: EditorialDiagnostic[] = [];
  const ownPrompt = normalizeText(entity.prompt);

  if (!ownPrompt) {
    return diagnostics;
  }

  for (const peer of peers) {
    if (peer.id === entity.id) {
      continue;
    }

    const peerPrompt = normalizeText(peer.prompt);
    if (!peerPrompt) {
      continue;
    }

    if (peerPrompt === ownPrompt) {
      diagnostics.push(
        buildDiagnostic(
          entity,
          'duplicate_prompt',
          'critical',
          'Prompt duplicado',
          `El enunciado coincide con ${peer.entityType === 'question' ? 'otra pregunta' : 'otra sugerencia'} (${peer.id}).`,
          {
            referenceTargetId: peer.id,
            referenceTargetType: peer.entityType,
          },
        ),
      );
      return diagnostics;
    }

    if (similarity(entity.prompt, peer.prompt) >= 0.82) {
      diagnostics.push(
        buildDiagnostic(
          entity,
          'duplicate_prompt',
          'warning',
          'Prompt muy similar',
          `El enunciado se parece demasiado a ${peer.entityType === 'question' ? 'otra pregunta' : 'otra sugerencia'} (${peer.id}).`,
          {
            referenceTargetId: peer.id,
            referenceTargetType: peer.entityType,
          },
        ),
      );
      return diagnostics;
    }
  }

  return diagnostics;
}

function getWeakDistractorDiagnostics(entity: ReviewableEntity) {
  const diagnostics: EditorialDiagnostic[] = [];
  const normalizedOptions = entity.options.map((option) => normalizeText(option.text));
  const uniqueOptionTexts = new Set(normalizedOptions.filter(Boolean));
  const correctOptions = entity.options.filter((option) => option.isCorrect);
  const incorrectOptions = entity.options.filter((option) => !option.isCorrect);

  if (uniqueOptionTexts.size !== normalizedOptions.filter(Boolean).length) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'weak_distractor',
        'critical',
        'Alternativas repetidas',
        'Hay opciones con el mismo texto o con diferencias irrelevantes.',
      ),
    );
  }

  const veryShortIncorrect = incorrectOptions.filter(
    (option) => tokenize(option.text).length <= 1 && normalizeText(option.text).length < 8,
  );
  if (veryShortIncorrect.length > 0) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'weak_distractor',
        'warning',
        'Distractores débiles',
        'Al menos una alternativa incorrecta es demasiado corta o poco plausible.',
      ),
    );
  }

  const overlapsCorrectAnswer = incorrectOptions.some((incorrect) =>
    correctOptions.some((correct) => normalizeText(correct.text) === normalizeText(incorrect.text)),
  );

  if (overlapsCorrectAnswer) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'weak_distractor',
        'critical',
        'Distractor idéntico a respuesta correcta',
        'Una alternativa incorrecta repite el texto de una respuesta marcada como correcta.',
      ),
    );
  }

  return diagnostics;
}

function getInstructionMismatchDiagnostics(entity: ReviewableEntity) {
  const diagnostics: EditorialDiagnostic[] = [];
  const instruction = normalizeText(entity.instruction);

  if (!instruction) {
    return diagnostics;
  }

  const mentionsSingle =
    /\buna\b/.test(instruction) || /\bun\b/.test(instruction) || instruction.includes('una respuesta');
  const mentionsMultiple =
    /\bdos\b/.test(instruction) ||
    /\btres\b/.test(instruction) ||
    instruction.includes('respuestas') ||
    instruction.includes('alternativas');

  if (entity.selectionMode === 'single' && mentionsMultiple && !mentionsSingle) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'instruction_mismatch',
        'warning',
        'Instrucción no coincide con selección única',
        'La instrucción parece pedir múltiples respuestas, pero la pregunta está marcada como selección única.',
      ),
    );
  }

  if (entity.selectionMode === 'multiple' && mentionsSingle && !mentionsMultiple) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'instruction_mismatch',
        'warning',
        'Instrucción no coincide con selección múltiple',
        'La instrucción parece pedir una sola respuesta, pero la pregunta está marcada como selección múltiple.',
      ),
    );
  }

  return diagnostics;
}

function getAnswerFormatDiagnostics(entity: ReviewableEntity) {
  const diagnostics: EditorialDiagnostic[] = [];
  const correctCount = entity.options.filter((option) => option.isCorrect).length;

  if (correctCount === 0) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'answer_format',
        'critical',
        'Sin respuesta correcta',
        'La pregunta no tiene ninguna alternativa marcada como correcta.',
      ),
    );
  }

  if (entity.selectionMode === 'single' && correctCount !== 1) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'answer_format',
        'critical',
        'Selección única inconsistente',
        'Las preguntas de selección única deben tener exactamente una respuesta correcta.',
      ),
    );
  }

  if (entity.selectionMode === 'multiple' && correctCount < 2) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'answer_format',
        'critical',
        'Selección múltiple inconsistente',
        'Las preguntas de selección múltiple deben tener al menos dos respuestas correctas.',
      ),
    );
  }

  return diagnostics;
}

function getSourceReferenceDiagnostics(entity: ReviewableEntity, published = false) {
  const diagnostics: EditorialDiagnostic[] = [];
  if (!published) {
    return diagnostics;
  }

  if (!entity.sourceReference?.trim()) {
    diagnostics.push(
      buildDiagnostic(
        entity,
        'source_reference',
        'critical',
        'Publicada sin referencia precisa',
        'La pregunta está publicada, pero no incluye texto de referencia fuente.',
      ),
    );
  }

  return diagnostics;
}

export function getQuestionDiagnostics(question: Question, questions: Question[]): EditorialDiagnostic[] {
  const entity = buildQuestionReviewable(question);
  const peers = questions.map(buildQuestionReviewable);

  return [
    ...getSourceReferenceDiagnostics(entity, question.status === 'published'),
    ...getAnswerFormatDiagnostics(entity),
    ...getInstructionMismatchDiagnostics(entity),
    ...getWeakDistractorDiagnostics(entity),
    ...getDuplicateDiagnostics(entity, peers),
  ];
}

export function getSuggestionDiagnostics(
  suggestion: AiSuggestion,
  questions: Question[],
  suggestions: AiSuggestion[] = [],
): EditorialDiagnostic[] {
  const entity = buildSuggestionReviewable(suggestion);

  if (!entity) {
    return [];
  }

  const peerQuestions = questions.map(buildQuestionReviewable);
  const peerSuggestions = suggestions
    .map(buildSuggestionReviewable)
    .filter((item): item is ReviewableEntity => Boolean(item));

  return [
    ...getAnswerFormatDiagnostics(entity),
    ...getInstructionMismatchDiagnostics(entity),
    ...getWeakDistractorDiagnostics(entity),
    ...getDuplicateDiagnostics(entity, [...peerQuestions, ...peerSuggestions]),
  ];
}

export function getQuestionWarnings(question: Question, questions: Question[] = [question]): EditorialWarning[] {
  return getQuestionDiagnostics(question, questions).map((diagnostic) => ({
    id: diagnostic.id,
    questionId: question.id,
    title: diagnostic.title,
    detail: diagnostic.detail,
  }));
}

export function buildQuestionDiagnosticMap(questions: Question[]) {
  const entries = questions.map((question) => [
    question.id,
    getQuestionDiagnostics(question, questions),
  ] as const);

  return Object.fromEntries(entries) as Record<string, EditorialDiagnostic[]>;
}

export function buildSuggestionDiagnosticMap(
  suggestions: AiSuggestion[],
  questions: Question[],
) {
  const entries = suggestions.map((suggestion) => [
    suggestion.id,
    getSuggestionDiagnostics(suggestion, questions, suggestions),
  ] as const);

  return Object.fromEntries(entries) as Record<string, EditorialDiagnostic[]>;
}

export function buildReviewTasks(questions: Question[]): ReviewTask[] {
  return questions.flatMap((question) =>
    getQuestionDiagnostics(question, questions).map((diagnostic) => ({
      id: diagnostic.id,
      questionId: question.id,
      prompt: question.prompt,
      chapterId: question.chapterId,
      severity: diagnostic.severity,
      category: diagnostic.category,
      title: diagnostic.title,
      detail: diagnostic.detail,
    })),
  );
}

export function buildReviewSummary(tasks: ReviewTask[]): ReviewSummary {
  return {
    total: tasks.length,
    critical: tasks.filter((task) => task.severity === 'critical').length,
    warning: tasks.filter((task) => task.severity === 'warning').length,
    duplicatePromptCount: tasks.filter((task) => task.category === 'duplicate_prompt').length,
    weakDistractorCount: tasks.filter((task) => task.category === 'weak_distractor').length,
    instructionMismatchCount: tasks.filter((task) => task.category === 'instruction_mismatch').length,
    answerFormatCount: tasks.filter((task) => task.category === 'answer_format').length,
  };
}

export function buildChapterCoverage(chapters: Chapter[], questions: Question[]): ChapterCoverageRow[] {
  return chapters
    .map((chapter) => {
      const chapterQuestions = questions.filter((question) => question.chapterId === chapter.id);

      return {
        chapterId: chapter.id,
        chapterCode: chapter.code,
        chapterTitle: chapter.title,
        total: chapterQuestions.length,
        published: chapterQuestions.filter((question) => question.status === 'published').length,
        reviewedPending: chapterQuestions.filter((question) => question.status === 'reviewed').length,
      };
    })
    .sort((left, right) => left.chapterCode.localeCompare(right.chapterCode));
}

export function buildSourceCoverage(
  sourceDocuments: SourceDocument[],
  questions: Question[],
): SourceCoverageRow[] {
  return sourceDocuments
    .map((sourceDocument) => {
      const sourceQuestions = questions.filter(
        (question) => question.sourceDocumentId === sourceDocument.id,
      );

      return {
        sourceDocumentId: sourceDocument.id,
        title: sourceDocument.title,
        total: sourceQuestions.length,
        missingReferenceCount: sourceQuestions.filter(
          (question) => !hasClearSourceReference(question),
        ).length,
      };
    })
    .sort((left, right) => right.total - left.total || left.title.localeCompare(right.title));
}
