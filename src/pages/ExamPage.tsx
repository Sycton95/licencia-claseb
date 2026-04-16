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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="shrink-0 px-4 py-3 shadow-sm md:py-4 transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', borderBottomWidth: '1px' }}>
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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 md:px-6 md:py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <section className="rounded-[28px] p-4 shadow-sm md:p-5 transition-colors duration-200" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', borderWidth: '1px' }}>
            <div className="grid gap-2 md:gap-3 grid-cols-2 md:grid-cols-4">
              <article className="rounded-2xl px-3 py-3 md:px-4 md:py-4 transition-colors duration-200" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-border)', borderWidth: '1px' }}>
                <div className="text-xl font-black md:text-2xl transition-colors duration-200" style={{ color: 'var(--color-text-primary)' }}>
                  {catalog?.examRuleSet.questionCount ?? 35}
                </div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide md:text-xs transition-colors duration-200" style={{ color: 'var(--color-text-secondary)' }}>
                  preguntas
                </div>
              </article>
              <article className="rounded-2xl px-3 py-3 md:px-4 md:py-4 transition-colors duration-200" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-border)', borderWidth: '1px' }}>
                <div className="text-xl font-black md:text-2xl transition-colors duration-200" style={{ color: 'var(--color-text-primary)' }}>
                  {catalog?.examRuleSet.maxPoints ?? 38}
                </div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide md:text-xs transition-colors duration-200" style={{ color: 'var(--color-text-secondary)' }}>
                  máximo
                </div>
              </article>
              <article className="rounded-2xl px-3 py-3 md:px-4 md:py-4 transition-colors duration-200" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-border)', borderWidth: '1px' }}>
                <div className="text-xl font-black md:text-2xl transition-colors duration-200" style={{ color: 'var(--color-text-primary)' }}>
                  {catalog?.examRuleSet.passingPoints ?? 33}
                </div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide md:text-xs transition-colors duration-200" style={{ color: 'var(--color-text-secondary)' }}>
                  aprobación
                </div>
              </article>
              <article className="rounded-2xl px-3 py-3 md:px-4 md:py-4 transition-colors duration-200" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-border)', borderWidth: '1px' }}>
                <div className="text-xl font-black md:text-2xl transition-colors duration-200" style={{ color: 'var(--color-text-primary)' }}>
                  {catalog?.examRuleSet.doubleWeightCount ?? 3}
                </div>
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide md:text-xs transition-colors duration-200" style={{ color: 'var(--color-text-secondary)' }}>
                  dobles
                </div>
              </article>
            </div>

            {isLoading && (
              <div className="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)', borderWidth: '1px' }}>
                Cargando reglas de examen…
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold text-warning-700 transition-colors duration-200" style={{ borderColor: 'var(--color-warning-200)', backgroundColor: 'var(--color-warning-50)', borderWidth: '1px' }}>
                {error}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', borderTopWidth: '1px' }}>
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
