import { ChevronLeftIcon, AdminButton, AdminLabel, AdminCard, AdminSection, AdminBadge } from './index';
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
  onOpenManual: (sourceDocumentId: string, page?: number) => void;
  onOpenReference: (id: string) => void;
  chapters: Chapter[];
  sourceDocuments: SourceDocument[];
};

function renderDiagnosticDetail(
  diagnostic: EditorialDiagnostic,
  onOpenReference: (id: string) => void,
) {
  if (!diagnostic.referenceTargetId) {
    return <p className="mt-1 text-sm leading-relaxed text-neutral-700">{diagnostic.detail}</p>;
  }

  const token = diagnostic.referenceTargetId;
  const parts = diagnostic.detail.split(token);

  return (
    <p className="mt-1 text-sm leading-relaxed text-neutral-700">
      {parts[0]}
      <button
        type="button"
        onClick={() => onOpenReference(token)}
        className="font-semibold text-blue-700 underline underline-offset-2"
      >
        {token}
      </button>
      {parts.slice(1).join(token)}
    </p>
  );
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
  onOpenManual,
  onOpenReference,
  chapters,
  sourceDocuments,
}: Props) {
  if (!draftQuestion) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50/50 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <span className="text-2xl font-serif italic text-neutral-300">Q</span>
        </div>
        <p className="font-medium text-neutral-700">Ninguna pregunta seleccionada</p>
        <p className="mt-1 max-w-xs text-sm text-neutral-600">
          Selecciona un elemento de la lista maestra para editar su contenido y opciones.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 md:hidden"
            aria-label="Volver a la lista de preguntas"
            type="button"
          >
            <ChevronLeftIcon size={20} />
          </button>
          <div className="flex items-center space-x-2">
            <h2 className="hidden text-sm font-semibold text-neutral-900 sm:block">Modo edicion</h2>
            <code className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-600">
              {draftQuestion.id}
            </code>
          </div>
        </div>
        <AdminBadge variant="neutral" size="xs">
          {draftQuestion.status}
        </AdminBadge>
      </div>

      <div className="flex-1 overflow-y-auto bg-neutral-50/30 p-4 pb-28 md:p-8 md:pb-32">
        <div className="mx-auto min-h-full max-w-3xl space-y-6 md:space-y-8">
          {statusMessage && (
            <AdminCard variant="subtle" padding="standard">
              <div
                aria-live="polite"
                className={`text-sm font-medium ${statusTone === 'error' ? 'text-warning-700' : 'text-success-700'}`}
              >
                {statusMessage}
              </div>
            </AdminCard>
          )}

          {diagnostics.length > 0 && (
            <div className="space-y-3">
              {diagnostics.map((diagnostic) => (
                <AdminCard
                  key={diagnostic.id}
                  variant="subtle"
                  padding="standard"
                  className="border-l-4 border-l-warning-600"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <AdminLabel variant="metadata">
                      {diagnostic.category.replace('_', ' ')}
                    </AdminLabel>
                    <AdminBadge variant="warning" size="xs">
                      {diagnostic.severity}
                    </AdminBadge>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900">{diagnostic.title}</p>
                  {renderDiagnosticDetail(diagnostic, onOpenReference)}
                </AdminCard>
              ))}
            </div>
          )}

          <AdminSection title="Metadatos de la pregunta">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Capitulo base
                </label>
                <select
                  value={draftQuestion.chapterId}
                  onChange={(event) => onUpdateField('chapterId', event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.code} - {chapter.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Documento fuente
                </label>
                <select
                  value={draftQuestion.sourceDocumentId}
                  onChange={(event) => onUpdateField('sourceDocumentId', event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
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
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Modo de seleccion
                </label>
                <select
                  value={draftQuestion.selectionMode}
                  onChange={(event) => onUpdateField('selectionMode', event.target.value as SelectionMode)}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="single">Unica</option>
                  <option value="multiple">Multiple</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Pagina fuente
                </label>
                <input
                  type="number"
                  min={1}
                  value={draftQuestion.sourcePage}
                  onChange={(event) => onUpdateField('sourcePage', Number(event.target.value) || 0)}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Referencia visible
                </label>
                <input
                  type="text"
                  value={draftQuestion.sourceReference || ''}
                  onChange={(event) => onUpdateField('sourceReference', event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Pag. 34"
                />
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onOpenManual(draftQuestion.sourceDocumentId, draftQuestion.sourcePage)}
                    className="rounded border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    Abrir manual
                  </button>
                </div>
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Contenido de la pregunta">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Enunciado de la pregunta
                </label>
                <textarea
                  value={draftQuestion.prompt}
                  onChange={(event) => onUpdateField('prompt', event.target.value)}
                  className="w-full resize-y rounded-lg border border-neutral-200 bg-white p-3.5 text-sm leading-relaxed shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  rows={3}
                  placeholder="Escribe el enunciado aqui..."
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Instruccion visible
                </label>
                <input
                  type="text"
                  value={draftQuestion.instruction}
                  onChange={(event) => onUpdateField('instruction', event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Marque una respuesta."
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  Explicacion o feedback publico (opcional)
                </label>
                <textarea
                  value={draftQuestion.publicExplanation || ''}
                  onChange={(event) => onUpdateField('publicExplanation', event.target.value)}
                  className="w-full resize-y rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  rows={2}
                  placeholder="Se muestra al usuario al revisar el test..."
                />
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Opciones de respuesta">
            <div className="mb-4 flex items-center justify-between">
              <AdminLabel variant="metadata">
                {draftQuestion.selectionMode === 'single' ? 'Seleccion unica' : 'Seleccion multiple'}
              </AdminLabel>
            </div>
            <div className="space-y-3">
              {draftQuestion.options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-start space-x-3 rounded-xl border p-3 shadow-sm transition-colors ${
                    option.isCorrect ? 'border-success-300 bg-success-50' : 'border-neutral-200 bg-white'
                  }`}
                >
                  <div className="flex h-10 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(event) => onUpdateOptionCorrect(option.id, event.target.checked)}
                      aria-label={`Marcar opcion ${option.label} como correcta`}
                      className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-success-600 focus:ring-success-500"
                    />
                  </div>
                  <textarea
                    value={option.text}
                    onChange={(event) => onUpdateOptionText(option.id, event.target.value)}
                    rows={1}
                    placeholder="Texto de la alternativa..."
                    className="min-h-[40px] w-full resize-none bg-transparent py-2 text-sm text-neutral-900 outline-none"
                  />
                </div>
              ))}
            </div>
          </AdminSection>

          <div className="pt-2">
            <label className="flex cursor-pointer items-center space-x-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={draftQuestion.isOfficialExamEligible}
                onChange={(event) => onUpdateField('isOfficialExamEligible', event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-neutral-900">
                Apta para simulacro de examen oficial
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="z-20 flex shrink-0 items-center justify-between border-t border-neutral-200 bg-white p-3">
        <AdminButton
          variant="ghost"
          size="sm"
          onClick={() => onAction('archive', 'Pregunta archivada.')}
          disabled={isBusy}
          className="hidden sm:block"
        >
          Archivar
        </AdminButton>
        <div className="flex w-full justify-end space-x-2 sm:w-auto">
          <AdminButton
            variant="outline"
            size="sm"
            onClick={() => onAction('save_draft', 'Borrador guardado.')}
            disabled={isBusy}
          >
            Guardar borrador
          </AdminButton>
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => onAction('mark_reviewed', 'Pregunta revisada.')}
            disabled={isBusy}
            className="hidden md:block"
          >
            Aprobar revision
          </AdminButton>
          <AdminButton
            variant="primary"
            size="sm"
            onClick={() => onAction('publish', 'Pregunta publicada.')}
            disabled={isBusy}
          >
            Publicar
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
