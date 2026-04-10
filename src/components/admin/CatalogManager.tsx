// src/components/admin/CatalogManager.tsx
import { SearchIcon } from './AdminIcons';
import { getEditorialStatusColor } from './types';
import type { EditorialStatus, Question } from '../../types/content';

type Props = {
  questions: Question[];
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string | null) => void;
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  filterStatus: 'all' | EditorialStatus;
  setFilterStatus: (val: 'all' | EditorialStatus) => void;
  editorPanel: React.ReactNode;
};

export function CatalogManager({ questions, selectedQuestionId, onSelectQuestion, searchTerm, onSearchTermChange, filterStatus, setFilterStatus, editorPanel }: Props) {
  return (
    <div className="flex flex-1 h-full w-full overflow-hidden relative">
      
      {/* Master Column (List) */}
      <div className={`
        w-full md:w-[340px] lg:w-[380px] flex flex-col border-r border-slate-200 bg-white shrink-0 h-full
        ${selectedQuestionId ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Search & Filters */}
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50/80 space-y-3 z-10">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><SearchIcon size={16} /></div>
            <input 
              type="text" placeholder="Buscar enunciado o ID..." value={searchTerm} onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none shadow-sm transition-all"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {['all', 'draft', 'reviewed', 'published'].map(status => (
              <button 
                key={status} onClick={() => setFilterStatus(status as any)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border transition-colors ${filterStatus === status ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                {status === 'all' ? 'Todos' : status}
              </button>
            ))}
          </div>
        </div>
        
        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-slate-50/30">
          {questions.map(q => (
            <button
              key={q.id} onClick={() => onSelectQuestion(q.id)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${selectedQuestionId === q.id ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{q.id}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${getEditorialStatusColor(q.status)}`} title={q.status} />
              </div>
              <p className={`text-sm leading-snug line-clamp-2 ${selectedQuestionId === q.id ? 'text-blue-900 font-semibold' : 'text-slate-700 font-medium'}`}>
                {q.prompt}
              </p>
            </button>
          ))}
          {questions.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400 mt-10">No hay resultados para tu búsqueda.</div>
          )}
        </div>
      </div>

      {/* Detail Column (Editor) */}
      <div className={`
        flex-1 flex flex-col h-full bg-slate-50 relative min-w-0
        ${selectedQuestionId ? 'flex' : 'hidden md:flex'}
      `}>
        {editorPanel}
      </div>
      
    </div>
  );
}