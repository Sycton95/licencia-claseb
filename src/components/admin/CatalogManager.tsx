import { SearchIcon } from './AdminIcons';
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
}: Props) {
  return (
    <div className="relative flex h-full w-full flex-1 overflow-hidden">
      <div
        className={`
          flex h-full w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-[340px] lg:w-[380px]
          ${selectedQuestionId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="z-10 shrink-0 space-y-3 border-b border-slate-200 bg-slate-50/80 p-3">
          <div className="relative">
            <label htmlFor="catalog-search" className="sr-only">
              Buscar pregunta por enunciado o ID
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <SearchIcon size={16} />
            </div>
            <input
              id="catalog-search"
              name="catalog-search"
              autoComplete="off"
              type="text"
              aria-label="Buscar pregunta por enunciado o ID"
              placeholder="Buscar enunciado o ID…"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-1">
            {['all', 'draft', 'reviewed', 'published'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as 'all' | EditorialStatus)}
                className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                  filterStatus === status
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                }`}
              >
                {status === 'all' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto bg-slate-50/30 p-2.5">
          {questions.map((question) => {
            const diagnostics = diagnosticsByQuestionId[question.id] ?? [];
            const highestSeverity = diagnostics.length > 0 ? getHighestSeverity(diagnostics) : null;

            return (
              <button
                key={question.id}
                onClick={() => onSelectQuestion(question.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                  selectedQuestionId === question.id
                    ? 'border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                    {question.id}
                  </span>
                  <div className="flex items-center gap-2">
                    {diagnostics.length > 0 && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          highestSeverity === 'critical'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                        title={`${diagnostics.length} alertas`}
                      >
                        {diagnostics.length}
                      </span>
                    )}
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${getEditorialStatusColor(question.status)}`}
                      title={question.status}
                    />
                  </div>
                </div>
                <p
                  className={`line-clamp-2 text-sm leading-snug ${
                    selectedQuestionId === question.id
                      ? 'font-semibold text-blue-900'
                      : 'font-medium text-slate-700'
                  }`}
                >
                  {question.prompt}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                  <span className="truncate">{question.chapterId}</span>
                  <span className="shrink-0 uppercase">{question.selectionMode}</span>
                </div>
              </button>
            );
          })}
          {questions.length === 0 && (
            <div className="mt-10 p-4 text-center text-sm text-slate-400">
              No hay resultados para esta búsqueda. Ajusta el filtro o intenta con otro ID.
            </div>
          )}
        </div>
      </div>

      <div
        className={`
          relative flex h-full min-w-0 flex-1 flex-col bg-slate-50
          ${selectedQuestionId ? 'flex' : 'hidden md:flex'}
        `}
      >
        {editorPanel}
      </div>
    </div>
  );
}
