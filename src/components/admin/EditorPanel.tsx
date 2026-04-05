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
  if (!draftQuestion) {
    return (
      <section className="panel admin-surface admin-editor-panel admin-editor-panel--empty">
        <div className="admin-empty-state">
          <span className="eyebrow">Editor</span>
          <h3 className="section-title">Selecciona una pregunta</h3>
          <p className="info-text">
            Desde Catálogo puedes abrir una pregunta existente. Desde Cola AI puedes cargar una sugerencia al editor o convertirla en draft.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel admin-surface admin-editor-panel">
      <div className="admin-editor-panel__head">
        <div>
          <span className="eyebrow">Editor</span>
          <h3 className="section-title">Edición manual</h3>
          <p className="info-text">
            Estado {draftQuestion.status} · Fuente {draftQuestion.sourceReference ?? `Pág. ${draftQuestion.sourcePage}`}
          </p>
        </div>
        <div className="admin-inline-chip admin-inline-chip--subtle">
          Edición {activeEditionCode ?? draftQuestion.editionId}
        </div>
      </div>

      <div className="admin-editor-panel__body">
        <div className="field-grid">
          <label className="field field--full">
            <span>Enunciado</span>
            <textarea
              rows={4}
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
              onChange={(event) => onQuestionField('selectionMode', event.target.value as SelectionMode)}
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
              rows={3}
              value={draftQuestion.publicExplanation ?? ''}
              onChange={(event) => onQuestionField('publicExplanation', event.target.value)}
            />
          </label>
          <label className="field field--full">
            <span>Notas editoriales</span>
            <textarea
              rows={3}
              value={draftQuestion.reviewNotes ?? ''}
              onChange={(event) => onQuestionField('reviewNotes', event.target.value)}
            />
          </label>
        </div>

        <div className="field-inline">
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
          <h3>Opciones</h3>
          {draftQuestion.options.map((option) => (
            <div key={option.id} className="admin-option-row">
              <span className="option-letter">{option.label}</span>
              <input value={option.text} onChange={(event) => onOptionText(option.id, event.target.value)} />
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

        <div className="admin-preview admin-preview--compact">
          <h3>Vista previa</h3>
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
        </div>
      </div>

      <div className="admin-editor-panel__footer">
        <button
          className="primary-button"
          type="button"
          onClick={() => onEditorialAction('save', 'Cambios guardados correctamente.')}
          disabled={isBusy}
        >
          Guardar
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => onEditorialAction('mark_reviewed', 'Pregunta marcada como revisada.')}
          disabled={isBusy}
        >
          Marcar revisada
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => onEditorialAction('publish', 'Pregunta publicada correctamente.')}
          disabled={isBusy}
        >
          Publicar
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => onEditorialAction('archive', 'Pregunta archivada correctamente.')}
          disabled={isBusy}
        >
          Archivar
        </button>
      </div>
    </section>
  );
}
