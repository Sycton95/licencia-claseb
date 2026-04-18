import type { ContentCatalog, Question } from '../types/content.js';
import type {
  AiPilotActiveRun,
  AiPilotRunConfig,
  AiPilotEvaluationItemReport,
  AiPilotEvaluationReport,
  AiPilotRun,
  AiPilotRunMode,
  AiPilotSuggestionRecord,
  AiProvider,
  AiSuggestion,
  SourcePreparationChunk,
} from '../types/ai.js';
import { buildPilotSuggestionRecord } from './aiSuggestionVerifier.js';
import {
  getLocalOllamaRuntimeConfig,
  type LocalOllamaRuntimeConfig,
} from './ollamaRuntimeConfig.js';

type OllamaGenerateResponse = {
  response?: string;
};

type OllamaQuestionShape = {
  prompt?: string;
  selectionMode?: AiSuggestion['selectionMode'];
  instruction?: string;
  options?: string[];
  correctOptionIndexes?: number[];
  publicExplanation?: string;
  reviewNotes?: string;
  rationale?: string;
  groundingExcerpt?: string;
};

type LocalOllamaPilotOptions = {
  evaluationSetId?: string;
  provider?: AiProvider;
  maxItems?: number;
  chunks?: SourcePreparationChunk[];
  questions?: Question[];
  mode?: AiPilotRunMode;
  signal?: AbortSignal;
  runtimeConfig?: Partial<LocalOllamaRuntimeConfig>;
  onProgress?: (
    progress: Pick<
      AiPilotActiveRun,
      | 'status'
      | 'completedItems'
      | 'totalItems'
      | 'currentItemLabel'
      | 'currentStep'
      | 'progressPercent'
    >,
  ) => void;
};

export type LocalOllamaPilotTaskInput =
  | {
      type: 'new_question';
      label: string;
      chunk: SourcePreparationChunk;
    }
  | {
      type: 'rewrite';
      label: string;
      question: Question;
    };

function nowIso() {
  return new Date().toISOString();
}

function buildId(prefix: string, key: string) {
  return `${prefix}-${key}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function extractJsonPayload(rawOutput: string): OllamaQuestionShape | null {
  const trimmed = rawOutput.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as OllamaQuestionShape;
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace < 0 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as OllamaQuestionShape;
    } catch {
      return null;
    }
  }
}

function buildNewQuestionPrompt(chunk: SourcePreparationChunk) {
  return [
    'Actua como editor de preguntas para Licencia Clase B en Chile.',
    'Devuelve solo JSON valido con este esquema:',
    '{"prompt":"","selectionMode":"single|multiple","instruction":"","options":[""],"correctOptionIndexes":[0],"publicExplanation":"","reviewNotes":"","rationale":"","groundingExcerpt":""}',
    'Reglas:',
    '- No inventes fuentes fuera del fragmento entregado.',
    '- Manten tono de examen claro y neutro.',
    '- Si la evidencia es insuficiente, devuelve un JSON con prompt vacio.',
    '',
    `Capitulo: ${chunk.chapterId}`,
    `Referencia: ${chunk.referenceLabel}`,
    `Resumen base: ${chunk.groundingSummary}`,
    `Rationale editorial: ${chunk.rationale}`,
    `Nota de benchmark: ${chunk.benchmarkNote ?? 'N/A'}`,
  ].join('\n');
}

function buildRewritePrompt(question: Question) {
  const options = question.options
    .map((option, index) => `${String.fromCharCode(65 + index)}. ${option.text}`)
    .join('\n');

  return [
    'Actua como editor de preguntas para Licencia Clase B en Chile.',
    'Reescribe el enunciado y las alternativas solo si mejora claridad sin cambiar el hecho base.',
    'Devuelve solo JSON valido con este esquema:',
    '{"prompt":"","selectionMode":"single|multiple","instruction":"","options":[""],"correctOptionIndexes":[0],"publicExplanation":"","reviewNotes":"","rationale":"","groundingExcerpt":""}',
    'No cambies el tipo de seleccion ni inventes nueva fuente.',
    '',
    `Pregunta actual: ${question.prompt}`,
    `Instruccion: ${question.instruction}`,
    `Referencia: ${question.sourceReference ?? `Pag. ${question.sourcePage}`}`,
    `Explicacion publica: ${question.publicExplanation ?? question.explanation ?? 'N/A'}`,
    'Alternativas:',
    options,
  ].join('\n');
}

function buildProgressSnapshot(
  completedItems: number,
  totalItems: number,
  currentStep: AiPilotActiveRun['currentStep'],
  currentItemLabel?: string,
  status: AiPilotActiveRun['status'] = 'running',
) {
  return {
    status,
    completedItems,
    totalItems,
    currentItemLabel,
    currentStep,
    progressPercent: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
  } satisfies Pick<
    AiPilotActiveRun,
    'status' | 'completedItems' | 'totalItems' | 'currentItemLabel' | 'currentStep' | 'progressPercent'
  >;
}

async function requestOllama(
  prompt: string,
  runtimeConfig: LocalOllamaRuntimeConfig,
  signal?: AbortSignal,
) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), runtimeConfig.maxGenerationMs);
  const abortHandler = () => controller.abort();

  try {
    if (signal?.aborted) {
      controller.abort();
    } else if (signal) {
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    const response = await fetch(`${runtimeConfig.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: runtimeConfig.model,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama devolvio ${response.status}.`);
    }

    return (await response.json()) as OllamaGenerateResponse;
  } finally {
    globalThis.clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }
  }
}

function buildSuggestionFromChunk(
  chunk: SourcePreparationChunk,
  payload: OllamaQuestionShape | null,
  actorEmail: string,
  runId: string,
): AiSuggestion {
  const createdAt = nowIso();
  const prompt = payload?.prompt?.trim() ?? '';
  const options = payload?.options?.map((item) => item.trim()) ?? [];
  const correctOptionIndexes = payload?.correctOptionIndexes ?? [];

  return {
    id: buildId('ollama', `new-${chunk.id}`),
    editionId: chunk.editionId,
    chapterId: chunk.chapterId,
    sourceDocumentId: chunk.sourceDocumentId,
    sourceReference: chunk.referenceLabel,
    suggestionType: 'new_question',
    status: 'pending',
    prompt,
    selectionMode: payload?.selectionMode,
    instruction: payload?.instruction?.trim(),
    suggestedOptions: options,
    suggestedCorrectAnswers: correctOptionIndexes,
    publicExplanation: payload?.publicExplanation?.trim(),
    reviewNotes: payload?.reviewNotes?.trim(),
    groundingExcerpt: payload?.groundingExcerpt?.trim() || chunk.groundingSummary,
    rationale: payload?.rationale?.trim() || chunk.rationale,
    confidence: 0.45,
    provider: 'ollama_qwen25_3b',
    dedupeKey: `ollama:new:${chunk.id}`,
    aiRunId: runId,
    createdBy: actorEmail,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildRewriteSuggestion(
  question: Question,
  payload: OllamaQuestionShape | null,
  actorEmail: string,
  runId: string,
): AiSuggestion {
  const createdAt = nowIso();
  const prompt = payload?.prompt?.trim() ?? '';
  const options = payload?.options?.map((item) => item.trim()) ?? [];
  const correctOptionIndexes = payload?.correctOptionIndexes ?? [];

  return {
    id: buildId('ollama', `rewrite-${question.id}`),
    editionId: question.editionId,
    chapterId: question.chapterId,
    sourceDocumentId: question.sourceDocumentId,
    sourceReference: question.sourceReference ?? `Pag. ${question.sourcePage}`,
    suggestionType: 'rewrite',
    status: 'pending',
    prompt,
    selectionMode: payload?.selectionMode ?? question.selectionMode,
    instruction: payload?.instruction?.trim() ?? question.instruction,
    suggestedOptions: options,
    suggestedCorrectAnswers: correctOptionIndexes,
    publicExplanation:
      payload?.publicExplanation?.trim() ??
      question.publicExplanation ??
      question.explanation,
    reviewNotes: payload?.reviewNotes?.trim(),
    groundingExcerpt:
      payload?.groundingExcerpt?.trim() ??
      question.publicExplanation ??
      question.explanation ??
      `Referencia: ${question.sourceReference ?? `Pag. ${question.sourcePage}`}.`,
    rationale:
      payload?.rationale?.trim() ??
      'Reescritura local generada por Ollama para revision editorial.',
    confidence: 0.38,
    provider: 'ollama_qwen25_3b',
    dedupeKey: `ollama:rewrite:${question.id}`,
    targetQuestionId: question.id,
    aiRunId: runId,
    createdBy: actorEmail,
    createdAt,
    updatedAt: createdAt,
  };
}

async function generateNewQuestionRecord(
  catalog: ContentCatalog,
  chunk: SourcePreparationChunk,
  actorEmail: string,
  runId: string,
  runtimeConfig: LocalOllamaRuntimeConfig,
  signal?: AbortSignal,
): Promise<AiPilotSuggestionRecord> {
  const prompt = buildNewQuestionPrompt(chunk);
  const response = await requestOllama(prompt, runtimeConfig, signal);
  const rawOutput = response.response ?? '';
  const payload = extractJsonPayload(rawOutput);
  const suggestion = buildSuggestionFromChunk(chunk, payload, actorEmail, runId);

  return buildPilotSuggestionRecord('ollama_qwen25_3b', suggestion, catalog, rawOutput);
}

async function generateRewriteRecord(
  catalog: ContentCatalog,
  question: Question,
  actorEmail: string,
  runId: string,
  runtimeConfig: LocalOllamaRuntimeConfig,
  signal?: AbortSignal,
): Promise<AiPilotSuggestionRecord> {
  const prompt = buildRewritePrompt(question);
  const response = await requestOllama(prompt, runtimeConfig, signal);
  const rawOutput = response.response ?? '';
  const payload = extractJsonPayload(rawOutput);
  const suggestion = buildRewriteSuggestion(question, payload, actorEmail, runId);

  return buildPilotSuggestionRecord('ollama_qwen25_3b', suggestion, catalog, rawOutput);
}

export async function runLocalOllamaPilotTask(
  catalog: ContentCatalog,
  actorEmail: string,
  task: LocalOllamaPilotTaskInput,
  runId: string,
  runtimeConfig: LocalOllamaRuntimeConfig,
  signal?: AbortSignal,
) {
  if (task.type === 'new_question') {
    return generateNewQuestionRecord(catalog, task.chunk, actorEmail, runId, runtimeConfig, signal);
  }

  return generateRewriteRecord(catalog, task.question, actorEmail, runId, runtimeConfig, signal);
}

function buildEvaluationItemReport(record: AiPilotSuggestionRecord): AiPilotEvaluationItemReport {
  const criticalCount = record.verifierIssues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = record.verifierIssues.filter((issue) => issue.severity === 'warning').length;

  return {
    evaluationItemId: record.suggestion.dedupeKey,
    targetId: record.suggestion.targetQuestionId ?? record.suggestion.dedupeKey,
    label: record.suggestion.sourceReference,
    suggestionType: record.suggestion.suggestionType as 'new_question' | 'rewrite',
    verifierStatus: record.verifierStatus,
    criticalCount,
    warningCount,
    issueCodes: [...new Set(record.verifierIssues.map((issue) => issue.code))],
  };
}

function buildIssueBreakdown(records: AiPilotSuggestionRecord[]) {
  const counts: AiPilotEvaluationReport['issueBreakdown'] = {};

  for (const record of records) {
    for (const issue of record.verifierIssues) {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
    }
  }

  return counts as AiPilotEvaluationReport['issueBreakdown'];
}

export function buildLocalOllamaPilotCompletedResult(params: {
  provider: AiProvider;
  runtimeConfig: LocalOllamaRuntimeConfig;
  actorEmail: string;
  runId: string;
  evaluationSetId: string;
  mode: AiPilotRunMode;
  config: AiPilotRunConfig;
  startedAt: string;
  durationMs: number;
  suggestions: AiPilotSuggestionRecord[];
}) {
  const { provider, runtimeConfig, actorEmail, runId, evaluationSetId, mode, config, startedAt, durationMs, suggestions } = params;
  const attemptedItemIds = suggestions.map((record) => record.suggestion.dedupeKey);
  const criticalIssueCount = suggestions.reduce(
    (total, record) =>
      total + record.verifierIssues.filter((issue) => issue.severity === 'critical').length,
    0,
  );
  const warningIssueCount = suggestions.reduce(
    (total, record) =>
      total + record.verifierIssues.filter((issue) => issue.severity === 'warning').length,
    0,
  );

  const run: AiPilotRun = {
    id: runId,
    provider,
    model: runtimeConfig.model,
    actorEmail,
    evaluationSetId,
    attemptedItemIds,
    mode,
    status: 'completed',
    config,
    createdAt: startedAt,
    durationMs,
    summary: {
      attemptedCount: suggestions.length,
      passedCount: suggestions.filter((item) => item.verifierStatus === 'passed').length,
      failedCount: suggestions.filter((item) => item.verifierStatus === 'failed').length,
      newQuestionCount: suggestions.filter(
        (item) => item.suggestion.suggestionType === 'new_question',
      ).length,
      rewriteCount: suggestions.filter(
        (item) => item.suggestion.suggestionType === 'rewrite',
      ).length,
    },
  };

  const report: AiPilotEvaluationReport = {
    id: `pilot-report-${runId}`,
    evaluationSetId,
    runId,
    provider,
    model: runtimeConfig.model,
    mode,
    createdAt: startedAt,
    durationMs: run.durationMs,
    attemptedCount: run.summary.attemptedCount,
    passedCount: run.summary.passedCount,
    failedCount: run.summary.failedCount,
    criticalIssueCount,
    warningIssueCount,
    issueBreakdown: buildIssueBreakdown(suggestions),
    items: suggestions.map(buildEvaluationItemReport),
  };

  return {
    run,
    report,
    suggestions,
  };
}

export async function runLocalOllamaPilot(
  catalog: ContentCatalog,
  actorEmail: string,
  options: LocalOllamaPilotOptions = {},
): Promise<{ run: AiPilotRun; report: AiPilotEvaluationReport; suggestions: AiPilotSuggestionRecord[] }> {
  const provider = options.provider ?? 'ollama_qwen25_3b';
  const mode = options.mode ?? 'mixed';
  const runtimeConfig = getLocalOllamaRuntimeConfig(options.runtimeConfig);

  if (provider !== 'ollama_qwen25_3b') {
    throw new Error('El proveedor local solicitado no esta soportado todavia.');
  }

  const startedAt = Date.now();
  const runId = `pilot-run-${startedAt}`;
  const evaluationSetId = options.evaluationSetId ?? 'ad-hoc';
  const maxItems = options.maxItems ?? runtimeConfig.maxItemsPerRun;
  const config: AiPilotRunConfig = {
    timeoutMs: runtimeConfig.maxGenerationMs,
    maxItems,
    newQuestionCount:
      mode === 'rewrite' ? 0 : mode === 'new_question' ? maxItems : Math.max(1, Math.ceil(maxItems / 2)),
    rewriteCount:
      mode === 'new_question' ? 0 : mode === 'rewrite' ? maxItems : Math.max(0, maxItems - Math.max(1, Math.ceil(maxItems / 2))),
  };
  const chunkBudget =
    mode === 'new_question' ? maxItems : mode === 'rewrite' ? 0 : Math.max(1, Math.ceil(maxItems / 2));
  const rewriteBudget =
    mode === 'rewrite' ? maxItems : mode === 'new_question' ? 0 : Math.max(0, maxItems - chunkBudget);
  const chunkTargets = (options.chunks ?? []).slice(0, chunkBudget);
  const rewriteTargets = (options.questions ?? []).slice(0, rewriteBudget);
  const totalItems = chunkTargets.length + rewriteTargets.length;
  const suggestionRecords: AiPilotSuggestionRecord[] = [];
  let completedItems = 0;

  options.onProgress?.(
    buildProgressSnapshot(0, totalItems, 'queued', undefined, totalItems > 0 ? 'queued' : 'running'),
  );

  for (const chunk of chunkTargets) {
    options.signal?.throwIfAborted?.();
    options.onProgress?.(
      buildProgressSnapshot(completedItems, totalItems, 'generating', chunk.referenceLabel),
    );
    const record = await generateNewQuestionRecord(
      catalog,
      chunk,
      actorEmail,
      runId,
      runtimeConfig,
      options.signal,
    );
    options.onProgress?.(
      buildProgressSnapshot(completedItems, totalItems, 'verifying', chunk.referenceLabel),
    );
    suggestionRecords.push(record);
    completedItems += 1;
    options.onProgress?.(
      buildProgressSnapshot(completedItems, totalItems, 'persisting', chunk.referenceLabel),
    );
  }

  for (const question of rewriteTargets) {
    options.signal?.throwIfAborted?.();
    const itemLabel = question.sourceReference ?? question.id;
    options.onProgress?.(
      buildProgressSnapshot(completedItems, totalItems, 'generating', itemLabel),
    );
    const record = await generateRewriteRecord(
      catalog,
      question,
      actorEmail,
      runId,
      runtimeConfig,
      options.signal,
    );
    options.onProgress?.(
      buildProgressSnapshot(completedItems, totalItems, 'verifying', itemLabel),
    );
    suggestionRecords.push(record);
    completedItems += 1;
    options.onProgress?.(
      buildProgressSnapshot(completedItems, totalItems, 'persisting', itemLabel),
    );
  }

  const completedResult = buildLocalOllamaPilotCompletedResult({
    provider,
    runtimeConfig,
    actorEmail,
    runId,
    evaluationSetId,
    mode,
    config,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: Date.now() - startedAt,
    suggestions: suggestionRecords,
  });

  options.onProgress?.(
    buildProgressSnapshot(
      suggestionRecords.length,
      totalItems,
      'completed',
      suggestionRecords[suggestionRecords.length - 1]?.suggestion.sourceReference,
      'completed',
    ),
  );

  return {
    ...completedResult,
  };
}
