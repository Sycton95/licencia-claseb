import { SearchIcon, AdminBadge, AdminEmptyState, AdminListItem } from './index';
import { getEditorialStatusColor } from './types';
import type { EditorialDiagnostic } from '../../lib/editorialDiagnostics';
import type { EditorialStatus, Question } from '../../types/content';

type Props = {
  questions: Question[];
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string | null) => void;
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  filterStatus: 'all' | EditorialStatus;
  setFilterStatus: (val: 'all' | EditorialStatus) => void;
  diagnosticsByQuestionId: Record<string, EditorialDiagnostic[]>;
  editorPanel: React.ReactNode;
  isListCollapsed: boolean;
  onToggleListCollapsed: () => void;
};

function getHighestSeverity(diagnostics: EditorialDiagnostic[]) {
  return diagnostics.some((item) => item.severity === 'critical') ? 'critical' : 'warning';
}

export function CatalogManager({
  questions,
  selectedQuestionId,
  onSelectQuestion,
  searchTerm,
  onSearchTermChange,
  filterStatus,
  setFilterStatus,
  diagnosticsByQuestionId,
  editorPanel,
  isListCollapsed,
  onToggleListCollapsed,
}: Props) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden">
      <div
        className={`
          flex h-full shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200
          ${isListCollapsed ? 'md:w-14' : 'w-full md:w-[340px] lg:w-[380px]'}
          ${selectedQuestionId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="z-10 shrink-0 border-b border-neutral-200 bg-neutral-50/80 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            {!isListCollapsed && (
              <div>
                <div className="text-sm font-semibold text-neutral-900">Catalogo</div>
                <div className="text-[11px] text-neutral-500">{questions.length} preguntas</div>
              </div>
            )}
            <button
              type="button"
              onClick={onToggleListCollapsed}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              {isListCollapsed ? 'Abrir' : 'Plegar'}
            </button>
          </div>

          {!isListCollapsed && (
            <div className="space-y-3">
              <div className="relative">
                <label htmlFor="catalog-search" className="sr-only">
                  Buscar pregunta por enunciado o ID
                </label>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <SearchIcon size={16} />
                </div>
                <input
                  id="catalog-search"
                  name="catalog-search"
                  autoComplete="off"
                  type="text"
                  aria-label="Buscar pregunta por enunciado o ID"
                  placeholder="Buscar enunciado o ID..."
                  value={searchTerm}
                  onChange={(event) => onSearchTermChange(event.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition-all focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                {['all', 'draft', 'reviewed', 'published'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as 'all' | EditorialStatus)}
                    className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 ${
                      filterStatus === status
                        ? 'border-neutral-800 bg-neutral-800 text-white'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {status === 'all' ? 'Todos' : status}
                  </button>
                ))}
              </div>
            </div>
          )}
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
              {questions.map((question) => {
                const diagnostics = diagnosticsByQuestionId[question.id] ?? [];
                const highestSeverity = diagnostics.length > 0 ? getHighestSeverity(diagnostics) : null;

                return (
                  <AdminListItem
                    key={question.id}
                    title={question.prompt}
                    metadata={`${question.chapterId} • ${question.selectionMode}`}
                    isSelected={selectedQuestionId === question.id}
                    onClick={() => onSelectQuestion(question.id)}
                    statusBadge={
                      diagnostics.length > 0 && (
                        <AdminBadge
                          variant={highestSeverity === 'critical' ? 'warning' : 'warning'}
                          size="xs"
                        >
                          {diagnostics.length}
                        </AdminBadge>
                      )
                    }
                    actions={
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${getEditorialStatusColor(question.status)}`}
                        title={question.status}
                        aria-label={`Estado: ${question.status}`}
                      />
                    }
                    className="hover:cursor-pointer"
                  />
                );
              })}
              {questions.length === 0 && (
                <AdminEmptyState
                  title="Sin resultados"
                  message="No hay preguntas para esta busqueda. Ajusta el filtro o intenta con otro ID."
                />
              )}
            </>
          )}
        </div>
      </div>

      <div
        className={`
          relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-neutral-50
          ${selectedQuestionId ? 'flex' : 'hidden md:flex'}
        `}
      >
        {editorPanel}
      </div>
    </div>
  );
}
