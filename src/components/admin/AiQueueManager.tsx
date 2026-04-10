import { ChevronLeftIcon } from './AdminIcons';
import { getSuggestionStatusColor } from './types';
import type { EditorialDiagnostic } from '../../lib/editorialDiagnostics';
import type { AiSuggestion, AiSuggestionStatus } from '../../types/ai';

type Props = {
  filteredSuggestions: AiSuggestion[];
  diagnosticsBySuggestionId: Record<string, EditorialDiagnostic[]>;
  isBusy: boolean;
  onGenerateSuggestions: () => void;
  onLoadSuggestionIntoEditor: (suggestion: AiSuggestion) => void;
  onSelectSuggestion: (id: string | null) => void;
  onTransitionSuggestion: (id: string, status: AiSuggestionStatus, msg: string) => void;
  selectedSuggestion: AiSuggestion | null;
  selectedSuggestionId: string | null;
};

function getSeverityClasses(severity: EditorialDiagnostic['severity']) {
  return severity === 'critical'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

export function AiQueueManager({
  filteredSuggestions,
  diagnosticsBySuggestionId,
  isBusy,
  onGenerateSuggestions,
  onLoadSuggestionIntoEditor,
  onSelectSuggestion,
  onTransitionSuggestion,
  selectedSuggestion,
  selectedSuggestionId,
}: Props) {
  const selectedDiagnostics = selectedSuggestion
    ? diagnosticsBySuggestionId[selectedSuggestion.id] ?? []
    : [];

  return (
    <div className="relative flex h-full w-full flex-1 overflow-hidden">
      <div
        className={`
          flex h-full w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-[340px] lg:w-[380px]
          ${selectedSuggestionId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 p-4">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              Sugerencias AI
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">
              {filteredSuggestions.length} en cola
            </p>
          </div>
          <button
            onClick={onGenerateSuggestions}
            disabled={isBusy}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            Generar más
          </button>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto bg-slate-50/30 p-2.5">
          {filteredSuggestions.map((suggestion) => {
            const diagnostics = diagnosticsBySuggestionId[suggestion.id] ?? [];
            const hasCritical = diagnostics.some((item) => item.severity === 'critical');

            return (
              <button
                key={suggestion.id}
                onClick={() => onSelectSuggestion(suggestion.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 ${
                  selectedSuggestionId === suggestion.id
                    ? 'border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded border border-indigo-100 bg-indigo-100/50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                    {suggestion.suggestionType.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    {diagnostics.length > 0 && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          hasCritical
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                        title={`${diagnostics.length} alertas`}
                      >
                        {diagnostics.length}
                      </span>
                    )}
                    <span className="rounded border bg-slate-50 px-1 text-[10px] font-mono text-slate-400">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${getSuggestionStatusColor(suggestion.status)}`}
                      title={suggestion.status}
                    />
                  </div>
                </div>
                <p
                  className={`line-clamp-3 text-sm leading-relaxed ${
                    selectedSuggestionId === suggestion.id
                      ? 'font-semibold text-indigo-950'
                      : 'font-medium text-slate-700'
                  }`}
                >
                  {suggestion.prompt}
                </p>
              </button>
            );
          })}
          {filteredSuggestions.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">
              No hay sugerencias pendientes. Genera nuevas propuestas o vuelve más tarde.
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
              AI
            </div>
            <p className="font-medium text-slate-600">Selecciona una sugerencia para revisar</p>
            <p className="mt-1 max-w-sm text-sm">
              Aquí verás el prompt propuesto, la fundamentación, las opciones sugeridas y las alertas de calidad.
            </p>
          </div>
        ) : (
          <>
            <div className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onSelectSuggestion(null)}
                  className="-ml-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 md:hidden"
                  aria-label="Volver a la cola AI"
                  type="button"
                >
                  <ChevronLeftIcon size={20} />
                </button>
                <h2 className="hidden text-sm font-semibold text-slate-900 sm:block">
                  Revisión automática
                </h2>
              </div>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">
                {selectedSuggestion.status}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 md:p-8">
              <div className="mx-auto max-w-3xl space-y-6">
                {selectedDiagnostics.length > 0 && (
                  <div className="space-y-3">
                    {selectedDiagnostics.map((diagnostic) => (
                      <div
                        key={diagnostic.id}
                        className={`rounded-xl border p-4 ${getSeverityClasses(diagnostic.severity)}`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {diagnostic.category.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {diagnostic.severity}
                          </span>
                        </div>
                        <p className="text-sm font-semibold">{diagnostic.title}</p>
                        <p className="mt-1 text-sm leading-relaxed">{diagnostic.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Enunciado propuesto
                  </h3>
                  <p className="text-base font-semibold leading-relaxed text-slate-900">
                    {selectedSuggestion.prompt}
                  </p>
                </div>

                {selectedSuggestion.rationale && (
                  <div className="rounded-xl border border-slate-200 bg-slate-100/50 p-5">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Fundamentación de AI
                    </h3>
                    <p className="text-sm italic leading-relaxed text-slate-700">
                      "{selectedSuggestion.rationale}"
                    </p>
                  </div>
                )}

                {selectedSuggestion.suggestedOptions?.length > 0 && (
                  <div>
                    <h3 className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Opciones generadas
                    </h3>
                    <div className="space-y-2">
                      {selectedSuggestion.suggestedOptions.map((option, index) => {
                        const isCorrect =
                          selectedSuggestion.suggestedCorrectAnswers.includes(index);
                        return (
                          <div
                            key={index}
                            className={`flex items-start space-x-3 rounded-xl border p-4 shadow-sm ${
                              isCorrect
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                isCorrect
                                  ? 'bg-emerald-200 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className={`mt-0.5 text-sm ${isCorrect ? 'font-semibold' : 'font-medium'}`}>
                              {option}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="z-20 flex shrink-0 justify-end space-x-2 border-t border-slate-200 bg-white p-3">
              <button
                onClick={() =>
                  onTransitionSuggestion(selectedSuggestion.id, 'deferred', 'Postergada')
                }
                disabled={isBusy}
                className="hidden rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:block"
              >
                Postergar
              </button>
              <button
                onClick={() =>
                  onTransitionSuggestion(selectedSuggestion.id, 'rejected', 'Rechazada')
                }
                disabled={isBusy}
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
              >
                Rechazar
              </button>
              <button
                onClick={() => onLoadSuggestionIntoEditor(selectedSuggestion)}
                disabled={isBusy}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
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
