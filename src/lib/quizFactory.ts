import { SEED_CONTENT } from '../data/seedContent';
import { pickRandomQuestions } from './pickRandomQuestions';
import type { ExamRuleSet, PracticeConfig, Question } from '../types/content';

export function getQuestionPoints(question: Question, isExamMode: boolean) {
  return isExamMode && question.doubleWeight ? 2 : 1;
}

export function isQuestionAnswerCorrect(question: Question, selectedOptionIds: string[]) {
  const correctOptionIds = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.id)
    .sort();
  const sortedSelectedOptionIds = [...selectedOptionIds].sort();

  if (correctOptionIds.length !== sortedSelectedOptionIds.length) {
    return false;
  }

  return correctOptionIds.every((optionId, index) => optionId === sortedSelectedOptionIds[index]);
}

export function buildPracticeQuestionSet(questions: Question[], config: PracticeConfig) {
  const pool = questions.filter((question) => config.chapterIds.includes(question.chapterId));

  return pickRandomQuestions(pool, config.questionCount);
}

export function buildExamQuestionSet(questions: Question[], examRuleSet: ExamRuleSet) {
  const publishedEligible = questions.filter(
    (question) => question.status === 'published' && question.isOfficialExamEligible,
  );

  const doubleWeightQuestions = publishedEligible.filter((question) => question.doubleWeight);
  const regularQuestions = publishedEligible.filter((question) => !question.doubleWeight);

  if (doubleWeightQuestions.length < examRuleSet.doubleWeightCount) {
    throw new Error('No hay suficientes preguntas de doble puntuación para simular el examen.');
  }

  const requiredRegularQuestions = examRuleSet.questionCount - examRuleSet.doubleWeightCount;

  if (regularQuestions.length < requiredRegularQuestions) {
    throw new Error('No hay suficientes preguntas publicadas para armar el examen.');
  }

  const selectedQuestions = [
    ...pickRandomQuestions(doubleWeightQuestions, examRuleSet.doubleWeightCount),
    ...pickRandomQuestions(regularQuestions, requiredRegularQuestions),
  ];

  return pickRandomQuestions(selectedQuestions, selectedQuestions.length);
}

export function getChapterQuestionCount(questions: Question[], chapterId: string) {
  return questions.filter(
    (question) => question.chapterId === chapterId && question.status === 'published',
  ).length;
}

export function getDefaultPracticeQuestionCount(questions: Question[]) {
  const publishedCount = questions.filter((question) => question.status === 'published').length;
  return Math.min(10, publishedCount || SEED_CONTENT.questions.length);
}
