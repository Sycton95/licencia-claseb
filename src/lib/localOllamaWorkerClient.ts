import type { ContentCatalog, Question } from '../types/content.js';
import type {
  AiPilotActiveRun,
  AiPilotEvaluationSet,
  AiPilotRunConfig,
  AiPilotRunMode,
  AiProvider,
  LocalOllamaHealth,
  LocalOllamaMetrics,
  SourcePreparationChunk,
} from '../types/ai.js';

export type StartRunPayload = {
  actorEmail: string;
  provider: AiProvider;
  mode: AiPilotRunMode;
  config: AiPilotRunConfig;
  evaluationSet: AiPilotEvaluationSet;
  catalog: ContentCatalog;
  chunks: SourcePreparationChunk[];
  questions: Question[];
};

async function requestLocalWorker<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const rawText = await response.text();
  const payload = rawText ? (JSON.parse(rawText) as TResponse & { error?: string }) : ({} as TResponse & { error?: string });

  if (!response.ok) {
    throw new Error(payload.error ?? `La operacion local fallo con ${response.status}.`);
  }

  return payload;
}

export async function getLocalOllamaWorkerHealth() {
  return requestLocalWorker<LocalOllamaHealth>('/__local/ollama/health');
}

export async function getLocalOllamaWorkerMetrics() {
  return requestLocalWorker<LocalOllamaMetrics>('/__local/ollama/metrics');
}

export async function startLocalOllamaWorkerRun(payload: StartRunPayload) {
  return requestLocalWorker<AiPilotActiveRun>('/__local/ollama/runs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getLocalOllamaWorkerRun(runId: string) {
  return requestLocalWorker<AiPilotActiveRun>(`/__local/ollama/runs/${runId}`);
}

export async function cancelLocalOllamaWorkerRun(runId: string) {
  return requestLocalWorker<AiPilotActiveRun>(`/__local/ollama/runs/${runId}/cancel`, {
    method: 'POST',
  });
}
