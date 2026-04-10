import { ChevronLeftIcon } from './AdminIcons';
import type { EditorialDiagnostic } from '../../lib/editorialDiagnostics';
import type { Chapter, EditorialAction, Question, SelectionMode, SourceDocument } from '../../types/content';

type Props = {
  draftQuestion: Question | null;
  diagnostics: EditorialDiagnostic[];
  isBusy: boolean;
  statusMessage: string | null;
  statusTone: 'success' | 'error';
  onAction: (action: EditorialAction, msg: string) => void;
  onClose: () => void;
  onUpdateField: <K extends keyof Question>(field: K, val: Question[K]) => void;
  onUpdateOptionText: (id: string, text: string) => void;
  onUpdateOptionCorrect: (id: string, checked: boolean) => void;
  chapters: Chapter[];
  sourceDocuments: SourceDocument[];
};

function getSeverityClasses(severity: EditorialDiagnostic['severity']) {
  return severity === 'critical'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

export function EditorPanel({
  draftQuestion,
  diagnostics,
  isBusy,
  statusMessage,
  statusTone,
  onAction,
  onClose,
  onUpdateField,
  onUpdateOptionText,
  onUpdateOptionCorrect,
  chapters,
  sourceDocuments,
}: Props) {
  if (!draftQuestion) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-400">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <span className="text-2xl font-serif italic text-slate-300">Q</span>
        </div>
        <p className="font-medium text-slate-600">Ninguna pregunta seleccionada</p>
        <p className="mt-1 max-w-xs text-sm">
          Selecciona un elemento de la lista maestra para editar su contenido y opciones.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col bg-white">
      <div className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 md:hidden"
            aria-label="Volver a la lista de preguntas"
            type="button"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <h2 className="hidden text-sm font-semibold text-slate-900 sm:block">Modo edición</h2>
            <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
              {draftQuestion.id}
            </span>
          </div>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          {draftQuestion.status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 pb-28 md:p-8 md:pb-32">
        <div className="mx-auto max-w-3xl space-y-6 md:space-y-8">
          {statusMessage && (
            <div
              aria-live="polite"
              className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                statusTone === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {statusMessage}
            </div>
          )}

          {diagnostics.length > 0 && (
            <div className="space-y-3">
              {diagnostics.map((diagnostic) => (
                <div
                  key={diagnostic.id}
                  className={`rounded-xl border p-4 ${getSeverityClasses(diagnostic.severity)}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {diagnostic.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {diagnostic.severity}
                    </span>
                  </div>
                  <p className="text-sm font-semibold">{diagnostic.title}</p>
                  <p className="mt-1 text-sm leading-relaxed">{diagnostic.detail}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Capítulo base
              </label>
              <select
                value={draftQuestion.chapterId}
                onChange={(event) => onUpdateField('chapterId', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.code} - {chapter.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Documento fuente
              </label>
              <select
                value={draftQuestion.sourceDocumentId}
                onChange={(event) => onUpdateField('sourceDocumentId', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {sourceDocuments.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Modo de selección
              </label>
              <select
                value={draftQuestion.selectionMode}
                onChange={(event) =>
                  onUpdateField('selectionMode', event.target.value as SelectionMode)
                }
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="single">Única</option>
                <option value="multiple">Múltiple</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Página fuente
              </label>
              <input
                type="number"
                min={1}
                value={draftQuestion.sourcePage}
                onChange={(event) => onUpdateField('sourcePage', Number(event.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Referencia visible
              </label>
              <input
                type="text"
                value={draftQuestion.sourceReference || ''}
                onChange={(event) => onUpdateField('sourceReference', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Pág. 34"
              />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Enunciado de la pregunta
              </label>
              <textarea
                value={draftQuestion.prompt}
                onChange={(event) => onUpdateField('prompt', event.target.value)}
                className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3.5 text-sm leading-relaxed shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows={3}
                placeholder="Escribe el enunciado aquí…"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Instrucción visible
              </label>
              <input
                type="text"
                value={draftQuestion.instruction}
                onChange={(event) => onUpdateField('instruction', event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Marque una respuesta."
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Explicación o feedback público (opcional)
              </label>
              <textarea
                value={draftQuestion.publicExplanation || ''}
                onChange={(event) => onUpdateField('publicExplanation', event.target.value)}
                className="w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows={2}
                placeholder="Se muestra al usuario al revisar el test…"
              />
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-end justify-between border-b border-slate-200 pb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Opciones de respuesta
              </h3>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {draftQuestion.selectionMode === 'single' ? 'Selección única' : 'Selección múltiple'}
              </span>
            </div>
            <div className="space-y-3">
              {draftQuestion.options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-start space-x-3 rounded-xl border p-3 shadow-sm transition-colors ${
                    option.isCorrect
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex h-10 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(event) => onUpdateOptionCorrect(option.id, event.target.checked)}
                      aria-label={`Marcar opción ${option.label} como correcta`}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <textarea
                    value={option.text}
                    onChange={(event) => onUpdateOptionText(option.id, event.target.value)}
                    rows={1}
                    placeholder="Texto de la alternativa…"
                    className="min-h-[40px] w-full resize-none bg-transparent py-2 text-sm text-slate-800 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <label className="flex cursor-pointer items-center space-x-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50">
              <input
                type="checkbox"
                checked={draftQuestion.isOfficialExamEligible}
                onChange={(event) => onUpdateField('isOfficialExamEligible', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Apta para simulacro de examen oficial
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="z-20 flex shrink-0 items-center justify-between border-t border-slate-200 bg-white p-3">
        <button
          onClick={() => onAction('archive', 'Pregunta archivada.')}
          disabled={isBusy}
          className="hidden rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 sm:block"
        >
          Archivar
        </button>
        <div className="flex w-full justify-end space-x-2 sm:w-auto">
          <button
            onClick={() => onAction('save_draft', 'Borrador guardado.')}
            disabled={isBusy}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            Guardar borrador
          </button>
          <button
            onClick={() => onAction('mark_reviewed', 'Pregunta revisada.')}
            disabled={isBusy}
            className="hidden rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 md:block"
          >
            Aprobar revisión
          </button>
          <button
            onClick={() => onAction('publish', 'Pregunta publicada.')}
            disabled={isBusy}
            className="rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
          >
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}
