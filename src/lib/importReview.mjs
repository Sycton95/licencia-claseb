import { createProductionGroundingEngine } from './grounding/engine.mjs';
import { loadGroundingResource } from './grounding/resourceLoader.mjs';

const CHAPTER_SOURCE_WINDOWS = {
  'chapter-1': { start: 6, end: 10, label: 'Los siniestros de transito' },
  'chapter-2': { start: 11, end: 32, label: 'Los principios de la conduccion' },
  'chapter-3': { start: 33, end: 36, label: 'Convivencia vial' },
  'chapter-4': { start: 37, end: 67, label: 'La persona en el transito' },
  'chapter-5': { start: 68, end: 76, label: 'Las y los usuarios vulnerables' },
  'chapter-6': { start: 77, end: 108, label: 'Normas de circulacion' },
  'chapter-7': { start: 109, end: 126, label: 'Conduccion en circunstancias especiales' },
  'chapter-8': { start: 127, end: 135, label: 'Conduccion eficiente' },
  'chapter-9': { start: 136, end: 148, label: 'Informaciones importantes' },
};

const DEFAULT_EDITION_ID = 'edition-2026';
const DEFAULT_SOURCE_DOCUMENT_ID = 'manual-claseb-2026';
const DEFAULT_SIMILARITY_THRESHOLD = 0.85;
const VISUAL_AUDIT_TRIGGERS = loadGroundingResource('visual-audit-triggers.json').triggers ?? [];
const ISSUE_LOCALIZATION_MAP = {
  invalid_source_page: 'La página indicada fue corregida automáticamente o requiere revisión.',
  invalid_source_page_range: 'El rango de páginas informado no es válido y debe corregirse.',
  chapter_scope_mismatch: 'La referencia de páginas no coincide con el capítulo final asignado.',
  batch_chapter_mismatch: 'La pregunta fue reasignada a otro capítulo durante la revisión.',
  batch_chapter_mismatch_repaired: 'La pregunta fue corregida a otro capítulo según el grounding.',
  missing_grounding_excerpt: 'No se encontró una referencia textual clara en el libro.',
  manual_fact_conflict: 'El dato crítico de la respuesta no coincide con el manual.',
  manual_fact_fix_suggested: 'Dato del manual detectado para revisión y corrección sugerida.',
  manual_fact_auxiliary_warning: 'El texto auxiliar contiene un dato que no coincide con el manual.',
  referenced_duplicate_in_batch: 'La pregunta fue desplazada por otra mejor dentro del mismo lote.',
  duplicate_prompt_existing_bank: 'Esta pregunta ya existe en la base revisada.',
  near_duplicate_prompt_existing_bank: 'Esta pregunta es muy similar a una ya existente en la base.',
  duplicate_prompt_reviewed_import: 'Esta pregunta ya apareció en otra corrida de importación revisada.',
  near_duplicate_prompt_reviewed_import: 'Esta pregunta es muy similar a otra ya revisada.',
  low_confidence_grounding: 'No se encontró una referencia clara en el libro.',
  no_grounding_support: 'No se encontró respaldo suficiente en el manual.',
  metadata_auto_repaired: 'Los metadatos fueron corregidos automáticamente usando el grounding.',
  auto_grounded_from_production_engine: 'Se agregó una cita automática desde el manual.',
  auto_grounded_low_confidence: 'Se agregó una cita tentativa, pero requiere revisión humana.',
  missing_source_reference: 'Se recomienda registrar una referencia de origen más precisa.',
  needs_visual_audit: 'La pregunta requiere revisión visual porque el texto podría no ser suficiente.',
  reduced_option_count: 'Pregunta con formato reducido de 3 alternativas.',
  non_standard_option_count: 'La cantidad de alternativas requiere revisión manual.',
};
const UNIT_REPLACEMENTS = [
  { pattern: /\b(?:kms?\/h|kmh|km\/hr|kph)\b/giu, replacement: 'km/h' },
  { pattern: /\b(?:gr\/l|g\/lt|g\/l\.)\b/giu, replacement: 'g/l' },
  { pattern: /\banios\b/giu, replacement: 'años' },
  { pattern: /\baÃ±os\b/giu, replacement: 'años' },
];

const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
const suspiciousPattern = /(Ã.|Â|â€|â€œ|â€|â€™|â€¦|ï¿½|�)/g;

function localizeIssue(code, fallbackMessage = '') {
  return ISSUE_LOCALIZATION_MAP[code] ?? fallbackMessage ?? '';
}

function buildIssue(code, message, field, localizedMessage = '') {
  return {
    code,
    message,
    field,
    localizedMessage: localizedMessage || localizeIssue(code, message),
  };
}

function toSlug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function countSuspiciousMarkers(value) {
  return [...String(value ?? '').matchAll(suspiciousPattern)].length;
}

function hasSuspiciousMojibake(value) {
  return suspiciousPattern.test(String(value ?? ''));
}

function decodeLatin1AsUtf8(value) {
  const bytes = Uint8Array.from([...value].map((character) => character.charCodeAt(0) & 0xff));
  return utf8Decoder.decode(bytes);
}

function recoverMojibake(value) {
  if (!hasSuspiciousMojibake(value)) {
    return value;
  }

  let next = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const candidate = decodeLatin1AsUtf8(next);
    if (candidate === next || countSuspiciousMarkers(candidate) >= countSuspiciousMarkers(next)) {
      break;
    }
    next = candidate;
  }
  return next;
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function normalizeUnitVariants(value) {
  return UNIT_REPLACEMENTS.reduce(
    (current, rule) => current.replace(rule.pattern, rule.replacement),
    String(value ?? ''),
  );
}

function normalizeString(value, context, normalizations) {
  if (typeof value !== 'string') {
    return value;
  }

  let next = value;
  const mojibakeRecovered = recoverMojibake(next);
  if (mojibakeRecovered !== next) {
    normalizations.push({
      scope: context.scope,
      target: context.target,
      field: context.field,
      action: 'mojibake_recovered',
      before: next,
      after: mojibakeRecovered,
    });
    next = mojibakeRecovered;
  }

  const unitNormalized = normalizeUnitVariants(next);
  if (unitNormalized !== next) {
    normalizations.push({
      scope: context.scope,
      target: context.target,
      field: context.field,
      action: 'unit_normalized',
      before: next,
      after: unitNormalized,
    });
    next = unitNormalized;
  }

  const whitespaceNormalized = normalizeWhitespace(next);
  if (whitespaceNormalized !== next) {
    normalizations.push({
      scope: context.scope,
      target: context.target,
      field: context.field,
      action: 'whitespace_normalized',
      before: next,
      after: whitespaceNormalized,
    });
    next = whitespaceNormalized;
  }

  return next;
}

function normalizeTextForCompare(value) {
  return normalizeWhitespace(recoverMojibake(String(value ?? '')))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeTextForContains(value) {
  return normalizeTextForCompare(value).replace(/[^a-z0-9\s/%.-]/g, '').trim();
}

function tokenize(value) {
  return normalizeTextForCompare(value)
    .split(/[^a-z0-9/%.-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function similarity(left, right) {
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

function cosineSimilarity(leftVector, rightVector) {
  if (!Array.isArray(leftVector) || !Array.isArray(rightVector)) {
    return null;
  }

  if (leftVector.length === 0 || leftVector.length !== rightVector.length) {
    return null;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < leftVector.length; index += 1) {
    const left = Number(leftVector[index] ?? 0);
    const right = Number(rightVector[index] ?? 0);
    dot += left * right;
    leftMagnitude += left * left;
    rightMagnitude += right * right;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return null;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function createEmbeddingResolver(embeddingCache) {
  const prompts = embeddingCache?.prompts ?? {};
  return (left, right) => {
    const leftKey = normalizeTextForCompare(left);
    const rightKey = normalizeTextForCompare(right);
    const leftVector = prompts[leftKey];
    const rightVector = prompts[rightKey];
    return cosineSimilarity(leftVector, rightVector);
  };
}

function normalizeChapterId(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return `chapter-${trimmed}`;
  }

  return trimmed;
}

function normalizeClaimValue(value) {
  return String(value ?? '').replace(',', '.').trim();
}

function buildQuestionSnapshot(question) {
  return {
    id: question.externalId ?? question.id ?? '',
    prompt: question.prompt ?? '',
    options: Array.isArray(question.options)
      ? question.options.map((option) => option.text ?? '')
      : undefined,
    correctOptionIndexes: Array.isArray(question.correctOptionIndexes)
      ? question.correctOptionIndexes
      : undefined,
    publicExplanation: question.publicExplanation ?? '',
    chapterId: question.chapterId ?? '',
    sourceReference: question.sourceReference ?? '',
    sourcePageStart: question.sourcePageStart,
    sourcePageEnd: question.sourcePageEnd,
  };
}

function extractPromptSnapshots(seedContentText) {
  const prompts = [];
  const pattern = /prompt:\s*'((?:\\.|[^'\\])*)'/g;
  let match;

  while ((match = pattern.exec(seedContentText)) !== null) {
    const prompt = match[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
    prompts.push({
      id: `seed-${prompts.length + 1}`,
      prompt,
    });
  }

  return prompts;
}

function buildExistingQuestionSnapshots(seedContentText, reviewedImportQuestions = []) {
  const seedPrompts = extractPromptSnapshots(seedContentText).map((item) => ({
    id: item.id,
    prompt: item.prompt,
    scope: 'existing_bank',
  }));

  const reviewedPrompts = reviewedImportQuestions.map((question) => ({
    id: question.externalId,
    prompt: question.prompt,
    options: Array.isArray(question.options)
      ? question.options.map((option) => option.text ?? '')
      : [],
    correctOptionIndexes: question.correctOptionIndexes ?? [],
    publicExplanation: question.publicExplanation ?? '',
    chapterId: question.chapterId ?? '',
    sourceReference: question.sourceReference ?? '',
    sourcePageStart: question.sourcePageStart,
    sourcePageEnd: question.sourcePageEnd,
    scope: 'reviewed_import',
  }));

  return [...seedPrompts, ...reviewedPrompts];
}

function inferSelectionMode(correctOptionIndexes, rawSelectionMode) {
  if (rawSelectionMode === 'single' || rawSelectionMode === 'multiple') {
    return rawSelectionMode;
  }

  return correctOptionIndexes.length > 1 ? 'multiple' : 'single';
}

function createQuestionBase(externalId, rawQuestion, normalizations, batchChapterId) {
  const rawOptions = Array.isArray(rawQuestion?.options) ? rawQuestion.options : [];
  const optionTexts = rawOptions.map((option, optionIndex) =>
    normalizeString(
      typeof option === 'string' ? option : option?.text ?? '',
      { scope: 'question', target: externalId, field: `options[${optionIndex}].text` },
      normalizations,
    ),
  );

  const correctOptionIndexes = Array.isArray(rawQuestion?.correctOptionIndexes)
    ? rawQuestion.correctOptionIndexes.map((value) => Number(value))
    : Number.isInteger(rawQuestion?.correctAnswer)
      ? [Number(rawQuestion.correctAnswer)]
      : [];

  const selectionMode = inferSelectionMode(correctOptionIndexes, rawQuestion?.selectionMode);

  return {
    externalId,
    prompt: normalizeString(
      rawQuestion?.text ?? rawQuestion?.prompt ?? '',
      { scope: 'question', target: externalId, field: 'prompt' },
      normalizations,
    ),
    selectionMode,
    instruction: normalizeString(
      rawQuestion?.instruction ??
        (selectionMode === 'multiple'
          ? 'Seleccione todas las respuestas correctas.'
          : 'Marque una respuesta.'),
      { scope: 'question', target: externalId, field: 'instruction' },
      normalizations,
    ),
    options: optionTexts.map((text) => ({ text })),
    correctOptionIndexes,
    publicExplanation: normalizeString(
      rawQuestion?.publicExplanation ?? rawQuestion?.explanation ?? '',
      { scope: 'question', target: externalId, field: 'publicExplanation' },
      normalizations,
    ),
    sourcePageStart: Number(rawQuestion?.sourcePageStart),
    sourcePageEnd: Number(rawQuestion?.sourcePageEnd),
    sourceReference: normalizeString(
      rawQuestion?.sourceReference ?? '',
      { scope: 'question', target: externalId, field: 'sourceReference' },
      normalizations,
    ),
    groundingExcerpt: normalizeString(
      rawQuestion?.groundingExcerpt ?? '',
      { scope: 'question', target: externalId, field: 'groundingExcerpt' },
      normalizations,
    ),
    reviewNotes: normalizeString(
      rawQuestion?.reviewNotes ?? '',
      { scope: 'question', target: externalId, field: 'reviewNotes' },
      normalizations,
    ),
    tags: Array.isArray(rawQuestion?.tags)
      ? rawQuestion.tags
          .map((tag, tagIndex) =>
            normalizeString(
              String(tag ?? ''),
              { scope: 'question', target: externalId, field: `tags[${tagIndex}]` },
              normalizations,
            ),
          )
          .filter(Boolean)
      : [],
    chapterId: normalizeChapterId(rawQuestion?.chapterId ?? batchChapterId ?? ''),
    manualFactRefs: Array.isArray(rawQuestion?.manualFactRefs) ? rawQuestion.manualFactRefs : [],
    manualCitationRefs: Array.isArray(rawQuestion?.manualCitationRefs)
      ? rawQuestion.manualCitationRefs
      : [],
    classificationScores:
      rawQuestion?.classificationScores && typeof rawQuestion.classificationScores === 'object'
        ? rawQuestion.classificationScores
        : undefined,
    reviewDisposition: 'rejected',
    groundingMode: rawQuestion?.groundingExcerpt ? 'manual' : 'missing',
    autoGroundingConfidence: undefined,
    extractedEntities: [],
    groundingAudit: undefined,
  };
}

function normalizeFlatImportQuestion(rawQuestion, sourceStem, index, normalizations, batchChapterId) {
  const metadata = rawQuestion?.metadata ?? {};
  const externalId =
    typeof rawQuestion?.externalId === 'string' && rawQuestion.externalId.trim()
      ? rawQuestion.externalId.trim()
      : typeof metadata?.originalId === 'string' && metadata.originalId.trim()
        ? `${toSlug(sourceStem)}-${metadata.originalId.trim()}`
        : `${toSlug(sourceStem)}-${String(index + 1).padStart(4, '0')}`;

  const question = createQuestionBase(externalId, rawQuestion, normalizations, batchChapterId);
  if (!question.reviewNotes) {
    question.reviewNotes = normalizeString(
      `Importado desde ${metadata?.source ?? 'raw_import'} (${metadata?.originalId ?? externalId}).`,
      { scope: 'question', target: externalId, field: 'reviewNotes' },
      normalizations,
    );
  }

  return question;
}

function normalizeWrappedImportQuestion(rawQuestion, batchChapterId, normalizations, index) {
  const externalId =
    typeof rawQuestion?.externalId === 'string' && rawQuestion.externalId.trim()
      ? rawQuestion.externalId.trim()
      : `question-${index + 1}`;

  return createQuestionBase(externalId, rawQuestion, normalizations, batchChapterId);
}

function normalizeImportSource(rawBatch, sourceFile, normalizations) {
  const sourceStem = sourceFile.split('/').pop()?.replace(/\.json$/i, '') ?? 'import';

  if (Array.isArray(rawBatch)) {
    return {
      batchId: sourceStem,
      editionId: DEFAULT_EDITION_ID,
      sourceDocumentId: DEFAULT_SOURCE_DOCUMENT_ID,
      chapterId: '',
      questions: rawBatch.map((question, index) =>
        normalizeFlatImportQuestion(question, sourceStem, index, normalizations, ''),
      ),
    };
  }

  const chapterIdRaw = typeof rawBatch?.chapterId === 'string' ? rawBatch.chapterId : '';
  const chapterIdNormalized = normalizeChapterId(chapterIdRaw);
  if (chapterIdNormalized !== chapterIdRaw && chapterIdRaw) {
    normalizations.push({
      scope: 'batch',
      target: 'batch',
      field: 'chapterId',
      action: 'chapter_id_normalized',
      before: chapterIdRaw,
      after: chapterIdNormalized,
    });
  }

  return {
    batchId: normalizeString(
      rawBatch?.batchId ?? sourceStem,
      { scope: 'batch', target: 'batch', field: 'batchId' },
      normalizations,
    ),
    editionId: normalizeString(
      rawBatch?.editionId ?? DEFAULT_EDITION_ID,
      { scope: 'batch', target: 'batch', field: 'editionId' },
      normalizations,
    ),
    sourceDocumentId: normalizeString(
      rawBatch?.sourceDocumentId ?? DEFAULT_SOURCE_DOCUMENT_ID,
      { scope: 'batch', target: 'batch', field: 'sourceDocumentId' },
      normalizations,
    ),
    chapterId: chapterIdNormalized,
    questions: Array.isArray(rawBatch?.questions)
      ? rawBatch.questions.map((question, index) =>
          normalizeWrappedImportQuestion(question, chapterIdNormalized, normalizations, index),
        )
      : [],
  };
}

function toLegacyExtractedEntities(entities = []) {
  return entities.map((entity) => ({
    raw: entity.raw,
    value: String(entity.normalized ?? ''),
    unit: entity.unit ?? '',
    factRefIds: [],
  }));
}

function summarizeGroundingChapterPrediction(audit) {
  const ranked = audit?.chapterLikelihood?.ranked ?? [];
  const [best, second] = ranked;
  const bestScore = Number(best?.likelihood ?? 0);
  const secondScore = Number(second?.likelihood ?? 0);
  return {
    scores: audit?.chapterLikelihood?.combinedDistribution ?? audit?.chapterLikelihood?.distribution ?? {},
    bestChapterId: best?.chapterId ?? audit?.winner?.chapterId ?? '',
    bestScore,
    secondScore,
    ambiguous: !best?.chapterId || bestScore < 0.18 || bestScore - secondScore <= 0.03,
  };
}

function buildGroundingSuggestionsFromAudit(audit, limit = 3) {
  return (audit?.reranked ?? []).slice(0, limit).map((candidate) => ({
    citationId: candidate.id,
    chapterId: candidate.chapterId,
    manualRef: candidate.manualRef ?? '',
    pageRange: candidate.pageRange,
    excerpt: candidate.excerpt ?? '',
    confidence: Number(candidate.finalScore ?? 0),
  }));
}

function buildProductionGroundingAudit(audit) {
  return {
    disposition: audit?.confidence?.disposition ?? 'no_grounding',
    reason: audit?.confidence?.reason ?? 'unknown',
    predictedChapterId: audit?.chapterLikelihood?.predictedChapterId ?? '',
    predictedLikelihood: Number(audit?.chapterLikelihood?.predictedLikelihood ?? 0),
    winnerId: audit?.winner?.id ?? '',
    winnerChapterId: audit?.winner?.chapterId ?? '',
    winnerPageRange: audit?.winner?.pageRange ?? null,
    supportCoverage: Number(audit?.winner?.supportMetrics?.structuredCoverage ?? 0),
    factScore: Number(audit?.winner?.factGate?.factScore ?? 0),
    top1Score: Number(audit?.confidence?.top1Score ?? 0),
    delta: Number(audit?.confidence?.delta ?? 0),
    answerSupportCoverage: 0,
    answerTokenCoverage: 0,
    productionDisposition: audit?.confidence?.disposition ?? 'no_grounding',
    supportRefinement: audit?.supportRefinement ?? null,
    fallbackRecovery: audit?.fallbackRecovery ?? null,
    latencyMs: Number(audit?.latencyMs ?? 0),
  };
}

function buildPromptAndAnswerSurface(question) {
  const correctOptionTexts = question.correctOptionIndexes
    .map((index) => question.options[index]?.text ?? '')
    .filter(Boolean);

  return {
    promptText: question.prompt ?? '',
    answerText: correctOptionTexts.join(' '),
    combinedText: [question.prompt, ...correctOptionTexts].filter(Boolean).join(' '),
  };
}

function computeAnswerSupportSignal(question, groundingAudit) {
  const winnerText = groundingAudit?.winner?.text ?? groundingAudit?.winner?.excerpt ?? '';
  const winnerNormalized = normalizeTextForCompare(winnerText);
  const { promptText, answerText, combinedText } = buildPromptAndAnswerSurface(question);
  const combinedTokens = tokenize(combinedText);
  const answerTokens = tokenize(answerText);
  const matchedCombinedTokens = combinedTokens.filter((token) => winnerNormalized.includes(token));
  const matchedAnswerTokens = answerTokens.filter((token) => winnerNormalized.includes(token));
  const combinedCoverage =
    combinedTokens.length === 0 ? 0 : matchedCombinedTokens.length / combinedTokens.length;
  const answerCoverage =
    answerTokens.length === 0 ? combinedCoverage : matchedAnswerTokens.length / answerTokens.length;
  const promptSimilarity = similarity(promptText, winnerText);
  const combinedSimilarity = similarity(combinedText, winnerText);

  return {
    combinedCoverage: Number(combinedCoverage.toFixed(6)),
    answerCoverage: Number(answerCoverage.toFixed(6)),
    promptSimilarity: Number(promptSimilarity.toFixed(6)),
    combinedSimilarity: Number(combinedSimilarity.toFixed(6)),
  };
}

function classifyProductionGrounding(question, groundingAudit) {
  if (!groundingAudit?.winner) {
    return {
      productionDisposition: 'no_grounding',
      reason: 'no_winner',
      answerSupportCoverage: 0,
      answerTokenCoverage: 0,
    };
  }

  const answerSignal = computeAnswerSupportSignal(question, groundingAudit);
  if (groundingAudit.confidence?.disposition === 'grounded') {
    return {
      productionDisposition: 'grounded',
      reason: groundingAudit.confidence?.reason ?? 'confident_match',
      answerSupportCoverage: answerSignal.combinedCoverage,
      answerTokenCoverage: answerSignal.answerCoverage,
    };
  }

  const top1Score = Number(groundingAudit.confidence?.top1Score ?? 0);
  const delta = Number(groundingAudit.confidence?.delta ?? 0);
  const predictedLikelihood = Number(groundingAudit.chapterLikelihood?.predictedLikelihood ?? 0);
  const supportCoverage = Number(groundingAudit.winner?.supportMetrics?.structuredCoverage ?? 0);
  const factScore = Number(groundingAudit.winner?.factGate?.factScore ?? 0);
  const winnerChapterMatchesPrediction =
    Boolean(groundingAudit.winner?.chapterId) &&
    groundingAudit.chapterLikelihood?.predictedChapterId === groundingAudit.winner?.chapterId;
  const fallbackChangedWinner = Boolean(groundingAudit?.fallbackRecovery?.winnerChanged);
  const strongCoverage =
    answerSignal.answerCoverage >= 0.72 ||
    answerSignal.combinedCoverage >= 0.72 ||
    supportCoverage >= 0.72;
  const strongAlignment =
    answerSignal.answerCoverage >= 0.45 ||
    answerSignal.combinedCoverage >= 0.45 ||
    supportCoverage >= 0.5 ||
    answerSignal.combinedSimilarity >= 0.18;
  const chapterSignalStrong =
    predictedLikelihood >= 0.6 ||
    winnerChapterMatchesPrediction ||
    strongCoverage;
  const stableEnough =
    delta >= 0.015 ||
    strongCoverage ||
    factScore >= 0.85 ||
    (predictedLikelihood >= 0.85 && top1Score >= 0.95) ||
    (predictedLikelihood >= 0.75 && supportCoverage >= 0.65 && answerSignal.combinedSimilarity >= 0.2) ||
    top1Score >= 1.05;
  const recoverable =
    groundingAudit.confidence?.disposition === 'low_confidence' &&
    top1Score >= 0.72 &&
    strongAlignment &&
    chapterSignalStrong &&
    stableEnough;
  const usableWinnerLowConfidence =
    groundingAudit.confidence?.disposition === 'low_confidence' &&
    !recoverable &&
    top1Score >= 0.42 &&
    (
      answerSignal.answerCoverage >= 0.75 ||
      (answerSignal.combinedCoverage >= 0.55 && answerSignal.combinedSimilarity >= 0.18) ||
      (supportCoverage >= 0.4 && answerSignal.answerCoverage >= 0.58) ||
      fallbackChangedWinner
    ) &&
    (
      winnerChapterMatchesPrediction ||
      supportCoverage >= 0.32 ||
      answerSignal.answerCoverage >= 0.8 ||
      fallbackChangedWinner
    ) &&
    (
      delta >= 0.003 ||
      answerSignal.answerCoverage >= 0.82 ||
      answerSignal.combinedSimilarity >= 0.22 ||
      top1Score >= 0.5 ||
      fallbackChangedWinner
    );

  return {
    productionDisposition: recoverable
      ? 'grounded_recoverable'
      : usableWinnerLowConfidence
        ? 'usable_winner_low_confidence'
        : 'no_grounding',
    reason: recoverable
      ? 'recoverable_incomplete_support'
      : usableWinnerLowConfidence
        ? fallbackChangedWinner
          ? 'usable_low_confidence_fallback_winner'
          : 'usable_low_confidence_winner'
        : groundingAudit.confidence?.reason ?? 'low_confidence',
    answerSupportCoverage: answerSignal.combinedCoverage,
    answerTokenCoverage: answerSignal.answerCoverage,
  };
}

function isUsableGroundingDisposition(productionDisposition) {
  return (
    productionDisposition === 'grounded' ||
    productionDisposition === 'grounded_recoverable' ||
    productionDisposition === 'usable_winner_low_confidence'
  );
}

function detectVisualDependency(question) {
  const surface = normalizeTextForCompare(
    [
      question.prompt,
      question.instruction,
      question.publicExplanation,
      ...(question.options ?? []).map((option) => option.text ?? ''),
    ].join(' '),
  );
  return VISUAL_AUDIT_TRIGGERS.some((trigger) => surface.includes(normalizeTextForCompare(trigger)));
}

function applyGroundingMetadataRepair(question, groundingAudit, productionDisposition = 'no_grounding') {
  if (!isUsableGroundingDisposition(productionDisposition)) {
    return {
      applied: false,
      fields: [],
      before: {},
      after: {},
      basis: 'grounding_winner',
      recoveryTier: undefined,
      winnerId: groundingAudit?.winner?.id,
      winnerChapterId: groundingAudit?.winner?.chapterId,
      winnerPageRange: groundingAudit?.winner?.pageRange ?? null,
    };
  }

  const winner = groundingAudit.winner;
  const before = {};
  const after = {};
  const fields = [];

  const applyField = (field, nextValue) => {
    const currentValue = question[field] ?? null;
    if (currentValue === nextValue || (Number.isNaN(currentValue) && Number.isNaN(nextValue))) {
      return;
    }
    before[field] = currentValue;
    after[field] = nextValue ?? null;
    question[field] = nextValue;
    fields.push(field);
  };

  applyField('chapterId', winner.chapterId);
  applyField('sourcePageStart', Number(winner.pageRange?.start ?? null));
  applyField('sourcePageEnd', Number(winner.pageRange?.end ?? null));
  applyField('sourceReference', winner.manualRef ?? '');

  return {
    applied: fields.length > 0,
    fields,
    before,
    after,
    basis: 'grounding_winner',
    recoveryTier: productionDisposition,
    winnerId: winner.id,
    winnerChapterId: winner.chapterId,
    winnerPageRange: winner.pageRange ?? null,
  };
}

function extractEntities(text) {
  const matches =
    String(text ?? '').match(
      /\b\d+(?:[.,]\d+)?\s*(?:km\/h|g\/l|utm|%|años?|anos?|d[ií]as?|metros?|segundos?)?/giu,
    ) ?? [];

  return matches
    .map((claim) => normalizeWhitespace(normalizeUnitVariants(recoverMojibake(claim))))
    .filter(Boolean)
    .map((claim) => {
      const match = claim.match(/^(\d+(?:[.,]\d+)?)(?:\s*(.*))?$/u);
      return {
        raw: claim,
        value: normalizeClaimValue(match?.[1] ?? claim),
        unit: normalizeWhitespace(match?.[2] ?? ''),
        factRefIds: [],
      };
    });
}

function pageRangesOverlap(left = null, right = null) {
  const leftStart = Number(left?.start ?? NaN);
  const leftEnd = Number(left?.end ?? leftStart);
  const rightStart = Number(right?.start ?? NaN);
  const rightEnd = Number(right?.end ?? rightStart);
  if (!Number.isFinite(leftStart) || !Number.isFinite(leftEnd) || !Number.isFinite(rightStart) || !Number.isFinite(rightEnd)) {
    return false;
  }
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function pageRangeDistance(left = null, right = null) {
  const leftStart = Number(left?.start ?? NaN);
  const leftEnd = Number(left?.end ?? leftStart);
  const rightStart = Number(right?.start ?? NaN);
  const rightEnd = Number(right?.end ?? rightStart);
  if (!Number.isFinite(leftStart) || !Number.isFinite(leftEnd) || !Number.isFinite(rightStart) || !Number.isFinite(rightEnd)) {
    return Number.POSITIVE_INFINITY;
  }
  if (pageRangesOverlap(left, right)) {
    return 0;
  }
  return Math.min(Math.abs(leftStart - rightEnd), Math.abs(rightStart - leftEnd));
}

function normalizeEntityKey(value) {
  return normalizeTextForCompare(String(value ?? '')).replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildFactEntitySurface(fact) {
  return normalizeEntityKey([fact.entity, ...(fact.aliases ?? []), fact.manualRef].filter(Boolean).join(' '));
}

function unitCompatible(leftUnit, rightUnit) {
  const left = normalizeTextForContains(leftUnit);
  const right = normalizeTextForContains(rightUnit);
  if (!left || !right) {
    return true;
  }
  return left === right;
}

function pickWinnerScopedFacts(groundTruth, groundingAudit, question) {
  const winner = groundingAudit?.winner;
  const chapterId = winner?.chapterId ?? question.chapterId ?? '';
  const winnerRange = winner?.pageRange ?? null;
  const sameChapterFacts = chapterId
    ? groundTruth.filter((fact) => fact.chapterId === chapterId)
    : groundTruth;

  const overlapping = sameChapterFacts.filter((fact) => pageRangesOverlap(fact.pageRange, winnerRange));
  if (overlapping.length > 0) {
    return overlapping;
  }

  const nearby = sameChapterFacts.filter((fact) => pageRangeDistance(fact.pageRange, winnerRange) <= 1);
  if (nearby.length > 0) {
    return nearby;
  }

  return sameChapterFacts;
}

function collectFactReviewSuggestions({
  criticalSurface,
  auxiliarySurface,
  criticalClaims,
  auxiliaryClaims,
  relevantFacts,
  winnerId,
}) {
  const byEntity = new Map();
  const matchedFactIds = [];

  for (const fact of relevantFacts) {
    const aliases = Array.isArray(fact.aliases) ? fact.aliases : [];
    const aliasMatchedCritical = aliases.some((alias) =>
      criticalSurface.includes(normalizeTextForContains(alias)),
    );
    const aliasMatchedAuxiliary = !aliasMatchedCritical && aliases.some((alias) =>
      auxiliarySurface.includes(normalizeTextForContains(alias)),
    );
    if (!aliasMatchedCritical && !aliasMatchedAuxiliary) {
      continue;
    }

    matchedFactIds.push(fact.id);
    const expectedValue = normalizeClaimValue(fact.value);
    const expectedUnit = normalizeWhitespace(normalizeUnitVariants(fact.unit ?? ''));
    const entitySurface = buildFactEntitySurface(fact);
    const claimSource = aliasMatchedCritical ? criticalClaims : auxiliaryClaims;
    const claimMatched = claimSource.find((claim) => {
      const sameValue =
        claim.value === expectedValue ||
        claim.value === normalizeClaimValue(claim.normalized ?? claim.value) ||
        claim.normalized === Number(expectedValue) ||
        claim.normalizedEnd === Number(expectedValue);
      return sameValue && unitCompatible(claim.unit, expectedUnit);
    });

    if (claimMatched) {
      continue;
    }

    const importedEntity = claimSource.find((claim) => unitCompatible(claim.unit, expectedUnit));
    const entityBindingMatched =
      aliasMatchedCritical ||
      aliasMatchedAuxiliary ||
      (importedEntity && entitySurface.length > 0);
    if (!entityBindingMatched) {
      continue;
    }

    const issueCode = aliasMatchedCritical ? 'manual_fact_fix_suggested' : 'manual_fact_auxiliary_warning';
    const rankingKey = normalizeEntityKey(fact.entity || aliases[0] || fact.manualRef || fact.id);
    const importedValue =
      importedEntity?.raw ??
      ([claimSource[0]?.raw, aliases[0]].filter(Boolean).join(' / ') || 'sin valor importado normalizado');
    const manualValue = `${fact.value}${fact.unit ? ` ${fact.unit}` : ''}`.trim();
    const suggestion = {
      factId: fact.id,
      chapterId: fact.chapterId,
      pageRange: fact.pageRange,
      supportUnitId: winnerId,
      entity: fact.entity ?? fact.manualRef ?? fact.id,
      importedValue,
      manualValue,
      unit: fact.unit ?? '',
      issueCode,
      conflictReason: aliasMatchedCritical
        ? 'winner_scoped_numeric_mismatch'
        : 'winner_scoped_auxiliary_mismatch',
      excerpt: fact.manualRef,
    };

    const current = byEntity.get(rankingKey);
    const score =
      (aliasMatchedCritical ? 4 : 1) +
      (expectedUnit ? 2 : 0) +
      (pageRangesOverlap(fact.pageRange, suggestion.pageRange) ? 1 : 0);
    if (!current || score > current.score) {
      byEntity.set(rankingKey, { score, suggestion });
    }
  }

  const suggestions = [...byEntity.values()].map((entry) => entry.suggestion);
  return { matchedFactIds: Array.from(new Set(matchedFactIds)), suggestions };
}

function validateFacts(question, groundTruth = [], groundingAudit = null) {
  const errors = [];
  const warnings = [];
  const correctOptionTexts = question.correctOptionIndexes
    .map((index) => question.options[index]?.text ?? '')
    .filter(Boolean);
  const criticalText = [question.prompt, ...correctOptionTexts].filter(Boolean).join(' ');
  const auxiliaryText = [question.publicExplanation].filter(Boolean).join(' ');
  const criticalSurface = normalizeTextForContains(criticalText);
  const auxiliarySurface = normalizeTextForContains(auxiliaryText);
  const criticalClaims = extractEntities(criticalText);
  const auxiliaryClaims = extractEntities(auxiliaryText);
  const relevantFacts = pickWinnerScopedFacts(groundTruth, groundingAudit, question);
  const { matchedFactIds, suggestions } = collectFactReviewSuggestions({
    criticalSurface,
    auxiliarySurface,
    criticalClaims,
    auxiliaryClaims,
    relevantFacts,
    winnerId: groundingAudit?.winner?.id,
  });

  for (const suggestion of suggestions) {
    warnings.push(
      buildIssue(
        suggestion.issueCode,
        `Dato importado "${suggestion.importedValue}" difiere del manual (${suggestion.manualValue}) para ${suggestion.entity}.`,
        'publicExplanation',
      ),
    );
  }

  return {
    errors,
    warnings,
    matchedFactIds,
    factReview: {
      advisoryOnly: true,
      winnerScopedFactIds: suggestions.map((suggestion) => suggestion.factId),
      suggestions,
    },
    answerCriticalConflictCount: 0,
    auxiliaryMismatchCount: warnings.filter((issue) => issue.code === 'manual_fact_auxiliary_warning').length,
  };
}

function findBestDuplicateMatch(question, peers, scope, embeddingResolver, threshold = DEFAULT_SIMILARITY_THRESHOLD) {
  const normalizedPrompt = normalizeTextForCompare(question.prompt);
  let bestMatch = null;

  for (const peer of peers) {
    const peerId = peer.externalId ?? peer.id ?? '';
    const questionId = question.externalId ?? question.id ?? '';
    if (!peer.prompt || peerId === questionId) {
      continue;
    }

    const normalizedPeer = normalizeTextForCompare(peer.prompt);
    const lexicalScore = normalizedPrompt === normalizedPeer ? 1 : similarity(question.prompt, peer.prompt);
    const semanticScore = embeddingResolver(question.prompt, peer.prompt);
    const score =
      semanticScore !== null && Number.isFinite(semanticScore)
        ? Math.max(lexicalScore, semanticScore)
        : lexicalScore;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        scope,
        id: peerId,
        prompt: peer.prompt,
        score,
        exact: normalizedPrompt === normalizedPeer,
        snapshot: buildQuestionSnapshot(peer),
      };
    }
  }

  if (!bestMatch || bestMatch.score < threshold) {
    return null;
  }

  return bestMatch;
}

function validateQuestion(
  question,
  {
    batchChapterId,
    existingSnapshots,
    reviewedImportSnapshots,
    groundTruth,
    groundingEngine,
    embeddingResolver,
    similarityThreshold,
  },
) {
  const errors = [];
  const warnings = [];

  if (!question.prompt) {
    errors.push(buildIssue('missing_prompt', 'Question prompt is required.', 'prompt'));
  }

  if (!question.instruction) {
    errors.push(buildIssue('missing_instruction', 'Question instruction is required.', 'instruction'));
  }

  if (!['single', 'multiple'].includes(question.selectionMode)) {
    errors.push(
      buildIssue(
        'invalid_selection_mode',
        'selectionMode must be "single" or "multiple".',
        'selectionMode',
      ),
    );
  }

  if (!Array.isArray(question.options) || question.options.length < 2) {
    errors.push(buildIssue('invalid_options', 'Question must include at least two options.', 'options'));
  }

  const normalizedOptions = question.options.map((option) => normalizeTextForCompare(option.text));
  if (question.options.some((option) => !option.text)) {
    errors.push(buildIssue('empty_option_text', 'All options must have text.', 'options'));
  }

  if (new Set(normalizedOptions.filter(Boolean)).size !== normalizedOptions.filter(Boolean).length) {
    errors.push(buildIssue('duplicate_option_text', 'Options cannot repeat the same text.', 'options'));
  }

  const invalidAnswerIndexes = question.correctOptionIndexes.some(
    (value) => !Number.isInteger(value) || value < 0 || value >= question.options.length,
  );
  if (invalidAnswerIndexes) {
    errors.push(
      buildIssue(
        'invalid_correct_option_index',
        'correctOptionIndexes must be zero-based indexes within the options array.',
        'correctOptionIndexes',
      ),
    );
  }

  if (new Set(question.correctOptionIndexes).size !== question.correctOptionIndexes.length) {
    errors.push(
      buildIssue(
        'duplicate_correct_option_index',
        'correctOptionIndexes cannot repeat the same index.',
        'correctOptionIndexes',
      ),
    );
  }

  if (question.selectionMode === 'single' && question.correctOptionIndexes.length !== 1) {
    errors.push(
      buildIssue(
        'invalid_single_answer_count',
        'Single-selection questions must have exactly one correct answer.',
        'correctOptionIndexes',
      ),
    );
  }

  if (question.selectionMode === 'multiple' && question.correctOptionIndexes.length < 2) {
    errors.push(
      buildIssue(
        'invalid_multiple_answer_count',
        'Multiple-selection questions must have at least two correct answers.',
        'correctOptionIndexes',
      ),
    );
  }

  const groundingAudit = groundingEngine.query({
    prompt: question.prompt,
    options: [
      question.instruction,
      question.publicExplanation,
      ...question.options.map((option) => option.text),
      ...question.correctOptionIndexes.map((index) => question.options[index]?.text ?? ''),
    ].filter(Boolean),
  });
  const productionGrounding = classifyProductionGrounding(question, groundingAudit);
  const metadataRepair = applyGroundingMetadataRepair(
    question,
    groundingAudit,
    productionGrounding.productionDisposition,
  );
  const classification = summarizeGroundingChapterPrediction(groundingAudit);
  question.classificationScores = classification.scores;
  question.extractedEntities = toLegacyExtractedEntities(groundingAudit.entities);
  question.groundingAudit = {
    ...buildProductionGroundingAudit(groundingAudit),
    productionDisposition: productionGrounding.productionDisposition,
    reason: productionGrounding.reason,
    answerSupportCoverage: productionGrounding.answerSupportCoverage,
    answerTokenCoverage: productionGrounding.answerTokenCoverage,
  };
  question.metadataRepair = metadataRepair;
  question.needsVisualAudit = detectVisualDependency(question);
  let chapterAmbiguous = false;

  if (metadataRepair.applied) {
    warnings.push(
      buildIssue(
        'metadata_auto_repaired',
        `Metadata was repaired from grounding winner ${metadataRepair.winnerId}.`,
        'sourcePageStart',
      ),
    );
  }

  if (!question.chapterId) {
    if (classification.ambiguous) {
      chapterAmbiguous = true;
    } else {
      question.chapterId = classification.bestChapterId;
    }
  } else if (!CHAPTER_SOURCE_WINDOWS[question.chapterId]) {
    errors.push(buildIssue('invalid_chapter_id', 'chapterId is not recognized.', 'chapterId'));
  } else if (
    classification.bestChapterId &&
    classification.bestChapterId !== question.chapterId &&
    !classification.ambiguous
  ) {
    warnings.push(
      buildIssue(
        'classifier_disagrees_with_question_chapter',
        `Keyword classifier suggests ${classification.bestChapterId} instead of ${question.chapterId}.`,
        'chapterId',
      ),
    );
  }

  if (question.needsVisualAudit) {
    warnings.push(
      buildIssue(
        'needs_visual_audit',
        'Question likely depends on a visual asset and requires human verification.',
        'prompt',
      ),
    );
  }

  const groundingSuggestions = buildGroundingSuggestionsFromAudit(groundingAudit);
  if (!question.groundingExcerpt) {
    const winner = groundingAudit.winner;
    const disposition = productionGrounding.productionDisposition;
    if (winner && disposition !== 'no_grounding') {
      question.groundingExcerpt = winner.excerpt || winner.text || '';
      question.manualCitationRefs = Array.from(
        new Set([...(question.manualCitationRefs ?? []), winner.id]),
      );
      question.groundingMode = 'citation_auto';
      question.autoGroundingConfidence = Math.max(
        0,
        Math.min(1, Number(groundingAudit.confidence?.top1Score ?? 0)),
      );
      warnings.push(
        buildIssue(
          disposition === 'grounded'
            ? 'auto_grounded_from_production_engine'
            : 'auto_grounded_low_confidence',
          disposition === 'grounded'
            ? `Missing grounding was resolved from ${winner.id}.`
            : `Missing grounding was resolved from ${winner.id} with low-confidence human review required.`,
          'groundingExcerpt',
        ),
      );
    }
  }

  if (!question.chapterId && chapterAmbiguous) {
    const ambiguityIssue = buildIssue(
      'chapter_classification_ambiguous',
      'Question could not be assigned to a single chapter with enough confidence.',
      'chapterId',
    );
    if (isUsableGroundingDisposition(productionGrounding.productionDisposition) && question.chapterId) {
      warnings.push(ambiguityIssue);
    } else {
      errors.push(ambiguityIssue);
    }
  }

  if (batchChapterId && question.chapterId && batchChapterId !== question.chapterId) {
    const mismatchCode = metadataRepair.fields.includes('chapterId')
      ? 'batch_chapter_mismatch_repaired'
      : 'batch_chapter_mismatch';
    const mismatchIssue = buildIssue(
      mismatchCode,
      `Question resolved to ${question.chapterId} but the batch is scoped to ${batchChapterId}.`,
      'chapterId',
    );
    if (isUsableGroundingDisposition(productionGrounding.productionDisposition)) {
      warnings.push(mismatchIssue);
    } else {
      errors.push(mismatchIssue);
    }
  }

  if (!question.groundingExcerpt) {
    errors.push(
      buildIssue('missing_grounding_excerpt', 'groundingExcerpt is required.', 'groundingExcerpt'),
    );
    question.groundingMode = 'missing';
  }

  const missingSourcePages =
    !Number.isFinite(question.sourcePageStart) || !Number.isFinite(question.sourcePageEnd);
  if (missingSourcePages) {
    const issue = buildIssue(
      'invalid_source_page',
      'sourcePageStart and sourcePageEnd must resolve to valid numbers.',
      'sourcePageStart',
    );
    if (isUsableGroundingDisposition(productionGrounding.productionDisposition)) {
      warnings.push(issue);
    } else {
      errors.push(issue);
    }
  } else if (question.sourcePageStart > question.sourcePageEnd) {
    const issue = buildIssue(
      'invalid_source_page_range',
      'sourcePageStart cannot be greater than sourcePageEnd.',
      'sourcePageStart',
    );
    if (isUsableGroundingDisposition(productionGrounding.productionDisposition)) {
      warnings.push(issue);
    } else {
      errors.push(issue);
    }
  }

  const scopeWindow = CHAPTER_SOURCE_WINDOWS[question.chapterId];
  if (
    scopeWindow &&
    Number.isFinite(question.sourcePageStart) &&
    Number.isFinite(question.sourcePageEnd)
  ) {
    if (
      question.sourcePageStart < scopeWindow.start ||
      question.sourcePageEnd > scopeWindow.end
    ) {
      const issue = buildIssue(
        'chapter_scope_mismatch',
        `Source pages ${question.sourcePageStart}-${question.sourcePageEnd} fall outside the accepted ${question.chapterId} source window ${scopeWindow.start}-${scopeWindow.end}.`,
        'sourcePageStart',
      );
      if (isUsableGroundingDisposition(productionGrounding.productionDisposition)) {
        warnings.push(issue);
      } else {
        errors.push(issue);
      }
    }
    if (question.sourcePageStart >= 149 || question.sourcePageEnd >= 149) {
      errors.push(
        buildIssue(
          'annex_scope_mismatch',
          `Source pages ${question.sourcePageStart}-${question.sourcePageEnd} fall inside annex pages 149-169, which are out of scope for chapter imports.`,
          'sourcePageStart',
        ),
      );
    }
  }

  if (!question.sourceReference) {
    warnings.push(
      buildIssue('missing_source_reference', 'sourceReference is recommended.', 'sourceReference'),
    );
  }

  const factValidation = validateFacts(question, groundTruth, groundingAudit);
  question.manualFactRefs = Array.from(
    new Set([...(question.manualFactRefs ?? []), ...factValidation.matchedFactIds]),
  );
  question.factReview = factValidation.factReview;
  errors.push(...factValidation.errors);
  warnings.push(...factValidation.warnings);

  const reviewedMatch = findBestDuplicateMatch(
    question,
    reviewedImportSnapshots,
    'reviewed_import',
    embeddingResolver,
    similarityThreshold,
  );
  const existingMatch = findBestDuplicateMatch(
    question,
    existingSnapshots,
    'existing_bank',
    embeddingResolver,
    similarityThreshold,
  );

  const strongestExternalMatch = [reviewedMatch, existingMatch]
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)[0] ?? null;

  if (strongestExternalMatch) {
    errors.push(
      buildIssue(
        strongestExternalMatch.exact
          ? strongestExternalMatch.scope === 'reviewed_import'
            ? 'duplicate_prompt_reviewed_import'
            : 'duplicate_prompt_existing_bank'
          : strongestExternalMatch.scope === 'reviewed_import'
            ? 'near_duplicate_prompt_reviewed_import'
            : 'near_duplicate_prompt_existing_bank',
        `Prompt is too similar to ${strongestExternalMatch.scope.replace('_', ' ')} item ${strongestExternalMatch.id} (similarity ${strongestExternalMatch.score.toFixed(2)}).`,
        'prompt',
      ),
    );
    question.similarityScore = strongestExternalMatch.score;
    question.similarityScope = strongestExternalMatch.scope;
    question.similarityMatchId = strongestExternalMatch.id;
    question.similarityMatchPrompt = strongestExternalMatch.prompt;
    question.similarityMatchQuestion = strongestExternalMatch.snapshot;
  }

  if (question.options.length > 4) {
    warnings.push(
      buildIssue(
        'non_standard_option_count',
        'Question uses a non-standard number of options.',
        'options',
      ),
    );
  }

  const instructionNormalized = normalizeTextForCompare(question.instruction);
  if (
    question.selectionMode === 'single' &&
    (instructionNormalized.includes('respuestas') || instructionNormalized.includes('alternativas'))
  ) {
    warnings.push(
      buildIssue(
        'instruction_mismatch',
        'Instruction wording suggests multiple answers for a single-selection question.',
        'instruction',
      ),
    );
  }

  if (question.selectionMode === 'multiple' && instructionNormalized.includes('una respuesta')) {
    warnings.push(
      buildIssue(
        'instruction_mismatch',
        'Instruction wording suggests one answer for a multiple-selection question.',
        'instruction',
      ),
    );
  }

  return { errors, warnings, groundingSuggestions: groundingSuggestions ?? [], factGrounding: null };
}

function createUnionFind(size) {
  const parent = Array.from({ length: size }, (_, index) => index);

  function find(index) {
    if (parent[index] !== index) {
      parent[index] = find(parent[index]);
    }
    return parent[index];
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) {
      parent[rightRoot] = leftRoot;
    }
  }

  return { find, union };
}

function buildBatchDuplicateClusters(items, embeddingResolver, threshold) {
  const unionFind = createUnionFind(items.length);
  const pairScores = new Map();

  for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
      const left = items[leftIndex];
      const right = items[rightIndex];
      const lexicalScore = similarity(
        left.normalizedQuestion.prompt,
        right.normalizedQuestion.prompt,
      );
      const semanticScore = embeddingResolver(
        left.normalizedQuestion.prompt,
        right.normalizedQuestion.prompt,
      );
      const score =
        semanticScore !== null && Number.isFinite(semanticScore)
          ? Math.max(lexicalScore, semanticScore)
          : lexicalScore;

      if (score >= threshold) {
        unionFind.union(leftIndex, rightIndex);
        pairScores.set(`${leftIndex}:${rightIndex}`, score);
      }
    }
  }

  const grouped = new Map();
  for (let index = 0; index < items.length; index += 1) {
    const root = unionFind.find(index);
    const group = grouped.get(root) ?? [];
    group.push(index);
    grouped.set(root, group);
  }

  return [...grouped.values()]
    .filter((group) => group.length > 1)
    .map((group, clusterIndex) => ({
      clusterId: `dup-cluster-${clusterIndex + 1}`,
      indexes: group,
      pairScores,
    }));
}

function countQuestionNormalizations(normalizations, externalId) {
  return normalizations.filter(
    (entry) => entry.scope === 'question' && entry.target === externalId,
  ).length;
}

function computeQualityScore(item, normalizations) {
  const question = item.normalizedQuestion;
  let score = 0;
  score += Math.min(question.prompt.length, 220) / 10;
  score += question.publicExplanation ? Math.min(question.publicExplanation.length, 240) / 20 : 0;
  score += question.groundingMode === 'manual' ? 18 : 0;
  score += question.groundingMode === 'fact_auto' ? 15 : 0;
  score += question.groundingMode === 'citation_auto' ? 12 : 0;
  score += question.manualFactRefs?.length ? 6 : 0;
  score += question.manualCitationRefs?.length ? 4 : 0;
  score += new Set(question.options.map((option) => normalizeTextForCompare(option.text))).size;
  score -= item.errors.length * 40;
  score -= countQuestionNormalizations(normalizations, question.externalId) * 1.5;
  return Number(score.toFixed(2));
}

function getClusterEdgeScore(indexes, pairScores, winnerIndex, loserIndex) {
  const left = Math.min(winnerIndex, loserIndex);
  const right = Math.max(winnerIndex, loserIndex);
  return Number(pairScores.get(`${left}:${right}`) ?? 0);
}

function resolveBatchDuplicateClusters(items, normalizations, embeddingResolver, threshold) {
  const rawClusters = buildBatchDuplicateClusters(items, embeddingResolver, threshold);
  const duplicateClusters = [];

  for (const cluster of rawClusters) {
    const ranked = cluster.indexes
      .map((index) => ({
        index,
        item: items[index],
        qualityScore: computeQualityScore(items[index], normalizations),
      }))
      .sort((left, right) => {
        if (right.qualityScore !== left.qualityScore) {
          return right.qualityScore - left.qualityScore;
        }
        if (left.item.errors.length !== right.item.errors.length) {
          return left.item.errors.length - right.item.errors.length;
        }
        return left.item.externalId.localeCompare(right.item.externalId);
      });

    const winner = ranked[0];
    winner.item.normalizedQuestion.qualityScore = winner.qualityScore;
    winner.item.normalizedQuestion.duplicateClusterId = cluster.clusterId;
    winner.item.normalizedQuestion.duplicateResolution = 'winner';

    const losers = [];
    for (const loser of ranked.slice(1)) {
      const score = getClusterEdgeScore(cluster.indexes, cluster.pairScores, winner.index, loser.index);
      loser.item.normalizedQuestion.qualityScore = loser.qualityScore;
      loser.item.normalizedQuestion.duplicateClusterId = cluster.clusterId;
      loser.item.normalizedQuestion.duplicateWinnerId = winner.item.externalId;
      loser.item.normalizedQuestion.duplicateResolution = 'referenced_duplicate';
      loser.item.duplicateSimilarityScore = score;
      loser.item.duplicateMatchId = winner.item.externalId;
      loser.item.duplicateMatchScope = 'batch';
      loser.item.duplicateMatchPrompt = winner.item.normalizedQuestion.prompt;
      loser.item.duplicateMatchQuestion = buildQuestionSnapshot(winner.item.normalizedQuestion);
      loser.item.errors.push(
        buildIssue(
          'referenced_duplicate_in_batch',
          `Candidate was superseded by duplicate winner ${winner.item.externalId} in cluster ${cluster.clusterId}.`,
          'prompt',
        ),
      );
      losers.push({
        externalId: loser.item.externalId,
        similarityScore: score,
        qualityScore: loser.qualityScore,
        question: buildQuestionSnapshot(loser.item.normalizedQuestion),
      });
    }

    duplicateClusters.push({
      clusterId: cluster.clusterId,
      winnerId: winner.item.externalId,
      winnerQualityScore: winner.qualityScore,
      winnerQuestion: buildQuestionSnapshot(winner.item.normalizedQuestion),
      losers,
    });
  }

  return duplicateClusters;
}

function summarizeTopLevelErrors(batchErrors, items) {
  return [
    ...batchErrors,
    ...items.flatMap((item) =>
      item.errors.map((error) => ({
        code: error.code,
        message: error.message,
        questionId: item.externalId,
      })),
    ),
  ];
}

function hasIssueCode(issues = [], codes = []) {
  const codeSet = new Set(codes);
  return issues.some((issue) => codeSet.has(issue.code));
}

function isDuplicateBlocked(item) {
  return hasIssueCode(item.errors, [
    'referenced_duplicate_in_batch',
    'duplicate_prompt_existing_bank',
    'near_duplicate_prompt_existing_bank',
    'duplicate_prompt_reviewed_import',
    'near_duplicate_prompt_reviewed_import',
  ]);
}

function hasAnswerCriticalFactConflict(item) {
  return hasIssueCode(item.errors, ['manual_fact_conflict']);
}

function hasWinner(item) {
  return Boolean(item.normalizedQuestion?.groundingAudit?.winnerId);
}

function isRecoverableWinnerReject(item) {
  return item.status === 'rejected' && hasWinner(item) && !isDuplicateBlocked(item) && !hasAnswerCriticalFactConflict(item);
}

function wasRecoveredValidReject(item) {
  if (item.status !== 'accepted' || !hasWinner(item)) {
    return false;
  }

  const question = item.normalizedQuestion ?? {};
  const productionDisposition = question.groundingAudit?.productionDisposition;
  return (
    question.metadataRepair?.applied ||
    question.groundingMode === 'citation_auto' ||
    question.groundingMode === 'fact_auto' ||
    productionDisposition === 'grounded_recoverable' ||
    productionDisposition === 'usable_winner_low_confidence'
  );
}

export function reviewImportBatch(
  rawBatch,
  {
    sourceFile,
    seedContentText,
    knowledgePack = {},
    reviewedImportQuestions = [],
    embeddingCache = null,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
    parserWarnings = [],
    chapterFilter = '',
  },
) {
  const normalizations = [];
  const batchWarnings = [...parserWarnings];
  const batchErrors = [];
  const normalizedBatch = normalizeImportSource(rawBatch, sourceFile, normalizations);
  const embeddingResolver = createEmbeddingResolver(embeddingCache);
  const existingSnapshots = buildExistingQuestionSnapshots(seedContentText);
  const groundingEngine = createProductionGroundingEngine({
    manualSegments: knowledgePack.manualSegments ?? [],
  });

  if (!normalizedBatch.batchId) {
    batchErrors.push(buildIssue('missing_batch_id', 'batchId is required.'));
  }

  if (normalizedBatch.editionId !== DEFAULT_EDITION_ID) {
    batchWarnings.push(buildIssue('invalid_edition_id', `editionId was normalized to ${DEFAULT_EDITION_ID}.`));
    normalizedBatch.editionId = DEFAULT_EDITION_ID;
  }

  if (normalizedBatch.sourceDocumentId !== DEFAULT_SOURCE_DOCUMENT_ID) {
    batchWarnings.push(
      buildIssue(
        'invalid_source_document_id',
        `sourceDocumentId was normalized to ${DEFAULT_SOURCE_DOCUMENT_ID}.`,
      ),
    );
    normalizedBatch.sourceDocumentId = DEFAULT_SOURCE_DOCUMENT_ID;
  }

  let items = normalizedBatch.questions.map((question) => {
    const { errors, warnings, groundingSuggestions } = validateQuestion(question, {
      batchChapterId: normalizedBatch.chapterId,
      existingSnapshots,
      reviewedImportSnapshots: reviewedImportQuestions,
      groundTruth: knowledgePack.groundTruth ?? [],
      groundingEngine,
      embeddingResolver,
      similarityThreshold,
    });

    return {
      externalId: question.externalId,
      status: 'rejected',
      warnings,
      errors,
      normalizedQuestion: question,
      duplicateSimilarityScore: question.similarityScore,
      duplicateMatchId: question.similarityMatchId,
      duplicateMatchScope: question.similarityScope,
      duplicateMatchPrompt: question.similarityMatchPrompt,
      duplicateMatchQuestion: question.similarityMatchQuestion,
      groundingSuggestions,
    };
  });

  if (chapterFilter) {
    items = items.filter((item) => item.normalizedQuestion.chapterId === chapterFilter);
  }

  const duplicateClusters = resolveBatchDuplicateClusters(
    items,
    normalizations,
    embeddingResolver,
    similarityThreshold,
  );

  for (const item of items) {
    item.status = item.errors.length > 0 ? 'rejected' : 'accepted';
    item.normalizedQuestion.reviewDisposition =
      item.errors.length > 0
        ? 'rejected'
        : item.warnings.length > 0
          ? 'accepted_with_warning'
          : 'accepted';
  }

  const acceptedItems = items.filter((item) => item.status === 'accepted');
  const rejectedItems = items.filter((item) => item.status === 'rejected');
  const recoverableAcceptedCount = acceptedItems.filter(
    (item) => item.normalizedQuestion.groundingAudit?.productionDisposition === 'grounded_recoverable',
  ).length;
  const usableWinnerLowConfidenceCount = acceptedItems.filter(
    (item) =>
      item.normalizedQuestion.groundingAudit?.productionDisposition === 'usable_winner_low_confidence',
  ).length;
  const recoveredValidRejectCount = acceptedItems.filter(wasRecoveredValidReject).length;
  const remainingRecoverableWinnerRejectCount = rejectedItems.filter(isRecoverableWinnerReject).length;
  const duplicateBlockedRejectCount = rejectedItems.filter(isDuplicateBlocked).length;
  const factBlockedRejectCount = rejectedItems.filter(hasAnswerCriticalFactConflict).length;
  const factReviewSuggestedCount = items.filter(
    (item) => (item.normalizedQuestion.factReview?.suggestions?.length ?? 0) > 0,
  ).length;
  const auxiliaryOnlyMismatchCount = items.filter((item) =>
    hasIssueCode(item.warnings, ['manual_fact_auxiliary_warning']),
  ).length;
  const metadataRepairedCount = items.filter((item) => item.normalizedQuestion.metadataRepair?.applied).length;
  const metadataRepairedByTier = items.reduce(
    (counts, item) => {
      const tier = item.normalizedQuestion.metadataRepair?.recoveryTier;
      if (item.normalizedQuestion.metadataRepair?.applied && tier) {
        counts[tier] = (counts[tier] ?? 0) + 1;
      }
      return counts;
    },
    {},
  );
  const visualAuditRequiredCount = items.filter((item) => item.normalizedQuestion.needsVisualAudit).length;
  const chapterFallbackRecoveredCount = items.filter(
    (item) => item.normalizedQuestion.groundingAudit?.fallbackRecovery?.winnerChanged,
  ).length;
  const unresolvedMetadataRejectCount = rejectedItems.filter(
    (item) =>
      hasIssueCode(item.errors, ['missing_grounding_excerpt']) ||
      hasIssueCode(item.errors, ['invalid_source_page', 'invalid_source_page_range']),
  ).length;
  const trueNoGroundingRejectCount = rejectedItems.filter(
    (item) => item.normalizedQuestion.groundingAudit?.productionDisposition === 'no_grounding',
  ).length;
  const autoGroundedAccepted = acceptedItems
    .filter(
      (item) =>
        item.normalizedQuestion.groundingMode === 'fact_auto' ||
        item.normalizedQuestion.groundingMode === 'citation_auto',
    )
    .map((item) => ({
      externalId: item.externalId,
      groundingMode: item.normalizedQuestion.groundingMode,
      confidence: Number(item.normalizedQuestion.autoGroundingConfidence ?? 0),
      chapterId: item.normalizedQuestion.chapterId,
      manualFactRefs: item.normalizedQuestion.manualFactRefs ?? [],
      manualCitationRefs: item.normalizedQuestion.manualCitationRefs ?? [],
      groundingExcerpt: item.normalizedQuestion.groundingExcerpt,
    }));

  const chapterAcceptedMap = Object.fromEntries(
    Object.keys(CHAPTER_SOURCE_WINDOWS).map((chapterId) => [chapterId, []]),
  );
  for (const item of acceptedItems) {
    if (!chapterAcceptedMap[item.normalizedQuestion.chapterId]) {
      chapterAcceptedMap[item.normalizedQuestion.chapterId] = [];
    }
    chapterAcceptedMap[item.normalizedQuestion.chapterId].push(item.normalizedQuestion);
  }

  const chapterSummaries = Object.keys(CHAPTER_SOURCE_WINDOWS).map((chapterId) => ({
    chapterId,
    acceptedCount: (chapterAcceptedMap[chapterId] ?? []).length,
    rejectedCount: rejectedItems.filter((item) => item.normalizedQuestion.chapterId === chapterId).length,
  }));

  const ambiguousCandidates = rejectedItems
    .filter((item) =>
      item.errors.some((error) => error.code === 'chapter_classification_ambiguous'),
    )
    .map((item) => ({
      externalId: item.externalId,
      classificationScores: item.normalizedQuestion.classificationScores ?? {},
    }));

  const warningCount =
    batchWarnings.length + items.reduce((count, item) => count + item.warnings.length, 0);
  const errorCount =
    batchErrors.length + items.reduce((count, item) => count + item.errors.length, 0);

  return {
    reviewLog: {
      sourceFile,
      reviewedAt: new Date().toISOString(),
      batch: {
        batchId: normalizedBatch.batchId,
        chapterIdNormalized: normalizedBatch.chapterId,
        chapterFilterApplied: chapterFilter || null,
        sourceDocumentId: normalizedBatch.sourceDocumentId,
        questionCount: items.length,
      },
      summary: {
        acceptedCount: acceptedItems.length,
        acceptedWithWarningCount: acceptedItems.filter((item) => item.warnings.length > 0).length,
        autoGroundedAcceptedCount: autoGroundedAccepted.length,
        recoverableAcceptedCount,
        usableWinnerLowConfidenceCount,
        recoveredValidRejectCount,
        remainingRecoverableWinnerRejectCount,
        duplicateBlockedRejectCount,
        factBlockedRejectCount,
        factReviewSuggestedCount,
        auxiliaryOnlyMismatchCount,
        rejectedCount: rejectedItems.length,
        duplicateClusterCount: duplicateClusters.length,
        metadataRepairedCount,
        metadataRepairedByTier,
        visualAuditRequiredCount,
        chapterFallbackRecoveredCount,
        unresolvedMetadataRejectCount,
        trueNoGroundingRejectCount,
        warningCount,
        errorCount,
      },
      normalizations,
      warnings: batchWarnings,
      errors: summarizeTopLevelErrors(batchErrors, rejectedItems),
      items,
      duplicateClusters,
      ambiguousCandidates,
      autoGroundedAccepted,
      chapterSummaries,
      chapterAcceptedMap,
    },
    acceptedCandidates: acceptedItems.map((item) => item.normalizedQuestion),
    rejectedCandidates: rejectedItems.map((item) => ({
      externalId: item.externalId,
      errors: item.errors,
      warnings: item.warnings,
      normalizedQuestion: item.normalizedQuestion,
      groundingSuggestions: item.groundingSuggestions,
      duplicateSimilarityScore: item.duplicateSimilarityScore,
      duplicateMatchId: item.duplicateMatchId,
      duplicateMatchScope: item.duplicateMatchScope,
      duplicateMatchPrompt: item.duplicateMatchPrompt,
      duplicateMatchQuestion: item.duplicateMatchQuestion,
    })),
    chapterAcceptedMap,
    duplicateClusters,
    autoGroundedAccepted,
    recoverableAcceptedCount,
    usableWinnerLowConfidenceCount,
    recoveredValidRejectCount,
    remainingRecoverableWinnerRejectCount,
    duplicateBlockedRejectCount,
    factBlockedRejectCount,
    factReviewSuggestedCount,
    auxiliaryOnlyMismatchCount,
    metadataRepairedCount,
    metadataRepairedByTier,
    visualAuditRequiredCount,
    chapterFallbackRecoveredCount,
    unresolvedMetadataRejectCount,
    trueNoGroundingRejectCount,
    chapterSummaries,
    ambiguousCandidates,
  };
}

export function renderReviewSummary(reviewLog) {
  const acceptedItems = reviewLog.items.filter((item) => item.status === 'accepted');
  const rejectedItems = reviewLog.items.filter((item) => item.status === 'rejected');
  const lines = [
    `# Import Review: ${reviewLog.batch.batchId || reviewLog.sourceFile}`,
    '',
    '## Batch overview',
    `- Source file: \`${reviewLog.sourceFile}\``,
    `- Reviewed at: \`${reviewLog.reviewedAt}\``,
    `- Chapter: \`${reviewLog.batch.chapterIdNormalized || 'auto-classified'}\``,
    `- Chapter filter: \`${reviewLog.batch.chapterFilterApplied || 'none'}\``,
    `- Source document: \`${reviewLog.batch.sourceDocumentId}\``,
    `- Total questions: ${reviewLog.batch.questionCount}`,
    `- Accepted: ${reviewLog.summary.acceptedCount}`,
    `- Accepted with warning: ${reviewLog.summary.acceptedWithWarningCount}`,
    `- Auto-grounded accepted: ${reviewLog.summary.autoGroundedAcceptedCount}`,
    `- Recoverable grounding accepted: ${reviewLog.summary.recoverableAcceptedCount ?? 0}`,
    `- Usable low-confidence accepted: ${reviewLog.summary.usableWinnerLowConfidenceCount ?? 0}`,
    `- Recovered valid rejects: ${reviewLog.summary.recoveredValidRejectCount ?? 0}`,
    `- Remaining recoverable winner rejects: ${reviewLog.summary.remainingRecoverableWinnerRejectCount ?? 0}`,
    `- Chapter fallback recoveries: ${reviewLog.summary.chapterFallbackRecoveredCount ?? 0}`,
    `- Duplicate-blocked rejects: ${reviewLog.summary.duplicateBlockedRejectCount ?? 0}`,
    `- Fact-blocked rejects: ${reviewLog.summary.factBlockedRejectCount ?? 0}`,
    `- Fact review suggested: ${reviewLog.summary.factReviewSuggestedCount ?? 0}`,
    `- Auxiliary-only mismatches: ${reviewLog.summary.auxiliaryOnlyMismatchCount ?? 0}`,
    `- Metadata repaired: ${reviewLog.summary.metadataRepairedCount ?? 0}`,
    `- Unresolved metadata rejects: ${reviewLog.summary.unresolvedMetadataRejectCount ?? 0}`,
    `- True no-grounding rejects: ${reviewLog.summary.trueNoGroundingRejectCount ?? 0}`,
    `- Visual audit required: ${reviewLog.summary.visualAuditRequiredCount ?? 0}`,
    `- Rejected: ${reviewLog.summary.rejectedCount}`,
    `- Duplicate clusters: ${reviewLog.summary.duplicateClusterCount}`,
    `- Warnings: ${reviewLog.summary.warningCount}`,
    `- Errors: ${reviewLog.summary.errorCount}`,
    '',
    '## Accepted items',
  ];

  if (acceptedItems.length === 0) {
    lines.push('- None');
  } else {
    for (const item of acceptedItems.slice(0, 25)) {
      const warningLabel = item.warnings.length > 0 ? ` (${item.warnings.length} warnings)` : '';
      const groundingLabel =
        item.normalizedQuestion.groundingMode === 'fact_auto' ||
        item.normalizedQuestion.groundingMode === 'citation_auto'
          ? ` [${item.normalizedQuestion.groundingMode}]`
          : '';
      lines.push(
        `- \`${item.externalId}\`${warningLabel}${groundingLabel} -> \`${item.normalizedQuestion.chapterId}\``,
      );
    }
    if (acceptedItems.length > 25) {
      lines.push(`- ... ${acceptedItems.length - 25} more accepted items`);
    }
  }

  lines.push('', '## Rejected items');
  if (rejectedItems.length === 0) {
    lines.push('- None');
  } else {
    for (const item of rejectedItems.slice(0, 25)) {
      lines.push(`- \`${item.externalId}\``);
      for (const error of item.errors) {
        lines.push(`  - ${error.code}: ${error.message}`);
      }
      if (item.duplicateSimilarityScore) {
        lines.push(
          `  - duplicate: ${item.duplicateMatchScope} ${item.duplicateMatchId} (${item.duplicateSimilarityScore.toFixed(2)})`,
        );
      }
    }
    if (rejectedItems.length > 25) {
      lines.push(`- ... ${rejectedItems.length - 25} more rejected items`);
    }
  }

  lines.push('', '## Duplicate clusters');
  if ((reviewLog.duplicateClusters ?? []).length === 0) {
    lines.push('- None');
  } else {
    for (const cluster of reviewLog.duplicateClusters.slice(0, 15)) {
      lines.push(
        `- ${cluster.clusterId}: winner \`${cluster.winnerId}\` over ${cluster.losers.length} duplicates`,
      );
    }
  }

  lines.push('', '## Chapter split');
  for (const summary of reviewLog.chapterSummaries ?? []) {
    lines.push(`- ${summary.chapterId}: ${summary.acceptedCount} accepted / ${summary.rejectedCount} rejected`);
  }

  lines.push('', '## Normalization warnings');
  if (reviewLog.normalizations.length === 0) {
    lines.push('- None');
  } else {
    for (const normalization of reviewLog.normalizations.slice(0, 25)) {
      lines.push(`- \`${normalization.target}\` ${normalization.field}: ${normalization.action}`);
    }
    if (reviewLog.normalizations.length > 25) {
      lines.push(`- ... ${reviewLog.normalizations.length - 25} more normalizations`);
    }
  }

  lines.push('', '## Next operator action');
  if (rejectedItems.length > 0) {
    lines.push(
      '- Use `accepted-candidates.json` as the eligible staging set.',
      '- Review `run-details.json` for rejected candidates, duplicate clusters, and grounding suggestions.',
      '- Use the per-chapter accepted files under `chapters/` for chapter-specific merge preparation.',
    );
  } else {
    lines.push('- All items passed review. Continue with merge preparation.');
  }

  return `${lines.join('\n')}\n`;
}
