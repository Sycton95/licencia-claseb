import type { Question } from '../types/quiz';

type QuizSummaryProps = {
  questions: Question[];
  score: number;
  onRestart: () => void;
};

export function QuizSummary({ questions, score, onRestart }: QuizSummaryProps) {
  const totalQuestions = questions.length;
  const percentage = totalQuestions === 0 ? 0 : Math.round((score / totalQuestions) * 100);

  return (
    <section className="panel">
      <span className="eyebrow">Resultado final</span>
      <h2 className="hero-title">Terminaste la práctica</h2>
      <p className="hero-copy">
        Obtuviste {score} de {totalQuestions} respuestas correctas ({percentage}%).
      </p>

      <div className="score-badge">
        <strong>
          {score}/{totalQuestions}
        </strong>
        <span>Semana 1 · Manual 2026</span>
      </div>

      <div className="review-list">
        {questions.map((question) => (
          <article key={question.id} className="review-card">
            <span className="review-page">Pág. {question.sourcePage}</span>
            <h3>{question.question}</h3>
            <p>{question.options[question.correctIndex]}</p>
          </article>
        ))}
      </div>

      <button className="primary-button" type="button" onClick={onRestart}>
        Practicar con otras preguntas
      </button>
    </section>
  );
}
