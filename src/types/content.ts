export type SelectionMode = 'single' | 'multiple';
export type EditorialStatus = 'draft' | 'reviewed' | 'published' | 'archived';
export type QuestionMediaType = 'image';
export type QuizMode = 'practice' | 'exam';
export type EditionStatus = 'draft' | 'active' | 'archived';
export type EditorialAction =
  | 'save'
  | 'save_draft'
  | 'mark_reviewed'
  | 'publish'
  | 'archive'
  | 'seed'
  | 'import_prepare'
  | 'import_commit'
  | 'import_revert';

export interface Edition {
  id: string;
  code: string;
  title: string;
  status: EditionStatus;
  isActive: boolean;
  effectiveFrom: string;
  archivedAt?: string;
}

export interface Chapter {
  id: string;
  editionId: string;
  code: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}

export interface SourceDocument {
  id: string;
  title: string;
  issuer: string;
  year: number;
  url: string;
  type: 'manual' | 'decree' | 'service-page' | 'municipal-questionnaire' | 'simulator';
  official: boolean;
}

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuestionMedia {
  id: string;
  questionId: string;
  type: QuestionMediaType;
  url: string;
  altText: string;
  sourceAttribution?: string;
  order: number;
}

export interface QuestionImportReferenceAsset {
  assetId: string;
  kind: 'crop' | 'upload';
  mimeType: string;
  name: string;
  page?: number;
  byteSize: number;
}

export interface QuestionImportGroundingCorrection {
  replacementText: string;
  source: 'manual_segment' | 'pdf_selection';
  page?: number;
  segmentId?: string;
  excerpt?: string;
  updatedAt: string;
}

export interface QuestionImportRequiredMedia {
  assetIds: string[];
  cropHints?: Array<{
    assetId: string;
    reason: string;
  }>;
}

export interface QuestionImportGroundingAnchor {
  pageId?: string;
  pageNumber?: number;
  blockId?: string;
  excerpt: string;
  textAnchor?: {
    exact?: string;
    prefix?: string;
    suffix?: string;
  };
  bbox?: unknown;
  bboxSource?: string;
}

export interface QuestionImportMetadata {
  importBatchId: string;
  importRunId: string;
  importExternalId: string;
  importSourceFile: string;
  importReviewDisposition: string;
  groundingDisposition?: string;
  manualCitationRefs?: string[];
  manualFactRefs?: string[];
  needsVisualAudit?: boolean;
  warnings?: string[];
  draftGroundingCorrection?: QuestionImportGroundingCorrection;
  referenceAssets?: QuestionImportReferenceAsset[];
  buildId?: string;
  candidateId?: string;
  unitIds?: string[];
  generationMode?: 'text' | 'visual' | 'mixed';
  verifierScore?: number;
  verifierIssues?: Array<{
    code: string;
    severity?: string;
    message: string;
  }>;
  requiredMedia?: QuestionImportRequiredMedia;
  groundingAnchors?: QuestionImportGroundingAnchor[];
  manualAssetId?: string;
}

export interface Question {
  id: string;
  editionId: string;
  chapterId: string;
  week: number;
  prompt: string;
  selectionMode: SelectionMode;
  instruction: string;
  sourceDocumentId: string;
  sourcePage: number;
  sourceReference?: string;
  explanation?: string;
  publicExplanation?: string;
  status: EditorialStatus;
  isOfficialExamEligible: boolean;
  doubleWeight: boolean;
  reviewNotes?: string;
  createdBy: string;
  updatedBy: string;
  reviewedAt?: string;
  publishedAt?: string;
  options: QuestionOption[];
  media: QuestionMedia[];
  importMetadata?: QuestionImportMetadata;
}

export interface ExamRuleSet {
  code: string;
  editionId: string;
  questionCount: number;
  maxPoints: number;
  passingPoints: number;
  doubleWeightCount: number;
  examDurationMinutes?: number;
}

export interface PracticeConfig {
  chapterIds: string[];
  questionCount: number;
}

export interface QuizAttempt {
  id: string;
  mode: QuizMode;
  startedAt: string;
  completedAt?: string;
  score: number;
  passed?: boolean;
  configSnapshot: Record<string, unknown>;
}

export interface AttemptAnswer {
  attemptId: string;
  questionId: string;
  selectedOptionIds: string[];
  pointsEarned: number;
  isCorrect: boolean;
}

export interface EditorialEvent {
  id: string;
  editionId: string;
  questionId?: string;
  actorEmail: string;
  action: EditorialAction;
  notes?: string;
  createdAt: string;
}

export interface ContentCatalog {
  editions: Edition[];
  activeEdition: Edition | null;
  chapters: Chapter[];
  sourceDocuments: SourceDocument[];
  examRuleSet: ExamRuleSet;
  questions: Question[];
  editorialEvents: EditorialEvent[];
}
