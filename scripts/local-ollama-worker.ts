import http from 'node:http';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  AiPilotActiveRun,
  AiPilotCompletedResult,
  AiPilotEvaluationSet,
  AiPilotLogEntry,
  AiPilotRunConfig,
  AiPilotRunMode,
  AiPilotTask,
  AiPilotTaskStatus,
  AiProvider,
  LocalOllamaHealth,
  LocalOllamaMetrics,
  SourcePreparationChunk,
} from '../src/types/ai.js';
import type { ContentCatalog, Question } from '../src/types/content.js';
import { getLocalOllamaRuntimeConfig } from '../src/lib/ollamaRuntimeConfig.js';
import {
  buildLocalOllamaPilotCompletedResult,
  runLocalOllamaPilotTask,
  type LocalOllamaPilotTaskInput,
} from '../src/lib/localOllamaPilot.js';

type StartRunPayload = {
  actorEmail: string;
  provider: AiProvider;
  mode: AiPilotRunMode;
  config: AiPilotRunConfig;
  evaluationSet: AiPilotEvaluationSet;
  catalog: ContentCatalog;
  chunks: SourcePreparationChunk[];
  questions: Question[];
};

const execFileAsync = promisify(execFile);
const port = Number(process.env.LOCAL_OLLAMA_WORKER_PORT ?? 4789);
const runtimeConfig = getLocalOllamaRuntimeConfig();
const workerStartedAt = Date.now();
const runStates = new Map<string, AiPilotActiveRun>();
let currentRunId: string | null = null;
let currentAbortController: AbortController | null = null;
let cpuSnapshot = readCpuSnapshot();
let gpuCache: { expiresAt: number; value: LocalOllamaMetrics } | null = null;

function readCpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.irq + cpu.times.idle;
  }

  return { idle, total };
}

function sampleCpuPercent() {
  const nextSnapshot = readCpuSnapshot();
  const idleDiff = nextSnapshot.idle - cpuSnapshot.idle;
  const totalDiff = nextSnapshot.total - cpuSnapshot.total;
  cpuSnapshot = nextSnapshot;

  if (totalDiff <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(((totalDiff - idleDiff) / totalDiff) * 100)));
}

async function sampleGpuMetrics() {
  if (process.platform !== 'win32') {
    return {
      gpuAvailable: false,
      gpuPercent: undefined,
      gpuStatus: 'GPU no disponible en este sistema operativo.',
    };
  }

  try {
    const { stdout } = await execFileAsync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        "(Get-Counter '\\GPU Engine(*)\\Utilization Percentage').CounterSamples | Measure-Object -Property CookedValue -Maximum | Select-Object -ExpandProperty Maximum",
      ],
      { timeout: 3000 },
    );
    const parsed = Number(stdout.trim());

    if (!Number.isFinite(parsed)) {
      return {
        gpuAvailable: false,
        gpuPercent: undefined,
        gpuStatus: 'GPU no disponible.',
      };
    }

    return {
      gpuAvailable: true,
      gpuPercent: Math.max(0, Math.min(100, Math.round(parsed))),
      gpuStatus: 'GPU activa',
    };
  } catch {
    return {
      gpuAvailable: false,
      gpuPercent: undefined,
      gpuStatus: 'GPU no disponible.',
    };
  }
}

async function getMetricsSnapshot(): Promise<LocalOllamaMetrics> {
  const now = Date.now();
  if (gpuCache && gpuCache.expiresAt > now) {
    return {
      ...gpuCache.value,
      timestamp: new Date().toISOString(),
      cpuPercent: sampleCpuPercent(),
    };
  }

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsedPercent = Math.round((usedMemory / totalMemory) * 100);
  const cpuPercent = sampleCpuPercent();
  const gpu = await sampleGpuMetrics();
  const warnings: string[] = [];

  if (cpuPercent >= 85) {
    warnings.push('Carga alta de CPU');
  }
  if (memoryUsedPercent >= 85) {
    warnings.push('Memoria local alta');
  }
  if (gpu.gpuAvailable && (gpu.gpuPercent ?? 0) >= 90) {
    warnings.push('GPU alta');
  }

  const metrics: LocalOllamaMetrics = {
    timestamp: new Date().toISOString(),
    cpuPercent,
    memoryUsedPercent,
    memoryUsedBytes: usedMemory,
    memoryTotalBytes: totalMemory,
    gpuAvailable: gpu.gpuAvailable,
    gpuPercent: gpu.gpuPercent,
    gpuStatus: gpu.gpuStatus,
    warnings,
  };

  gpuCache = {
    expiresAt: now + 5000,
    value: metrics,
  };

  return metrics;
}

async function probeOllama() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${runtimeConfig.baseUrl}/api/tags`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        reachable: false,
        error: `Ollama devolvio ${response.status}.`,
      };
    }

    return {
      reachable: true,
      error: undefined,
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : 'Ollama no responde.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getActiveRunSummary() {
  const currentRun = currentRunId ? runStates.get(currentRunId) ?? null : null;

  if (!currentRun) {
    return null;
  }

  return {
    runId: currentRun.runId,
    status: currentRun.status,
    mode: currentRun.mode,
    progressPercent: currentRun.progressPercent,
    currentItemLabel: currentRun.currentItemLabel,
    currentStep: currentRun.currentStep,
    config: currentRun.config,
  } satisfies LocalOllamaHealth['currentRun'];
}

function getRunState(runId: string) {
  return runStates.get(runId) ?? null;
}

function setRunState(runId: string, nextState: AiPilotActiveRun) {
  runStates.set(runId, nextState);
}

function nowIso() {
  return new Date().toISOString();
}

function buildTaskId(prefix: string, targetId: string) {
  return `${prefix}-${targetId}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function buildQueueTasks(payload: StartRunPayload): LocalOllamaPilotTaskInput[] {
  const chunkTasks = payload.chunks.map((chunk) => ({
    type: 'new_question' as const,
    label: chunk.referenceLabel,
    chunk,
  }));
  const rewriteTasks = payload.questions.map((question) => ({
    type: 'rewrite' as const,
    label: question.sourceReference ?? question.id,
    question,
  }));

  if (payload.mode === 'new_question') {
    return chunkTasks;
  }

  if (payload.mode === 'rewrite') {
    return rewriteTasks;
  }

  return [...chunkTasks, ...rewriteTasks];
}

function toRunTask(task: LocalOllamaPilotTaskInput, status: AiPilotTaskStatus = 'queued'): AiPilotTask {
  return {
    id: task.type === 'new_question' ? buildTaskId('chunk', task.chunk.id) : buildTaskId('rewrite', task.question.id),
    type: task.type,
    targetId: task.type === 'new_question' ? task.chunk.id : task.question.id,
    label: task.label,
    status,
  };
}

function createLogEntry(level: AiPilotLogEntry['level'], message: string, taskId?: string): AiPilotLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: nowIso(),
    level,
    message,
    taskId,
  };
}

function appendLog(run: AiPilotActiveRun, entry: AiPilotLogEntry) {
  return {
    ...run,
    logEntries: [...run.logEntries, entry].slice(-120),
  };
}

function buildInitialRunState(payload: StartRunPayload) {
  const queueTasks = buildQueueTasks(payload);
  const totalItems = queueTasks.length;
  const startedAt = nowIso();
  const runId = `local-beta-${Date.now()}`;

  return {
    runId,
    provider: payload.provider,
    model: runtimeConfig.model,
    mode: payload.mode,
    evaluationSetId: payload.evaluationSet.id,
    config: payload.config,
    status: 'queued',
    startedAt,
    totalItems,
    completedItems: 0,
    currentStep: 'queued',
    progressPercent: 0,
    queuedTasks: queueTasks.map((task) => toRunTask(task)),
    completedTasks: [],
    logEntries: [
      createLogEntry(
        'info',
        `Corrida creada con ${payload.chunks.length} nuevas y ${payload.questions.length} reescrituras.`,
      ),
    ],
  } satisfies AiPilotActiveRun;
}

async function executeRun(payload: StartRunPayload, initialState: AiPilotActiveRun) {
  const abortController = new AbortController();
  currentAbortController = abortController;
  currentRunId = initialState.runId;

  const startedState = appendLog(
    {
      ...initialState,
      status: 'running',
    },
    createLogEntry('info', 'Corrida iniciada.'),
  );
  setRunState(initialState.runId, startedState);

  try {
    const queuedInputs = buildQueueTasks(payload);
    const suggestionRecords: AiPilotCompletedResult['suggestions'] = [];
    const startedAtMs = new Date(initialState.startedAt).getTime();
    const runRuntimeConfig = {
      ...runtimeConfig,
      maxGenerationMs: payload.config.timeoutMs,
      maxItemsPerRun: payload.config.maxItems,
    };

    for (const taskInput of queuedInputs) {
      abortController.signal.throwIfAborted();
      const current = getRunState(initialState.runId) ?? initialState;
      const runningTask = {
        ...toRunTask(taskInput, 'running'),
        startedAt: nowIso(),
      } satisfies AiPilotTask;
      const remainingQueued = current.queuedTasks.filter((task) => task.id !== runningTask.id);

      setRunState(
        initialState.runId,
        appendLog(
          {
            ...current,
            queuedTasks: remainingQueued,
            currentTask: runningTask,
            currentItemLabel: runningTask.label,
            currentStep: 'generating',
          },
          createLogEntry('info', `Procesando ${runningTask.label}.`, runningTask.id),
        ),
      );

      const record = await runLocalOllamaPilotTask(
        payload.catalog,
        payload.actorEmail,
        taskInput,
        initialState.runId,
        runRuntimeConfig,
        abortController.signal,
      );
      suggestionRecords.push(record);

      const criticalCount = record.verifierIssues.filter((issue) => issue.severity === 'critical').length;
      const warningCount = record.verifierIssues.filter((issue) => issue.severity === 'warning').length;
      const completedTask: AiPilotTask = {
        ...runningTask,
        status: record.verifierStatus === 'passed' ? 'completed' : 'failed',
        completedAt: nowIso(),
        verifierStatus: record.verifierStatus,
        criticalCount,
        warningCount,
      };
      const nextCurrent = getRunState(initialState.runId) ?? initialState;
      const completedItems = nextCurrent.completedItems + 1;
      const progressPercent =
        nextCurrent.totalItems > 0 ? Math.round((completedItems / nextCurrent.totalItems) * 100) : 100;

      setRunState(
        initialState.runId,
        appendLog(
          {
            ...nextCurrent,
            completedItems,
            progressPercent,
            currentStep: 'persisting',
            currentTask: undefined,
            completedTasks: [...nextCurrent.completedTasks, completedTask],
          },
          createLogEntry(
            record.verifierStatus === 'passed' ? 'success' : 'warning',
            `${completedTask.label}: ${record.verifierStatus === 'passed' ? 'verificada' : 'con alertas del verificador'}.`,
            completedTask.id,
          ),
        ),
      );
    }

    const result = buildLocalOllamaPilotCompletedResult({
      provider: payload.provider,
      runtimeConfig: runRuntimeConfig,
      actorEmail: payload.actorEmail,
      runId: initialState.runId,
      evaluationSetId: payload.evaluationSet.id,
      mode: payload.mode,
      config: payload.config,
      startedAt: initialState.startedAt,
      durationMs: Date.now() - startedAtMs,
      suggestions: suggestionRecords,
    });

    const current = getRunState(initialState.runId) ?? initialState;
    const completedAt = nowIso();
    const completedState = appendLog(
      {
        ...current,
        status: 'completed',
        completedAt,
        completedItems: result.run.summary.attemptedCount,
        currentItemLabel: result.suggestions[result.suggestions.length - 1]?.suggestion.sourceReference,
        currentStep: 'completed',
        progressPercent: 100,
        result: result satisfies AiPilotCompletedResult,
      },
      createLogEntry('success', 'Corrida completada.'),
    );
    setRunState(initialState.runId, completedState);
  } catch (error) {
    const current = getRunState(initialState.runId) ?? initialState;
    const completedAt = nowIso();
    const isAbort = error instanceof Error && error.name === 'AbortError';

    setRunState(
      initialState.runId,
      appendLog(
        {
          ...current,
          status: isAbort ? 'cancelled' : 'failed',
          completedAt,
          error: isAbort
            ? 'Corrida cancelada por el operador.'
            : error instanceof Error
              ? error.message
              : 'La corrida local fallo.',
        },
        createLogEntry(
          isAbort ? 'warning' : 'error',
          isAbort ? 'Corrida cancelada por el operador.' : error instanceof Error ? error.message : 'La corrida local fallo.',
          current.currentTask?.id,
        ),
      ),
    );
  } finally {
    currentAbortController = null;
  }
}

async function parseJsonBody<T>(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

function writeJson(response: http.ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer(async (request, response) => {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  const pathname = url.pathname;

  try {
    if (method === 'GET' && pathname === '/__local/ollama/health') {
      const ollama = await probeOllama();
      writeJson(response, 200, {
        workerAvailable: true,
        ollamaReachable: ollama.reachable,
        model: runtimeConfig.model,
        baseUrl: runtimeConfig.baseUrl,
        currentRun: getActiveRunSummary(),
        error: ollama.error,
      } satisfies LocalOllamaHealth);
      return;
    }

    if (method === 'GET' && pathname === '/__local/ollama/metrics') {
      writeJson(response, 200, await getMetricsSnapshot());
      return;
    }

    if (method === 'POST' && pathname === '/__local/ollama/runs') {
      if (currentRunId) {
        const currentRun = getRunState(currentRunId);
        if (currentRun && ['queued', 'running'].includes(currentRun.status)) {
          writeJson(response, 409, {
            error: 'Ya existe una corrida local en progreso.',
          });
          return;
        }
      }

      const payload = await parseJsonBody<StartRunPayload>(request);
      const initialState = buildInitialRunState(payload);
      setRunState(initialState.runId, initialState);
      void executeRun(payload, initialState);
      writeJson(response, 202, initialState);
      return;
    }

    const runMatch = pathname.match(/^\/__local\/ollama\/runs\/([^/]+)$/);
    if (method === 'GET' && runMatch) {
      const runState = getRunState(runMatch[1]);
      if (!runState) {
        writeJson(response, 404, { error: 'Corrida local no encontrada.' });
        return;
      }
      writeJson(response, 200, runState);
      return;
    }

    const cancelMatch = pathname.match(/^\/__local\/ollama\/runs\/([^/]+)\/cancel$/);
    if (method === 'POST' && cancelMatch) {
      const runState = getRunState(cancelMatch[1]);
      if (!runState) {
        writeJson(response, 404, { error: 'Corrida local no encontrada.' });
        return;
      }
      if (runState.status !== 'running' && runState.status !== 'queued') {
        writeJson(response, 200, runState);
        return;
      }
      currentAbortController?.abort();
      writeJson(response, 202, {
        ...runState,
        status: 'cancelled',
      } satisfies AiPilotActiveRun);
      return;
    }

    writeJson(response, 404, { error: 'Ruta local no encontrada.' });
  } catch (error) {
    writeJson(response, 500, {
      error: error instanceof Error ? error.message : 'Error interno del worker local.',
    });
  }
});

server.listen(port, '127.0.0.1', () => {
  const uptimeSeconds = Math.round((Date.now() - workerStartedAt) / 1000);
  console.log(
    `Local Ollama worker listening on http://127.0.0.1:${port} (uptime ${uptimeSeconds}s)`,
  );
});
