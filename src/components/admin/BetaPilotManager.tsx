import { ChevronLeftIcon, FlaskIcon } from './AdminIcons';
import type {
  AiPilotEvaluationReport,
  AiPilotRunMode,
  AiPilotSuggestionRecord,
  AiPilotWorkspace,
} from '../../types/ai';

type Props = {
  isBusy: boolean;
  isEnabled: boolean;
  maxItemsPerRun: number;
  model: string;
  providerId: string;
  selectedSuggestionId: string | null;
  timeoutMs: number;
  workspace: AiPilotWorkspace | null;
  onDiscardSuggestion: (id: string) => void;
  onLoadIntoEditor: (record: AiPilotSuggestionRecord) => void;
  onRunPilot: (mode: AiPilotRunMode) => void;
  onSelectSuggestion: (id: string | null) => void;
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

function formatDelta(value: number) {
  if (value === 0) {
    return '0';
  }

  return value > 0 ? `+${value}` : `${value}`;
}

export function BetaPilotManager({
  isBusy,
  isEnabled,
  maxItemsPerRun,
  model,
  providerId,
  selectedSuggestionId,
  timeoutMs,
  workspace,
  onDiscardSuggestion,
  onLoadIntoEditor,
  onRunPilot,
  onSelectSuggestion,
}: Props) {
  const records = workspace?.suggestions ?? [];
  const grouped = groupRecords(records);
  const selectedSuggestion =
    records.find((record) => record.id === selectedSuggestionId) ?? null;
  const latestRun = workspace?.runs[0] ?? null;
  const evaluationSet = workspace?.evaluationSet ?? null;
  const latestReport = workspace?.reports[0] ?? null;
  const previousReport =
    workspace?.reports.find(
      (report) =>
        report.id !== latestReport?.id &&
        report.evaluationSetId === latestReport?.evaluationSetId &&
        report.mode === latestReport?.mode,
    ) ?? null;
  const topIssueBreakdown = getTopIssueBreakdown(latestReport);

  return (
    <div className="relative flex h-full w-full flex-1 overflow-hidden">
      <div
        className={`
          flex h-full w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-[360px] lg:w-[400px]
          ${selectedSuggestionId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="z-10 shrink-0 space-y-4 border-b border-slate-200 bg-slate-50/80 p-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <FlaskIcon size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Beta local</h2>
                <p className="text-xs text-slate-500">Experimental y aislado del flujo verificado.</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div>
                <dt className="font-semibold text-slate-900">Proveedor</dt>
                <dd>{providerId}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Modelo</dt>
                <dd>{model}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Timeout</dt>
                <dd>{Math.round(timeoutMs / 1000)} s</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">Maximo por corrida</dt>
                <dd>{maxItemsPerRun}</dd>
              </div>
            </dl>
          </div>

          {evaluationSet && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Set de evaluación</h3>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                  {evaluationSet.id}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{evaluationSet.description}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <dt className="font-semibold text-slate-900">Nuevas</dt>
                  <dd>{evaluationSet.newQuestionChunkIds.length}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">Reescrituras</dt>
                  <dd>{evaluationSet.rewriteQuestionIds.length}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Corridas</h3>
              {latestRun && (
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                  {runModeLabel(latestRun.mode)}
                </span>
              )}
            </div>
            {!isEnabled ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Habilita <code>VITE_ENABLE_LOCAL_OLLAMA=true</code> y ejecuta Ollama localmente para usar este panel.
              </div>
            ) : (
              <div className="grid gap-2">
                <button
                  onClick={() => onRunPilot('new_question')}
                  disabled={isBusy}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                >
                  Generar nuevas preguntas
                </button>
                <button
                  onClick={() => onRunPilot('rewrite')}
                  disabled={isBusy}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                >
                  Probar reescrituras
                </button>
                <button
                  onClick={() => onRunPilot('mixed')}
                  disabled={isBusy}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                >
                  Ejecutar corrida mixta
                </button>
              </div>
            )}
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

          {latestReport && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Reporte base</h3>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                  {latestReport.mode}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-900">Intentos</span>
                  <div>{latestReport.attemptedCount}</div>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Issues</span>
                  <div>{latestReport.criticalIssueCount + latestReport.warningIssueCount}</div>
                </div>
                <div>
                  <span className="font-semibold text-emerald-700">Pasan</span>
                  <div>{latestReport.passedCount}</div>
                </div>
                <div>
                  <span className="font-semibold text-rose-700">Fallan</span>
                  <div>{latestReport.failedCount}</div>
                </div>
              </div>
              {topIssueBreakdown.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {topIssueBreakdown.map(([code, count]) => (
                    <span
                      key={code}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                    >
                      {code.replace(/_/g, ' ')}: {count}
                    </span>
                  ))}
                </div>
              )}
              {previousReport && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-900">Delta pasan</span>
                    <div>{formatDelta(latestReport.passedCount - previousReport.passedCount)}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Delta fallan</span>
                    <div>{formatDelta(latestReport.failedCount - previousReport.failedCount)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-2.5">
          {records.length === 0 ? (
            <div className="mt-10 p-4 text-center text-sm text-slate-400">
              No hay resultados Beta todavia. Ejecuta una corrida para inspeccionar el verificador.
            </div>
          ) : (
            <div className="space-y-5">
              {[
                { title: 'Verificadas', items: grouped.passed, tone: 'emerald' },
                { title: 'Fallidas', items: grouped.failed, tone: 'rose' },
              ].map((group) =>
                group.items.length === 0 ? null : (
                  <section key={group.title} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {group.title}
                      </h3>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {group.items.length}
                      </span>
                    </div>
                    {group.items.map((record) => {
                      const warningCount = record.verifierIssues.filter(
                        (issue) => issue.severity === 'warning',
                      ).length;
                      const criticalCount = record.verifierIssues.filter(
                        (issue) => issue.severity === 'critical',
                      ).length;

                      return (
                        <button
                          key={record.id}
                          onClick={() => onSelectSuggestion(record.id)}
                          className={`w-full rounded-xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                            selectedSuggestionId === record.id
                              ? 'border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-500'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
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
                          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                            <span className="truncate">{record.provider}</span>
                            <span className={record.verifierStatus === 'passed' ? 'text-emerald-700' : 'text-rose-700'}>
                              {record.verifierStatus === 'passed' ? 'Pasa' : 'Falla'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </section>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={`
          relative flex h-full min-w-0 flex-1 flex-col bg-slate-50
          ${selectedSuggestionId ? 'flex' : 'hidden md:flex'}
        `}
      >
        {!selectedSuggestion ? (
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-400">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl">
              <FlaskIcon size={26} />
            </div>
            <p className="font-medium text-slate-600">Selecciona un resultado Beta para revisar</p>
            <p className="mt-1 max-w-sm text-sm">
              Aqui veras el output del modelo, el grounding, las alertas del verificador y el acceso seguro al editor.
            </p>
          </div>
        ) : (
          <>
            <div className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onSelectSuggestion(null)}
                  className="-ml-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 md:hidden"
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

            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 md:p-8">
              <div className="mx-auto max-w-3xl space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Proveedor
                    </span>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{selectedSuggestion.provider}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Tipo
                    </span>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedSuggestion.suggestion.suggestionType.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Referencia
                    </span>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedSuggestion.suggestion.sourceReference}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Enunciado propuesto
                  </h3>
                  <p className="text-base font-semibold leading-relaxed text-slate-900">
                    {selectedSuggestion.suggestion.prompt || 'Salida sin prompt utilizable'}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Opciones y respuestas
                    </h3>
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
                                  isCorrect
                                    ? 'bg-emerald-200 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
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
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Grounding
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-700">
                        {selectedSuggestion.suggestion.groundingExcerpt}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Rationale
                      </h3>
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
                    {selectedSuggestion.verifierIssues.map((issue, index) => (
                      <div
                        key={`${selectedSuggestion.id}-issue-${index}`}
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
                        <p className="text-sm leading-relaxed">{issue.message}</p>
                      </div>
                    ))}
                    {selectedSuggestion.verifierIssues.length === 0 && (
                      <p className="text-sm text-slate-500">Sin observaciones del verificador.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="z-20 flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white p-3">
              <button
                onClick={() => onDiscardSuggestion(selectedSuggestion.id)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                type="button"
              >
                Descartar resultado
              </button>
              <button
                onClick={() => onLoadIntoEditor(selectedSuggestion)}
                disabled={selectedSuggestion.verifierStatus !== 'passed'}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-300"
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
