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
    'No se pudo cargar la práctica personalizada.',
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
        title: 'Práctica personalizada',
        subtitle: `${questions.length} preguntas seleccionadas.`,
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-50">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 shadow-sm md:py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            onClick={() => navigate('/')}
            aria-label="Volver a la página principal"
            className="rounded-xl px-2 py-1 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200"
            type="button"
          >
            Volver
          </button>
          <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary-600">
            Práctica
          </span>
          <div className="w-12" aria-hidden="true" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {isLoading && (
            <div className="rounded-3xl border border-neutral-200 bg-white px-5 py-4 text-sm font-semibold text-neutral-500 shadow-sm">
              Cargando práctica disponible…
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-warning-200 bg-warning-50 px-5 py-4 text-sm font-semibold text-warning-700 shadow-sm">
              {error}
            </div>
          )}

          <section className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
            <div className="overflow-hidden rounded-3xl border border-neutral-200">
              {chapterCards.map((chapter) => {
                const isSelected = selectedChapterIds.includes(chapter.id);
                const isDisabled = chapter.questionCount === 0;

                return (
                  <label
                    key={chapter.id}
                    className={`flex cursor-pointer items-center gap-4 border-b border-neutral-100 px-4 py-3.5 last:border-b-0 ${
                      isSelected ? 'bg-primary-50/70' : 'bg-white hover:bg-neutral-50'
                    } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggleChapter(chapter.id)}
                      aria-label={`${chapter.title}. ${chapter.description}${isDisabled ? ' (No disponible)' : ''}`}
                      className="h-5 w-5 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-bold text-neutral-900">
                          {chapter.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-500">
                          {isDisabled ? 'Próximamente' : `${chapter.questionCount}`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{chapter.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-3">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Cantidad de preguntas
              </h2>
            </div>

            <div className="flex rounded-2xl border border-neutral-200 bg-neutral-200/70 p-1 shadow-inner">
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
                          ? 'cursor-not-allowed text-neutral-400'
                          : 'text-neutral-500 hover:text-neutral-800 peer-checked:bg-white peer-checked:text-primary-700 peer-checked:shadow-sm'
                      }`}
                    >
                      {amount}
                    </div>
                  </label>
                );
              })}
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-neutral-700">Personalizado</span>
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
                aria-label={`Número personalizado de preguntas. Mínimo 1, máximo ${Math.max(1, availableQuestionCount)}`}
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base font-semibold text-neutral-900 outline-none ring-0 transition focus:border-primary-400 focus:bg-white"
              />
            </label>
          </section>
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <button
            className="w-full rounded-2xl border-b-4 border-primary-800 bg-primary-600 px-6 py-3.5 text-base font-black text-white transition-all hover:border-primary-700 hover:bg-primary-500 active:translate-y-[4px] active:border-b-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:active:translate-y-0 disabled:active:border-b-4"
            type="button"
            onClick={startPractice}
            disabled={isLoading || selectedChapterIds.length === 0 || availableQuestionCount === 0}
          >
            Iniciar práctica
          </button>
        </div>
      </div>
    </div>
  );
}
