import { useReducer, useEffect, useRef } from 'react';
import { QuizSummary } from '../QuizSummary';
import { getQuestionPoints, isQuestionAnswerCorrect } from '../../lib/quizFactory';
import { CheckIcon } from '../icons';
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


const XIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
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
  const currentQuestion = questions[state.currentIndex];

  const handleSelect = (optionId: string) => {
    if (!currentQuestion) {
      return;
    }

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

  // Auto-focus container on mount for keyboard accessibility
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentQuestion) return;

      // Arrow keys for navigation between options
      if (!state.isAnswered && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();

        const optionsCount = currentQuestion.options.length;
        if (optionsCount === 0) return;

        const currentIndex = state.selectedOptionIds.length > 0
          ? currentQuestion.options.findIndex(o => o.id === state.selectedOptionIds[0])
          : -1;

        let nextIndex = currentIndex;
        if (['ArrowDown', 'ArrowRight'].includes(event.key)) {
          nextIndex = (currentIndex + 1) % optionsCount;
        } else {
          nextIndex = (currentIndex - 1 + optionsCount) % optionsCount;
        }

        handleSelect(currentQuestion.options[nextIndex].id);
      }

      // Enter or Space to confirm answer
      if (!state.isAnswered && (event.key === 'Enter' || event.key === ' ') && state.selectedOptionIds.length > 0) {
        event.preventDefault();
        handleConfirm();
      }

      // Escape to exit quiz (with confirmation visual)
      if (event.key === 'Escape') {
        event.preventDefault();
        onRestart();
      }

      // After answer: Arrow keys or Enter to go to next question
      if (state.isAnswered && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight' || event.key === 'ArrowDown')) {
        event.preventDefault();
        handleNext();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [state, currentQuestion, questions.length]);

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

  const progress = questions.length === 0 ? 0 : (state.currentIndex / questions.length) * 100;
  const hasQuickReference = Boolean(
    currentQuestion.sourceReference || currentQuestion.publicExplanation,
  );
  const isCorrectAnswerSelected =
    state.isAnswered &&
    isQuestionAnswerCorrect(currentQuestion, state.selectedOptionIds);
  const footerTone = !state.isAnswered
    ? 'border-neutral-200 bg-white'
    : isCorrectAnswerSelected
      ? 'border-success-200 bg-success-50'
      : 'border-warning-200 bg-warning-50';

  return (
    <div ref={containerRef} tabIndex={-1} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-50 focus:outline-none">
      <header className="z-20 flex h-14 shrink-0 items-center border-b border-neutral-200 bg-white shadow-sm md:h-16 landscape:h-12">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4">
          <button
            onClick={onRestart}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 md:h-12 md:w-12"
            aria-label="Salir del quiz"
            type="button"
          >
            <XIcon />
          </button>
          <div className="flex-1">
            <div
              className="h-2.5 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 shadow-inner"
              role="progressbar"
              aria-valuenow={state.currentIndex + 1}
              aria-valuemin={1}
              aria-valuemax={questions.length}
              aria-label={`Pregunta ${state.currentIndex + 1} de ${questions.length}`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  mode === 'exam' ? 'bg-sage-500' : 'bg-primary-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="w-14 text-right font-mono text-sm font-black text-neutral-400">
            {state.currentIndex + 1}/{questions.length}
          </span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-2 md:px-6 md:py-4 landscape:px-3 landscape:py-1.5">
        <div className="sr-only">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <section className="rounded-[30px] border border-neutral-200 bg-white p-4 shadow-sm md:p-6 landscape:p-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2 md:gap-3 landscape:gap-2">
              <div className="min-w-0">
                {mode === 'practice' && (
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400 md:text-[11px] landscape:text-[10px]">
                    Manual oficial · página {currentQuestion.sourcePage}
                  </div>
                )}
                <h2 className="mt-2 text-lg font-black leading-tight tracking-tight text-neutral-900 md:text-[1.7rem] landscape:text-base landscape:mt-1">
                  {currentQuestion.prompt}
                </h2>
                <p className="mt-1.5 text-xs font-semibold leading-5 text-neutral-500 md:text-sm md:leading-6 landscape:text-[11px] landscape:leading-4 landscape:mt-1">
                  {currentQuestion.instruction}
                </p>
              </div>

              <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-neutral-500">
                {currentQuestion.selectionMode === 'multiple'
                  ? 'Selección múltiple'
                  : 'Selección única'}
              </span>
            </div>

            {currentQuestion.media[0] && (
              <figure className="mb-3 overflow-hidden rounded-[24px] border border-neutral-200 bg-neutral-50 md:mb-5">
                <img
                  className="block w-full object-cover max-h-[250px] md:max-h-[350px] landscape:max-h-[140px]"
                  src={currentQuestion.media[0].url}
                  alt={currentQuestion.media[0].altText}
                  loading="lazy"
                />
              </figure>
            )}

            <fieldset className="border-0 p-0 m-0">
              <legend className="sr-only">
                {currentQuestion.selectionMode === 'multiple'
                  ? 'Selecciona todas las respuestas correctas'
                  : 'Selecciona la respuesta correcta'}
              </legend>
              <div className="space-y-2 md:space-y-3 landscape:space-y-1.5">
              {currentQuestion.options.map((option) => {
                const isSelected = state.selectedOptionIds.includes(option.id);

                let cardClass =
                  'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 border-b-4 active:border-b-0 active:translate-y-[4px]';
                let iconClass = 'bg-neutral-100 text-neutral-500';

                if (state.isAnswered) {
                  if (option.isCorrect) {
                    cardClass =
                      'border-success-500 bg-sage-50 text-success-950 border-b-[3px] shadow-sm';
                    iconClass = 'bg-success-100 text-success-700';
                  } else if (isSelected) {
                    cardClass =
                      'border-warning-400 bg-warning-50 text-warning-950 border-b-[3px] shadow-sm';
                    iconClass = 'bg-warning-100 text-warning-700';
                  } else {
                    cardClass =
                      'border-neutral-200 bg-white text-neutral-400 border-b-[3px] opacity-60';
                    iconClass = 'bg-neutral-100 text-neutral-400';
                  }
                } else if (isSelected) {
                  cardClass =
                    'border-primary-400 bg-primary-50 text-primary-950 border-b-4 shadow-sm';
                  iconClass = 'bg-primary-100 text-primary-700';
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={state.isAnswered}
                    onClick={() => handleSelect(option.id)}
                    aria-pressed={isSelected}
                    aria-label={`${option.label}. ${option.text}${isSelected ? ' (Seleccionado)' : ''}`}
                    className={`flex min-h-[3.5rem] w-full items-center justify-between gap-2 rounded-2xl border-2 px-4 py-2 md:py-3 md:gap-3 text-left font-semibold transition-all landscape:min-h-[2.8rem] landscape:px-3 landscape:py-1.5 landscape:gap-2 ${cardClass}`}
                  >
                    <div className="flex min-w-0 items-center gap-2 md:gap-3 landscape:gap-2">
                      <span
                        className={`flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full text-[10px] md:text-xs font-black landscape:h-7 landscape:w-7 landscape:text-[10px] ${iconClass}`}
                      >
                        {option.label}
                      </span>
                      <span className="text-[14px] md:text-base leading-snug landscape:text-[12px]">{option.text}</span>
                    </div>

                    {state.isAnswered && option.isCorrect && (
                      <span className="shrink-0 text-sage-600">
                        <CheckIcon size={20} />
                      </span>
                    )}
                    {state.isAnswered && isSelected && !option.isCorrect && (
                      <span className="shrink-0 text-warning-500">
                        <XIcon />
                      </span>
                    )}
                  </button>
                );
              })}
              </div>
            </fieldset>
          </section>
        </div>
      </main>

      <footer className={`shrink-0 border-t ${footerTone}`}>
        <div className="mx-auto flex min-h-[6rem] w-full max-w-3xl flex-col gap-3 px-4 py-3 md:flex-row md:items-end md:justify-between md:px-6 md:py-4 landscape:gap-2 landscape:py-2">
          <div className="min-h-0 flex-1">
            {state.isAnswered ? (
              <div className="flex flex-col gap-2">
                <div
                  className={`flex items-center gap-2 text-lg font-black ${
                    isCorrectAnswerSelected ? 'text-success-800' : 'text-warning-800'
                  }`}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      isCorrectAnswerSelected
                        ? 'bg-success-200/70 text-success-700'
                        : 'bg-warning-200/70 text-warning-700'
                    }`}
                  >
                    {isCorrectAnswerSelected ? <CheckIcon size={20} /> : <XIcon />}
                  </span>
                  <span>{isCorrectAnswerSelected ? 'Correcta' : 'Incorrecta'}</span>
                </div>

                {hasQuickReference && (
                  <div
                    className="max-h-40 overflow-y-auto rounded-2xl bg-white/80 px-3 py-3 text-sm leading-6 text-neutral-600 shadow-sm md:max-h-48"
                    role="region"
                    aria-label="Explicación de respuesta"
                    aria-live="polite"
                  >
                    {currentQuestion.publicExplanation && <p>{currentQuestion.publicExplanation}</p>}
                    {!currentQuestion.publicExplanation && currentQuestion.sourceReference && (
                      <p>{currentQuestion.sourceReference}</p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="w-full shrink-0 md:w-auto">
            {!state.isAnswered ? (
              <button
                onClick={handleConfirm}
                disabled={state.selectedOptionIds.length === 0}
                className="w-full rounded-2xl border-b-4 border-primary-800 bg-primary-600 px-6 py-3.5 text-base font-black text-white transition-all hover:border-primary-700 hover:bg-primary-500 active:translate-y-[4px] active:border-b-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:active:translate-y-0 disabled:active:border-b-4 md:w-44"
                type="button"
              >
                {currentQuestion.selectionMode === 'multiple' ? 'Comprobar' : 'Responder'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className={`w-full rounded-2xl border-b-4 px-6 py-3.5 text-base font-black text-white transition-all active:translate-y-[4px] active:border-b-0 focus-visible:outline-none focus-visible:ring-4 md:w-44 ${
                  isCorrectAnswerSelected
                    ? 'border-success-800 bg-success-600 hover:border-success-700 hover:bg-sage-500 focus-visible:ring-success-200'
                    : 'border-warning-800 bg-warning-600 hover:border-warning-700 hover:bg-warning-500 focus-visible:ring-warning-200'
                }`}
                type="button"
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
