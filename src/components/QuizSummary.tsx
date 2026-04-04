import type { Question, QuizMode } from '../types/content';
import type { QuestionOutcome } from '../types/quiz';

type QuizSummaryProps = {
  mode: QuizMode;
  title: string;
  subtitle: string;
  questions: Question[];
  outcomes: QuestionOutcome[];
  score: number;
  maxScore: number;
  passingScore?: number;
  onRestart: () => void;
};

function formatCorrectAnswers(question: Question) {
  return question.options
    .filter((option) => option.isCorrect)
    .map((option) => `${option.label}. ${option.text}`)
    .join(' · ');
}

export function QuizSummary({
  mode,
  title,
  subtitle,
  questions,
  outcomes,
  score,
  maxScore,
  passingScore,
  onRestart,
}: QuizSummaryProps) {
  const totalQuestions = questions.length;
  const percentage = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  const passed = typeof passingScore === 'number' ? score >= passingScore : undefined;

  return (
    <section className="panel">
      <span className="eyebrow">{mode === 'exam' ? 'Resultado del examen' : 'Resultado final'}</span>
      <h2 className="hero-title">{title}</h2>
      <p className="hero-copy">{subtitle}</p>

      <div className="score-badge">
        <strong>
          {score}/{maxScore}
        </strong>
        <span>
          {mode === 'exam'
            ? passed
              ? `Aprobado con ${percentage}% del puntaje disponible`
              : `Reprobado. Se requieren ${passingScore} puntos`
            : `Acertaste ${percentage}% del puntaje disponible`}
        </span>
      </div>

      <div className="review-list">
        {questions.map((question) => {
          const outcome = outcomes.find((item) => item.questionId === question.id);

          return (
            <article key={question.id} className="review-card">
              <span className="review-page">Pág. {question.sourcePage}</span>
              <h3>{question.prompt}</h3>
              <p className="review-instruction">{question.instruction}</p>
              <p className="review-answer">{formatCorrectAnswers(question)}</p>
              {outcome && (
                <p className="review-points">
                  {outcome.isCorrect
                    ? `Sumaste ${outcome.pointsEarned} punto(s)`
                    : `No sumaste puntos de ${outcome.pointsAvailable} posibles`}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <button className="primary-button" type="button" onClick={onRestart}>
        {mode === 'exam' ? 'Intentar otra simulación' : 'Practicar de nuevo'}
      </button>
      <p className="summary-footnote">{totalQuestions} preguntas revisadas en este intento.</p>
    </section>
  );
}
