import {
  ChevronLeftIcon,
  AdminButton,
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminTooltip,
  CloseIcon,
} from './index';
import { getSuggestionStatusColor } from './types';
import type { EditorialDiagnostic } from '../../lib/editorialDiagnostics';
import type { Chapter, Question, SourceDocument } from '../../types/content';
import type { AiSuggestion, AiSuggestionStatus } from '../../types/ai';

type Props = {
  filteredSuggestions: AiSuggestion[];
  diagnosticsBySuggestionId: Record<string, EditorialDiagnostic[]>;
  isBusy: boolean;
  isListCollapsed: boolean;
  onGenerateSuggestions: () => void;
  onLoadSuggestionIntoEditor: (suggestion: AiSuggestion) => void;
  onOpenManual: (sourceDocumentId: string, page?: number) => void;
  onOpenReference: (id: string) => void;
  onCloseReference: () => void;
  onSelectSuggestion: (id: string | null) => void;
  onToggleListCollapsed: () => void;
  onTransitionSuggestion: (id: string, status: AiSuggestionStatus, msg: string) => void;
  referenceChapter: Chapter | null;
  referenceQuestion: Question | null;
  referenceSourceDocument: SourceDocument | null;
  selectedSuggestion: AiSuggestion | null;
  selectedSuggestionId: string | null;
};

function parsePageFromReference(reference?: string) {
  if (!reference) {
    return undefined;
  }

  const match = reference.match(/pag\.?\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function renderDiagnosticDetail(
  diagnostic: EditorialDiagnostic,
  onOpenReference: (id: string) => void,
) {
  if (!diagnostic.referenceTargetId) {
    return <p className="mt-1 text-sm leading-relaxed text-neutral-700">{diagnostic.detail}</p>;
  }

  const token = diagnostic.referenceTargetId;
  const parts = diagnostic.detail.split(token);

  return (
    <p className="mt-1 text-sm leading-relaxed text-neutral-700">
      {parts[0]}
      <button
        type="button"
        onClick={() => onOpenReference(token)}
        className="font-semibold text-blue-700 underline underline-offset-2"
      >
        {token}
      </button>
      {parts.slice(1).join(token)}
    </p>
  );
}

export function AiQueueManager({
  filteredSuggestions,
  diagnosticsBySuggestionId,
  isBusy,
  isListCollapsed,
  onGenerateSuggestions,
  onLoadSuggestionIntoEditor,
  onOpenManual,
  onOpenReference,
  onCloseReference,
  onSelectSuggestion,
  onToggleListCollapsed,
  onTransitionSuggestion,
  referenceChapter,
  referenceQuestion,
  referenceSourceDocument,
  selectedSuggestion,
  selectedSuggestionId,
}: Props) {
  const selectedDiagnostics = selectedSuggestion
    ? diagnosticsBySuggestionId[selectedSuggestion.id] ?? []
    : [];
  const selectedPage = parsePageFromReference(selectedSuggestion?.sourceReference);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <div
        className={`
          flex h-full shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200
          ${isListCollapsed ? 'md:w-14' : 'w-full md:w-[340px] lg:w-[380px]'}
          ${selectedSuggestionId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="z-10 shrink-0 border-b border-neutral-200 bg-neutral-50/80 p-4">
          <div className="flex items-center justify-between gap-2">
            {!isListCollapsed && (
              <div>
                <h2 className="text-sm font-extrabold tracking-tight text-neutral-900">Sugerencias AI</h2>
                <p className="mt-0.5 text-[11px] font-medium text-neutral-600">
                  {filteredSuggestions.length} en cola
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              {!isListCollapsed && (
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={onGenerateSuggestions}
                  disabled={isBusy}
                >
                  Generar mas
                </AdminButton>
              )}
              <button
                type="button"
                onClick={onToggleListCollapsed}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                {isListCollapsed ? 'Abrir' : 'Plegar'}
              </button>
            </div>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto bg-neutral-50/30 ${isListCollapsed ? 'p-1.5' : 'space-y-1.5 p-2.5'}`}>
          {isListCollapsed ? (
            <div className="flex h-full items-start justify-center pt-3">
              <button
                type="button"
                onClick={onToggleListCollapsed}
                className="rounded-md border border-neutral-200 bg-white px-2 py-2 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                &gt;
              </button>
            </div>
          ) : (
            <>
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
                      variant="default"
                      padding="compact"
                      className={`cursor-pointer border-2 transition-all ${
                        selectedSuggestionId === suggestion.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <AdminBadge variant="primary" size="xs">
                          {suggestion.suggestionType.replace('_', ' ')}
                        </AdminBadge>
                        <div className="flex items-center gap-2">
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
                          <AdminTooltip label="Este porcentaje representa la confianza estimada del modelo en el borrador sugerido. No es puntaje del verificador ni una senal de publicacion.">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-[11px] font-extrabold text-neutral-700">
                              {Math.round(suggestion.confidence * 100)}%
                            </span>
                          </AdminTooltip>
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
                  message="No hay sugerencias pendientes. Genera nuevas propuestas o vuelve mas tarde."
                  action={{
                    label: 'Generar ahora',
                    onClick: onGenerateSuggestions,
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div
        className={`
          relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-slate-50
          ${selectedSuggestionId ? 'flex' : 'hidden md:flex'}
        `}
      >
        {!selectedSuggestion ? (
          <AdminEmptyState
            title="Selecciona una sugerencia"
            message="Aqui veras el prompt propuesto, la fundamentacion, las opciones sugeridas y las alertas de calidad."
          />
        ) : (
          <>
            <div className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 shadow-sm">
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
                  Revision automatica
                </h2>
              </div>
              <AdminBadge variant="neutral" size="xs">
                {selectedSuggestion.status}
              </AdminBadge>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-50/30 p-4 md:p-8">
              <div className={`mx-auto space-y-6 ${referenceQuestion ? 'max-w-7xl' : 'max-w-4xl'}`}>
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
                        {renderDiagnosticDetail(diagnostic, onOpenReference)}
                      </AdminCard>
                    ))}
                  </div>
                )}

                <div className={`grid gap-4 ${referenceQuestion ? 'xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)]' : ''}`}>
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                      <AdminCard padding="standard">
                        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                          Enunciado propuesto
                        </h3>
                        <p className="text-base font-semibold leading-relaxed text-neutral-900">
                          {selectedSuggestion.prompt}
                        </p>
                      </AdminCard>

                      <AdminCard variant="subtle" padding="standard">
                        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                          Grounding
                        </h3>
                        <p className="text-sm leading-relaxed text-neutral-700">
                          {selectedSuggestion.groundingExcerpt}
                        </p>
                        <div className="mt-4 space-y-2 text-xs text-neutral-600">
                          <div className="font-semibold text-neutral-900">
                            {selectedSuggestion.sourceReference}
                          </div>
                          {selectedSuggestion.sourceDocumentId && (
                            <button
                              type="button"
                              onClick={() => onOpenManual(selectedSuggestion.sourceDocumentId!, selectedPage)}
                              className="rounded border border-neutral-200 bg-white px-3 py-1.5 font-semibold text-neutral-700 hover:bg-neutral-100"
                            >
                              Abrir manual
                            </button>
                          )}
                        </div>
                      </AdminCard>
                    </div>

                    {selectedSuggestion.rationale && (
                      <AdminCard variant="subtle" padding="standard">
                        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                          Fundamentacion de AI
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

                  {referenceQuestion ? (
                    <AdminCard padding="standard" className="space-y-4 self-start xl:sticky xl:top-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Referencia
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-slate-900">
                            {referenceQuestion.id}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={onCloseReference}
                          className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200"
                          aria-label="Cerrar comparacion"
                        >
                          <CloseIcon size={18} />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Capitulo</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {referenceChapter
                              ? `${referenceChapter.code} - ${referenceChapter.title}`
                              : referenceQuestion.chapterId}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fuente</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {referenceQuestion.sourceReference ?? `Pag. ${referenceQuestion.sourcePage}`}
                          </div>
                          {referenceSourceDocument ? (
                            <div className="mt-1 text-xs text-slate-500">{referenceSourceDocument.title}</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enunciado</div>
                        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">
                          {referenceQuestion.prompt}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Opciones</div>
                        <div className="mt-3 space-y-2">
                          {referenceQuestion.options.map((option) => (
                            <div
                              key={option.id}
                              className={`rounded-lg border p-3 text-sm ${
                                option.isCorrect
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                  : 'border-slate-200 bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="mr-2 font-bold">{option.label}.</span>
                              {option.text}
                            </div>
                          ))}
                        </div>
                      </div>

                      {referenceQuestion.publicExplanation || referenceQuestion.explanation ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Explicacion</div>
                          <p className="mt-2 text-sm leading-relaxed text-slate-700">
                            {referenceQuestion.publicExplanation ?? referenceQuestion.explanation}
                          </p>
                        </div>
                      ) : null}
                    </AdminCard>
                  ) : null}
                </div>
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
