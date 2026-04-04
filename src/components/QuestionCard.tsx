import type { Question } from '../types/content';

type QuestionCardProps = {
  question: Question;
  selectedOptionIds: string[];
  isAnswered: boolean;
  onSelect: (optionId: string) => void;
  onConfirm: () => void;
  onNext: () => void;
};

export function QuestionCard({
  question,
  selectedOptionIds,
  isAnswered,
  onSelect,
  onConfirm,
  onNext,
}: QuestionCardProps) {
  return (
    <section className="panel">
      <div className="question-meta">
        <span className="eyebrow">Manual oficial · pág. {question.sourcePage}</span>
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

      <h2 className="question-title">{question.prompt}</h2>
      <p className="question-instruction">{question.instruction}</p>

      <div className="option-list" role="list" aria-label="Opciones de respuesta">
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
            >
              <span className="option-letter">{option.label}</span>
              <span>{option.text}</span>
            </button>
          );
        })}
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
        <button className="secondary-button" type="button" onClick={onNext}>
          Siguiente pregunta
        </button>
      )}
    </section>
  );
}
