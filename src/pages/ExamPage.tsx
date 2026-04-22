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

const ArrowLeftIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const ExamPageIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const DirectionMandatoryIcon = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" fill="white" stroke="#dc2626" strokeWidth="4" />
    <path d="M 6 10.5 L 13 10.5 L 13 7.5 L 19 12 L 13 16.5 L 13 13.5 L 6 13.5 Z" fill="black" />
  </svg>
);

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
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-6 md:pb-8 md:pt-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="mb-1 flex w-full items-center justify-between gap-3 border-b-4 border-[var(--color-border)] pb-3 text-[var(--color-text-primary)]">
            <div className="flex min-w-0 items-center gap-3">
              <ExamPageIcon />
              <h2 className="text-2xl font-black uppercase tracking-tighter md:text-3xl">
                Simulación
              </h2>
            </div>
            <button
              onClick={() => navigate('/')}
              aria-label="Volver a la página principal"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition hover:-translate-x-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
              type="button"
            >
              <ArrowLeftIcon />
              <span className="hidden sm:inline">Volver</span>
            </button>
          </div>

          <section
            className="rounded-[28px] p-4 shadow-sm transition-colors duration-200 md:p-5"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              borderWidth: '1px',
            }}
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              <article
                className="rounded-2xl px-3 py-3 transition-colors duration-200 md:px-4 md:py-4"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-border)',
                  borderWidth: '1px',
                }}
              >
                <div
                  className="text-xl font-black transition-colors duration-200 md:text-2xl"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {catalog?.examRuleSet.questionCount ?? 35}
                </div>
                <div
                  className="mt-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 md:text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  preguntas
                </div>
              </article>
              <article
                className="rounded-2xl px-3 py-3 transition-colors duration-200 md:px-4 md:py-4"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-border)',
                  borderWidth: '1px',
                }}
              >
                <div
                  className="text-xl font-black transition-colors duration-200 md:text-2xl"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {catalog?.examRuleSet.maxPoints ?? 38}
                </div>
                <div
                  className="mt-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 md:text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  máximo
                </div>
              </article>
              <article
                className="rounded-2xl px-3 py-3 transition-colors duration-200 md:px-4 md:py-4"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-border)',
                  borderWidth: '1px',
                }}
              >
                <div
                  className="text-xl font-black transition-colors duration-200 md:text-2xl"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {catalog?.examRuleSet.passingPoints ?? 33}
                </div>
                <div
                  className="mt-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 md:text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  aprobación
                </div>
              </article>
              <article
                className="rounded-2xl px-3 py-3 transition-colors duration-200 md:px-4 md:py-4"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-border)',
                  borderWidth: '1px',
                }}
              >
                <div
                  className="text-xl font-black transition-colors duration-200 md:text-2xl"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {catalog?.examRuleSet.doubleWeightCount ?? 3}
                </div>
                <div
                  className="mt-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 md:text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  dobles
                </div>
              </article>
            </div>

            {isLoading && (
              <div
                className="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  borderWidth: '1px',
                }}
              >
                Cargando reglas de examen…
              </div>
            )}

            {error && (
              <div
                className="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold text-warning-700 transition-colors duration-200"
                style={{
                  borderColor: 'var(--color-warning-200)',
                  backgroundColor: 'var(--color-warning-50)',
                  borderWidth: '1px',
                }}
              >
                {error}
              </div>
            )}
          </section>
        </div>
      </div>

      <div
        className="shrink-0 px-4 py-3 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
          borderTopWidth: '1px',
        }}
      >
        <div className="mx-auto max-w-3xl">
          <button
            className="flex w-full items-center justify-center gap-4 rounded-[2rem] border-[10px] border-black bg-white py-5 text-2xl font-black uppercase tracking-widest text-black shadow-xl transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage-200 disabled:cursor-not-allowed disabled:opacity-50 md:py-6"
            type="button"
            onClick={startExam}
            disabled={isLoading || !catalog}
          >
            <DirectionMandatoryIcon />
            Iniciar Examen
          </button>
        </div>
      </div>
    </div>
  );
}
