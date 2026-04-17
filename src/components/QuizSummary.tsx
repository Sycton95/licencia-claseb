import { useMemo, useState } from 'react';
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

type ReviewFilter = 'all' | 'correct' | 'incorrect';

function formatCorrectAnswers(question: Question) {
  return question.options
    .filter((option) => option.isCorrect)
    .map((option) => `${option.label}. ${option.text}`)
    .join(' · ');
}

function getPerformanceTier(percentage: number): { tier: string; color: string } {
  if (percentage >= 80) {
    return { tier: 'Excelente', color: 'text-sage-700' };
  }
  if (percentage >= 60) {
    return { tier: 'Bueno', color: 'text-primary-700' };
  }
  return { tier: 'Necesita mejorar', color: 'text-warning-700' };
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
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');

  const totalQuestions = questions.length;
  const percentage = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  const passed = typeof passingScore === 'number' ? score >= passingScore : undefined;
  const performanceTier = getPerformanceTier(percentage);

  const outcomesByQuestionId = useMemo(
    () => new Map(outcomes.map((outcome) => [outcome.questionId, outcome])),
    [outcomes],
  );

  const correctCount = outcomes.filter((outcome) => outcome.isCorrect).length;
  const incorrectCount = outcomes.filter((outcome) => !outcome.isCorrect).length;

  // Category breakdown
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { correct: number; total: number }>();

    questions.forEach((question) => {
      const outcome = outcomesByQuestionId.get(question.id);
      const category = question.chapterId || 'Sin categoría';

      if (!stats.has(category)) {
        stats.set(category, { correct: 0, total: 0 });
      }

      const stat = stats.get(category)!;
      stat.total += 1;
      if (outcome?.isCorrect) {
        stat.correct += 1;
      }
    });

    return Array.from(stats.entries()).map(([category, stat]) => ({
      category,
      correct: stat.correct,
      total: stat.total,
      percentage: stat.total === 0 ? 0 : Math.round((stat.correct / stat.total) * 100),
    }));
  }, [questions, outcomesByQuestionId]);

  // Filtered questions for review
  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const outcome = outcomesByQuestionId.get(question.id);
      if (!outcome) return false;

      if (reviewFilter === 'correct') return outcome.isCorrect;
      if (reviewFilter === 'incorrect') return !outcome.isCorrect;
      return true;
    });
  }, [questions, outcomesByQuestionId, reviewFilter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="shrink-0 px-4 py-6 shadow-sm md:py-7 transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', borderBottomWidth: '1px' }}>
        <div className="mx-auto max-w-3xl">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
              mode === 'exam' ? 'bg-sage-50 text-sage-600' : 'bg-primary-50 text-primary-600'
            }`}
          >
            {mode === 'exam' ? 'Resultado del examen' : 'Resultado final'}
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl transition-colors duration-200" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h1>
          <p className="mt-1 text-sm transition-colors duration-200" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {/* Results Card */}
          <section
            className={`rounded-[30px] border p-6 shadow-sm ${
              mode === 'exam'
                ? passed
                  ? 'border-sage-200 bg-sage-50'
                  : 'border-warning-200 bg-warning-50'
                : 'border-primary-200 bg-primary-50'
            }`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-5xl font-black tracking-tight text-neutral-900">
                    {score}/{maxScore}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-sm font-bold ${performanceTier.color}`}>
                      {performanceTier.tier}
                    </span>
                    <span className="text-2xl font-black text-neutral-900">{percentage}%</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-neutral-700">
                    {mode === 'exam'
                      ? passed
                        ? `¡Excelente! Aprobaste con éxito. ${totalQuestions - incorrectCount} respuestas correctas.`
                        : `Necesitas ${passingScore! - score} puntos más para aprobar.`
                      : `Acertaste ${correctCount} de ${totalQuestions} preguntas.`}
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm">
                    <div className="text-sm font-bold text-success-600">{correctCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Correctas</div>
                  </div>
                  <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm">
                    <div className="text-sm font-bold text-warning-600">{incorrectCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Incorrectas</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Category Breakdown */}
          {categoryStats.length > 0 && (
            <section
              className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6"
              aria-label="Desglose de desempeño por categoría o capítulo"
            >
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Desempeño por categoría
              </h2>

              <div className="mt-4 space-y-2">
                {categoryStats.map((stat) => (
                  <div key={stat.category} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-neutral-900 truncate">
                          {stat.category}
                        </span>
                        <span className="text-xs font-bold text-neutral-600">
                          {stat.correct}/{stat.total}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className={`h-full ${
                            stat.percentage >= 80 ? 'bg-sage-500' : stat.percentage >= 60 ? 'bg-primary-500' : 'bg-warning-500'
                          }`}
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-neutral-600 w-8 text-right">{stat.percentage}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Review Filters */}
          <section
            className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm md:p-6"
            aria-label="Revisión detallada de respuestas con opción de filtrado"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Revisión de respuestas
              </h2>
              <div className="flex gap-2" role="group" aria-label="Filtrar respuestas">
                {(['all', 'correct', 'incorrect'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setReviewFilter(filter)}
                    aria-pressed={reviewFilter === filter}
                    aria-label={filter === 'all' ? `Todas las respuestas (${totalQuestions})` : filter === 'correct' ? `Solo respuestas correctas (${correctCount})` : `Solo respuestas incorrectas (${incorrectCount})`}
                    className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors md:min-h-0 ${
                      reviewFilter === filter
                        ? filter === 'correct'
                          ? 'bg-success-600 text-white'
                          : filter === 'incorrect'
                            ? 'bg-warning-600 text-white'
                            : 'bg-primary-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                    type="button"
                  >
                    {filter === 'all' ? `Todas (${totalQuestions})` : filter === 'correct' ? `Correctas (${correctCount})` : `Incorrectas (${incorrectCount})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredQuestions.map((question) => {
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
