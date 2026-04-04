import type { Question, QuizMode } from './content';

export type QuizStep = 'setup' | 'quiz' | 'review';

export interface QuestionOutcome {
  questionId: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsAvailable: number;
  pointsEarned: number;
}

export interface QuizSession {
  mode: QuizMode;
  title: string;
  subtitle: string;
  questions: Question[];
  currentIndex: number;
  score: number;
  maxScore: number;
  passingScore?: number;
  selectedOptionIds: string[];
  isAnswered: boolean;
  outcomes: QuestionOutcome[];
  startedAt: string;
  step: QuizStep;
}
