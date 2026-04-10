// src/components/admin/EditorPanel.tsx
import { ChevronLeftIcon } from './AdminIcons';
import type { EditorialAction, Question } from '../../types/content';

type Props = {
  draftQuestion: Question | null;
  isBusy: boolean;
  onAction: (action: EditorialAction, msg: string) => void;
  onClose: () => void;
  onUpdateField: <K extends keyof Question>(field: K, val: Question[K]) => void;
  onUpdateOptionText: (id: string, text: string) => void;
  onUpdateOptionCorrect: (id: string, checked: boolean) => void;
  chapters: any[];
  sourceDocuments: any[];
};

export function EditorPanel({ draftQuestion, isBusy, onAction, onClose, onUpdateField, onUpdateOptionText, onUpdateOptionCorrect, chapters, sourceDocuments }: Props) {
  if (!draftQuestion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><span className="text-2xl font-serif italic text-slate-300">Q</span></div>
        <p className="font-medium text-slate-600">Ninguna pregunta seleccionada</p>
        <p className="text-sm mt-1 max-w-xs">Selecciona un elemento de la lista maestra para editar su contenido y opciones.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative min-w-0">
      {/* Detail Header */}
      <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-2">
          <button onClick={onClose} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
            <ChevronLeftIcon size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <h2 className="font-semibold text-slate-900 text-sm hidden sm:block">Modo Edición:</h2>
            <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{draftQuestion.id}</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 border border-slate-200">
          {draftQuestion.status}
        </span>
      </div>
      
      {/* Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/30">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Capítulo Base</label>
              <select value={draftQuestion.chapterId} onChange={e => onUpdateField('chapterId', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm">
                {chapters?.map(c => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Documento Fuente</label>
              <select value={draftQuestion.sourceDocumentId} onChange={e => onUpdateField('sourceDocumentId', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm">
                {sourceDocuments?.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Enunciado de la Pregunta</label>
              <textarea value={draftQuestion.prompt} onChange={e => onUpdateField('prompt', e.target.value)} className="w-full p-3.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y shadow-sm leading-relaxed" rows={3} placeholder="Escribe el enunciado aquí..." />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Explicación o Feedback Público (Opcional)</label>
              <textarea value={draftQuestion.publicExplanation || ''} onChange={e => onUpdateField('publicExplanation', e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y shadow-sm" rows={2} placeholder="Se muestra al usuario al revisar el test..." />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-end border-b border-slate-200 pb-2 mb-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Opciones de Respuesta</h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Selección Única</span>
            </div>
            <div className="space-y-3">
              {draftQuestion.options.map((opt) => (
                <div key={opt.id} className={`flex items-start space-x-3 p-3 border rounded-xl transition-colors shadow-sm ${opt.isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'}`}>
                  <div className="flex h-10 items-center justify-center shrink-0">
                    <input type="checkbox" checked={opt.isCorrect} onChange={(e) => onUpdateOptionCorrect(opt.id, e.target.checked)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer" />
                  </div>
                  <textarea value={opt.text} onChange={(e) => onUpdateOptionText(opt.id, e.target.value)} rows={1} placeholder="Texto de la alternativa..." className="w-full py-2 bg-transparent text-sm text-slate-800 outline-none resize-none min-h-[40px]" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
              <input type="checkbox" checked={draftQuestion.isOfficialExamEligible} onChange={e => onUpdateField('isOfficialExamEligible', e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-slate-700">Apta para simulacro de examen oficial</span>
            </label>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="shrink-0 p-3 bg-white border-t border-slate-200 flex justify-between items-center z-20">
        <button onClick={() => onAction('archive', 'Archivada')} disabled={isBusy} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors hidden sm:block">
          Archivar
        </button>
        <div className="flex space-x-2 w-full sm:w-auto justify-end">
          <button onClick={() => onAction('save_draft', 'Borrador guardado')} disabled={isBusy} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            Guardar Borrador
          </button>
          <button onClick={() => onAction('mark_reviewed', 'Revisada')} disabled={isBusy} className="hidden md:block px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
            Aprobar Revisión
          </button>
          <button onClick={() => onAction('publish', 'Publicada')} disabled={isBusy} className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}