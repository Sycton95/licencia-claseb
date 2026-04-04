import type { Question } from '../types/quiz';

export function pickRandomQuestions(questions: Question[], quizSize: number): Question[] {
  const pool = [...questions];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }

  return pool.slice(0, Math.min(quizSize, pool.length));
}
