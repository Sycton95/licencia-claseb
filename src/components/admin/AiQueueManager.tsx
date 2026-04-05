import type { AiSuggestion, AiSuggestionStatus } from '../../types/ai';
import { ChevronLeftIcon } from './AdminIcons';
import {
  getSuggestionStatusDotClass,
  getSuggestionStatusLabel,
  getSuggestionTypeLabel,
} from './types';

type AiQueueManagerProps = {
  aiSummary: {
    total: number;
    pending: number;
    accepted: number;
    applied: number;
    rejected: number;
    deferred: number;
    flags: number;
    coverageGaps: number;
  } | null;
  catalogChapterOptions: Array<{ id: string; code: string }>;
  catalogSourceOptions: Array<{ id: string; title: string }>;
  filteredSuggestions: AiSuggestion[];
  isBusy: boolean;
  onClearSelection: () => void;
  onCreateDraftFromSuggestion: (suggestion: AiSuggestion) => void;
  onGenerateSuggestions: () => void;
  onLoadSuggestionIntoEditor: (suggestion: AiSuggestion) => void;
  onSelectSuggestion: (suggestionId: string) => void;
  onTransitionSuggestion: (
    suggestionId: string,
    status: AiSuggestionStatus,
    successMessage: string,
  ) => void;
  selectedSuggestion: AiSuggestion | null;
  selectedSuggestionId: string | null;
  setSuggestionChapterFilter: (value: 'all' | string) => void;
  setSuggestionSourceFilter: (value: 'all' | string) => void;
  setSuggestionStatusFilter: (value: 'all' | AiSuggestionStatus) => void;
  setSuggestionTypeFilter: (value: 'all' | AiSuggestion['suggestionType']) => void;
  suggestionChapterFilter: 'all' | string;
  suggestionSourceFilter: 'all' | string;
  suggestionStatusFilter: 'all' | AiSuggestionStatus;
  suggestionTypeFilter: 'all' | AiSuggestion['suggestionType'];
};

export function AiQueueManager({
  aiSummary,
  catalogChapterOptions,
  catalogSourceOptions,
  filteredSuggestions,
  isBusy,
  onClearSelection,
  onCreateDraftFromSuggestion,
  onGenerateSuggestions,
  onLoadSuggestionIntoEditor,
  onSelectSuggestion,
  onTransitionSuggestion,
  selectedSuggestion,
  selectedSuggestionId,
  setSuggestionChapterFilter,
  setSuggestionSourceFilter,
  setSuggestionStatusFilter,
  setSuggestionTypeFilter,
  suggestionChapterFilter,
  suggestionSourceFilter,
  suggestionStatusFilter,
  suggestionTypeFilter,
}: AiQueueManagerProps) {
  return (
    <section className="admin-master-detail">
      <div className={selectedSuggestionId ? 'admin-master-detail__master admin-master-detail__master--hidden-mobile' : 'admin-master-detail__master'}>
        <section className="panel admin-surface admin-pane">
          <div className="admin-pane__head">
            <div>
              <span className="eyebrow">Sugerencias AI</span>
              <h3 className="section-title">Cola privada</h3>
            </div>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={onGenerateSuggestions}
              disabled={isBusy}
            >
              Actualizar sugerencias
            </button>
          </div>

          {aiSummary && (
            <div className="admin-summary-grid admin-summary-grid--tight">
              <article className="admin-summary-card">
                <small>Pendientes</small>
                <strong>{aiSummary.pending}</strong>
              </article>
              <article className="admin-summary-card">
                <small>Aceptadas</small>
                <strong>{aiSummary.accepted}</strong>
              </article>
              <article className="admin-summary-card admin-summary-card--warning">
                <small>Flags</small>
                <strong>{aiSummary.flags}</strong>
              </article>
              <article className="admin-summary-card">
                <small>Brechas</small>
                <strong>{aiSummary.coverageGaps}</strong>
              </article>
            </div>
          )}

          <div className="admin-filter-row">
            <button type="button" className="admin-chip-button" onClick={() => setSuggestionTypeFilter('all')}>
              Todas
            </button>
            <button type="button" className="admin-chip-button" onClick={() => setSuggestionTypeFilter('new_question')}>
              Nuevas
            </button>
            <button type="button" className="admin-chip-button" onClick={() => setSuggestionTypeFilter('rewrite')}>
              Rewrites
            </button>
            <button type="button" className="admin-chip-button" onClick={() => setSuggestionTypeFilter('flag')}>
              Flags
            </button>
            <button type="button" className="admin-chip-button" onClick={() => setSuggestionTypeFilter('coverage_gap')}>
              Brechas
            </button>
          </div>

          <div className="admin-compact-form">
            <label className="field">
              <span>Estado</span>
              <select
                value={suggestionStatusFilter}
                onChange={(event) => setSuggestionStatusFilter(event.target.value as 'all' | AiSuggestionStatus)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="accepted">Aceptadas</option>
                <option value="applied">Aplicadas</option>
                <option value="deferred">Postergadas</option>
                <option value="rejected">Rechazadas</option>
              </select>
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                value={suggestionTypeFilter}
                onChange={(event) => setSuggestionTypeFilter(event.target.value as 'all' | AiSuggestion['suggestionType'])}
              >
                <option value="all">Todos</option>
                <option value="new_question">Nuevas</option>
                <option value="rewrite">Rewrites</option>
                <option value="flag">Flags</option>
                <option value="coverage_gap">Brechas</option>
              </select>
            </label>
            <label className="field">
              <span>Capítulo</span>
              <select value={suggestionChapterFilter} onChange={(event) => setSuggestionChapterFilter(event.target.value)}>
                <option value="all">Todos</option>
                {catalogChapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Fuente</span>
              <select value={suggestionSourceFilter} onChange={(event) => setSuggestionSourceFilter(event.target.value)}>
                <option value="all">Todas</option>
                {catalogSourceOptions.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-pane__body admin-work-list">
            {filteredSuggestions.length === 0 ? (
              <article className="admin-inline-note">
                <strong>Sin sugerencias</strong>
                <span>Ejecuta una actualización para poblar la cola privada.</span>
              </article>
            ) : (
              filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={selectedSuggestionId === suggestion.id ? 'admin-work-item admin-work-item--selected' : 'admin-work-item'}
                  onClick={() => onSelectSuggestion(suggestion.id)}
                >
                  <div className="admin-work-item__top">
                    <strong>{getSuggestionTypeLabel(suggestion.suggestionType)}</strong>
                    <span className="admin-status-inline">
                      <span className={getSuggestionStatusDotClass(suggestion.status)} />
                      <span>{getSuggestionStatusLabel(suggestion.status)}</span>
                    </span>
                  </div>
                  <span className="admin-work-item__title">{suggestion.prompt}</span>
                  <small className="admin-work-item__meta">
                    {suggestion.chapterId ?? 'sin capítulo'}
                    {suggestion.sourceReference ? ` · ${suggestion.sourceReference}` : ''}
                  </small>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <div className={selectedSuggestionId ? 'admin-master-detail__detail' : 'admin-master-detail__detail admin-master-detail__detail--hidden-mobile'}>
        <div className="admin-detail-shell">
          <div className="admin-detail-shell__mobile-head">
            <button type="button" className="secondary-button secondary-button--compact" onClick={onClearSelection}>
              <ChevronLeftIcon className="admin-icon" />
              <span>Volver</span>
            </button>
          </div>

          <section className="panel admin-surface admin-pane admin-pane--detail">
            {!selectedSuggestion ? (
              <article className="admin-inline-note">
                <strong>Selecciona una sugerencia</strong>
                <span>La cola AI sirve como bandeja privada de revisión y generación de drafts.</span>
              </article>
            ) : (
              <>
                <div className="admin-pane__head">
                  <div>
                    <span className="eyebrow">Detalle AI</span>
                    <h3 className="section-title">{getSuggestionTypeLabel(selectedSuggestion.suggestionType)}</h3>
                  </div>
                  <div className="admin-status-inline">
                    <span className={getSuggestionStatusDotClass(selectedSuggestion.status)} />
                    <span>{getSuggestionStatusLabel(selectedSuggestion.status)}</span>
                  </div>
                </div>

                <div className="admin-detail-list">
                  <div className="admin-detail-list__row">
                    <span>Confianza</span>
                    <strong>{Math.round(selectedSuggestion.confidence * 100)}%</strong>
                  </div>
                  <div className="admin-detail-list__row">
                    <span>Proveedor</span>
                    <strong>{selectedSuggestion.provider}</strong>
                  </div>
                  <div className="admin-detail-list__row">
                    <span>Fuente</span>
                    <strong>{selectedSuggestion.sourceReference || 'sin referencia'}</strong>
                  </div>
                </div>

                <div className="admin-pane__body admin-detail-stack">
                  <label className="field field--full">
                    <span>Prompt sugerido</span>
                    <textarea rows={4} value={selectedSuggestion.prompt} readOnly />
                  </label>
                  <label className="field field--full">
                    <span>Grounding</span>
                    <textarea rows={4} value={selectedSuggestion.groundingExcerpt} readOnly />
                  </label>
                  <label className="field field--full">
                    <span>Rationale</span>
                    <textarea rows={4} value={selectedSuggestion.rationale} readOnly />
                  </label>
                  {selectedSuggestion.reviewNotes && (
                    <label className="field field--full">
                      <span>Notas AI</span>
                      <textarea rows={3} value={selectedSuggestion.reviewNotes} readOnly />
                    </label>
                  )}

                  {selectedSuggestion.suggestedOptions.length > 0 && (
                    <div className="admin-options">
                      <h3>Opciones sugeridas</h3>
                      {selectedSuggestion.suggestedOptions.map((option, index) => (
                        <div key={`${selectedSuggestion.id}-option-${index}`} className="admin-option-row">
                          <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                          <input value={option} readOnly />
                          <label className="checkbox-field">
                            <input
                              type="checkbox"
                              checked={selectedSuggestion.suggestedCorrectAnswers.includes(index)}
                              readOnly
                            />
                            <span>Correcta</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-action-row">
                  {(selectedSuggestion.suggestionType === 'new_question' ||
                    selectedSuggestion.suggestionType === 'rewrite') && (
                    <>
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => onLoadSuggestionIntoEditor(selectedSuggestion)}
                        disabled={isBusy}
                      >
                        Cargar en editor
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => onCreateDraftFromSuggestion(selectedSuggestion)}
                        disabled={isBusy}
                      >
                        Crear draft
                      </button>
                    </>
                  )}
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      onTransitionSuggestion(
                        selectedSuggestion.id,
                        'deferred',
                        'La sugerencia quedó postergada para revisión posterior.',
                      )
                    }
                    disabled={isBusy}
                  >
                    Postergar
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      onTransitionSuggestion(
                        selectedSuggestion.id,
                        'rejected',
                        'La sugerencia quedó rechazada.',
                      )
                    }
                    disabled={isBusy}
                  >
                    Rechazar
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
