import { startTransition, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuizRunner } from '../components/quiz/QuizRunner';
import { usePublishedCatalog } from '../hooks/usePublishedCatalog';
import { buildExamQuestionSet } from '../lib/quizFactory';
import type { ContentCatalog } from '../types/content';

type ActiveExam = {
  key: string;
  questions: ContentCatalog['questions'];
  maxScore: number;
  passingScore: number;
};

export function ExamPage() {
  const navigate = useNavigate();
  const { catalog, error: loadError, isLoading } = usePublishedCatalog(
    'No se pudo cargar el modo examen.',
  );
  const [buildError, setBuildError] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<ActiveExam | null>(null);

  const startExam = () => {
    if (!catalog) {
      return;
    }

    try {
      const questions = buildExamQuestionSet(catalog.questions, catalog.examRuleSet);

      setBuildError(null);
      startTransition(() => {
        setActiveExam({
          key: `${Date.now()}`,
          questions,
          maxScore: catalog.examRuleSet.maxPoints,
          passingScore: catalog.examRuleSet.passingPoints,
        });
      });
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : 'No se pudo construir el examen.');
    }
  };

  if (activeExam && catalog) {
    return (
      <QuizRunner
        key={activeExam.key}
        mode="exam"
        title="Simulación del examen teórico Clase B"
        subtitle="35 preguntas, 38 puntos posibles y aprobación con 33."
        questions={activeExam.questions}
        maxScore={activeExam.maxScore}
        passingScore={activeExam.passingScore}
        onRestart={() => setActiveExam(null)}
      />
    );
  }

  const error = loadError ?? buildError;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-50">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 shadow-sm md:py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            onClick={() => navigate('/')}
            aria-label="Volver a la página principal"
            className="rounded-xl px-2 py-1 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage-200"
            type="button"
          >
            Volver
          </button>
          <span className="inline-flex rounded-full bg-sage-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sage-600">
            Simulador
          </span>
          <div className="w-12" aria-hidden="true" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <section className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <div className="text-2xl font-black text-neutral-900">
                  {catalog?.examRuleSet.questionCount ?? 35}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-400">
                  preguntas
                </div>
              </article>
              <article className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <div className="text-2xl font-black text-neutral-900">
                  {catalog?.examRuleSet.maxPoints ?? 38}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-400">
                  puntos máximos
                </div>
              </article>
              <article className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <div className="text-2xl font-black text-neutral-900">
                  {catalog?.examRuleSet.passingPoints ?? 33}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-400">
                  para aprobar
                </div>
              </article>
              <article className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <div className="text-2xl font-black text-neutral-900">
                  {catalog?.examRuleSet.doubleWeightCount ?? 3}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-400">
                  preguntas dobles
                </div>
              </article>
            </div>

            {isLoading && (
              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-500">
                Cargando reglas de examen…
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-700">
                {error}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <button
            className="w-full rounded-2xl border-b-4 border-sage-800 bg-sage-600 px-6 py-3.5 text-base font-black text-white transition-all hover:border-sage-700 hover:bg-sage-500 active:translate-y-[4px] active:border-b-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage-200 disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:active:translate-y-0 disabled:active:border-b-4"
            type="button"
            onClick={startExam}
            disabled={isLoading || !catalog}
          >
            Iniciar examen
          </button>
        </div>
      </div>
    </div>
  );
}
