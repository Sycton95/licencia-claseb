import { useEffect, useState } from 'react';
import { QuestionCard } from '../QuestionCard';
import type { ContentCatalog, Question, SelectionMode } from '../../types/content';

type EditorPanelProps = {
  activeEditionCode?: string;
  catalog: ContentCatalog | null;
  draftQuestion: Question | null;
  isBusy: boolean;
  onEditorialAction: (
    action: 'save' | 'mark_reviewed' | 'publish' | 'archive',
    successMessage: string,
    notes?: string,
  ) => void;
  onOptionCorrect: (optionId: string, checked: boolean) => void;
  onOptionText: (optionId: string, text: string) => void;
  onQuestionField: <Key extends keyof Question>(field: Key, value: Question[Key]) => void;
};

export function EditorPanel({
  activeEditionCode,
  catalog,
  draftQuestion,
  isBusy,
  onEditorialAction,
  onOptionCorrect,
  onOptionText,
  onQuestionField,
}: EditorPanelProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    setIsPreviewOpen(false);
  }, [draftQuestion?.id]);

  if (!draftQuestion) {
    return (
      <section className="panel admin-surface admin-editor-panel admin-editor-panel--empty">
        <div className="admin-empty-state">
          <span className="eyebrow">Editor</span>
          <h3 className="section-title">Selecciona una pregunta</h3>
          <p className="info-text">
            Desde Catálogo puedes abrir una pregunta existente. Desde Cola AI puedes cargar una
            sugerencia al editor o convertirla en draft.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel admin-surface admin-editor-panel">
      <div className="admin-editor-panel__head">
        <div className="admin-editor-panel__heading">
          <span className="eyebrow">Editor</span>
          <div>
            <h3 className="section-title">Edición manual</h3>
            <p className="info-text">
              Estado {draftQuestion.status} · Fuente{' '}
              {draftQuestion.sourceReference ?? `Pág. ${draftQuestion.sourcePage}`}
            </p>
          </div>
        </div>
        <div className="admin-editor-panel__head-meta">
          <span className="admin-inline-chip admin-inline-chip--subtle">
            Edición {activeEditionCode ?? draftQuestion.editionId}
          </span>
          <span className="admin-inline-chip admin-inline-chip--subtle">
            {draftQuestion.selectionMode === 'multiple' ? 'Respuesta múltiple' : 'Respuesta única'}
          </span>
        </div>
      </div>

      <div className="admin-editor-panel__body">
        <div className="field-grid admin-editor-panel__fields">
          <label className="field field--full">
            <span>Enunciado</span>
            <textarea
              rows={5}
              value={draftQuestion.prompt}
              onChange={(event) => onQuestionField('prompt', event.target.value)}
            />
          </label>
          <label className="field">
            <span>Capítulo</span>
            <select
              value={draftQuestion.chapterId}
              onChange={(event) => onQuestionField('chapterId', event.target.value)}
            >
              {catalog?.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.code} · {chapter.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Modo de respuesta</span>
            <select
              value={draftQuestion.selectionMode}
              onChange={(event) =>
                onQuestionField('selectionMode', event.target.value as SelectionMode)
              }
            >
              <option value="single">single</option>
              <option value="multiple">multiple</option>
            </select>
          </label>
          <label className="field">
            <span>Documento fuente</span>
            <select
              value={draftQuestion.sourceDocumentId}
              onChange={(event) => onQuestionField('sourceDocumentId', event.target.value)}
            >
              {catalog?.sourceDocuments.map((sourceDocument) => (
                <option key={sourceDocument.id} value={sourceDocument.id}>
                  {sourceDocument.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Página fuente</span>
            <input
              type="number"
              value={draftQuestion.sourcePage}
              onChange={(event) => onQuestionField('sourcePage', Number(event.target.value))}
            />
          </label>
          <label className="field field--full">
            <span>Referencia fuente</span>
            <input
              value={draftQuestion.sourceReference ?? ''}
              onChange={(event) => onQuestionField('sourceReference', event.target.value)}
              placeholder="Pág. 35, tabla principal, figura 2, etc."
            />
          </label>
          <label className="field field--full">
            <span>Instrucción</span>
            <input
              value={draftQuestion.instruction}
              onChange={(event) => onQuestionField('instruction', event.target.value)}
            />
          </label>
          <label className="field field--full">
            <span>Explicación pública opcional</span>
            <textarea
              rows={4}
              value={draftQuestion.publicExplanation ?? ''}
              onChange={(event) => onQuestionField('publicExplanation', event.target.value)}
            />
          </label>
          <label className="field field--full">
            <span>Notas editoriales</span>
            <textarea
              rows={4}
              value={draftQuestion.reviewNotes ?? ''}
              onChange={(event) => onQuestionField('reviewNotes', event.target.value)}
            />
          </label>
        </div>

        <div className="field-inline admin-editor-panel__toggles">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draftQuestion.isOfficialExamEligible}
              onChange={(event) => onQuestionField('isOfficialExamEligible', event.target.checked)}
            />
            <span>Apta para modo examen</span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={draftQuestion.doubleWeight}
              onChange={(event) => onQuestionField('doubleWeight', event.target.checked)}
            />
            <span>Doble puntuación</span>
          </label>
        </div>

        <div className="admin-options">
          <div className="admin-options__head">
            <h3>Opciones</h3>
            <span className="info-text">
              Marca las correctas según el modo de respuesta de la pregunta.
            </span>
          </div>
          <div className="admin-option-list">
            {draftQuestion.options.map((option) => (
              <div key={option.id} className="admin-option-row">
                <span className="option-letter">{option.label}</span>
                <input
                  value={option.text}
                  onChange={(event) => onOptionText(option.id, event.target.value)}
                />
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={option.isCorrect}
                    onChange={(event) => onOptionCorrect(option.id, event.target.checked)}
                  />
                  <span>Correcta</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <section className="admin-preview admin-preview--compact">
          <div className="admin-preview__head admin-preview__head--interactive">
            <div>
              <h3>Vista previa</h3>
              <span className="info-text">Se mantiene plegada para priorizar la edición.</span>
            </div>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={() => setIsPreviewOpen((current) => !current)}
            >
              {isPreviewOpen ? 'Ocultar preview' : 'Mostrar preview'}
            </button>
          </div>

          {isPreviewOpen && (
            <QuestionCard
              question={draftQuestion}
              selectedOptionIds={[]}
              isAnswered={false}
              showReference={false}
              onSelect={() => {}}
              onConfirm={() => {}}
              onNext={() => {}}
              onToggleReference={() => {}}
            />
          )}
        </section>

        <div className="admin-editor-panel__footer admin-editor-panel__footer--inline">
          <div className="admin-editor-panel__footer-copy">
            <strong>{draftQuestion.id}</strong>
            <span>Los cambios quedan dentro del flujo editorial actual.</span>
          </div>
          <div className="admin-editor-panel__footer-actions">
            <button
              className="primary-button secondary-button--compact"
              type="button"
              onClick={() => onEditorialAction('save', 'Cambios guardados correctamente.')}
              disabled={isBusy}
            >
              Guardar
            </button>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={() => onEditorialAction('mark_reviewed', 'Pregunta marcada como revisada.')}
              disabled={isBusy}
            >
              Revisada
            </button>
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={() => onEditorialAction('publish', 'Pregunta publicada correctamente.')}
              disabled={isBusy}
            >
              Publicar
            </button>
            <button
              className="secondary-button secondary-button--compact secondary-button--danger"
              type="button"
              onClick={() => onEditorialAction('archive', 'Pregunta archivada correctamente.')}
              disabled={isBusy}
            >
              Archivar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
