import { useMemo } from 'react';
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
  const outcomesByQuestionId = useMemo(
    () => new Map(outcomes.map((outcome) => [outcome.questionId, outcome])),
    [outcomes],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-50">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-6 shadow-sm md:py-7">
        <div className="mx-auto max-w-3xl">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
              mode === 'exam' ? 'bg-sage-50 text-sage-600' : 'bg-primary-50 text-primary-600'
            }`}
          >
            {mode === 'exam' ? 'Resultado del examen' : 'Resultado final'}
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-neutral-900 md:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <section
            className={`rounded-[30px] border p-6 shadow-sm ${
              mode === 'exam'
                ? passed
                  ? 'border-sage-200 bg-sage-50'
                  : 'border-warning-200 bg-warning-50'
                : 'border-primary-200 bg-primary-50'
            }`}
            aria-live="polite"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-4xl font-black tracking-tight text-neutral-900">
                  {score}/{maxScore}
                </div>
                <p className="mt-2 text-sm leading-7 text-neutral-600">
                  {mode === 'exam'
                    ? passed
                      ? `Aprobado con ${percentage}% del puntaje disponible.`
                      : `Reprobado. Se requieren ${passingScore} puntos para aprobar.`
                    : `Acertaste ${percentage}% del puntaje disponible.`}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold text-neutral-600 shadow-sm">
                {totalQuestions} preguntas revisadas
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              Revisión de respuestas
            </h2>

            <div className="mt-4 space-y-3">
              {questions.map((question) => {
                const outcome = outcomesByQuestionId.get(question.id);
                const correct = outcome?.isCorrect ?? false;

                return (
                  <article
                    key={question.id}
                    className={`rounded-2xl border px-4 py-4 ${
                      correct
                        ? 'border-success-200 bg-success-50/70'
                        : 'border-neutral-200 bg-neutral-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-neutral-500">
                        Pág. {question.sourcePage}
                      </span>
                      {outcome && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                            correct
                              ? 'bg-success-100 text-success-700'
                              : 'bg-warning-100 text-warning-700'
                          }`}
                        >
                          {correct
                            ? `+${outcome.pointsEarned} punto(s)`
                            : `0 de ${outcome.pointsAvailable}`}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-black leading-6 text-neutral-900">
                      {question.prompt}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">{question.instruction}</p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-neutral-700">
                      Respuesta correcta: {formatCorrectAnswers(question)}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <button
            className={`w-full rounded-2xl border-b-4 px-6 py-3.5 text-base font-black text-white transition-all active:translate-y-[4px] active:border-b-0 focus-visible:outline-none focus-visible:ring-4 ${
              mode === 'exam'
                ? 'border-sage-800 bg-sage-600 hover:border-sage-700 hover:bg-sage-500 focus-visible:ring-sage-200'
                : 'border-primary-800 bg-primary-600 hover:border-primary-700 hover:bg-primary-500 focus-visible:ring-primary-200'
            }`}
            type="button"
            onClick={onRestart}
          >
            {mode === 'exam' ? 'Intentar otra simulación' : 'Crear otra práctica'}
          </button>
        </div>
      </div>
    </div>
  );
}
