import { useReducer } from 'react';
import { QuizSummary } from '../QuizSummary';
import { getQuestionPoints, isQuestionAnswerCorrect } from '../../lib/quizFactory';
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
  showReference: boolean;
};

type QuizAction =
  | { type: 'toggle-option'; optionId: string; selectionMode: Question['selectionMode'] }
  | { type: 'confirm'; outcome: QuestionOutcome; pointsEarned: number }
  | { type: 'next'; totalQuestions: number }
  | { type: 'toggle-reference' };

const INITIAL_STATE: QuizState = {
  currentIndex: 0,
  selectedOptionIds: [],
  isAnswered: false,
  score: 0,
  outcomes: [],
  showReference: false,
};

const CheckIcon = () => (
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
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

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
        showReference: true,
      };
    case 'next':
      if (state.currentIndex >= action.totalQuestions - 1) {
        return {
          ...state,
          currentIndex: action.totalQuestions,
          selectedOptionIds: [],
          isAnswered: false,
          showReference: false,
        };
      }

      return {
        ...state,
        currentIndex: state.currentIndex + 1,
        selectedOptionIds: [],
        isAnswered: false,
        showReference: false,
      };
    case 'toggle-reference':
      return {
        ...state,
        showReference: !state.showReference,
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

  if (!currentQuestion) {
    return (
      <QuizSummary
        mode={mode}
        title={mode === 'exam' ? 'Simulacion completada' : 'Practica completada'}
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
    ? 'border-slate-200 bg-white'
    : isCorrectAnswerSelected
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-rose-200 bg-rose-50';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <header className="z-20 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4">
          <button
            onClick={onRestart}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            title="Salir del quiz"
            type="button"
          >
            <XIcon />
          </button>
          <div className="flex-1">
            <div className="h-2.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  mode === 'exam' ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="w-14 text-right font-mono text-sm font-black text-slate-400">
            {state.currentIndex + 1}/{questions.length}
          </span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                mode === 'exam'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {mode === 'exam' ? 'Simulador clase B' : 'Practica personalizada'}
            </span>
            <h1 className="mt-3 text-lg font-black tracking-tight text-slate-900 md:text-xl">
              {title}
            </h1>
            <p className="mt-1 text-sm leading-7 text-slate-500">{subtitle}</p>
          </div>

          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Manual oficial · pagina {currentQuestion.sourcePage}
                </div>
                <h2 className="mt-3 text-xl font-black leading-tight tracking-tight text-slate-900 md:text-[1.7rem]">
                  {currentQuestion.prompt}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                  {currentQuestion.instruction}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">
                {currentQuestion.selectionMode === 'multiple'
                  ? 'Seleccion multiple'
                  : 'Seleccion unica'}
              </span>
            </div>

            {currentQuestion.media[0] && (
              <figure className="mb-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                <img
                  className="block max-h-[20rem] w-full object-cover"
                  src={currentQuestion.media[0].url}
                  alt={currentQuestion.media[0].altText}
                  loading="lazy"
                />
              </figure>
            )}

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = state.selectedOptionIds.includes(option.id);

                let cardClass =
                  'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 border-b-4 active:border-b-0 active:translate-y-[4px]';
                let iconClass = 'bg-slate-100 text-slate-500';

                if (state.isAnswered) {
                  if (option.isCorrect) {
                    cardClass =
                      'border-emerald-500 bg-emerald-50 text-emerald-950 border-b-[3px] shadow-sm';
                    iconClass = 'bg-emerald-100 text-emerald-700';
                  } else if (isSelected) {
                    cardClass =
                      'border-rose-400 bg-rose-50 text-rose-950 border-b-[3px] shadow-sm';
                    iconClass = 'bg-rose-100 text-rose-700';
                  } else {
                    cardClass =
                      'border-slate-200 bg-white text-slate-400 border-b-[3px] opacity-60';
                    iconClass = 'bg-slate-100 text-slate-400';
                  }
                } else if (isSelected) {
                  cardClass =
                    'border-indigo-400 bg-indigo-50 text-indigo-950 border-b-4 shadow-sm';
                  iconClass = 'bg-indigo-100 text-indigo-700';
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={state.isAnswered}
                    onClick={() => handleSelect(option.id)}
                    aria-pressed={isSelected}
                    className={`flex min-h-[3.5rem] w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left font-semibold transition-all ${cardClass}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${iconClass}`}
                      >
                        {option.label}
                      </span>
                      <span className="text-[15px] leading-snug md:text-base">{option.text}</span>
                    </div>

                    {state.isAnswered && option.isCorrect && (
                      <span className="shrink-0 text-emerald-600">
                        <CheckIcon />
                      </span>
                    )}
                    {state.isAnswered && isSelected && !option.isCorrect && (
                      <span className="shrink-0 text-rose-500">
                        <XIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <footer className={`shrink-0 border-t ${footerTone}`}>
        <div className="mx-auto flex min-h-[6rem] w-full max-w-3xl flex-col gap-4 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-6">
          <div className="min-h-0 flex-1">
            {state.isAnswered ? (
              <div className="flex flex-col gap-2">
                <div
                  className={`flex items-center gap-2 text-lg font-black ${
                    isCorrectAnswerSelected ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      isCorrectAnswerSelected
                        ? 'bg-emerald-200/70 text-emerald-700'
                        : 'bg-rose-200/70 text-rose-700'
                    }`}
                  >
                    {isCorrectAnswerSelected ? <CheckIcon /> : <XIcon />}
                  </span>
                  <span>{isCorrectAnswerSelected ? 'Correcto' : 'Incorrecto'}</span>
                </div>

                {hasQuickReference && (
                  <div className="flex flex-col gap-2">
                    {mode === 'practice' && (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'toggle-reference' })}
                        className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        {state.showReference ? 'Ocultar referencia' : 'Ver referencia'}
                      </button>
                    )}

                    {(mode === 'exam' || state.showReference) && (
                      <div className="max-h-24 overflow-y-auto rounded-2xl bg-white/80 px-3 py-3 text-sm leading-6 text-slate-600 shadow-sm">
                        {currentQuestion.publicExplanation && <p>{currentQuestion.publicExplanation}</p>}
                        {!currentQuestion.publicExplanation && currentQuestion.sourceReference && (
                          <p>{currentQuestion.sourceReference}</p>
                        )}
                        {!currentQuestion.publicExplanation && !currentQuestion.sourceReference && (
                          <p>Pagina {currentQuestion.sourcePage}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-500">
                {mode === 'exam'
                  ? 'Confirma tu respuesta para seguir sumando puntaje.'
                  : 'Selecciona una opcion y revisa la explicacion al responder.'}
              </div>
            )}
          </div>

          <div className="w-full shrink-0 md:w-auto">
            {!state.isAnswered ? (
              <button
                onClick={handleConfirm}
                disabled={state.selectedOptionIds.length === 0}
                className="w-full rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-6 py-3.5 text-base font-black text-white transition-all hover:border-indigo-700 hover:bg-indigo-500 active:translate-y-[4px] active:border-b-0 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:translate-y-0 disabled:active:border-b-4 md:w-44"
                type="button"
              >
                {currentQuestion.selectionMode === 'multiple' ? 'Comprobar' : 'Responder'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className={`w-full rounded-2xl border-b-4 px-6 py-3.5 text-base font-black text-white transition-all active:translate-y-[4px] active:border-b-0 md:w-44 ${
                  isCorrectAnswerSelected
                    ? 'border-emerald-800 bg-emerald-600 hover:border-emerald-700 hover:bg-emerald-500'
                    : 'border-rose-800 bg-rose-600 hover:border-rose-700 hover:bg-rose-500'
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
