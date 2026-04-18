import type { ContentCatalog, Question } from '../types/content.js';
import type {
  AiPilotEvaluationSet,
  AiPilotRunConfig,
  SourcePreparationChunk,
} from '../types/ai.js';

export const AI_PILOT_BASELINE_EVALUATION_SET: AiPilotEvaluationSet = {
  id: 'pilot-baseline-v1',
  title: 'Baseline local 5E v1',
  description:
    'Set fijo para comparar corridas locales de Ollama sobre dos prompts nuevos y dos reescrituras ya publicadas.',
  newQuestionChunkIds: ['prep-system-safe-components', 'prep-convivencia-vial-space'],
  rewriteQuestionIds: ['week1-q01', 'import-chapter-2-q001'],
};

function resolveByOrderedIds<T extends { id: string }>(
  items: T[],
  orderedIds: string[],
  kind: string,
) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const resolved = orderedIds.map((id) => byId.get(id) ?? null);
  const missingIds = orderedIds.filter((_, index) => resolved[index] === null);

  if (missingIds.length > 0) {
    throw new Error(`Faltan ${kind} del set de evaluación: ${missingIds.join(', ')}`);
  }

  return resolved.filter((item): item is T => item !== null);
}

export function resolveAiPilotEvaluationTargets(
  catalog: ContentCatalog,
  sourcePreparation: SourcePreparationChunk[],
  evaluationSet: AiPilotEvaluationSet = AI_PILOT_BASELINE_EVALUATION_SET,
): {
  evaluationSet: AiPilotEvaluationSet;
  chunks: SourcePreparationChunk[];
  questions: Question[];
} {
  return {
    evaluationSet,
    chunks: resolveByOrderedIds(
      sourcePreparation,
      evaluationSet.newQuestionChunkIds,
      'chunks',
    ),
    questions: resolveByOrderedIds(
      catalog.questions,
      evaluationSet.rewriteQuestionIds,
      'preguntas',
    ),
  };
}

export function buildAiPilotExecutionTargets(
  catalog: ContentCatalog,
  sourcePreparation: SourcePreparationChunk[],
  config: AiPilotRunConfig,
  evaluationSet: AiPilotEvaluationSet = AI_PILOT_BASELINE_EVALUATION_SET,
): {
  evaluationSet: AiPilotEvaluationSet;
  chunks: SourcePreparationChunk[];
  questions: Question[];
} {
  const resolved = resolveAiPilotEvaluationTargets(catalog, sourcePreparation, evaluationSet);
  const maxItems = Math.max(1, config.maxItems);
  const newQuestionCount = Math.max(0, Math.min(config.newQuestionCount, resolved.chunks.length));
  const rewriteCount = Math.max(0, Math.min(config.rewriteCount, resolved.questions.length));

  const boundedChunks = resolved.chunks.slice(0, Math.min(newQuestionCount, maxItems));
  const remaining = Math.max(0, maxItems - boundedChunks.length);
  const boundedQuestions = resolved.questions.slice(0, Math.min(rewriteCount, remaining));

  return {
    evaluationSet: resolved.evaluationSet,
    chunks: boundedChunks,
    questions: boundedQuestions,
  };
}
