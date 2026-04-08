import type { Question } from '../types/content';

type QuestionCardProps = {
  question: Question;
  selectedOptionIds: string[];
  isAnswered: boolean;
  showReference: boolean;
  onSelect: (optionId: string) => void;
  onConfirm: () => void;
  onNext: () => void;
  onToggleReference: () => void;
};

export function QuestionCard({
  question,
  selectedOptionIds,
  isAnswered,
  showReference,
  onSelect,
  onConfirm,
  onNext,
  onToggleReference,
}: QuestionCardProps) {
  const hasQuickReference = Boolean(question.sourceReference || question.publicExplanation);
  const optionGroupLabel =
    question.selectionMode === 'multiple'
      ? 'Opciones de respuesta de selección múltiple'
      : 'Opciones de respuesta de selección única';

  return (
    <section className="panel question-card-shell">
      <div className="question-meta">
        <span className="eyebrow">Manual oficial · página {question.sourcePage}</span>
        <span className="question-mode">
          {question.selectionMode === 'multiple' ? 'Selección múltiple' : 'Selección única'}
        </span>
      </div>

      {question.media[0] && (
        <figure className="question-figure">
          <img
            className="question-image"
            src={question.media[0].url}
            alt={question.media[0].altText}
            loading="lazy"
          />
        </figure>
      )}

      <div className="question-body">
        <div className="question-copy">
          <h2 className="question-title">{question.prompt}</h2>
          <p className="question-instruction">{question.instruction}</p>
        </div>

        <div className="option-list" role="group" aria-label={optionGroupLabel}>
          {question.options.map((option) => {
            const isCorrect = option.isCorrect;
            const isSelected = selectedOptionIds.includes(option.id);

            let className = 'option-button';

            if (isAnswered && isCorrect) {
              className += ' option-button--correct';
            } else if (isAnswered && isSelected) {
              className += ' option-button--wrong';
            } else if (!isAnswered && isSelected) {
              className += ' option-button--selected';
            } else if (isAnswered) {
              className += ' option-button--muted';
            }

            return (
              <button
                key={option.id}
                className={className}
                type="button"
                onClick={() => onSelect(option.id)}
                disabled={isAnswered}
                aria-pressed={isSelected}
                aria-label={`${option.label}. ${option.text}`}
              >
                <span className="option-letter">{option.label}</span>
                <span>{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!isAnswered ? (
        <button
          className="primary-button"
          type="button"
          onClick={onConfirm}
          disabled={selectedOptionIds.length === 0}
        >
          {question.selectionMode === 'multiple' ? 'Comprobar respuestas' : 'Comprobar respuesta'}
        </button>
      ) : (
        <div className="question-action-row">
          {hasQuickReference && (
            <button
              className="question-reference-button"
              type="button"
              onClick={onToggleReference}
              aria-expanded={showReference}
            >
              {showReference ? 'Ocultar referencia' : 'Referencia rápida'}
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onNext}>
            Siguiente pregunta
          </button>
        </div>
      )}

      {isAnswered && hasQuickReference && showReference && (
        <aside className="reference-overlay" aria-label="Referencia rápida">
          <div className="reference-overlay__head">
            <strong>Referencia rápida</strong>
            <span>Página {question.sourcePage}</span>
          </div>
          {question.sourceReference && <p>{question.sourceReference}</p>}
          {question.publicExplanation && <p>{question.publicExplanation}</p>}
        </aside>
      )}
    </section>
  );
}
