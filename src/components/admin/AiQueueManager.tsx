// src/components/admin/AiQueueManager.tsx
import { ChevronLeftIcon } from './AdminIcons';
import { getSuggestionStatusColor } from './types';
import type { AiSuggestion, AiSuggestionStatus } from '../../types/ai';

type Props = {
  filteredSuggestions: AiSuggestion[];
  isBusy: boolean;
  onGenerateSuggestions: () => void;
  onLoadSuggestionIntoEditor: (s: AiSuggestion) => void;
  onSelectSuggestion: (id: string | null) => void;
  onTransitionSuggestion: (id: string, status: AiSuggestionStatus, msg: string) => void;
  selectedSuggestion: AiSuggestion | null;
  selectedSuggestionId: string | null;
};

export function AiQueueManager({ filteredSuggestions, isBusy, onGenerateSuggestions, onLoadSuggestionIntoEditor, onSelectSuggestion, onTransitionSuggestion, selectedSuggestion, selectedSuggestionId }: Props) {
  return (
    <div className="flex flex-1 h-full w-full overflow-hidden relative">
      {/* Master Column */}
      <div className={`
        w-full md:w-[340px] lg:w-[380px] flex flex-col border-r border-slate-200 bg-white shrink-0 h-full
        ${selectedSuggestionId ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="shrink-0 p-4 border-b border-slate-200 bg-slate-50/80 flex justify-between items-center z-10">
           <div>
             <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Sugerencias AI</h2>
             <p className="text-[11px] text-slate-500 font-medium mt-0.5">{filteredSuggestions.length} en cola</p>
           </div>
           <button onClick={onGenerateSuggestions} disabled={isBusy} className="text-xs text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg font-semibold shadow-sm transition-colors">
             Generar Más
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-slate-50/30">
          {filteredSuggestions.map((s) => (
            <button
              key={s.id} onClick={() => onSelectSuggestion(s.id)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all ${selectedSuggestionId === s.id ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-100/50 px-2 py-0.5 rounded border border-indigo-100">{s.suggestionType.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1 rounded border">{Math.round(s.confidence * 100)}%</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${getSuggestionStatusColor(s.status)}`} title={s.status} />
                </div>
              </div>
              <p className={`text-sm line-clamp-3 leading-relaxed ${selectedSuggestionId === s.id ? 'text-indigo-950 font-semibold' : 'text-slate-700 font-medium'}`}>
                {s.prompt}
              </p>
            </button>
          ))}
          {filteredSuggestions.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-400">La cola privada AI está vacía.</div>
          )}
        </div>
      </div>

      {/* Detail Column */}
      <div className={`
        flex-1 flex flex-col h-full bg-slate-50 relative min-w-0
        ${selectedSuggestionId ? 'flex' : 'hidden md:flex'}
      `}>
        {!selectedSuggestion ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl">✨</div>
             <p className="font-medium text-slate-600">Selecciona una sugerencia para revisión manual</p>
           </div>
        ) : (
          <>
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 z-10 shadow-sm">
              <div className="flex items-center space-x-2">
                <button onClick={() => onSelectSuggestion(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md">
                  <ChevronLeftIcon size={20} />
                </button>
                <h2 className="font-semibold text-slate-900 text-sm hidden sm:block">Revisión Automática</h2>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[10px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {selectedSuggestion.status}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Enunciado Propuesto</h3>
                  <p className="text-base font-semibold text-slate-900 leading-relaxed">{selectedSuggestion.prompt}</p>
                </div>
                
                {selectedSuggestion.rationale && (
                  <div className="bg-slate-100/50 p-5 rounded-xl border border-slate-200">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Fundamentación de AI</h3>
                    <p className="text-sm text-slate-700 leading-relaxed italic">"{selectedSuggestion.rationale}"</p>
                  </div>
                )}

                {selectedSuggestion.suggestedOptions?.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Opciones Generadas</h3>
                    <div className="space-y-2">
                      {selectedSuggestion.suggestedOptions.map((opt: string, i: number) => {
                        const isCorrect = selectedSuggestion.suggestedCorrectAnswers.includes(i);
                        return (
                          <div key={i} className={`p-4 border rounded-xl flex items-start space-x-3 shadow-sm ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-xs font-bold ${isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{String.fromCharCode(65 + i)}</span>
                            <span className={`text-sm mt-0.5 ${isCorrect ? 'font-semibold' : 'font-medium'}`}>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 p-3 bg-white border-t border-slate-200 flex justify-end space-x-2 z-20">
              <button onClick={() => onTransitionSuggestion(selectedSuggestion.id, 'deferred', 'Postergada')} disabled={isBusy} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors hidden sm:block">
                Postergar
              </button>
              <button onClick={() => onTransitionSuggestion(selectedSuggestion.id, 'rejected', 'Rechazada')} disabled={isBusy} className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
                Rechazar
              </button>
              <button onClick={() => onLoadSuggestionIntoEditor(selectedSuggestion)} disabled={isBusy} className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                Aprobar y Editar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}