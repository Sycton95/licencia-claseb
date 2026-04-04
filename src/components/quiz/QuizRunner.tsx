import { useState } from 'react';
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

export function QuizRunner({
  mode,
  title,
  subtitle,
  questions,
  maxScore,
  passingScore,
  onRestart,
}: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [outcomes, setOutcomes] = useState<QuestionOutcome[]>([]);

  const currentQuestion = questions[currentIndex];

  const handleSelect = (optionId: string) => {
    if (isAnswered) {
      return;
    }

    if (currentQuestion.selectionMode === 'single') {
      setSelectedOptionIds([optionId]);
      return;
    }

    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((selectedId) => selectedId !== optionId)
        : [...current, optionId],
    );
  };

  const handleConfirm = () => {
    if (selectedOptionIds.length === 0 || isAnswered) {
      return;
    }

    const isCorrect = isQuestionAnswerCorrect(currentQuestion, selectedOptionIds);
    const pointsAvailable = getQuestionPoints(currentQuestion, mode === 'exam');
    const pointsEarned = isCorrect ? pointsAvailable : 0;

    setScore((current) => current + pointsEarned);
    setOutcomes((current) => [
      ...current,
      {
        questionId: currentQuestion.id,
        selectedOptionIds,
        isCorrect,
        pointsAvailable,
        pointsEarned,
      },
    ]);
    setIsAnswered(true);
  };

  const handleNext = () => {
    const isLastQuestion = currentIndex >= questions.length - 1;

    if (isLastQuestion) {
      setCurrentIndex(questions.length);
      return;
    }

    setCurrentIndex((current) => current + 1);
    setSelectedOptionIds([]);
    setIsAnswered(false);
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
        outcomes={outcomes}
        score={score}
        maxScore={maxScore}
        passingScore={passingScore}
        onRestart={onRestart}
      />
    );
  }

  const scoreLabel = mode === 'exam' ? 'Puntaje' : 'Aciertos';
  const scoreValue = mode === 'exam' ? `${score}/${maxScore}` : `${score}`;

  return (
    <>
      <div className="panel panel--soft quiz-header">
        <span className="eyebrow">{mode === 'exam' ? 'Examen clase B' : 'Práctica personalizada'}</span>
        <h1 className="hero-title">{title}</h1>
        <p className="hero-copy">{subtitle}</p>
      </div>

      <ProgressBar
        current={currentIndex + 1}
        total={questions.length}
        scoreLabel={scoreLabel}
        scoreValue={scoreValue}
      />

      <QuestionCard
        question={currentQuestion}
        selectedOptionIds={selectedOptionIds}
        isAnswered={isAnswered}
        onSelect={handleSelect}
        onConfirm={handleConfirm}
        onNext={handleNext}
      />
    </>
  );
}
