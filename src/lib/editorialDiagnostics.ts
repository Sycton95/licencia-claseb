import type { Chapter, Question, SourceDocument } from '../types/content.js';

export type EditorialWarning = {
  id: string;
  questionId: string;
  title: string;
  detail: string;
};

export type ChapterCoverageRow = {
  chapterId: string;
  chapterCode: string;
  chapterTitle: string;
  total: number;
  published: number;
  reviewedPending: number;
};

export type SourceCoverageRow = {
  sourceDocumentId: string;
  title: string;
  total: number;
  missingReferenceCount: number;
};

export function hasClearSourceReference(question: Question) {
  return Boolean(question.sourceReference?.trim());
}

export function getCorrectOptionCount(question: Question) {
  return question.options.filter((option) => option.isCorrect).length;
}

export function getQuestionWarnings(question: Question): EditorialWarning[] {
  const warnings: EditorialWarning[] = [];
  const correctOptionCount = getCorrectOptionCount(question);

  if (question.status === 'published' && !hasClearSourceReference(question)) {
    warnings.push({
      id: `${question.id}-missing-source-reference`,
      questionId: question.id,
      title: 'Publicada sin referencia precisa',
      detail: 'La pregunta está publicada, pero no incluye texto de referencia fuente.',
    });
  }

  if (question.status === 'published' && correctOptionCount === 0) {
    warnings.push({
      id: `${question.id}-missing-correct-option`,
      questionId: question.id,
      title: 'Publicada sin respuesta correcta',
      detail: 'La pregunta publicada no tiene ninguna alternativa marcada como correcta.',
    });
  }

  if (question.selectionMode === 'multiple' && correctOptionCount < 2) {
    warnings.push({
      id: `${question.id}-multiple-insufficient-correct`,
      questionId: question.id,
      title: 'Múltiple con respuestas insuficientes',
      detail: 'Las preguntas múltiples deben tener al menos dos respuestas correctas.',
    });
  }

  if (question.isOfficialExamEligible && question.status !== 'published') {
    warnings.push({
      id: `${question.id}-exam-not-published`,
      questionId: question.id,
      title: 'Apta para examen sin publicar',
      detail: 'La pregunta está marcada como apta para examen, pero aún no está publicada.',
    });
  }

  if (question.doubleWeight && !question.isOfficialExamEligible) {
    warnings.push({
      id: `${question.id}-double-weight-not-eligible`,
      questionId: question.id,
      title: 'Doble puntaje fuera de examen',
      detail: 'Una pregunta de doble puntaje debe estar marcada como apta para examen.',
    });
  }

  return warnings;
}

export function buildChapterCoverage(chapters: Chapter[], questions: Question[]): ChapterCoverageRow[] {
  return chapters
    .map((chapter) => {
      const chapterQuestions = questions.filter((question) => question.chapterId === chapter.id);

      return {
        chapterId: chapter.id,
        chapterCode: chapter.code,
        chapterTitle: chapter.title,
        total: chapterQuestions.length,
        published: chapterQuestions.filter((question) => question.status === 'published').length,
        reviewedPending: chapterQuestions.filter((question) => question.status === 'reviewed').length,
      };
    })
    .sort((left, right) => left.chapterCode.localeCompare(right.chapterCode));
}

export function buildSourceCoverage(
  sourceDocuments: SourceDocument[],
  questions: Question[],
): SourceCoverageRow[] {
  return sourceDocuments
    .map((sourceDocument) => {
      const sourceQuestions = questions.filter(
        (question) => question.sourceDocumentId === sourceDocument.id,
      );

      return {
        sourceDocumentId: sourceDocument.id,
        title: sourceDocument.title,
        total: sourceQuestions.length,
        missingReferenceCount: sourceQuestions.filter(
          (question) => !hasClearSourceReference(question),
        ).length,
      };
    })
    .sort((left, right) => right.total - left.total || left.title.localeCompare(right.title));
}
