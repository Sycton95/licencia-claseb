export type QuizStep = 'start' | 'quiz' | 'review';

export interface Question {
  id: number;
  week: number;
  question: string;
  options: string[];
  correctIndex: number;
  sourcePage: number;
}

export interface QuizSession {
  questions: Question[];
  currentIndex: number;
  score: number;
  selectedOption: number | null;
  isAnswered: boolean;
  step: QuizStep;
}

export const QUIZ_SIZE = 10;
