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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-6 shadow-sm md:py-7">
        <div className="mx-auto max-w-3xl">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
              mode === 'exam' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            {mode === 'exam' ? 'Resultado del examen' : 'Resultado final'}
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <section
            className={`rounded-[30px] border p-6 shadow-sm ${
              mode === 'exam'
                ? passed
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-rose-50'
                : 'border-indigo-200 bg-indigo-50'
            }`}
            aria-live="polite"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-4xl font-black tracking-tight text-slate-900">
                  {score}/{maxScore}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {mode === 'exam'
                    ? passed
                      ? `Aprobado con ${percentage}% del puntaje disponible.`
                      : `Reprobado. Se requieren ${passingScore} puntos para aprobar.`
                    : `Acertaste ${percentage}% del puntaje disponible.`}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
                {totalQuestions} preguntas revisadas
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Revision de respuestas
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
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
                        Pag. {question.sourcePage}
                      </span>
                      {outcome && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                            correct
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {correct
                            ? `+${outcome.pointsEarned} punto(s)`
                            : `0 de ${outcome.pointsAvailable}`}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-black leading-6 text-slate-900">
                      {question.prompt}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{question.instruction}</p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                      Respuesta correcta: {formatCorrectAnswers(question)}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <button
            className={`w-full rounded-2xl border-b-4 px-6 py-3.5 text-base font-black text-white transition-all active:translate-y-[4px] active:border-b-0 ${
              mode === 'exam'
                ? 'border-emerald-800 bg-emerald-600 hover:border-emerald-700 hover:bg-emerald-500'
                : 'border-indigo-800 bg-indigo-600 hover:border-indigo-700 hover:bg-indigo-500'
            }`}
            type="button"
            onClick={onRestart}
          >
            {mode === 'exam' ? 'Intentar otra simulacion' : 'Practicar de nuevo'}
          </button>
        </div>
      </div>
    </div>
  );
}
