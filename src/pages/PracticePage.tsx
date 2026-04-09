import { startTransition, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuizRunner } from '../components/quiz/QuizRunner';
import { usePublishedCatalog } from '../hooks/usePublishedCatalog';
import {
  buildPracticeQuestionSet,
  getChapterQuestionCount,
  getDefaultPracticeQuestionCount,
} from '../lib/quizFactory';
import type { ContentCatalog } from '../types/content';

type ActivePractice = {
  key: string;
  title: string;
  subtitle: string;
  questions: ContentCatalog['questions'];
  maxScore: number;
};

export function PracticePage() {
  const navigate = useNavigate();
  const { catalog, error, isLoading } = usePublishedCatalog(
    'No se pudo cargar la practica personalizada.',
  );
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [activePractice, setActivePractice] = useState<ActivePractice | null>(null);

  useEffect(() => {
    if (!catalog) {
      return;
    }

    const availableChapterIds = catalog.chapters
      .filter((chapter) => getChapterQuestionCount(catalog.questions, chapter.id) > 0)
      .map((chapter) => chapter.id);

    setSelectedChapterIds(availableChapterIds);
    setQuestionCount(getDefaultPracticeQuestionCount(catalog.questions));
  }, [catalog]);

  const chapterCards = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return catalog.chapters.map((chapter) => ({
      ...chapter,
      questionCount: getChapterQuestionCount(catalog.questions, chapter.id),
    }));
  }, [catalog]);

  const availableQuestionCount = useMemo(() => {
    if (!catalog) {
      return 0;
    }

    return catalog.questions.filter((question) => selectedChapterIds.includes(question.chapterId))
      .length;
  }, [catalog, selectedChapterIds]);

  const toggleChapter = (chapterId: string) => {
    setSelectedChapterIds((current) =>
      current.includes(chapterId)
        ? current.filter((id) => id !== chapterId)
        : [...current, chapterId],
    );
  };

  const startPractice = () => {
    if (!catalog || selectedChapterIds.length === 0) {
      return;
    }

    const questions = buildPracticeQuestionSet(catalog.questions, {
      chapterIds: selectedChapterIds,
      questionCount,
    });

    startTransition(() => {
      setActivePractice({
        key: `${Date.now()}`,
        title: 'Practica personalizada',
        subtitle: `${questions.length} preguntas seleccionadas desde ${selectedChapterIds.length} capitulo(s).`,
        questions,
        maxScore: questions.length,
      });
    });
  };

  if (activePractice) {
    return (
      <QuizRunner
        key={activePractice.key}
        mode="practice"
        title={activePractice.title}
        subtitle={activePractice.subtitle}
        questions={activePractice.questions}
        maxScore={activePractice.maxScore}
        onRestart={() => setActivePractice(null)}
      />
    );
  }

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
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                Practica guiada
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                Configura tu sesion
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Elige temario, define volumen de preguntas y entra a una experiencia sin scroll de
                ventana.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:min-w-[15rem]">
              <div className="rounded-2xl bg-slate-100 px-3 py-3 text-center">
                <div className="text-lg font-black text-slate-900">{selectedChapterIds.length}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  capitulos
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-3 text-center">
                <div className="text-lg font-black text-slate-900">{availableQuestionCount}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  preguntas disp.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {isLoading && (
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-500 shadow-sm">
              Cargando practica disponible...
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 shadow-sm">
              {error}
            </div>
          )}

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Seleccion de temario
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Marca uno o varios capitulos. Los que no tienen preguntas publicadas quedan
                bloqueados.
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200">
              {chapterCards.map((chapter) => {
                const isSelected = selectedChapterIds.includes(chapter.id);
                const isDisabled = chapter.questionCount === 0;

                return (
                  <label
                    key={chapter.id}
                    className={`flex cursor-pointer items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 ${
                      isSelected ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50'
                    } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleChapter(chapter.id)}
                      className="h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-900">{chapter.title}</span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                          {isDisabled ? 'Proximamente' : `${chapter.questionCount} disp.`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-6 text-slate-500">{chapter.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Volumen de preguntas
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Usa un volumen sugerido o ingresa una cantidad personalizada dentro del rango
                disponible.
              </p>
            </div>

            <div className="flex rounded-2xl border border-slate-200 bg-slate-200/70 p-1 shadow-inner">
              {[5, 10, 20, 35].map((amount) => {
                const disabled = amount > availableQuestionCount || availableQuestionCount === 0;

                return (
                  <label key={amount} className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="question-count"
                      checked={questionCount === amount}
                      disabled={disabled}
                      onChange={() => setQuestionCount(amount)}
                      className="peer sr-only"
                    />
                    <div
                      className={`rounded-xl py-2.5 text-center text-sm font-black transition-all ${
                        disabled
                          ? 'cursor-not-allowed text-slate-400'
                          : 'text-slate-500 hover:text-slate-800 peer-checked:bg-white peer-checked:text-indigo-700 peer-checked:shadow-sm'
                      }`}
                    >
                      {amount}
                    </div>
                  </label>
                );
              })}
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Personalizado</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, availableQuestionCount)}
                value={questionCount}
                onChange={(event) =>
                  setQuestionCount(
                    Math.min(
                      Math.max(Number(event.target.value) || 1, 1),
                      Math.max(1, availableQuestionCount),
                    ),
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 outline-none ring-0 transition focus:border-indigo-400 focus:bg-white"
              />
            </label>
          </section>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <button
            className="w-full rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-3.5 text-base font-black text-white transition-all hover:border-indigo-700 hover:bg-indigo-500 active:translate-y-[4px] active:border-b-0 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:translate-y-0 disabled:active:border-b-4"
            type="button"
            onClick={startPractice}
            disabled={isLoading || selectedChapterIds.length === 0 || availableQuestionCount === 0}
          >
            Iniciar practica
          </button>
        </div>
      </div>
    </div>
  );
}
