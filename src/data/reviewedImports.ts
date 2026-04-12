import chapter2Accepted from '../../data/import-reviews/chapter-2-batch/accepted-candidates.json' with { type: 'json' };
import chapter4Accepted from '../../data/import-reviews/chapter-4-batch/accepted-candidates.json' with { type: 'json' };
import chapter5Accepted from '../../data/import-reviews/chapter-5-batch/accepted-candidates.json' with { type: 'json' };
import chapter6Accepted from '../../data/import-reviews/chapter-6-batch/accepted-candidates.json' with { type: 'json' };
import chapter7Accepted from '../../data/import-reviews/chapter-7-batch/accepted-candidates.json' with { type: 'json' };
import chapter8Accepted from '../../data/import-reviews/chapter-8-batch/accepted-candidates.json' with { type: 'json' };
import chapter9Accepted from '../../data/import-reviews/chapter-9-batch/accepted-candidates.json' with { type: 'json' };
import type { Question, QuestionOption } from '../types/content.js';

const IMPORT_AUTHOR = 'frontier-import@licencia-claseb.local';
const IMPORT_REVIEWED_AT = '2026-04-11T03:20:00.000Z';
const IMPORT_PUBLISHED_AT = '2026-04-11T03:20:00.000Z';

type ReviewedImportQuestion = {
  externalId: string;
  prompt: string;
  selectionMode: Question['selectionMode'];
  instruction: string;
  options: Array<{ text: string }>;
  correctOptionIndexes: number[];
  publicExplanation: string;
  sourcePageStart: number;
  sourcePageEnd: number;
  sourceReference: string;
  groundingExcerpt: string;
  reviewNotes: string;
  tags: string[];
  chapterId: string;
};

function buildOptions(
  questionId: string,
  optionTexts: string[],
  correctOptionIndexes: number[],
): QuestionOption[] {
  return optionTexts.map((text, index) => ({
    id: `${questionId}-opt-${String.fromCharCode(97 + index)}`,
    label: String.fromCharCode(65 + index),
    text,
    isCorrect: correctOptionIndexes.includes(index),
    order: index + 1,
  }));
}

function getChapterWeek(chapterId: string) {
  const chapterNumber = Number(chapterId.replace('chapter-', ''));
  return Number.isFinite(chapterNumber) && chapterNumber > 0 ? chapterNumber : 1;
}

function buildImportedQuestion(question: ReviewedImportQuestion): Question {
  const questionId = `import-${question.externalId}`;
  const sourcePage = Number.isFinite(question.sourcePageStart) ? question.sourcePageStart : 1;

  return {
    id: questionId,
    editionId: 'edition-2026',
    chapterId: question.chapterId,
    week: getChapterWeek(question.chapterId),
    prompt: question.prompt,
    selectionMode: question.selectionMode,
    instruction: question.instruction,
    sourceDocumentId: 'manual-claseb-2026',
    sourcePage,
    sourceReference: question.sourceReference || `Pág. ${sourcePage}`,
    explanation: question.publicExplanation,
    publicExplanation: question.publicExplanation,
    status: 'published',
    isOfficialExamEligible: true,
    doubleWeight: false,
    reviewNotes: [question.reviewNotes, `Importada desde batch revisado (${question.externalId}).`]
      .filter(Boolean)
      .join(' '),
    createdBy: IMPORT_AUTHOR,
    updatedBy: IMPORT_AUTHOR,
    reviewedAt: IMPORT_REVIEWED_AT,
    publishedAt: IMPORT_PUBLISHED_AT,
    options: buildOptions(
      questionId,
      question.options.map((option) => option.text),
      question.correctOptionIndexes,
    ),
    media: [],
  };
}

const REVIEWED_IMPORT_BATCHES = [
  chapter2Accepted,
  chapter4Accepted,
  chapter5Accepted,
  chapter6Accepted,
  chapter7Accepted,
  chapter8Accepted,
  chapter9Accepted,
] as ReviewedImportQuestion[][];

export const REVIEWED_IMPORTED_QUESTIONS: Question[] = REVIEWED_IMPORT_BATCHES.flatMap((batch) =>
  batch.map(buildImportedQuestion),
);
