import type { Question } from '../types/quiz';

type QuestionCardProps = {
  question: Question;
  selectedOption: number | null;
  isAnswered: boolean;
  onSelect: (index: number) => void;
  onConfirm: () => void;
  onNext: () => void;
};

export function QuestionCard({
  question,
  selectedOption,
  isAnswered,
  onSelect,
  onConfirm,
  onNext,
}: QuestionCardProps) {
  return (
    <section className="panel">
      <span className="eyebrow">Manual oficial · pág. {question.sourcePage}</span>
      <h2 className="question-title">{question.question}</h2>

      <div className="option-list" role="list" aria-label="Opciones de respuesta">
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctIndex;
          const isSelected = selectedOption === index;

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
              key={`${question.id}-${index}`}
              className={className}
              type="button"
              onClick={() => onSelect(index)}
              disabled={isAnswered}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {!isAnswered ? (
        <button
          className="primary-button"
          type="button"
          onClick={onConfirm}
          disabled={selectedOption === null}
        >
          Comprobar respuesta
        </button>
      ) : (
        <button className="secondary-button" type="button" onClick={onNext}>
          Siguiente pregunta
        </button>
      )}
    </section>
  );
}
