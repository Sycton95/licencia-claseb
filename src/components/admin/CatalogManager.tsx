import type { ReactNode } from 'react';
import type { EditorialWarning } from '../../lib/editorialDiagnostics';
import type { EditorialStatus, Question } from '../../types/content';
import { ChevronLeftIcon, SearchIcon } from './AdminIcons';
import { getEditorialStatusDotClass } from './types';

type CatalogManagerProps = {
  editorPanel: ReactNode;
  filterEligibleOnly: boolean;
  filterStatus: 'all' | EditorialStatus;
  filterWarningsOnly: boolean;
  isDetailOpen: boolean;
  onApplyQuickFilter: (
    preset: 'all' | 'draft' | 'reviewed' | 'published' | 'archived' | 'exam' | 'warnings',
  ) => void;
  onCloseDetail: () => void;
  onSearchTermChange: (value: string) => void;
  onSelectQuestion: (questionId: string) => void;
  questions: Question[];
  searchTerm: string;
  selectedQuestionId: string | null;
  setFilterEligibleOnly: (value: boolean) => void;
  setFilterStatus: (value: 'all' | EditorialStatus) => void;
  setFilterWarningsOnly: (value: boolean) => void;
  warningsByQuestionId: Map<string, EditorialWarning[]>;
};

export function CatalogManager({
  editorPanel,
  filterEligibleOnly,
  filterStatus,
  filterWarningsOnly,
  isDetailOpen,
  onApplyQuickFilter,
  onCloseDetail,
  onSearchTermChange,
  onSelectQuestion,
  questions,
  searchTerm,
  selectedQuestionId,
  setFilterEligibleOnly,
  setFilterStatus,
  setFilterWarningsOnly,
  warningsByQuestionId,
}: CatalogManagerProps) {
  return (
    <section className="admin-manager">
      <div
        className={
          isDetailOpen ? 'admin-manager__master admin-manager__master--hidden-mobile' : 'admin-manager__master'
        }
      >
        <section className="admin-manager__master-surface">
          <div className="admin-manager__master-head">
            <div className="admin-search">
              <span className="admin-search__icon">
                <SearchIcon className="admin-icon admin-icon--sm" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Buscar ID o enunciado..."
                className="admin-search__input"
              />
            </div>

            <div className="admin-filter-row admin-filter-row--compact">
              <button
                type="button"
                className={
                  filterStatus === 'all' ? 'admin-status-filter admin-status-filter--active' : 'admin-status-filter'
                }
                onClick={() => setFilterStatus('all')}
              >
                Todos
              </button>
              <button
                type="button"
                className={
                  filterStatus === 'draft'
                    ? 'admin-status-filter admin-status-filter--active'
                    : 'admin-status-filter'
                }
                onClick={() => onApplyQuickFilter('draft')}
              >
                Draft
              </button>
              <button
                type="button"
                className={
                  filterStatus === 'reviewed'
                    ? 'admin-status-filter admin-status-filter--active'
                    : 'admin-status-filter'
                }
                onClick={() => onApplyQuickFilter('reviewed')}
              >
                Revisadas
              </button>
              <button
                type="button"
                className={
                  filterStatus === 'published'
                    ? 'admin-status-filter admin-status-filter--active'
                    : 'admin-status-filter'
                }
                onClick={() => onApplyQuickFilter('published')}
              >
                Publicadas
              </button>
            </div>
          </div>

          <div className="admin-filter-row admin-filter-row--meta">
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={filterEligibleOnly}
                onChange={(event) => setFilterEligibleOnly(event.target.checked)}
              />
              <span>Solo examen</span>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={filterWarningsOnly}
                onChange={(event) => setFilterWarningsOnly(event.target.checked)}
              />
              <span>Solo warnings</span>
            </label>
          </div>

          <div className="admin-manager__master-list">
            {questions.map((question) => {
              const warnings = warningsByQuestionId.get(question.id) ?? [];
              return (
                <button
                  key={question.id}
                  type="button"
                  className={
                    selectedQuestionId === question.id
                      ? 'admin-work-item admin-work-item--selected'
                      : 'admin-work-item'
                  }
                  onClick={() => onSelectQuestion(question.id)}
                >
                  <div className="admin-work-item__top">
                    <span className="admin-record-id">{question.id}</span>
                    <div className="admin-work-item__dots">
                      {warnings.length > 0 && (
                        <span className="status-dot status-dot--rejected" title="Warnings" />
                      )}
                      <span
                        className={getEditorialStatusDotClass(question.status)}
                        title={question.status}
                      />
                    </div>
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

      <div
        className={
          isDetailOpen ? 'admin-manager__detail' : 'admin-manager__detail admin-manager__detail--hidden-mobile'
        }
      >
        <section className="admin-manager__detail-surface">
          <div className="admin-manager__detail-mobile-head">
            <button type="button" className="admin-back-button" onClick={onCloseDetail}>
              <ChevronLeftIcon className="admin-icon" />
              <span>Volver</span>
            </button>
          </div>
          {editorPanel}
        </section>
      </div>
    </section>
  );
}
