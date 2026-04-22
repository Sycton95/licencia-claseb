import MiniSearch from 'minisearch';

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
const AUTO_GROUND_THRESHOLD = 0.85;
const GLOBAL_CITATION_THRESHOLD = 0.2;
const SPANISH_STOPWORDS = new Set([
  'a', 'al', 'algo', 'alguna', 'alguno', 'algunos', 'ante', 'aquel', 'aquella', 'aquellas',
  'aquello', 'aquellos', 'asi', 'como', 'con', 'contra', 'cual', 'cuando', 'de', 'del', 'desde',
  'donde', 'dos', 'el', 'ella', 'ellas', 'ello', 'ellos', 'en', 'entre', 'era', 'eramos', 'eran',
  'eres', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estaba', 'estado', 'estan', 'estar',
  'este', 'esto', 'estos', 'fue', 'fueron', 'ha', 'han', 'hay', 'la', 'las', 'le', 'les', 'lo',
  'los', 'mas', 'mi', 'mis', 'mucho', 'muy', 'no', 'nos', 'nosotros', 'o', 'otra', 'otro', 'otros',
  'para', 'pero', 'por', 'porque', 'que', 'quien', 'se', 'ser', 'si', 'sin', 'sobre', 'son', 'su',
  'sus', 'tambien', 'te', 'tener', 'tiene', 'tienen', 'todo', 'todos', 'tu', 'una', 'uno', 'unos',
  'usted', 'ustedes', 'ya', 'y',
]);

const UNIT_REPLACEMENTS = [
  { pattern: /\b(?:kms?\/h|kmh|km\/hr|kph)\b/giu, replacement: 'km/h' },
  { pattern: /\b(?:gr\/l|g\/lt|g\/l\.)\b/giu, replacement: 'g/l' },
  { pattern: /\banios\b/giu, replacement: 'años' },
  { pattern: /\baÃ±os\b/giu, replacement: 'años' },
];

const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
const suspiciousPattern = /(Ã.|Â|â€|â€œ|â€|â€™|â€¦|ï¿½|�)/g;

function buildIssue(code, message, field) {
  return { code, message, field };
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

function normalizeSearchTerm(value) {
  const term = normalizeTextForCompare(value).replace(/[^a-z0-9/%.-]/g, '');
  if (!term || term.length < 3 || SPANISH_STOPWORDS.has(term)) {
    return null;
  }
  return term;
}

function buildSearchCorpus(parts) {
  return parts
    .flatMap((part) => tokenize(part))
    .map((token) => normalizeSearchTerm(token))
    .filter(Boolean)
    .join(' ');
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

function buildManualSearchEngine(manualSegments = []) {
  const docs = manualSegments.map((segment) => ({
    id: segment.id,
    chapterId: segment.chapterId,
    manualRef: segment.manualRef ?? '',
    excerpt: segment.excerpt ?? '',
    text: segment.text ?? '',
    pageStart: Number(segment.pageRange?.start ?? 0),
    pageEnd: Number(segment.pageRange?.end ?? segment.pageRange?.start ?? 0),
    searchText: buildSearchCorpus([segment.excerpt, segment.text]),
    conceptText: buildSearchCorpus(segment.conceptRefs ?? []),
    titleText: buildSearchCorpus([segment.manualRef]),
  }));

  const miniSearch = new MiniSearch({
    fields: ['searchText', 'conceptText', 'titleText'],
    storeFields: ['id', 'chapterId', 'manualRef', 'excerpt', 'text', 'pageStart', 'pageEnd'],
    searchOptions: {
      boost: { conceptText: 3, titleText: 2, searchText: 1 },
      prefix: true,
      fuzzy: 0.1,
    },
    processTerm: normalizeSearchTerm,
  });

  if (docs.length > 0) {
    miniSearch.addAll(docs);
  }

  return miniSearch;
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

function parseNumberish(value) {
  const normalized = Number(normalizeClaimValue(value));
  return Number.isFinite(normalized) ? normalized : null;
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

function scoreChapterClassification(question, classifier) {
  const chapters = classifier?.chapters ?? {};
  const ambiguityMargin = Number(classifier?.ambiguityMargin ?? 1);
  const haystack = normalizeTextForContains(
    [
      question.prompt,
      question.instruction,
      question.publicExplanation,
      ...question.options.map((option) => option.text),
      ...question.tags,
    ].join(' '),
  );

  const scores = {};
  for (const [chapterId, chapter] of Object.entries(chapters)) {
    let score = 0;
    for (const [keyword, weight] of Object.entries(chapter.keywords ?? {})) {
      if (haystack.includes(normalizeTextForContains(keyword))) {
        score += Number(weight ?? 0);
      }
    }
    scores[chapterId] = score;
  }

  const ranked = Object.entries(scores).sort((left, right) => right[1] - left[1]);
  const [bestChapterId = '', bestScore = 0] = ranked[0] ?? [];
  const [, secondScore = 0] = ranked[1] ?? [];
  const ambiguous = bestScore === 0 || bestScore - secondScore <= ambiguityMargin;

  return {
    scores,
    bestChapterId,
    bestScore,
    secondScore,
    ambiguous,
  };
}

function buildQuestionGroundingText(question) {
  const correctOptionTexts = question.correctOptionIndexes
    .map((index) => question.options[index]?.text ?? '')
    .filter(Boolean);

  return [
    question.prompt,
    question.publicExplanation,
    question.instruction,
    ...correctOptionTexts,
  ]
    .filter(Boolean)
    .join(' ');
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

function selectOverlappingCitation(manualSegments, fact) {
  const sameChapter = manualSegments.filter((segment) => segment.chapterId === fact.chapterId);
  const overlapping = sameChapter.find((segment) => {
    const start = Number(segment.pageRange?.start ?? 0);
    const end = Number(segment.pageRange?.end ?? start);
    return start <= fact.pageRange.end && end >= fact.pageRange.start;
  });

  return overlapping ?? sameChapter[0] ?? null;
}

function buildFactGroundingMatches(question, groundTruth, manualSegments) {
  const text = buildQuestionGroundingText(question);
  const surface = normalizeTextForContains(text);
  const entities = extractEntities(text);
  question.extractedEntities = entities;
  const matches = [];

  for (const fact of groundTruth) {
    const aliases = Array.isArray(fact.aliases) ? fact.aliases : [];
    const aliasMatches = aliases.filter((alias) =>
      surface.includes(normalizeTextForContains(alias)),
    );
    const expectedValue = normalizeClaimValue(fact.value);
    const expectedUnit = normalizeWhitespace(normalizeUnitVariants(fact.unit ?? ''));
    const claimMatches = entities.filter((entity) => {
      const sameValue = entity.value === expectedValue;
      const sameUnit = !expectedUnit || entity.unit === expectedUnit;
      return sameValue && sameUnit;
    });

    if (claimMatches.length === 0 && aliasMatches.length === 0) {
      continue;
    }

    let confidence = 0;
    if (claimMatches.length > 0) {
      confidence += 0.65;
    }
    if (aliasMatches.length > 0) {
      confidence += 0.25;
    }
    if (question.chapterId && question.chapterId === fact.chapterId) {
      confidence += 0.2;
    }
    if (!question.chapterId && claimMatches.length > 0) {
      confidence += 0.15;
    }
    if (aliasMatches.length > 1) {
      confidence += 0.05;
    }
    confidence = Math.min(confidence, 1);

    const citation = selectOverlappingCitation(manualSegments, fact);
    matches.push({
      fact,
      citation,
      confidence,
      claimMatches,
      aliasMatches,
    });
  }

  matches.sort((left, right) => right.confidence - left.confidence);
  return matches;
}

function findCitationCandidates(
  question,
  manualSegments,
  preferredChapterId = '',
  limit = 3,
  searchEngine = null,
) {
  const text = buildQuestionGroundingText(question);
  const normalizedQuery = buildSearchCorpus([text, question.sourceReference ?? '', ...(question.tags ?? [])]);
  const searchResults = searchEngine
    ? normalizedQuery
      ? searchEngine.search(normalizedQuery)
      : []
    : [];

  const searchResultMap = new Map(
    searchResults.map((result) => [
      result.id,
      {
        citationId: result.id,
        chapterId: result.chapterId,
        manualRef: result.manualRef,
        pageRange: {
          start: Number(result.pageStart ?? 0),
          end: Number(result.pageEnd ?? result.pageStart ?? 0),
        },
        excerpt: result.excerpt ?? result.text ?? '',
        confidence: Math.min(1, Number(result.score ?? 0) / 20),
      },
    ]),
  );

  const candidates = manualSegments
    .filter((segment) => !preferredChapterId || segment.chapterId === preferredChapterId)
    .map((segment) => {
      const searched = searchResultMap.get(segment.id);
      const lexicalScore = similarity(text, `${segment.excerpt ?? ''} ${segment.text ?? ''}`);
      return {
        citationId: segment.id,
        chapterId: segment.chapterId,
        manualRef: segment.manualRef,
        pageRange: {
          start: Number(segment.pageRange?.start ?? 0),
          end: Number(segment.pageRange?.end ?? segment.pageRange?.start ?? 0),
        },
        excerpt: segment.excerpt ?? segment.text ?? '',
        confidence: Math.max(lexicalScore, searched?.confidence ?? 0),
      };
    })
    .sort((left, right) => right.confidence - left.confidence);

  return candidates.slice(0, limit);
}

function applyFactAutoGrounding(question, warnings, groundTruth, manualSegments) {
  const matches = buildFactGroundingMatches(question, groundTruth, manualSegments);
  if (matches.length === 0) {
    return null;
  }

  const [best, second] = matches;
  if (
    !best ||
    best.confidence < AUTO_GROUND_THRESHOLD ||
    (second && second.confidence >= best.confidence - 0.05 && second.fact.chapterId !== best.fact.chapterId)
  ) {
    return {
      matched: false,
      matches,
    };
  }

  question.manualFactRefs = Array.from(
    new Set([...(question.manualFactRefs ?? []), best.fact.id]),
  );
  if (best.citation) {
    question.manualCitationRefs = Array.from(
      new Set([...(question.manualCitationRefs ?? []), best.citation.citationId ?? best.citation.id]),
    );
  }
  if (!question.chapterId) {
    question.chapterId = best.fact.chapterId;
  }
  if (!question.groundingExcerpt) {
    question.groundingExcerpt =
      best.citation?.excerpt ??
      `${best.fact.manualRef}: ${best.fact.value}${best.fact.unit ? ` ${best.fact.unit}` : ''}.`;
  }
  if (!Number.isFinite(question.sourcePageStart)) {
    question.sourcePageStart = Number(best.fact.pageRange?.start);
  }
  if (!Number.isFinite(question.sourcePageEnd)) {
    question.sourcePageEnd = Number(best.fact.pageRange?.end);
  }
  if (!question.sourceReference) {
    question.sourceReference = best.fact.manualRef;
  }
  question.groundingMode = 'fact_auto';
  question.autoGroundingConfidence = best.confidence;
  for (const entity of question.extractedEntities ?? []) {
    if (best.claimMatches.some((claim) => claim.raw === entity.raw)) {
      entity.factRefIds = Array.from(new Set([...(entity.factRefIds ?? []), best.fact.id]));
    }
  }
  warnings.push(
    buildIssue(
      'auto_grounded_from_fact_map',
      `Missing grounding was resolved from fact ${best.fact.id}.`,
      'groundingExcerpt',
    ),
  );

  return {
    matched: true,
    matches,
  };
}

function applyCitationAutoGrounding(question, warnings, manualSegments, searchEngine) {
  const preferredChapterId = question.chapterId || '';
  let suggestions = findCitationCandidates(
    question,
    manualSegments,
    preferredChapterId,
    3,
    searchEngine,
  );

  if (suggestions.length === 0 && !preferredChapterId) {
    suggestions = findCitationCandidates(question, manualSegments, '', 3, searchEngine);
  }

  const [best, second] = suggestions;
  if (!best) {
    return suggestions;
  }

  const globallyDominant =
    best.confidence >= GLOBAL_CITATION_THRESHOLD &&
    (!second || best.chapterId === second.chapterId || best.confidence - second.confidence >= 0.08);

  if (globallyDominant) {
    if (!question.chapterId) {
      question.chapterId = best.chapterId;
    }
    question.manualCitationRefs = Array.from(
      new Set([...(question.manualCitationRefs ?? []), best.citationId]),
    );
    if (!question.groundingExcerpt) {
      question.groundingExcerpt = best.excerpt;
    }
    if (!Number.isFinite(question.sourcePageStart)) {
      question.sourcePageStart = best.pageRange.start;
    }
    if (!Number.isFinite(question.sourcePageEnd)) {
      question.sourcePageEnd = best.pageRange.end;
    }
    if (!question.sourceReference) {
      question.sourceReference = best.manualRef;
    }
    question.groundingMode = 'citation_auto';
    question.autoGroundingConfidence = best.confidence;
    warnings.push(
      buildIssue(
        'auto_grounded_from_manual_segment',
        `Missing grounding was resolved from citation ${best.citationId}.`,
        'groundingExcerpt',
      ),
    );
  }

  return suggestions;
}

function validateFacts(question, groundTruth = []) {
  const errors = [];
  const warnings = [];
  const text = buildQuestionGroundingText(question);
  const answerSurface = normalizeTextForContains(text);
  const claims = question.extractedEntities?.length ? question.extractedEntities : extractEntities(text);
  const matchedFactIds = [];

  for (const fact of groundTruth) {
    const aliases = Array.isArray(fact.aliases) ? fact.aliases : [];
    const aliasMatched = aliases.some((alias) =>
      answerSurface.includes(normalizeTextForContains(alias)),
    );
    if (!aliasMatched) {
      continue;
    }

    matchedFactIds.push(fact.id);
    const expectedValue = normalizeClaimValue(fact.value);
    const expectedUnit = normalizeWhitespace(normalizeUnitVariants(fact.unit ?? ''));
    const claimMatched = claims.some((claim) => {
      const sameValue = claim.value === expectedValue;
      const sameUnit = !expectedUnit || claim.unit === expectedUnit;
      return sameValue && sameUnit;
    });

    if (!claimMatched && claims.length > 0) {
      const issue = buildIssue(
        fact.strictness === 'hard' ? 'manual_fact_conflict' : 'manual_fact_warning',
        `Question content conflicts with manual fact ${fact.id} (${fact.value}${fact.unit ? ` ${fact.unit}` : ''}).`,
        'publicExplanation',
      );
      if (fact.strictness === 'hard') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }

  return { errors, warnings, matchedFactIds };
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
    manualSegments,
    manualSearchEngine,
    chapterClassifier,
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

  const classification = scoreChapterClassification(question, chapterClassifier);
  question.classificationScores = classification.scores;
  let chapterAmbiguous = false;

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

  question.extractedEntities = extractEntities(buildQuestionGroundingText(question));
  const factGrounding = !question.groundingExcerpt
    ? applyFactAutoGrounding(question, warnings, groundTruth, manualSegments)
    : null;
  const groundingSuggestions =
    !question.groundingExcerpt || question.groundingMode === 'missing'
      ? applyCitationAutoGrounding(question, warnings, manualSegments, manualSearchEngine)
      : findCitationCandidates(
          question,
          manualSegments,
          question.chapterId || '',
          3,
          manualSearchEngine,
        );

  if (!question.chapterId && chapterAmbiguous) {
    errors.push(
      buildIssue(
        'chapter_classification_ambiguous',
        'Question could not be assigned to a single chapter with enough confidence.',
        'chapterId',
      ),
    );
  }

  if (batchChapterId && question.chapterId && batchChapterId !== question.chapterId) {
    errors.push(
      buildIssue(
        'batch_chapter_mismatch',
        `Question resolved to ${question.chapterId} but the batch is scoped to ${batchChapterId}.`,
        'chapterId',
      ),
    );
  }

  if (!question.groundingExcerpt) {
    errors.push(
      buildIssue('missing_grounding_excerpt', 'groundingExcerpt is required.', 'groundingExcerpt'),
    );
    question.groundingMode = 'missing';
  }

  if (!question.publicExplanation) {
    warnings.push(
      buildIssue(
        'missing_public_explanation',
        'publicExplanation is recommended for operator review and publishing.',
        'publicExplanation',
      ),
    );
  }

  if (!Number.isFinite(question.sourcePageStart) || !Number.isFinite(question.sourcePageEnd)) {
    errors.push(
      buildIssue(
        'invalid_source_page',
        'sourcePageStart and sourcePageEnd must resolve to valid numbers.',
        'sourcePageStart',
      ),
    );
  } else if (question.sourcePageStart > question.sourcePageEnd) {
    errors.push(
      buildIssue(
        'invalid_source_page_range',
        'sourcePageStart cannot be greater than sourcePageEnd.',
        'sourcePageStart',
      ),
    );
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
      errors.push(
        buildIssue(
          'chapter_scope_mismatch',
          `Source pages ${question.sourcePageStart}-${question.sourcePageEnd} fall outside the accepted ${question.chapterId} source window ${scopeWindow.start}-${scopeWindow.end}.`,
          'sourcePageStart',
        ),
      );
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

  const factValidation = validateFacts(question, groundTruth);
  question.manualFactRefs = Array.from(
    new Set([...(question.manualFactRefs ?? []), ...factValidation.matchedFactIds]),
  );
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

  if (question.options.length !== 4) {
    warnings.push(
      buildIssue(
        'non_standard_option_count',
        'Questions should normally have exactly four options.',
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

  return { errors, warnings, groundingSuggestions: groundingSuggestions ?? [], factGrounding };
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
  const manualSearchEngine = buildManualSearchEngine(knowledgePack.manualSegments ?? []);

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
      manualSegments: knowledgePack.manualSegments ?? [],
      manualSearchEngine,
      chapterClassifier: knowledgePack.chapterClassifier ?? {},
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
        rejectedCount: rejectedItems.length,
        duplicateClusterCount: duplicateClusters.length,
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
