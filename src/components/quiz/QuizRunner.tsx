import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useReducer, useRef } from 'react';
import { QuizSummary } from '../QuizSummary';
import { CheckIcon } from '../icons/StateIcons';
import { getQuestionPoints, isQuestionAnswerCorrect } from '../../lib/quizFactory';
import { useHaptics } from '../../hooks/useHaptics';
import type { Question, QuizMode } from '../../types/content';
import type { QuestionOutcome } from '../../types/quiz';

type QuizRunnerProps = {
  mode: QuizMode;
  title: string;
  subtitle: string;
  questions: Question[];
  maxScore: number;
  passingScore?: number;
  onRestart: () => void;
};

type QuizState = {
  currentIndex: number;
  selectedOptionIds: string[];
  isAnswered: boolean;
  score: number;
  outcomes: QuestionOutcome[];
};

type QuizAction =
  | { type: 'toggle-option'; optionId: string; selectionMode: Question['selectionMode'] }
  | { type: 'confirm'; outcome: QuestionOutcome; pointsEarned: number }
  | { type: 'next'; totalQuestions: number };

const INITIAL_STATE: QuizState = {
  currentIndex: 0,
  selectedOptionIds: [],
  isAnswered: false,
  score: 0,
  outcomes: [],
};

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BookIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'toggle-option':
      if (state.isAnswered) {
        return state;
      }

      if (action.selectionMode === 'single') {
        return {
          ...state,
          selectedOptionIds: [action.optionId],
        };
      }

      return {
        ...state,
        selectedOptionIds: state.selectedOptionIds.includes(action.optionId)
          ? state.selectedOptionIds.filter((selectedId) => selectedId !== action.optionId)
          : [...state.selectedOptionIds, action.optionId],
      };
    case 'confirm':
      if (state.isAnswered || state.selectedOptionIds.length === 0) {
        return state;
      }

      return {
        ...state,
        isAnswered: true,
        score: state.score + action.pointsEarned,
        outcomes: [...state.outcomes, action.outcome],
      };
    case 'next':
      if (state.currentIndex >= action.totalQuestions - 1) {
        return {
          ...state,
          currentIndex: action.totalQuestions,
          selectedOptionIds: [],
          isAnswered: false,
        };
      }

      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        selectedOptionIds: [],
        isAnswered: false,
      };
  }
}

export function QuizRunner({
  mode,
  title,
  subtitle,
  questions,
  maxScore,
  passingScore,
  onRestart,
}: QuizRunnerProps) {
  const [state, dispatch] = useReducer(quizReducer, INITIAL_STATE);
  const containerRef = useRef<HTMLDivElement>(null);
  const haptics = useHaptics();
  const currentQuestion = questions[state.currentIndex];

  const accentColor =
    mode === 'exam' ? 'var(--color-public-exam)' : 'var(--color-public-practice)';
  const progressFillColor =
    mode === 'exam'
      ? 'var(--color-sage-700)'
      : 'var(--color-text-secondary)';

  const handleSelect = (optionId: string) => {
    if (!currentQuestion) {
      return;
    }

    haptics.tap();
    dispatch({
      type: 'toggle-option',
      optionId,
      selectionMode: currentQuestion.selectionMode,
    });
  };

  const handleConfirm = () => {
    if (!currentQuestion || state.selectedOptionIds.length === 0 || state.isAnswered) {
      return;
    }

    const isCorrect = isQuestionAnswerCorrect(currentQuestion, state.selectedOptionIds);
    const pointsAvailable = getQuestionPoints(currentQuestion, mode === 'exam');
    const pointsEarned = isCorrect ? pointsAvailable : 0;

    if (isCorrect) {
      haptics.success();
    } else {
      haptics.error();
    }

    dispatch({
      type: 'confirm',
      pointsEarned,
      outcome: {
        questionId: currentQuestion.id,
        selectedOptionIds: state.selectedOptionIds,
        isCorrect,
        pointsAvailable,
        pointsEarned,
      },
    });
  };

  const handleNext = () => {
    dispatch({ type: 'next', totalQuestions: questions.length });
  };

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentQuestion) {
        return;
      }

      if (
        !state.isAnswered &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      ) {
        event.preventDefault();

        const optionsCount = currentQuestion.options.length;
        if (optionsCount === 0) {
          return;
        }

        const currentOptionIndex =
          state.selectedOptionIds.length > 0
            ? currentQuestion.options.findIndex(
                (option) => option.id === state.selectedOptionIds[0],
              )
            : -1;

        const delta = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
        const nextIndex = (currentOptionIndex + delta + optionsCount) % optionsCount;
        handleSelect(currentQuestion.options[nextIndex].id);
      }

      if (
        !state.isAnswered &&
        (event.key === 'Enter' || event.key === ' ') &&
        state.selectedOptionIds.length > 0
      ) {
        event.preventDefault();
        handleConfirm();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onRestart();
      }

      if (
        state.isAnswered &&
        ['Enter', ' ', 'ArrowRight', 'ArrowDown'].includes(event.key)
      ) {
        event.preventDefault();
        handleNext();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, onRestart, state, questions.length]);

  if (!currentQuestion) {
    return (
      <QuizSummary
        mode={mode}
        title={mode === 'exam' ? 'Simulación completada' : 'Práctica completada'}
        subtitle={
          mode === 'exam'
            ? 'Revisa tu puntaje y las respuestas correctas.'
            : 'Revisa tus respuestas correctas y vuelve a practicar.'
        }
        questions={questions}
        outcomes={state.outcomes}
        score={state.score}
        maxScore={maxScore}
        passingScore={passingScore}
        onRestart={onRestart}
      />
    );
  }

  const progress =
    questions.length === 0 ? 0 : ((state.currentIndex + 1) / questions.length) * 100;
  const isCorrectAnswerSelected =
    state.isAnswered &&
    isQuestionAnswerCorrect(currentQuestion, state.selectedOptionIds);
  const btnDisabled = state.selectedOptionIds.length === 0 && !state.isAnswered;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden focus:outline-none"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <motion.div
        className="pointer-events-none absolute left-4 right-4 top-4 z-40 flex justify-center md:left-6 md:right-6 md:top-5"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div
          className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-full border-2 px-3 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-colors duration-300 md:gap-4"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 95%, transparent)',
            borderColor: 'var(--color-border)',
          }}
        >
          <button
            onClick={onRestart}
            className="flex h-8 w-8 shrink-0 items-center justify-center transition-colors hover:text-rose-600 focus-visible:outline-none md:h-9 md:w-9"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Salir del quiz"
            type="button"
          >
            <XIcon size={20} />
          </button>

          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full border shadow-inner"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              style={{ backgroundColor: progressFillColor }}
            />
          </div>

          <span
            className="w-12 shrink-0 text-right text-xs font-black md:w-14 md:text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {state.currentIndex + 1} / {questions.length}
          </span>
        </div>
      </motion.div>

      <main className="flex w-full flex-1 flex-col overflow-y-auto pb-[22rem] pt-[4.5rem] md:pb-[18rem] md:pt-[5.25rem]">
        <div className="sr-only">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 md:px-6">
          <h3
            className="mb-2 text-2xl font-black leading-tight md:mb-4 md:text-3xl"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {currentQuestion.prompt}
          </h3>

          <p
            className="mb-6 text-sm font-bold opacity-80 md:text-base"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {currentQuestion.instruction}
          </p>

          {currentQuestion.media[0] && (
            <figure
              className="mb-8 overflow-hidden rounded-2xl border"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <img
                className="block max-h-[340px] w-full object-cover"
                src={currentQuestion.media[0].url}
                alt={currentQuestion.media[0].altText}
                loading="lazy"
              />
            </figure>
          )}

          <fieldset className="m-0 border-0 p-0">
            <legend className="sr-only">
              {currentQuestion.selectionMode === 'multiple'
                ? 'Selecciona todas las respuestas correctas'
                : 'Selecciona la respuesta correcta'}
            </legend>

            <div className="flex flex-col gap-4">
              {currentQuestion.options.map((option, index) => {
                const isSelected = state.selectedOptionIds.includes(option.id);
                const isCorrect = option.isCorrect;

                let backgroundColor = 'var(--color-bg-secondary)';
                let borderColor = 'var(--color-border)';
                let textColor = 'var(--color-text-primary)';

                let indicatorClasses =
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-black transition-colors ';
                let wrapperClasses =
                  'w-full rounded-xl border-2 p-4 text-left transition-all focus:outline-none md:p-5 flex items-start gap-4 ';

                if (state.isAnswered) {
                  if (isCorrect) {
                    backgroundColor = 'var(--color-success-600)';
                    borderColor = 'var(--color-success-600)';
                    textColor = '#ffffff';
                    indicatorClasses +=
                      'border-white bg-white text-[var(--color-success-600)] shadow-sm';
                  } else if (isSelected) {
                    backgroundColor = 'var(--color-warning-600)';
                    borderColor = 'var(--color-warning-600)';
                    textColor = '#ffffff';
                    indicatorClasses +=
                      'border-white bg-white text-[var(--color-warning-600)] shadow-sm';
                  } else {
                    backgroundColor =
                      'color-mix(in srgb, var(--color-bg-secondary) 50%, var(--color-bg-primary))';
                    textColor = 'var(--color-text-secondary)';
                    indicatorClasses += 'border-current bg-transparent text-current opacity-50';
                  }
                } else if (isSelected) {
                  backgroundColor = 'var(--color-primary-600)';
                  borderColor = 'var(--color-primary-600)';
                  textColor = '#ffffff';
                  wrapperClasses += 'scale-[1.01] shadow-lg';
                  indicatorClasses +=
                    'border-white bg-white text-[var(--color-primary-600)] shadow-sm';
                } else {
                  wrapperClasses += 'hover:border-[var(--color-text-primary)]';
                  indicatorClasses += 'border-current bg-transparent text-current';
                }

                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    disabled={state.isAnswered}
                    onClick={() => handleSelect(option.id)}
                    aria-pressed={isSelected}
                    aria-label={`${option.label}. ${option.text}${isSelected ? ' seleccionado' : ''}`}
                    className={wrapperClasses}
                    style={{
                      backgroundColor,
                      borderColor,
                      color: textColor,
                    }}
                    whileTap={state.isAnswered ? undefined : { scale: 0.992 }}
                  >
                    <div className={indicatorClasses}>
                      {state.isAnswered && isCorrect ? (
                        <CheckIcon size={20} />
                      ) : state.isAnswered && isSelected && !isCorrect ? (
                        <XIcon size={20} />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </div>
                    <span className="pt-0.5 text-base leading-snug md:text-lg">{option.text}</span>
                  </motion.button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </main>

      <div
        className="absolute bottom-0 left-0 right-0 z-30 transition-colors shadow-[0_-10px_40px_rgba(0,0,0,0.15)]"
        style={{
          backgroundColor: state.isAnswered
            ? isCorrectAnswerSelected
              ? 'var(--color-success-600)'
              : 'var(--color-warning-600)'
            : 'var(--color-bg-secondary)',
          borderTop: state.isAnswered ? 'none' : '2px solid var(--color-border)',
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col p-4 md:p-6">
          <AnimatePresence>
            {state.isAnswered &&
              (currentQuestion.publicExplanation || currentQuestion.sourceReference) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-4 w-full overflow-hidden border-b border-white/20"
                >
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-white shadow-inner">
                    <div className="mt-0.5 shrink-0 text-white/80">
                      <BookIcon />
                    </div>
                    <div>
                      <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
                        Fundamento Oficial
                      </h4>
                      <p className="text-sm font-medium leading-relaxed text-white md:text-base">
                        {currentQuestion.publicExplanation ?? currentQuestion.sourceReference}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-4">
            {state.isAnswered && (
              <div className="flex items-center gap-3 text-white">
                <div className="hidden items-center justify-center rounded-full bg-white/20 p-2 sm:flex">
                  {isCorrectAnswerSelected ? <CheckIcon size={20} /> : <XIcon size={20} />}
                </div>
                <h4 className="text-xl font-black uppercase tracking-wider drop-shadow-sm md:text-2xl">
                  {isCorrectAnswerSelected ? 'Correcto' : 'Incorrecto'}
                </h4>
              </div>
            )}

            <button
              onClick={state.isAnswered ? handleNext : handleConfirm}
              disabled={btnDisabled}
              className={`ml-auto w-full min-w-[200px] rounded-2xl border-2 px-8 py-4 text-lg font-black uppercase tracking-widest transition-all sm:w-auto
                ${btnDisabled ? 'cursor-not-allowed opacity-50 outline-none' : ''}
                ${!btnDisabled && !state.isAnswered ? 'border-transparent text-white shadow-lg hover:scale-[1.02]' : ''}
                ${state.isAnswered ? '!border-white/20 !bg-white !text-black shadow-xl hover:scale-105' : ''}`}
              style={
                btnDisabled
                  ? {
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-secondary)',
                      borderColor: 'var(--color-border)',
                    }
                  : !state.isAnswered
                    ? { backgroundColor: accentColor }
                    : {}
              }
              type="button"
            >
              {state.isAnswered
                ? 'Continuar'
                : currentQuestion.selectionMode === 'multiple'
                  ? 'Comprobar'
                  : 'Responder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
