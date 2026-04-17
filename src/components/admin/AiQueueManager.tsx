import { ChevronLeftIcon, AdminButton, AdminBadge, AdminCard, AdminEmptyState } from './index';
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

// Severity classes now handled by AdminCard + AdminBadge

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
          flex h-full w-full shrink-0 flex-col border-r border-neutral-200 bg-white md:w-[340px] lg:w-[380px]
          ${selectedSuggestionId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-50/80 p-4">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-neutral-900">
              Sugerencias AI
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-600">
              {filteredSuggestions.length} en cola
            </p>
          </div>
          <AdminButton
            variant="primary"
            size="sm"
            onClick={onGenerateSuggestions}
            disabled={isBusy}
          >
            Generar más
          </AdminButton>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto bg-neutral-50/30 p-2.5">
          {filteredSuggestions.map((suggestion) => {
            const diagnostics = diagnosticsBySuggestionId[suggestion.id] ?? [];
            const hasCritical = diagnostics.some((item) => item.severity === 'critical');

            return (
              <button
                key={suggestion.id}
                onClick={() => onSelectSuggestion(suggestion.id)}
                className="w-full text-left"
                type="button"
              >
                <AdminCard
                  variant={selectedSuggestionId === suggestion.id ? 'default' : 'default'}
                  padding="compact"
                  className={`cursor-pointer border-2 transition-all ${
                    selectedSuggestionId === suggestion.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <AdminBadge variant="primary" size="xs">
                      {suggestion.suggestionType.replace('_', ' ')}
                    </AdminBadge>
                    <div className="flex items-center space-x-2">
                      {diagnostics.length > 0 && (
                        <div title={`${diagnostics.length} alertas`}>
                          <AdminBadge
                            variant={hasCritical ? 'warning' : 'warning'}
                            size="xs"
                          >
                            {diagnostics.length}
                          </AdminBadge>
                        </div>
                      )}
                      <code className="rounded border bg-neutral-100 px-1 text-[10px] font-mono text-neutral-600">
                        {Math.round(suggestion.confidence * 100)}%
                      </code>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${getSuggestionStatusColor(suggestion.status)}`}
                        title={suggestion.status}
                        aria-label={`Estado: ${suggestion.status}`}
                      />
                    </div>
                  </div>
                  <p
                    className={`line-clamp-3 text-sm leading-relaxed ${
                      selectedSuggestionId === suggestion.id
                        ? 'font-semibold text-neutral-900'
                        : 'font-medium text-neutral-700'
                    }`}
                  >
                    {suggestion.prompt}
                  </p>
                </AdminCard>
              </button>
            );
          })}
          {filteredSuggestions.length === 0 && (
            <AdminEmptyState
              title="Sin sugerencias"
              message="No hay sugerencias pendientes. Genera nuevas propuestas o vuelve más tarde."
              action={{
                label: 'Generar ahora',
                onClick: onGenerateSuggestions,
              }}
            />
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
          <AdminEmptyState
            title="Selecciona una sugerencia"
            message="Aquí verás el prompt propuesto, la fundamentación, las opciones sugeridas y las alertas de calidad."
          />
        ) : (
          <>
            <div className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 shadow-sm" style={{ display: 'flex' }}>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onSelectSuggestion(null)}
                  className="-ml-2 rounded-md p-2 text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 md:hidden"
                  aria-label="Volver a la cola AI"
                  type="button"
                >
                  <ChevronLeftIcon size={20} />
                </button>
                <h2 className="hidden text-sm font-semibold text-neutral-900 sm:block">
                  Revisión automática
                </h2>
              </div>
              <AdminBadge variant="neutral" size="xs">
                {selectedSuggestion.status}
              </AdminBadge>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-50/30 p-4 md:p-8">
              <div className="mx-auto max-w-3xl space-y-6">
                {selectedDiagnostics.length > 0 && (
                  <div className="space-y-3">
                    {selectedDiagnostics.map((diagnostic) => (
                      <AdminCard
                        key={diagnostic.id}
                        variant="subtle"
                        padding="standard"
                        className="border-l-4 border-l-warning-600"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                            {diagnostic.category.replace('_', ' ')}
                          </span>
                          <AdminBadge variant="warning" size="xs">
                            {diagnostic.severity}
                          </AdminBadge>
                        </div>
                        <p className="text-sm font-semibold text-neutral-900">{diagnostic.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-700">{diagnostic.detail}</p>
                      </AdminCard>
                    ))}
                  </div>
                )}

                <AdminCard padding="standard">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Enunciado propuesto
                  </h3>
                  <p className="text-base font-semibold leading-relaxed text-neutral-900">
                    {selectedSuggestion.prompt}
                  </p>
                </AdminCard>

                {selectedSuggestion.rationale && (
                  <AdminCard variant="subtle" padding="standard">
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                      Fundamentación de AI
                    </h3>
                    <p className="text-sm italic leading-relaxed text-neutral-800">
                      "{selectedSuggestion.rationale}"
                    </p>
                  </AdminCard>
                )}

                {selectedSuggestion.suggestedOptions?.length > 0 && (
                  <div>
                    <h3 className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-neutral-700">
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
                                ? 'border-success-300 bg-success-50 text-success-900'
                                : 'border-neutral-200 bg-white text-neutral-700'
                            }`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                isCorrect
                                  ? 'bg-success-300 text-success-900'
                                  : 'bg-neutral-100 text-neutral-600'
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

            <div className="z-20 flex shrink-0 justify-end space-x-2 border-t border-neutral-200 bg-white p-3">
              <AdminButton
                variant="outline"
                size="sm"
                onClick={() =>
                  onTransitionSuggestion(selectedSuggestion.id, 'deferred', 'Postergada')
                }
                disabled={isBusy}
                className="hidden sm:block"
              >
                Postergar
              </AdminButton>
              <AdminButton
                variant="danger"
                size="sm"
                onClick={() =>
                  onTransitionSuggestion(selectedSuggestion.id, 'rejected', 'Rechazada')
                }
                disabled={isBusy}
              >
                Rechazar
              </AdminButton>
              <AdminButton
                variant="primary"
                size="sm"
                onClick={() => onLoadSuggestionIntoEditor(selectedSuggestion)}
                disabled={isBusy}
              >
                Cargar en editor
              </AdminButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
