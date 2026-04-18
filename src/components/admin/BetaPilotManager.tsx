import { useMemo } from 'react';
import { ChevronLeftIcon, FlaskIcon } from './AdminIcons';
import type {
  AiPilotActiveRun,
  AiPilotEvaluationReport,
  AiPilotRunConfig,
  AiPilotRunMode,
  AiPilotSuggestionRecord,
  AiPilotWorkspace,
  LocalOllamaHealth,
  LocalOllamaMetrics,
} from '../../types/ai';

type Props = {
  activeRun: AiPilotActiveRun | null;
  health: LocalOllamaHealth | null;
  isBusy: boolean;
  isEnabled: boolean;
  isListCollapsed: boolean;
  maxItemsPerRun: number;
  metrics: LocalOllamaMetrics | null;
  model: string;
  providerId: string;
  runConfig: AiPilotRunConfig;
  selectedSuggestionId: string | null;
  setupError: string | null;
  timeoutMs: number;
  workspace: AiPilotWorkspace | null;
  onCancelRun: (runId: string) => void;
  onDiscardSuggestion: (id: string) => void;
  onLoadIntoEditor: (record: AiPilotSuggestionRecord) => void;
  onOpenManual: (sourceDocumentId: string, page?: number) => void;
  onOpenReference: (id: string) => void;
  onRefreshRuntime: () => void;
  onRunPilot: (mode: AiPilotRunMode, config: AiPilotRunConfig) => void;
  onSelectSuggestion: (id: string | null) => void;
  onToggleListCollapsed: () => void;
  onUpdateRunConfig: (patch: Partial<AiPilotRunConfig>) => void;
};

function issueClasses(severity: 'critical' | 'warning') {
  return severity === 'critical'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

function runModeLabel(mode: AiPilotRunMode) {
  switch (mode) {
    case 'new_question':
      return 'Nuevas';
    case 'rewrite':
      return 'Reescrituras';
    default:
      return 'Mixto';
  }
}

function runStatusLabel(status: AiPilotActiveRun['status']) {
  switch (status) {
    case 'queued':
      return 'En cola';
    case 'running':
      return 'Corriendo';
    case 'completed':
      return 'Completada';
    case 'failed':
      return 'Fallida';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
}

function runStatusClasses(status: AiPilotActiveRun['status']) {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'failed':
    case 'cancelled':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-blue-200 bg-blue-50 text-blue-700';
  }
}

function formatDelta(value: number) {
  if (value === 0) {
    return '0';
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function formatDurationFromNow(startedAt?: string) {
  if (!startedAt) {
    return '0s';
  }

  const elapsedMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const elapsedSeconds = Math.round(elapsedMs / 1000);

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 GB';
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function groupRecords(records: AiPilotSuggestionRecord[]) {
  return {
    passed: records.filter((record) => record.verifierStatus === 'passed'),
    failed: records.filter((record) => record.verifierStatus === 'failed'),
  };
}

function getTopIssueBreakdown(report: AiPilotEvaluationReport | null) {
  if (!report) {
    return [];
  }

  return Object.entries(report.issueBreakdown)
    .sort((left, right) => (right[1] ?? 0) - (left[1] ?? 0))
    .slice(0, 3);
}

function parsePageFromReference(reference?: string) {
  if (!reference) {
    return undefined;
  }

  const match = reference.match(/pag\.?\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function renderSetupState(isEnabled: boolean, health: LocalOllamaHealth | null, setupError: string | null) {
  if (!isEnabled) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Habilita <code>VITE_ENABLE_LOCAL_ADMIN=true</code>, <code>VITE_ENABLE_ADMIN_BETA_PANEL=true</code> y{' '}
        <code>VITE_ENABLE_LOCAL_OLLAMA=true</code>, luego ejecuta <code>npm run dev:admin-beta</code>.
      </div>
    );
  }

  if (setupError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        {setupError}
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Verificando worker local...
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-slate-900">Worker local</span>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
            health.workerAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}
        >
          {health.workerAvailable ? 'online' : 'offline'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-slate-900">Ollama</span>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
            health.ollamaReachable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {health.ollamaReachable ? 'reachable' : 'unreachable'}
        </span>
      </div>
      <div className="text-xs text-slate-500">
        Base URL: <code>{health.baseUrl}</code>
      </div>
      {health.error && <div className="text-xs text-amber-700">{health.error}</div>}
    </div>
  );
}

function renderVerifierMessage(
  record: AiPilotSuggestionRecord,
  onOpenReference: (id: string) => void,
) {
  return record.verifierIssues.map((issue, index) => {
    const token = issue.referenceTargetId;
    const parts = token ? issue.message.split(token) : [issue.message];

    return (
      <div
        key={`${record.id}-issue-${index}`}
        className={`rounded-xl border p-4 ${issueClasses(issue.severity)}`}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {issue.code.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {issue.severity}
          </span>
        </div>
        <p className="text-sm leading-relaxed">
          {parts[0]}
          {token ? (
            <button
              type="button"
              onClick={() => onOpenReference(token)}
              className="font-semibold text-blue-700 underline underline-offset-2"
            >
              {token}
            </button>
          ) : null}
          {token ? parts.slice(1).join(token) : null}
        </p>
      </div>
    );
  });
}

export function BetaPilotManager({
  activeRun,
  health,
  isBusy,
  isEnabled,
  isListCollapsed,
  maxItemsPerRun,
  metrics,
  model,
  providerId,
  runConfig,
  selectedSuggestionId,
  setupError,
  timeoutMs,
  workspace,
  onCancelRun,
  onDiscardSuggestion,
  onLoadIntoEditor,
  onOpenManual,
  onOpenReference,
  onRefreshRuntime,
  onRunPilot,
  onSelectSuggestion,
  onToggleListCollapsed,
  onUpdateRunConfig,
}: Props) {
  const records = workspace?.suggestions ?? [];
  const grouped = groupRecords(records);
  const selectedSuggestion =
    records.find((record) => record.id === selectedSuggestionId) ?? null;
  const latestRun = workspace?.runs[0] ?? null;
  const latestReport = workspace?.reports[0] ?? null;
  const previousReport =
    workspace?.reports.find(
      (report) =>
        report.id !== latestReport?.id &&
        report.evaluationSetId === latestReport?.evaluationSetId &&
        report.mode === latestReport?.mode,
    ) ?? null;
  const topIssueBreakdown = getTopIssueBreakdown(latestReport);
  const runInFlight = Boolean(activeRun && ['queued', 'running'].includes(activeRun.status));
  const canTriggerRun = isEnabled && health?.workerAvailable && health?.ollamaReachable && !runInFlight && !isBusy;
  const selectedPage = parsePageFromReference(selectedSuggestion?.suggestion.sourceReference);
  const liveLog = activeRun?.logEntries ?? [];
  const queueTasks = useMemo(() => activeRun?.queuedTasks ?? [], [activeRun]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <div
        className={`
          flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200
          ${isListCollapsed ? 'md:w-14' : 'w-full md:w-[360px] lg:w-[400px]'}
          ${selectedSuggestionId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            {!isListCollapsed && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <FlaskIcon size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Beta local Ollama</h2>
                  <p className="text-xs text-slate-500">Consola local, secuencial y fuera del flujo verificado.</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={onToggleListCollapsed}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              {isListCollapsed ? 'Abrir' : 'Plegar'}
            </button>
          </div>

          {!isListCollapsed && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Setup local</h3>
                  <button
                    onClick={onRefreshRuntime}
                    disabled={isBusy || !isEnabled}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    type="button"
                  >
                    Refrescar
                  </button>
                </div>
                {renderSetupState(isEnabled, health, setupError)}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Corridas</h3>
                  <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    {providerId}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-900">Timeout (ms)</span>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={runConfig.timeoutMs}
                      onChange={(event) => onUpdateRunConfig({ timeoutMs: Math.max(1000, Number(event.target.value) || timeoutMs) })}
                      className="w-full rounded border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-900">Max runs</span>
                    <input
                      type="number"
                      min={1}
                      max={maxItemsPerRun}
                      value={runConfig.maxItems}
                      onChange={(event) => onUpdateRunConfig({ maxItems: Math.max(1, Number(event.target.value) || maxItemsPerRun) })}
                      className="w-full rounded border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-900">Nuevas</span>
                    <input
                      type="number"
                      min={0}
                      value={runConfig.newQuestionCount}
                      onChange={(event) => onUpdateRunConfig({ newQuestionCount: Math.max(0, Number(event.target.value) || 0) })}
                      className="w-full rounded border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-slate-900">Reescrituras</span>
                    <input
                      type="number"
                      min={0}
                      value={runConfig.rewriteCount}
                      onChange={(event) => onUpdateRunConfig({ rewriteCount: Math.max(0, Number(event.target.value) || 0) })}
                      className="w-full rounded border border-slate-200 px-3 py-2"
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-2">
                  <button
                    onClick={() => onRunPilot('new_question', runConfig)}
                    disabled={!canTriggerRun}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    type="button"
                  >
                    Lanzar nuevas preguntas
                  </button>
                  <button
                    onClick={() => onRunPilot('rewrite', runConfig)}
                    disabled={!canTriggerRun}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    type="button"
                  >
                    Lanzar reescrituras
                  </button>
                  <button
                    onClick={() => onRunPilot('mixed', runConfig)}
                    disabled={!canTriggerRun}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                  >
                    Ejecutar corrida mixta
                  </button>
                </div>
                {latestRun && (
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-900">Intentos</span>
                      <div>{latestRun.summary.attemptedCount}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Duracion</span>
                      <div>{latestRun.durationMs} ms</div>
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-700">Pasan</span>
                      <div>{latestRun.summary.passedCount}</div>
                    </div>
                    <div>
                      <span className="font-semibold text-rose-700">Fallan</span>
                      <div>{latestRun.summary.failedCount}</div>
                    </div>
                  </div>
                )}
              </div>

              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-900">Resultados</h3>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {records.length}
                  </span>
                </div>
                {records.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No hay resultados Beta todavia. Ejecuta una corrida para inspeccionar el verificador.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {[
                      { title: 'Verificadas', items: grouped.passed },
                      { title: 'Fallidas', items: grouped.failed },
                    ].map((group) =>
                      group.items.length === 0 ? null : (
                        <section key={group.title} className="space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              {group.title}
                            </h4>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {group.items.length}
                            </span>
                          </div>
                          {group.items.map((record) => {
                            const warningCount = record.verifierIssues.filter((issue) => issue.severity === 'warning').length;
                            const criticalCount = record.verifierIssues.filter((issue) => issue.severity === 'critical').length;

                            return (
                              <button
                                key={record.id}
                                onClick={() => onSelectSuggestion(record.id)}
                                className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                                  selectedSuggestionId === record.id
                                    ? 'border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-500'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                }`}
                                type="button"
                              >
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                    {record.suggestion.suggestionType.replace('_', ' ')}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {criticalCount > 0 && (
                                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                        {criticalCount} crit
                                      </span>
                                    )}
                                    {warningCount > 0 && (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                        {warningCount} warn
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-700">
                                  {record.suggestion.prompt || 'Salida sin prompt utilizable'}
                                </p>
                              </button>
                            );
                          })}
                        </section>
                      ),
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {isListCollapsed && (
          <div className="flex flex-1 items-start justify-center bg-slate-50/40 pt-3">
            <button
              type="button"
              onClick={onToggleListCollapsed}
              className="rounded-md border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              &gt;
            </button>
          </div>
        )}
      </div>

      <div
        className={`
          relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-slate-50
          ${selectedSuggestionId ? 'flex' : 'hidden md:flex'}
        `}
      >
        {!selectedSuggestion ? (
          <div className="flex flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
            <div className="mx-auto grid min-h-full w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                      <FlaskIcon size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Consola Beta lista</h2>
                      <p className="text-sm text-slate-500">
                        Configura la corrida, revisa la cola y abre resultados terminados desde la columna izquierda.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resultados</div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">{records.length}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Corrida</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {activeRun ? runStatusLabel(activeRun.status) : latestRun ? 'Ultima completada' : 'Sin ejecutar'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Modelo</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{model}</div>
                    </div>
                  </div>
                </div>

                {latestReport && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">Ultimo reporte</h3>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        {latestReport.mode}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Intentos</div>
                        <div className="mt-1 text-xl font-bold text-slate-900">{latestReport.attemptedCount}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pasan</div>
                        <div className="mt-1 text-xl font-bold text-emerald-700">{latestReport.passedCount}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fallan</div>
                        <div className="mt-1 text-xl font-bold text-rose-700">{latestReport.failedCount}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Issues</div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {latestReport.criticalIssueCount + latestReport.warningIssueCount}
                        </div>
                      </div>
                    </div>
                    {previousReport && (
                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        <div>Delta pasan: <span className="font-semibold text-slate-900">{formatDelta(latestReport.passedCount - previousReport.passedCount)}</span></div>
                        <div>Delta fallan: <span className="font-semibold text-slate-900">{formatDelta(latestReport.failedCount - previousReport.failedCount)}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <aside className="lg:sticky lg:top-4 lg:self-start">
                <div className="space-y-4">
                  {metrics && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">Telemetria local</h3>
                        <span className="text-[10px] font-semibold uppercase text-slate-400">{new Date(metrics.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="font-semibold text-slate-900">CPU</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{metrics.cpuPercent}%</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="font-semibold text-slate-900">RAM</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{metrics.memoryUsedPercent}%</div>
                          <div className="text-[10px] text-slate-500">
                            {formatBytes(metrics.memoryUsedBytes)} / {formatBytes(metrics.memoryTotalBytes)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="font-semibold text-slate-900">GPU</div>
                          <div className="mt-1 text-lg font-bold text-slate-900">
                            {metrics.gpuAvailable ? `${metrics.gpuPercent ?? 0}%` : '--'}
                          </div>
                          <div className="text-[10px] text-slate-500">{metrics.gpuStatus}</div>
                        </div>
                      </div>
                      {metrics.warnings.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {metrics.warnings.map((warning) => (
                            <span key={warning} className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              {warning}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Batch log</h3>
                      {activeRun && (
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${runStatusClasses(activeRun.status)}`}>
                          {runStatusLabel(activeRun.status)}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-xs text-slate-600">
                      {activeRun?.currentTask && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <div className="font-semibold text-blue-900">Actual</div>
                          <div>{activeRun.currentTask.label}</div>
                          <div className="mt-1 text-[11px] text-blue-700">{activeRun.currentStep}</div>
                        </div>
                      )}
                      {queueTasks.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 font-semibold text-slate-900">En espera</div>
                          <div className="space-y-1">
                            {queueTasks.map((task) => (
                              <div key={task.id} className="truncate">{task.label}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {liveLog.length > 0 ? (
                        <div className="max-h-[42vh] space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                          {liveLog.map((entry) => (
                            <div key={entry.id} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900">{entry.level}</span>
                                <span className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="mt-1">{entry.message}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-slate-500">
                          El log se llenara cuando ejecutes una corrida.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <>
            <div className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onSelectSuggestion(null)}
                  className="-ml-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
                  aria-label="Volver a los resultados Beta"
                  type="button"
                >
                  <ChevronLeftIcon size={20} />
                </button>
                <h2 className="hidden text-sm font-semibold text-slate-900 sm:block">
                  Revision Beta
                </h2>
              </div>
              <span
                className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase ${
                  selectedSuggestion.verifierStatus === 'passed'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {selectedSuggestion.verifierStatus === 'passed' ? 'verificada' : 'fallida'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 md:p-6">
              <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Proveedor</span>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{selectedSuggestion.provider}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tipo</span>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedSuggestion.suggestion.suggestionType.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Referencia</span>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedSuggestion.suggestion.sourceReference}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Enunciado propuesto</h3>
                    <p className="text-base font-semibold leading-relaxed text-slate-900">
                      {selectedSuggestion.suggestion.prompt || 'Salida sin prompt utilizable'}
                    </p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Opciones y respuestas</h3>
                      {selectedSuggestion.suggestion.suggestedOptions.length === 0 ? (
                        <p className="text-sm text-slate-500">No hay alternativas validas en este resultado.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedSuggestion.suggestion.suggestedOptions.map((option, index) => {
                            const isCorrect = selectedSuggestion.suggestion.suggestedCorrectAnswers.includes(index);
                            return (
                              <div
                                key={`${selectedSuggestion.id}-${index}`}
                                className={`flex items-start gap-3 rounded-xl border p-4 ${
                                  isCorrect
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {String.fromCharCode(65 + index)}
                                </span>
                                <span className="text-sm font-medium leading-relaxed">{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Grounding</h3>
                        <p className="text-sm leading-relaxed text-slate-700">
                          {selectedSuggestion.suggestion.groundingExcerpt}
                        </p>
                        {selectedSuggestion.suggestion.sourceDocumentId && (
                          <button
                            type="button"
                            onClick={() => onOpenManual(selectedSuggestion.suggestion.sourceDocumentId!, selectedPage)}
                            className="mt-4 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Abrir manual
                          </button>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Rationale</h3>
                        <p className="text-sm leading-relaxed text-slate-700">
                          {selectedSuggestion.suggestion.rationale}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Verificador</h3>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {selectedSuggestion.verifierIssues.length} observaciones
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedSuggestion.verifierIssues.length > 0 ? (
                        renderVerifierMessage(selectedSuggestion, onOpenReference)
                      ) : (
                        <p className="text-sm text-slate-500">Sin observaciones del verificador.</p>
                      )}
                    </div>
                  </div>
                </div>

                <aside className="lg:sticky lg:top-4 lg:self-start">
                  <div className="space-y-4">
                    {metrics && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-slate-900">Telemetria local</h3>
                          <span className="text-[10px] font-semibold uppercase text-slate-400">{new Date(metrics.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="space-y-2 text-xs text-slate-600">
                          <div>CPU: <span className="font-semibold text-slate-900">{metrics.cpuPercent}%</span></div>
                          <div>RAM: <span className="font-semibold text-slate-900">{metrics.memoryUsedPercent}%</span></div>
                          <div>GPU: <span className="font-semibold text-slate-900">{metrics.gpuAvailable ? `${metrics.gpuPercent ?? 0}%` : metrics.gpuStatus}</span></div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">Batch log</h3>
                        {activeRun && (
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${runStatusClasses(activeRun.status)}`}>
                            {runStatusLabel(activeRun.status)}
                          </span>
                        )}
                      </div>
                      <div className="max-h-[42vh] space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        {liveLog.length > 0 ? liveLog.map((entry) => (
                          <div key={entry.id} className="border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900">{entry.level}</span>
                              <span className="text-[10px] text-slate-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="mt-1">{entry.message}</div>
                          </div>
                        )) : (
                          <div>El log se llenara cuando ejecutes una corrida.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="z-20 flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white p-3">
              <button
                onClick={() => onDiscardSuggestion(selectedSuggestion.id)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                type="button"
              >
                Descartar resultado
              </button>
              <button
                onClick={() => onLoadIntoEditor(selectedSuggestion)}
                disabled={selectedSuggestion.verifierStatus !== 'passed'}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                type="button"
              >
                Cargar en editor
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
