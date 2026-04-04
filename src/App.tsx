import { useState } from 'react';
import { ProgressBar } from './components/ProgressBar';
import { QuestionCard } from './components/QuestionCard';
import { QuizSummary } from './components/QuizSummary';
import { StartScreen } from './components/StartScreen';
import { WEEK_ONE_QUESTIONS } from './data/questions';
import { pickRandomQuestions } from './lib/pickRandomQuestions';
import { QUIZ_SIZE, type QuizSession } from './types/quiz';

function createInitialSession(): QuizSession {
  return {
    questions: [],
    currentIndex: 0,
    score: 0,
    selectedOption: null,
    isAnswered: false,
    step: 'start',
  };
}

export default function App() {
  const [session, setSession] = useState<QuizSession>(createInitialSession);

  const startNewQuiz = () => {
    const questions = pickRandomQuestions(WEEK_ONE_QUESTIONS, QUIZ_SIZE);

    setSession({
      questions,
      currentIndex: 0,
      score: 0,
      selectedOption: null,
      isAnswered: false,
      step: 'quiz',
    });
  };

  const handleOptionSelect = (index: number) => {
    setSession((current) => {
      if (current.isAnswered) {
        return current;
      }

      return {
        ...current,
        selectedOption: index,
      };
    });
  };

  const checkAnswer = () => {
    setSession((current) => {
      if (current.selectedOption === null || current.isAnswered) {
        return current;
      }

      const currentQuestion = current.questions[current.currentIndex];
      const isCorrect = current.selectedOption === currentQuestion.correctIndex;

      return {
        ...current,
        isAnswered: true,
        score: isCorrect ? current.score + 1 : current.score,
      };
    });
  };

  const nextQuestion = () => {
    setSession((current) => {
      const nextIndex = current.currentIndex + 1;
      const isLastQuestion = nextIndex >= current.questions.length;

      if (isLastQuestion) {
        return {
          ...current,
          step: 'review',
        };
      }

      return {
        ...current,
        currentIndex: nextIndex,
        selectedOption: null,
        isAnswered: false,
      };
    });
  };

  const activeQuestion = session.questions[session.currentIndex];

  return (
    <main className="app-shell">
      <div className="ambient ambient--left" aria-hidden="true" />
      <div className="ambient ambient--right" aria-hidden="true" />

      <section className="app-frame">
        <header className="app-header">
          <span className="brand-pill">Clase B Chile</span>
          <p className="app-subtitle">Práctica rápida para móvil basada en el manual oficial 2026</p>
        </header>

        {session.step === 'start' && (
          <StartScreen totalQuestions={QUIZ_SIZE} onStart={startNewQuiz} />
        )}

        {session.step === 'quiz' && activeQuestion && (
          <>
            <ProgressBar
              current={session.currentIndex + 1}
              total={session.questions.length}
              score={session.score}
            />
            <QuestionCard
              question={activeQuestion}
              selectedOption={session.selectedOption}
              isAnswered={session.isAnswered}
              onSelect={handleOptionSelect}
              onConfirm={checkAnswer}
              onNext={nextQuestion}
            />
          </>
        )}

        {session.step === 'review' && (
          <QuizSummary
            questions={session.questions}
            score={session.score}
            onRestart={startNewQuiz}
          />
        )}

        <footer className="app-footer">
          <span>Roadmap 2026 listo para crecer por semanas</span>
          <span>Hoy publicado como MVP de Semana 1</span>
        </footer>
      </section>
    </main>
  );
}
