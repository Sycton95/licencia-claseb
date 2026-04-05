import type { ReactNode } from 'react';
import type { EditorialWarning } from '../../lib/editorialDiagnostics';
import type { EditorialStatus, Question } from '../../types/content';
import { ChevronLeftIcon } from './AdminIcons';
import { getEditorialStatusDotClass, getEditorialStatusLabel } from './types';

type CatalogManagerProps = {
  catalogChapterOptions: Array<{ id: string; code: string }>;
  catalogSourceOptions: Array<{ id: string; title: string }>;
  editorPanel: ReactNode;
  filterChapterId: 'all' | string;
  filterEligibleOnly: boolean;
  filterSourceDocumentId: 'all' | string;
  filterStatus: 'all' | EditorialStatus;
  filterWarningsOnly: boolean;
  onApplyQuickFilter: (
    preset: 'all' | 'draft' | 'reviewed' | 'published' | 'archived' | 'exam' | 'warnings',
  ) => void;
  onClearSelection: () => void;
  onSearchTermChange: (value: string) => void;
  onSelectQuestion: (questionId: string) => void;
  searchTerm: string;
  selectedQuestionId: string | null;
  setFilterChapterId: (value: 'all' | string) => void;
  setFilterEligibleOnly: (value: boolean) => void;
  setFilterSourceDocumentId: (value: 'all' | string) => void;
  setFilterStatus: (value: 'all' | EditorialStatus) => void;
  setFilterWarningsOnly: (value: boolean) => void;
  warningsByQuestionId: Map<string, EditorialWarning[]>;
  questions: Question[];
};

export function CatalogManager({
  catalogChapterOptions,
  catalogSourceOptions,
  editorPanel,
  filterChapterId,
  filterEligibleOnly,
  filterSourceDocumentId,
  filterStatus,
  filterWarningsOnly,
  onApplyQuickFilter,
  onClearSelection,
  onSearchTermChange,
  onSelectQuestion,
  questions,
  searchTerm,
  selectedQuestionId,
  setFilterChapterId,
  setFilterEligibleOnly,
  setFilterSourceDocumentId,
  setFilterStatus,
  setFilterWarningsOnly,
  warningsByQuestionId,
}: CatalogManagerProps) {
  return (
    <section className="admin-master-detail">
      <div className={selectedQuestionId ? 'admin-master-detail__master admin-master-detail__master--hidden-mobile' : 'admin-master-detail__master'}>
        <section className="panel admin-surface admin-pane">
          <div className="admin-pane__head">
            <div>
              <span className="eyebrow">Catálogo</span>
              <h3 className="section-title">Lista de trabajo</h3>
            </div>
          </div>

          <div className="admin-filter-row">
            <button type="button" className="admin-chip-button" onClick={() => onApplyQuickFilter('all')}>
              Todas
            </button>
            <button type="button" className="admin-chip-button" onClick={() => onApplyQuickFilter('draft')}>
              Draft
            </button>
            <button type="button" className="admin-chip-button" onClick={() => onApplyQuickFilter('reviewed')}>
              Revisadas
            </button>
            <button type="button" className="admin-chip-button" onClick={() => onApplyQuickFilter('published')}>
              Publicadas
            </button>
            <button type="button" className="admin-chip-button" onClick={() => onApplyQuickFilter('exam')}>
              Examen
            </button>
            <button type="button" className="admin-chip-button" onClick={() => onApplyQuickFilter('warnings')}>
              Warnings
            </button>
          </div>

          <div className="admin-compact-form">
            <label className="field">
              <span>Buscar</span>
              <input value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} />
            </label>
            <label className="field">
              <span>Estado</span>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as 'all' | EditorialStatus)}
              >
                <option value="all">Todos</option>
                <option value="draft">Draft</option>
                <option value="reviewed">Revisadas</option>
                <option value="published">Publicadas</option>
                <option value="archived">Archivadas</option>
              </select>
            </label>
            <label className="field">
              <span>Capítulo</span>
              <select value={filterChapterId} onChange={(event) => setFilterChapterId(event.target.value)}>
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
              <select value={filterSourceDocumentId} onChange={(event) => setFilterSourceDocumentId(event.target.value)}>
                <option value="all">Todas</option>
                {catalogSourceOptions.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={filterEligibleOnly}
                onChange={(event) => setFilterEligibleOnly(event.target.checked)}
              />
              <span>Solo aptas para examen</span>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={filterWarningsOnly}
                onChange={(event) => setFilterWarningsOnly(event.target.checked)}
              />
              <span>Solo con warnings</span>
            </label>
          </div>

          <div className="admin-pane__body admin-work-list">
            {questions.map((question) => {
              const warnings = warningsByQuestionId.get(question.id) ?? [];
              return (
                <button
                  key={question.id}
                  type="button"
                  className={selectedQuestionId === question.id ? 'admin-work-item admin-work-item--selected' : 'admin-work-item'}
                  onClick={() => onSelectQuestion(question.id)}
                >
                  <div className="admin-work-item__top">
                    <strong>{question.id}</strong>
                    <span className="admin-status-inline">
                      <span className={getEditorialStatusDotClass(question.status)} />
                      <span>{getEditorialStatusLabel(question.status)}</span>
                    </span>
                  </div>
                  <span className="admin-work-item__title">{question.prompt}</span>
                  <small className="admin-work-item__meta">
                    {question.chapterId}
                    {warnings.length > 0 ? ` · ${warnings.length} warning(s)` : ''}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className={selectedQuestionId ? 'admin-master-detail__detail' : 'admin-master-detail__detail admin-master-detail__detail--hidden-mobile'}>
        <div className="admin-detail-shell">
          <div className="admin-detail-shell__mobile-head">
            <button type="button" className="secondary-button secondary-button--compact" onClick={onClearSelection}>
              <ChevronLeftIcon className="admin-icon" />
              <span>Volver</span>
            </button>
          </div>
          {editorPanel}
        </div>
      </div>
    </section>
  );
}
