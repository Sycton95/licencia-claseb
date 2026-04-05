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
  filteredSuggestions: AiSuggestion[];
  isBusy: boolean;
  isDetailOpen: boolean;
  onCloseDetail: () => void;
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
  setSuggestionStatusFilter: (value: 'all' | AiSuggestionStatus) => void;
  setSuggestionTypeFilter: (value: 'all' | AiSuggestion['suggestionType']) => void;
  suggestionStatusFilter: 'all' | AiSuggestionStatus;
  suggestionTypeFilter: 'all' | AiSuggestion['suggestionType'];
};

export function AiQueueManager({
  aiSummary,
  filteredSuggestions,
  isBusy,
  isDetailOpen,
  onCloseDetail,
  onCreateDraftFromSuggestion,
  onGenerateSuggestions,
  onLoadSuggestionIntoEditor,
  onSelectSuggestion,
  onTransitionSuggestion,
  selectedSuggestion,
  selectedSuggestionId,
  setSuggestionStatusFilter,
  setSuggestionTypeFilter,
  suggestionStatusFilter,
  suggestionTypeFilter,
}: AiQueueManagerProps) {
  return (
    <section className="admin-manager">
      <div className={isDetailOpen ? 'admin-manager__master admin-manager__master--hidden-mobile' : 'admin-manager__master'}>
        <section className="admin-manager__master-surface">
          <div className="admin-manager__master-head">
            <div>
              <h3 className="section-title">Cola AI</h3>
              <p className="info-text">Sugerencias privadas para triage editorial.</p>
            </div>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={onGenerateSuggestions}
              disabled={isBusy}
            >
              Actualizar
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

          <div className="admin-filter-row admin-filter-row--compact">
            <button
              type="button"
              className={suggestionTypeFilter === 'all' ? 'admin-status-filter admin-status-filter--active' : 'admin-status-filter'}
              onClick={() => setSuggestionTypeFilter('all')}
            >
              Todas
            </button>
            <button
              type="button"
              className={suggestionTypeFilter === 'new_question' ? 'admin-status-filter admin-status-filter--active' : 'admin-status-filter'}
              onClick={() => setSuggestionTypeFilter('new_question')}
            >
              Nuevas
            </button>
            <button
              type="button"
              className={suggestionTypeFilter === 'rewrite' ? 'admin-status-filter admin-status-filter--active' : 'admin-status-filter'}
              onClick={() => setSuggestionTypeFilter('rewrite')}
            >
              Rewrites
            </button>
            <button
              type="button"
              className={suggestionTypeFilter === 'flag' ? 'admin-status-filter admin-status-filter--active' : 'admin-status-filter'}
              onClick={() => setSuggestionTypeFilter('flag')}
            >
              Flags
            </button>
          </div>

          <div className="admin-filter-row admin-filter-row--meta">
            <label className="field field--inline">
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
          </div>

          <div className="admin-manager__master-list">
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

      <div className={isDetailOpen ? 'admin-manager__detail' : 'admin-manager__detail admin-manager__detail--hidden-mobile'}>
        <section className="admin-manager__detail-surface">
          <div className="admin-manager__detail-mobile-head">
            <button type="button" className="admin-back-button" onClick={onCloseDetail}>
              <ChevronLeftIcon className="admin-icon" />
              <span>Volver</span>
            </button>
          </div>

          {!selectedSuggestion ? (
            <div className="admin-ai-placeholder">
              <p className="admin-ai-placeholder__title">Cola AI / Bandeja de entrada</p>
              <p className="admin-ai-placeholder__copy">
                El mismo patrón master-detail se aplica aquí para revisar sugerencias y convertirlas en drafts.
              </p>
              <p className="admin-ai-placeholder__meta">Total pendientes: {aiSummary?.pending ?? 0}</p>
            </div>
          ) : (
            <section className="panel admin-surface admin-pane admin-pane--detail">
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
            </section>
          )}
        </section>
      </div>
    </section>
  );
}
