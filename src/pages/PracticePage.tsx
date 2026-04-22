import { motion, AnimatePresence } from 'framer-motion';
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

const MapPinIcon = () => (
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
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
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

const svgConfig = {
  lineX: 20,
  targetX: 80,
  branchOffset: 53,
  strokeWidth: 12,
  arrowLength: 25,
  arrowWidth: 30,
  rowHeight: 75,
  fontSize: 20,
};

export function PracticePage() {
  const navigate = useNavigate();
  const { catalog, error, isLoading } = usePublishedCatalog(
    'No se pudo cargar la práctica personalizada.',
  );
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [customCount, setCustomCount] = useState('');
  const [activePractice, setActivePractice] = useState<ActivePractice | null>(null);

  useEffect(() => {
    if (!catalog) return;
    const availableChapterIds = catalog.chapters
      .filter((chapter) => getChapterQuestionCount(catalog.questions, chapter.id) > 0)
      .map((chapter) => chapter.id);

    const defaultCount = getDefaultPracticeQuestionCount(catalog.questions);
    setSelectedChapterIds(availableChapterIds);
    setQuestionCount(defaultCount);
    setCustomCount('');
  }, [catalog]);

  const chapterCards = useMemo(() => {
    if (!catalog) return [];
    return catalog.chapters.map((chapter) => ({
      ...chapter,
      questionCount: getChapterQuestionCount(catalog.questions, chapter.id),
    }));
  }, [catalog]);

  const availableQuestionCount = useMemo(() => {
    if (!catalog) return 0;
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

  const updateQuestionCount = (nextCount: number, customValue = '') => {
    const bounded = Math.min(Math.max(nextCount, 1), Math.max(1, availableQuestionCount));
    setQuestionCount(bounded);
    setCustomCount(customValue);
  };

  const startPractice = () => {
    if (!catalog || selectedChapterIds.length === 0) return;
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

  const totalSvgHeight = chapterCards.length * svgConfig.rowHeight;
  const paddingLeftForText = svgConfig.targetX + svgConfig.arrowLength + 20;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-6 md:pb-8 md:pt-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto flex w-full max-w-4xl flex-col gap-6"
        >
          <div className="mb-1 flex w-full items-center justify-between gap-3 border-b-4 border-[var(--color-border)] pb-3 text-[var(--color-text-primary)]">
            <div className="flex min-w-0 items-center gap-3">
              <MapPinIcon />
              <h2 className="text-2xl font-black uppercase tracking-tighter md:text-3xl">
                Planificar Ruta
              </h2>
            </div>
            <button
              onClick={() => navigate('/')}
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

          {isLoading && (
            <div
              className="rounded-[2rem] border px-5 py-4 text-sm font-semibold shadow-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cargando práctica disponible…
            </div>
          )}

          {error && (
            <div
              className="rounded-[2rem] border px-5 py-4 text-sm font-semibold"
              style={{
                borderColor: 'var(--color-warning-200)',
                backgroundColor: 'var(--color-warning-50)',
                color: 'var(--color-warning-700)',
              }}
            >
              {error}
            </div>
          )}

          <div className="mb-4 flex w-full flex-col items-center rounded-[2rem] border-[10px] border-black bg-white p-8 text-black shadow-md md:p-10">
            <h3 className="mb-8 border-b-4 border-black pb-2 text-center text-lg font-black uppercase tracking-widest text-slate-800 md:text-xl">
              Límite de Preguntas
            </h3>

            <div className="flex w-full flex-wrap justify-center gap-6 md:gap-12">
              {[10, 20, 30].map((amount) => {
                const disabled = amount > availableQuestionCount || availableQuestionCount === 0;
                const active = questionCount === amount && customCount === '';
                return (
                  <button
                    key={amount}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateQuestionCount(amount)}
                    className={`flex h-20 w-20 items-center justify-center rounded-full border-[8px] text-3xl font-black outline-none transition-all md:h-28 md:w-28 md:border-[10px] md:text-5xl
                    ${active ? 'scale-110 border-red-600 bg-white text-black shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-red-400 hover:text-slate-600'}
                    ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    {amount}
                  </button>
                );
              })}

              <div className="relative flex h-20 w-20 items-center justify-center md:h-28 md:w-28">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="?"
                  value={customCount}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^0-9]/g, '');
                    if (!value) {
                      setCustomCount('');
                      updateQuestionCount(getDefaultPracticeQuestionCount(catalog?.questions ?? []), '');
                      return;
                    }
                    updateQuestionCount(Number(value), value);
                  }}
                  className={`h-full w-full rounded-full border-[8px] text-center text-3xl font-black outline-none transition-all md:border-[10px] md:text-5xl
                  ${customCount !== '' ? 'scale-110 border-red-600 bg-white text-black shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-400 placeholder:text-slate-300 hover:border-red-400 hover:text-slate-600 focus:border-red-400 focus:text-slate-600'}`}
                />
              </div>
            </div>
          </div>

          <div
            className="relative mb-6 w-full rounded-[2.5rem] border-[4px] border-white p-8 text-white shadow-xl outline outline-[6px] outline-offset-4 md:p-12"
            style={{
              backgroundColor: 'var(--color-public-practice)',
              outlineColor: 'var(--color-public-practice)',
            }}
          >
            <div className="relative">
              <div className="mb-8 flex items-end justify-between border-b-2 border-white/30 pb-3">
                <span className="text-sm font-bold uppercase tracking-widest text-white/90 md:text-base">
                  Capítulos de Estudio
                </span>
                <span className="rounded-md bg-white/20 px-3 py-1 text-sm font-black">
                  {selectedChapterIds.length}/{chapterCards.length}
                </span>
              </div>

              <div className="relative flex w-full">
                <div
                  className="pointer-events-none absolute left-0 top-0"
                  style={{
                    width: svgConfig.targetX + svgConfig.arrowLength + 10,
                    height: totalSvgHeight,
                  }}
                >
                  <svg width="100%" height="100%" className="overflow-visible">
                    <defs>
                      <marker
                        id="hw-arrow"
                        markerWidth={svgConfig.arrowLength}
                        markerHeight={svgConfig.arrowWidth}
                        refX={6}
                        refY={svgConfig.arrowWidth / 2}
                        orient="auto"
                        markerUnits="userSpaceOnUse"
                      >
                        <polygon
                          points={`0 0, ${svgConfig.arrowLength} ${svgConfig.arrowWidth / 2}, 0 ${svgConfig.arrowWidth}`}
                          fill="white"
                        />
                      </marker>
                    </defs>

                    <path
                      d={`M ${svgConfig.lineX},${totalSvgHeight + 40} L ${svgConfig.lineX},0`}
                      stroke="white"
                      strokeWidth={svgConfig.strokeWidth}
                      fill="none"
                      markerEnd="url(#hw-arrow)"
                    />

                    <AnimatePresence>
                      {chapterCards.map((chapter, i) => {
                        if (!selectedChapterIds.includes(chapter.id)) return null;
                        const cy = i * svgConfig.rowHeight + svgConfig.rowHeight / 2;
                        const branchStartY = cy + svgConfig.branchOffset;

                        return (
                          <motion.path
                            key={`branch-${chapter.id}`}
                            d={`M ${svgConfig.lineX},${branchStartY} L ${svgConfig.targetX},${cy}`}
                            stroke="white"
                            strokeWidth={svgConfig.strokeWidth}
                            fill="none"
                            markerEnd="url(#hw-arrow)"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            exit={{ pathLength: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </svg>
                </div>

                <div className="relative z-10 flex w-full flex-col" style={{ paddingLeft: paddingLeftForText }}>
                  {chapterCards.map((chapter) => {
                    const isSelected = selectedChapterIds.includes(chapter.id);
                    const isDisabled = chapter.questionCount === 0;

                    return (
                      <button
                        key={chapter.id}
                        disabled={isDisabled}
                        onClick={() => toggleChapter(chapter.id)}
                        className={`flex w-full items-center text-left outline-none transition-all duration-300
                          ${isDisabled ? 'cursor-not-allowed opacity-40' : ''}
                          ${isSelected ? 'translate-x-2 scale-[1.02] font-black text-white' : 'font-semibold text-white/40 hover:text-white/80'}`}
                        style={{
                          height: svgConfig.rowHeight,
                          fontSize: `clamp(14px, 4vw, ${svgConfig.fontSize}px)`,
                          lineHeight: 1.1,
                        }}
                      >
                        <span className="truncate pr-2">{chapter.title}</span>
                        {isDisabled && (
                          <span className="ml-auto shrink-0 rounded-md bg-black/20 px-2 py-1 text-[10px] font-bold uppercase text-white/60">
                            Próximamente
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12 mt-2 w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startPractice}
              disabled={isLoading || selectedChapterIds.length === 0 || availableQuestionCount === 0}
              className="flex w-full items-center justify-center gap-4 rounded-[2rem] border-[10px] border-black bg-white py-5 text-2xl font-black uppercase tracking-widest text-black shadow-xl transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 md:py-6"
            >
              <DirectionMandatoryIcon />
              Iniciar Práctica
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
