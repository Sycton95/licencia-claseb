import type { ContentCatalog, Question } from '../types/content.js';
import type {
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
  isLocalOllamaEnabled,
  ollamaBaseUrl,
  ollamaMaxGenerationMs,
  ollamaMaxItemsPerRun,
  ollamaModel,
} from './supabase.js';

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
    'Actúa como editor de preguntas para Licencia Clase B en Chile.',
    'Devuelve solo JSON válido con este esquema:',
    '{"prompt":"","selectionMode":"single|multiple","instruction":"","options":[""],"correctOptionIndexes":[0],"publicExplanation":"","reviewNotes":"","rationale":"","groundingExcerpt":""}',
    'Reglas:',
    '- No inventes fuentes fuera del fragmento entregado.',
    '- Mantén tono de examen claro y neutro.',
    '- Si la evidencia es insuficiente, devuelve un JSON con prompt vacío.',
    '',
    `Capítulo: ${chunk.chapterId}`,
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
    'Actúa como editor de preguntas para Licencia Clase B en Chile.',
    'Reescribe el enunciado y las alternativas solo si mejora claridad sin cambiar el hecho base.',
    'Devuelve solo JSON válido con este esquema:',
    '{"prompt":"","selectionMode":"single|multiple","instruction":"","options":[""],"correctOptionIndexes":[0],"publicExplanation":"","reviewNotes":"","rationale":"","groundingExcerpt":""}',
    'No cambies el tipo de selección ni inventes nueva fuente.',
    '',
    `Pregunta actual: ${question.prompt}`,
    `Instrucción: ${question.instruction}`,
    `Referencia: ${question.sourceReference ?? `Pág. ${question.sourcePage}`}`,
    `Explicación pública: ${question.publicExplanation ?? question.explanation ?? 'N/A'}`,
    'Alternativas:',
    options,
  ].join('\n');
}

async function requestOllama(prompt: string) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), ollamaMaxGenerationMs);

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama devolvió ${response.status}.`);
    }

    return (await response.json()) as OllamaGenerateResponse;
  } finally {
    globalThis.clearTimeout(timeoutId);
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
    sourceReference: question.sourceReference ?? `Pág. ${question.sourcePage}`,
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
      `Referencia: ${question.sourceReference ?? `Pág. ${question.sourcePage}`}.`,
    rationale:
      payload?.rationale?.trim() ??
      'Reescritura local generada por Ollama para revisión editorial.',
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
): Promise<AiPilotSuggestionRecord> {
  const prompt = buildNewQuestionPrompt(chunk);
  const response = await requestOllama(prompt);
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
): Promise<AiPilotSuggestionRecord> {
  const prompt = buildRewritePrompt(question);
  const response = await requestOllama(prompt);
  const rawOutput = response.response ?? '';
  const payload = extractJsonPayload(rawOutput);
  const suggestion = buildRewriteSuggestion(question, payload, actorEmail, runId);

  return buildPilotSuggestionRecord('ollama_qwen25_3b', suggestion, catalog, rawOutput);
}

function buildEvaluationItemReport(
  record: AiPilotSuggestionRecord,
): AiPilotEvaluationItemReport {
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

export async function runLocalOllamaPilot(
  catalog: ContentCatalog,
  actorEmail: string,
  options: LocalOllamaPilotOptions = {},
): Promise<{ run: AiPilotRun; report: AiPilotEvaluationReport; suggestions: AiPilotSuggestionRecord[] }> {
  if (!isLocalOllamaEnabled) {
    throw new Error('El piloto local de Ollama está deshabilitado.');
  }

  const provider = options.provider ?? 'ollama_qwen25_3b';
  const mode = options.mode ?? 'mixed';
  if (provider !== 'ollama_qwen25_3b') {
    throw new Error('El proveedor local solicitado no está soportado todavía.');
  }

  const startedAt = Date.now();
  const runId = `pilot-run-${startedAt}`;
  const evaluationSetId = options.evaluationSetId ?? 'ad-hoc';
  const maxItems = options.maxItems ?? ollamaMaxItemsPerRun;
  const chunkBudget =
    mode === 'new_question' ? maxItems : mode === 'rewrite' ? 0 : Math.max(1, Math.ceil(maxItems / 2));
  const rewriteBudget =
    mode === 'rewrite' ? maxItems : mode === 'new_question' ? 0 : Math.max(0, maxItems - chunkBudget);
  const chunkTargets = (options.chunks ?? []).slice(0, chunkBudget);
  const rewriteTargets = (options.questions ?? []).slice(0, rewriteBudget);
  const suggestionRecords: AiPilotSuggestionRecord[] = [];

  for (const chunk of chunkTargets) {
    suggestionRecords.push(await generateNewQuestionRecord(catalog, chunk, actorEmail, runId));
  }

  for (const question of rewriteTargets) {
    suggestionRecords.push(await generateRewriteRecord(catalog, question, actorEmail, runId));
  }

  const completedAt = Date.now();
  const attemptedItemIds = suggestionRecords.map((record) => record.suggestion.dedupeKey);
  const criticalIssueCount = suggestionRecords.reduce(
    (total, record) =>
      total + record.verifierIssues.filter((issue) => issue.severity === 'critical').length,
    0,
  );
  const warningIssueCount = suggestionRecords.reduce(
    (total, record) =>
      total + record.verifierIssues.filter((issue) => issue.severity === 'warning').length,
    0,
  );
  const run: AiPilotRun = {
    id: runId,
    provider,
    model: ollamaModel,
    actorEmail,
    evaluationSetId,
    attemptedItemIds,
    mode,
    status: 'completed',
    createdAt: new Date(startedAt).toISOString(),
    durationMs: completedAt - startedAt,
    summary: {
      attemptedCount: suggestionRecords.length,
      passedCount: suggestionRecords.filter((item) => item.verifierStatus === 'passed').length,
      failedCount: suggestionRecords.filter((item) => item.verifierStatus === 'failed').length,
      newQuestionCount: suggestionRecords.filter(
        (item) => item.suggestion.suggestionType === 'new_question',
      ).length,
      rewriteCount: suggestionRecords.filter(
        (item) => item.suggestion.suggestionType === 'rewrite',
      ).length,
    },
  };
  const report: AiPilotEvaluationReport = {
    id: `pilot-report-${runId}`,
    evaluationSetId,
    runId,
    provider,
    model: ollamaModel,
    mode,
    createdAt: run.createdAt,
    durationMs: run.durationMs,
    attemptedCount: run.summary.attemptedCount,
    passedCount: run.summary.passedCount,
    failedCount: run.summary.failedCount,
    criticalIssueCount,
    warningIssueCount,
    issueBreakdown: buildIssueBreakdown(suggestionRecords),
    items: suggestionRecords.map(buildEvaluationItemReport),
  };

  return {
    run,
    report,
    suggestions: suggestionRecords,
  };
}
