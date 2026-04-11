const CHAPTER_SOURCE_WINDOWS = {
  'chapter-1': { start: 6, end: 10, label: 'Los siniestros de tránsito' },
  'chapter-2': { start: 11, end: 32, label: 'Los principios de la conducción' },
  'chapter-3': { start: 33, end: 36, label: 'Convivencia vial' },
  'chapter-4': { start: 37, end: 67, label: 'La persona en el tránsito' },
  'chapter-5': { start: 68, end: 76, label: 'Las y los usuarios vulnerables' },
  'chapter-6': { start: 77, end: 108, label: 'Normas de circulación' },
  'chapter-7': { start: 109, end: 126, label: 'Conducción en circunstancias especiales' },
  'chapter-8': { start: 127, end: 135, label: 'Conducción eficiente' },
  'chapter-9': { start: 136, end: 148, label: 'Informaciones importantes' },
};

const MOJIBAKE_REPLACEMENTS = new Map([
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã', 'Á'],
  ['Ã‰', 'É'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
  ['Ã±', 'ñ'],
  ['Ã‘', 'Ñ'],
  ['Ã¼', 'ü'],
  ['Ãœ', 'Ü'],
  ['â', '’'],
  ['â', '“'],
  ['â', '”'],
  ['â', '–'],
  ['â', '—'],
  ['â¦', '…'],
]);

/**
 * @typedef {{
 *   code: string;
 *   message: string;
 *   field?: string;
 * }} ImportReviewIssue
 */

/**
 * @typedef {{
 *   scope: 'batch' | 'question';
 *   target: string;
 *   field: string;
 *   action: string;
 *   before: string;
 *   after: string;
 * }} ImportNormalization
 */

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

function normalizeWhitespace(value) {
  return value.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function recoverMojibake(value) {
  let next = value;
  for (const [before, after] of MOJIBAKE_REPLACEMENTS.entries()) {
    next = next.split(before).join(after);
  }
  return next;
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

function buildIssue(code, message, field) {
  return { code, message, field };
}

function normalizeTextForCompare(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTextForContains(value) {
  return normalizeTextForCompare(value).replace(/[^a-z0-9\s]/g, '').trim();
}

function tokenize(value) {
  return normalizeTextForCompare(value)
    .split(/[^a-z0-9]+/i)
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

function extractPromptTexts(seedContentText) {
  const prompts = [];
  const pattern = /prompt:\s*'((?:\\.|[^'\\])*)'/g;
  let match;

  while ((match = pattern.exec(seedContentText)) !== null) {
    const prompt = match[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
    prompts.push(prompt);
  }

  return prompts;
}

function buildExistingPromptMatches(prompt, existingPrompts) {
  const exact = [];
  const near = [];
  const normalizedPrompt = normalizeTextForCompare(prompt);

  for (const existingPrompt of existingPrompts) {
    const normalizedExisting = normalizeTextForCompare(existingPrompt);
    if (!normalizedExisting) {
      continue;
    }

    if (normalizedExisting === normalizedPrompt) {
      exact.push(existingPrompt);
      continue;
    }

    const score = similarity(prompt, existingPrompt);
    if (score >= 0.82) {
      near.push({ prompt: existingPrompt, score });
    }
  }

  return { exact, near };
}

function normalizeQuestion(rawQuestion, batchChapterId, normalizations, index) {
  const externalId =
    typeof rawQuestion?.externalId === 'string' && rawQuestion.externalId.trim()
      ? rawQuestion.externalId.trim()
      : `question-${index + 1}`;

  const normalizeField = (field, value) =>
    normalizeString(value, { scope: 'question', target: externalId, field }, normalizations);

  const options = Array.isArray(rawQuestion?.options)
    ? rawQuestion.options.map((option, optionIndex) => ({
        text: normalizeField(`options[${optionIndex}].text`, option?.text ?? ''),
      }))
    : [];

  const tags = Array.isArray(rawQuestion?.tags)
    ? rawQuestion.tags
        .map((tag, tagIndex) => normalizeField(`tags[${tagIndex}]`, String(tag ?? '')))
        .filter(Boolean)
    : [];

  return {
    externalId,
    prompt: normalizeField('prompt', rawQuestion?.prompt ?? ''),
    selectionMode: normalizeField('selectionMode', rawQuestion?.selectionMode ?? ''),
    instruction: normalizeField('instruction', rawQuestion?.instruction ?? ''),
    options,
    correctOptionIndexes: Array.isArray(rawQuestion?.correctOptionIndexes)
      ? rawQuestion.correctOptionIndexes.map((value) => Number(value))
      : [],
    publicExplanation: normalizeField('publicExplanation', rawQuestion?.publicExplanation ?? ''),
    sourcePageStart: Number(rawQuestion?.sourcePageStart),
    sourcePageEnd: Number(rawQuestion?.sourcePageEnd),
    sourceReference: normalizeField('sourceReference', rawQuestion?.sourceReference ?? ''),
    groundingExcerpt: normalizeField('groundingExcerpt', rawQuestion?.groundingExcerpt ?? ''),
    reviewNotes: normalizeField('reviewNotes', rawQuestion?.reviewNotes ?? ''),
    tags,
    chapterId: batchChapterId,
  };
}

function validateQuestion(question, batchChapterId, batchPeers, existingPrompts) {
  /** @type {ImportReviewIssue[]} */
  const errors = [];
  /** @type {ImportReviewIssue[]} */
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

  if (!Number.isFinite(question.sourcePageStart) || !Number.isFinite(question.sourcePageEnd)) {
    errors.push(
      buildIssue(
        'invalid_source_page',
        'sourcePageStart and sourcePageEnd must be valid numbers.',
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

  if (!question.sourceReference) {
    errors.push(
      buildIssue('missing_source_reference', 'sourceReference is required.', 'sourceReference'),
    );
  }

  if (!question.groundingExcerpt) {
    errors.push(
      buildIssue('missing_grounding_excerpt', 'groundingExcerpt is required.', 'groundingExcerpt'),
    );
  }

  if (!question.publicExplanation) {
    errors.push(
      buildIssue('missing_public_explanation', 'publicExplanation is required.', 'publicExplanation'),
    );
  }

  if (!Array.isArray(question.options) || question.options.length < 2) {
    errors.push(buildIssue('invalid_options', 'Question must include at least two options.', 'options'));
  }

  const normalizedOptions = question.options.map((option) => normalizeTextForCompare(option.text));
  const emptyOptions = question.options.some((option) => !option.text);
  if (emptyOptions) {
    errors.push(buildIssue('empty_option_text', 'All options must have text.', 'options'));
  }

  const uniqueOptions = new Set(normalizedOptions.filter(Boolean));
  if (uniqueOptions.size !== normalizedOptions.filter(Boolean).length) {
    errors.push(
      buildIssue('duplicate_option_text', 'Options cannot repeat the same text.', 'options'),
    );
  }

  const invalidAnswerIndexes = question.correctOptionIndexes.some(
    (value) =>
      !Number.isInteger(value) || value < 0 || value >= question.options.length,
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

  const uniqueCorrectIndexes = new Set(question.correctOptionIndexes);
  if (uniqueCorrectIndexes.size !== question.correctOptionIndexes.length) {
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

  const scopeWindow = CHAPTER_SOURCE_WINDOWS[batchChapterId];
  if (scopeWindow) {
    if (
      question.sourcePageStart < scopeWindow.start ||
      question.sourcePageEnd > scopeWindow.end
    ) {
      errors.push(
        buildIssue(
          'chapter_scope_mismatch',
          `Source pages ${question.sourcePageStart}-${question.sourcePageEnd} fall outside the accepted ${batchChapterId} source window ${scopeWindow.start}-${scopeWindow.end}.`,
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
  } else {
    warnings.push(
      buildIssue(
        'chapter_scope_not_configured',
        `No chapter scope window is configured for ${batchChapterId}. Source-page validation was skipped.`,
        'sourcePageStart',
      ),
    );
  }

  const batchPrompt = normalizeTextForCompare(question.prompt);
  for (const peer of batchPeers) {
    if (peer.externalId === question.externalId) {
      continue;
    }

    const peerPrompt = normalizeTextForCompare(peer.prompt);
    if (!peerPrompt || !batchPrompt) {
      continue;
    }

    if (peerPrompt === batchPrompt) {
      errors.push(
        buildIssue(
          'duplicate_prompt_in_batch',
          `Prompt duplicates another batch item (${peer.externalId}).`,
          'prompt',
        ),
      );
      break;
    }

    const score = similarity(question.prompt, peer.prompt);
    if (score >= 0.82) {
      errors.push(
        buildIssue(
          'near_duplicate_prompt_in_batch',
          `Prompt is too similar to another batch item (${peer.externalId}, similarity ${score.toFixed(2)}).`,
          'prompt',
        ),
      );
      break;
    }
  }

  const promptMatches = buildExistingPromptMatches(question.prompt, existingPrompts);
  if (promptMatches.exact.length > 0) {
    errors.push(
      buildIssue(
        'duplicate_prompt_existing_bank',
        'Prompt already exists in the local question bank.',
        'prompt',
      ),
    );
  } else if (promptMatches.near.length > 0) {
    const strongest = promptMatches.near[0];
    errors.push(
      buildIssue(
        'near_duplicate_prompt_existing_bank',
        `Prompt is too similar to an existing bank item (similarity ${strongest.score.toFixed(2)}).`,
        'prompt',
      ),
    );
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

  if (
    question.selectionMode === 'multiple' &&
    instructionNormalized.includes('una respuesta')
  ) {
    warnings.push(
      buildIssue(
        'instruction_mismatch',
        'Instruction wording suggests one answer for a multiple-selection question.',
        'instruction',
      ),
    );
  }

  const explanationNormalized = normalizeTextForContains(question.publicExplanation);
  const mentionsCorrectOption = question.correctOptionIndexes.some((index) => {
    const option = question.options[index];
    return option ? explanationNormalized.includes(normalizeTextForContains(option.text)) : false;
  });
  const mentionedIncorrectOnly =
    explanationNormalized &&
    question.options.some(
      (option, index) =>
        explanationNormalized.includes(normalizeTextForContains(option.text)) &&
        !question.correctOptionIndexes.includes(index),
    ) &&
    !mentionsCorrectOption;

  if (mentionedIncorrectOnly) {
    errors.push(
      buildIssue(
        'explanation_answer_conflict',
        'Explanation appears to reference only incorrect options.',
        'publicExplanation',
      ),
    );
  }

  return { errors, warnings };
}

export function reviewImportBatch(rawBatch, { sourceFile, seedContentText }) {
  /** @type {ImportNormalization[]} */
  const normalizations = [];
  const batchErrors = [];
  const batchWarnings = [];

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

  const batchId = normalizeString(rawBatch?.batchId ?? '', {
    scope: 'batch',
    target: 'batch',
    field: 'batchId',
  }, normalizations);
  const editionId = normalizeString(rawBatch?.editionId ?? '', {
    scope: 'batch',
    target: 'batch',
    field: 'editionId',
  }, normalizations);
  const sourceDocumentId = normalizeString(rawBatch?.sourceDocumentId ?? '', {
    scope: 'batch',
    target: 'batch',
    field: 'sourceDocumentId',
  }, normalizations);

  if (!batchId) {
    batchErrors.push(buildIssue('missing_batch_id', 'batchId is required.'));
  }

  if (editionId !== 'edition-2026') {
    batchErrors.push(buildIssue('invalid_edition_id', 'editionId must be edition-2026.'));
  }

  if (!chapterIdNormalized) {
    batchErrors.push(buildIssue('missing_chapter_id', 'chapterId is required.'));
  }

  if (sourceDocumentId !== 'manual-claseb-2026') {
    batchErrors.push(
      buildIssue(
        'invalid_source_document_id',
        'sourceDocumentId must be manual-claseb-2026.',
      ),
    );
  }

  if (!Array.isArray(rawBatch?.questions)) {
    batchErrors.push(buildIssue('invalid_questions_array', 'questions must be an array.'));
  }

  const existingPrompts = extractPromptTexts(seedContentText);
  const normalizedQuestions = Array.isArray(rawBatch?.questions)
    ? rawBatch.questions.map((question, index) =>
        normalizeQuestion(question, chapterIdNormalized, normalizations, index),
      )
    : [];

  const items = normalizedQuestions.map((question) => {
    const { errors, warnings } = validateQuestion(
      question,
      chapterIdNormalized,
      normalizedQuestions,
      existingPrompts,
    );

    return {
      externalId: question.externalId,
      status: errors.length > 0 ? 'rejected' : 'accepted',
      warnings,
      errors,
      normalizedQuestion: question,
    };
  });

  const acceptedItems = items.filter((item) => item.status === 'accepted');
  const rejectedItems = items.filter((item) => item.status === 'rejected');
  const topLevelErrors = [
    ...batchErrors,
    ...rejectedItems.flatMap((item) =>
      item.errors.map((error) => ({
        code: error.code,
        message: error.message,
        questionId: item.externalId,
      })),
    ),
  ];

  const warningCount =
    batchWarnings.length +
    items.reduce((count, item) => count + item.warnings.length, 0);
  const errorCount =
    batchErrors.length +
    items.reduce((count, item) => count + item.errors.length, 0);

  return {
    reviewLog: {
      sourceFile,
      reviewedAt: new Date().toISOString(),
      batch: {
        batchId,
        chapterIdRaw,
        chapterIdNormalized,
        sourceDocumentId,
        questionCount: normalizedQuestions.length,
      },
      summary: {
        acceptedCount: acceptedItems.length,
        rejectedCount: rejectedItems.length,
        warningCount,
        errorCount,
      },
      normalizations,
      warnings: batchWarnings,
      errors: topLevelErrors,
      items,
    },
    acceptedCandidates: acceptedItems.map((item) => item.normalizedQuestion),
    rejectedCandidates: rejectedItems.map((item) => ({
      externalId: item.externalId,
      errors: item.errors,
      warnings: item.warnings,
      normalizedQuestion: item.normalizedQuestion,
    })),
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
    `- Chapter: \`${reviewLog.batch.chapterIdNormalized}\``,
    `- Source document: \`${reviewLog.batch.sourceDocumentId}\``,
    `- Total questions: ${reviewLog.batch.questionCount}`,
    `- Accepted: ${reviewLog.summary.acceptedCount}`,
    `- Rejected: ${reviewLog.summary.rejectedCount}`,
    `- Warnings: ${reviewLog.summary.warningCount}`,
    `- Errors: ${reviewLog.summary.errorCount}`,
    '',
    '## Accepted items',
  ];

  if (acceptedItems.length === 0) {
    lines.push('- None');
  } else {
    for (const item of acceptedItems) {
      const warningLabel = item.warnings.length > 0 ? ` (${item.warnings.length} warnings)` : '';
      lines.push(`- \`${item.externalId}\`${warningLabel}`);
    }
  }

  lines.push('', '## Rejected items');
  if (rejectedItems.length === 0) {
    lines.push('- None');
  } else {
    for (const item of rejectedItems) {
      lines.push(`- \`${item.externalId}\``);
      for (const error of item.errors) {
        lines.push(`  - ${error.code}: ${error.message}`);
      }
    }
  }

  lines.push('', '## Normalization warnings');
  if (reviewLog.normalizations.length === 0) {
    lines.push('- None');
  } else {
    for (const normalization of reviewLog.normalizations) {
      lines.push(
        `- \`${normalization.target}\` ${normalization.field}: ${normalization.action}`,
      );
    }
  }

  lines.push('', '## Next operator action');
  if (rejectedItems.length > 0) {
    lines.push(
      '- Use `accepted-candidates.json` as the only eligible staging set for later merge work.',
      '- Review `rejected-candidates.json` and split or discard out-of-scope items before resubmission.',
    );
  } else {
    lines.push(
      '- All items passed review. Continue with the later merge workflow from `accepted-candidates.json`.',
    );
  }

  return `${lines.join('\n')}\n`;
}
