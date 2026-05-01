import type { ImportReviewQuestionRecord } from './importReview';

export type GeneratedBuildChapterSummary = {
  chapterId: string;
  file: string;
  count: number;
};

export type GeneratedBuildManifest = {
  buildId: string;
  editionId?: string;
  manualYear?: number;
  sourceDocumentId?: string;
  exportedCount: number;
  generatedAt?: string;
  chapters: GeneratedBuildChapterSummary[];
};

export type GeneratedCandidateProvenance = NonNullable<
  ImportReviewQuestionRecord['sandboxProvenance']
>;

export type GeneratedReviewCandidate = ImportReviewQuestionRecord & {
  sandboxProvenance: GeneratedCandidateProvenance;
};

export type GeneratedReviewBucket =
  | 'blocked'
  | 'media-dependent'
  | 'warning-only'
  | 'review-ready';

export type GeneratedVerifierBand = 'high' | 'medium' | 'low';

export type GeneratedReviewExportLine =
  | {
      ok: true;
      lineNumber: number;
      candidate: GeneratedReviewCandidate;
    }
  | {
      ok: false;
      lineNumber: number;
      error: string;
      raw: string;
    };

export type GeneratedBuildSummary = {
  buildId: string;
  exportedCount: number;
  generatedAt?: string;
  chapterCount: number;
  visualAuditCount?: number;
};

export type GeneratedChapterLoadResult = {
  buildId: string;
  chapterId: string;
  candidates: GeneratedReviewCandidate[];
  blockedRows: Extract<GeneratedReviewExportLine, { ok: false }>[];
};

export type GeneratedChapterDiagnosticsSummary = {
  chapterId: string;
  totalCount: number;
  blockedCount: number;
  blockedRowCount: number;
  mediaDependentCount: number;
  warningOnlyCount: number;
  reviewReadyCount: number;
};

export type GeneratedBuildDiagnosticsSummary = {
  buildId: string;
  totalCount: number;
  blockedCount: number;
  blockedRowCount: number;
  mediaDependentCount: number;
  warningOnlyCount: number;
  reviewReadyCount: number;
};
