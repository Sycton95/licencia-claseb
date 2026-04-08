import { startTransition, useEffect, useMemo, useState } from 'react';
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
        subtitle: `${questions.length} preguntas seleccionadas desde ${selectedChapterIds.length} capítulo(s).`,
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
    <section className="page-stack page-stack--public">
      <section className="panel panel--soft">
        <span className="eyebrow">Práctica personalizada</span>
        <h1 className="hero-title">Arma un quiz según el capítulo que quieras estudiar</h1>
        <p className="hero-copy">
          Solo se usan preguntas publicadas de la edición activa. Así evitamos mezclar material
          pendiente con contenido apto para estudio.
        </p>
      </section>

      <section className="public-builder-grid">
        <section className="panel">
          <div className="section-head">
            <div>
              <h2 className="section-title">Capítulos disponibles</h2>
              <p className="info-text">Elige uno o varios capítulos para construir tu práctica.</p>
            </div>
          </div>
          {isLoading && <p className="info-banner">Cargando práctica disponible…</p>}
          {error && (
            <p className="error-banner" aria-live="polite">
              {error}
            </p>
          )}
          <div className="choice-grid choice-grid--chapters">
            {chapterCards.map((chapter) => {
              const isSelected = selectedChapterIds.includes(chapter.id);
              const isDisabled = chapter.questionCount === 0;

              return (
                <button
                  key={chapter.id}
                  type="button"
                  className={
                    isDisabled
                      ? 'choice-card choice-card--disabled'
                      : isSelected
                        ? 'choice-card choice-card--selected'
                        : 'choice-card'
                  }
                  disabled={isDisabled}
                  onClick={() => toggleChapter(chapter.id)}
                  aria-pressed={isSelected}
                >
                  <strong>{chapter.code}</strong>
                  <span>{chapter.title}</span>
                  <small>
                    {isDisabled ? 'Próximamente' : `${chapter.questionCount} preguntas publicadas`}
                  </small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel practice-config-panel">
          <div className="section-head">
            <div>
              <h2 className="section-title">Configuración</h2>
              <p className="info-text">Ajusta la cantidad de preguntas y comienza cuando quieras.</p>
            </div>
          </div>

          <div className="number-picker" aria-label="Cantidad sugerida de preguntas">
            {[5, 10, 20, 35].map((amount) => {
              const disabled = amount > availableQuestionCount || availableQuestionCount === 0;

              return (
                <button
                  key={amount}
                  type="button"
                  className={
                    questionCount === amount ? 'amount-chip amount-chip--selected' : 'amount-chip'
                  }
                  disabled={disabled}
                  onClick={() => setQuestionCount(amount)}
                  aria-pressed={questionCount === amount}
                >
                  {amount}
                </button>
              );
            })}
          </div>

          <label className="field">
            <span>Personalizado</span>
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
            />
          </label>

          <div className="stats-grid stats-grid--config">
            <article className="stat-card">
              <strong>{selectedChapterIds.length}</strong>
              <span>capítulos seleccionados</span>
            </article>
            <article className="stat-card">
              <strong>{availableQuestionCount}</strong>
              <span>preguntas disponibles</span>
            </article>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={startPractice}
            disabled={isLoading || selectedChapterIds.length === 0 || availableQuestionCount === 0}
          >
            Iniciar práctica
          </button>
        </section>
      </section>
    </section>
  );
}
