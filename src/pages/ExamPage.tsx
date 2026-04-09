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
        title="Simulacion del examen teorico Clase B"
        subtitle="35 preguntas, 38 puntos posibles y aprobacion con 33."
        questions={activeExam.questions}
        maxScore={activeExam.maxScore}
        passingScore={activeExam.passingScore}
        onRestart={() => setActiveExam(null)}
      />
    );
  }

  const error = loadError ?? buildError;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-6 shadow-sm md:py-7">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => navigate('/')}
            className="mb-3 flex items-center text-xs font-bold text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Volver al menu
          </button>
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
            Simulador oficial
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Entra a una prueba completa
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            La simulacion mantiene reglas oficiales verificadas y ponderacion especial para
            preguntas de alta criticidad.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto grid w-full max-w-3xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Reglas de esta simulacion
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Esta experiencia replica la estructura de puntaje del examen Clase B usando solo
                preguntas publicadas y elegibles.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-2xl font-black text-slate-900">
                  {catalog?.examRuleSet.questionCount ?? 35}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  preguntas
                </div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-2xl font-black text-slate-900">
                  {catalog?.examRuleSet.maxPoints ?? 38}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  puntos maximos
                </div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-2xl font-black text-slate-900">
                  {catalog?.examRuleSet.passingPoints ?? 33}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  puntos para aprobar
                </div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-2xl font-black text-slate-900">
                  {catalog?.examRuleSet.doubleWeightCount ?? 3}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  preguntas dobles
                </div>
              </article>
            </div>

            {isLoading && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                Cargando reglas de examen...
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <article className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-sm shadow-emerald-950/20">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100">
                Alcance
              </span>
              <h2 className="mt-3 text-xl font-black tracking-tight">
                Reglas verificadas, tiempo no fijado
              </h2>
              <p className="mt-3 text-sm leading-7 text-emerald-50/90">
                No se muestra una duracion oficial mientras no exista una fuente primaria
                equivalente que lo confirme con claridad.
              </p>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Banco activo
              </span>
              <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900">
                {catalog?.activeEdition?.title ?? 'Catalogo publicado'}
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                El examen se construye con preguntas ya publicadas y marcadas como elegibles para
                asegurar consistencia editorial.
              </p>
            </article>
          </aside>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <button
            className="w-full rounded-2xl border-b-4 border-emerald-800 bg-emerald-600 px-6 py-3.5 text-base font-black text-white transition-all hover:border-emerald-700 hover:bg-emerald-500 active:translate-y-[4px] active:border-b-0 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:translate-y-0 disabled:active:border-b-4"
            type="button"
            onClick={startExam}
            disabled={isLoading || !catalog}
          >
            Comenzar simulacion
          </button>
        </div>
      </div>
    </div>
  );
}
