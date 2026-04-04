import { SEED_CONTENT } from '../data/seedContent';
import type { ContentCatalog, EditorialEvent, Question } from '../types/content';

const STORAGE_KEY = 'licencia-claseb-content-catalog-v2';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeCatalog(rawCatalog: Partial<ContentCatalog>): ContentCatalog {
  const activeEdition =
    rawCatalog.activeEdition ??
    rawCatalog.editions?.find((edition) => edition.isActive) ??
    SEED_CONTENT.activeEdition;

  return {
    editions: rawCatalog.editions ?? SEED_CONTENT.editions,
    activeEdition,
    chapters: rawCatalog.chapters ?? SEED_CONTENT.chapters,
    sourceDocuments: rawCatalog.sourceDocuments ?? SEED_CONTENT.sourceDocuments,
    examRuleSet: rawCatalog.examRuleSet ?? SEED_CONTENT.examRuleSet,
    questions: rawCatalog.questions ?? SEED_CONTENT.questions,
    editorialEvents: rawCatalog.editorialEvents ?? SEED_CONTENT.editorialEvents,
  };
}

export function loadLocalCatalog(): ContentCatalog {
  if (!canUseStorage()) {
    return SEED_CONTENT;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return SEED_CONTENT;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<ContentCatalog>;
    return normalizeCatalog(parsed);
  } catch {
    return SEED_CONTENT;
  }
}

export function saveLocalCatalog(catalog: ContentCatalog) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
}

export function saveLocalQuestion(question: Question, event?: EditorialEvent) {
  const catalog = loadLocalCatalog();
  const questionIndex = catalog.questions.findIndex((item) => item.id === question.id);

  if (questionIndex === -1) {
    catalog.questions.push(question);
  } else {
    catalog.questions[questionIndex] = question;
  }

  if (event) {
    catalog.editorialEvents = [
      event,
      ...catalog.editorialEvents.filter((item) => item.id !== event.id),
    ];
  }

  saveLocalCatalog(catalog);
}

export function resetLocalCatalog() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
