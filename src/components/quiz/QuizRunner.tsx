import { useReducer } from 'react';
import { ProgressBar } from '../ProgressBar';
import { QuestionCard } from '../QuestionCard';
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

  const scoreLabel = mode === 'exam' ? 'Puntaje' : 'Aciertos';
  const scoreValue = mode === 'exam' ? `${state.score}/${maxScore}` : `${state.score}`;

  return (
    <section className="page-stack page-stack--quiz">
      <div className="panel panel--soft quiz-header">
        <span className="eyebrow">{mode === 'exam' ? 'Examen clase B' : 'Práctica personalizada'}</span>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-copy">{subtitle}</p>
      </div>

      <div className="quiz-layout">
        <aside className="quiz-sidebar">
          <ProgressBar
            current={state.currentIndex + 1}
            total={questions.length}
            scoreLabel={scoreLabel}
            scoreValue={scoreValue}
          />

          <section className="panel quiz-sidebar-card">
            <strong>{mode === 'exam' ? 'Modo examen' : 'Modo práctica'}</strong>
            <p className="info-text">
              {mode === 'exam'
                ? 'Avanza una pregunta a la vez y controla el puntaje acumulado.'
                : 'Responde con calma y usa la referencia rápida para volver al manual.'}
            </p>
            <div className="quiz-sidebar-stats">
              <span>
                <strong>{questions.length}</strong> preguntas
              </span>
              <span>
                <strong>{maxScore}</strong> {mode === 'exam' ? 'puntos máximos' : 'respuestas'}
              </span>
            </div>
          </section>
        </aside>

        <div className="quiz-main">
          <QuestionCard
            question={currentQuestion}
            selectedOptionIds={state.selectedOptionIds}
            isAnswered={state.isAnswered}
            showReference={mode === 'practice' && state.showReference}
            onSelect={handleSelect}
            onConfirm={handleConfirm}
            onNext={handleNext}
            onToggleReference={() => dispatch({ type: 'toggle-reference' })}
          />
        </div>
      </div>
    </section>
  );
}
