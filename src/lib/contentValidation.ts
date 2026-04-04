import type { EditorialAction, Question } from '../types/content.js';

function normalizeText(value: string | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function sanitizeQuestionPayload(question: Question): Question {
  return {
    ...question,
    prompt: normalizeText(question.prompt),
    instruction: normalizeText(question.instruction),
    sourceReference: normalizeText(question.sourceReference) || undefined,
    explanation: normalizeText(question.explanation) || undefined,
    publicExplanation: normalizeText(question.publicExplanation) || undefined,
    reviewNotes: normalizeText(question.reviewNotes) || undefined,
    options: question.options.map((option) => ({
      ...option,
      label: normalizeText(option.label) || option.label,
      text: normalizeText(option.text),
    })),
    media: question.media.map((item) => ({
      ...item,
      url: normalizeText(item.url),
      altText: normalizeText(item.altText),
      sourceAttribution: normalizeText(item.sourceAttribution) || undefined,
    })),
  };
}

export function validateQuestionForSave(question: Question): string[] {
  const errors: string[] = [];

  if (!question.editionId) {
    errors.push('La pregunta debe pertenecer a una edición activa.');
  }

  if (!question.chapterId) {
    errors.push('La pregunta debe pertenecer a un capítulo.');
  }

  if (!normalizeText(question.prompt)) {
    errors.push('La pregunta debe tener un enunciado.');
  }

  if (!normalizeText(question.instruction)) {
    errors.push('La pregunta debe tener una instrucción visible.');
  }

  if (!question.sourceDocumentId) {
    errors.push('La pregunta debe tener una fuente formal asociada.');
  }

  if (!question.sourcePage || Number.isNaN(Number(question.sourcePage))) {
    errors.push('La pregunta debe tener una página o referencia numérica válida.');
  }

  if (question.options.length < 2) {
    errors.push('La pregunta debe tener al menos dos alternativas.');
  }

  if (question.options.some((option) => !normalizeText(option.text))) {
    errors.push('Todas las alternativas deben tener texto.');
  }

  const correctOptions = question.options.filter((option) => option.isCorrect);

  if (correctOptions.length === 0) {
    errors.push('La pregunta debe tener al menos una respuesta correcta.');
  }

  if (question.selectionMode === 'single' && correctOptions.length !== 1) {
    errors.push('Las preguntas de selección única deben tener exactamente una respuesta correcta.');
  }

  if (question.selectionMode === 'multiple' && correctOptions.length < 2) {
    errors.push('Las preguntas de selección múltiple deben tener dos o más respuestas correctas.');
  }

  if (question.status === 'published') {
    if (!question.reviewedAt) {
      errors.push('Una pregunta publicada debe registrar la fecha de revisión.');
    }

    if (!question.publishedAt) {
      errors.push('Una pregunta publicada debe registrar la fecha de publicación.');
    }
  }

  return errors;
}

export function validateQuestionAction(question: Question, action: EditorialAction) {
  const errors = validateQuestionForSave(question);

  if (action === 'publish' && errors.length > 0) {
    return errors;
  }

  if (action === 'mark_reviewed') {
    return errors.filter((error) => !error.includes('fecha de publicación'));
  }

  if (action === 'archive' || action === 'save_draft' || action === 'save') {
    return errors.filter(
      (error) =>
        !error.includes('fecha de revisión') &&
        !error.includes('fecha de publicación'),
    );
  }

  return errors;
}
