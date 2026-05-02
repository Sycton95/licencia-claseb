import type { ImportReviewQuestionRecord } from './importReview';

export type GeneratedBuildChapterSummary = {
  chapterId: string;
  file: string;
  count: number;
};

export type GeneratedBuildManifest = {
  buildId: string;
  runId?: string;
  sourceBuildId?: string;
  editionId?: string;
  manualYear?: number;
  sourceDocumentId?: string;
  exportedCount: number;
  generatedAt?: string;
  duplicateClusterCount?: number;
  duplicatesFile?: string;
  noveltyReportFile?: string;
  exactDuplicateCount?: number;
  nearDuplicateCount?: number;
  novelCandidateCount?: number;
  noveltyRate?: number;
  noveltyWarning?: boolean;
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
  runId?: string;
  sourceBuildId?: string;
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
  duplicateClusterCount?: number;
  unresolvedDuplicateClusterCount?: number;
  multiKeepClusterCount?: number;
};

export type GeneratedDuplicateClusterDecisionMode =
  | 'suggested_winner'
  | 'manual_winner'
  | 'multi_keep';

export type GeneratedDuplicateClusterMember = {
  externalId: string;
  chapterId: string;
  prompt: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
  sourceReference?: string;
  publicExplanation?: string;
  groundingExcerpt?: string;
  verifierScore: number;
  verifierBreakdown?: {
    schemaQuality: number;
    groundingQuality: number;
    answerQuality: number;
    distractorQuality: number;
    visualSupportQuality: number;
    duplicateRiskPenalty: number;
    overallReviewScore: number;
  };
  verifierIssueCount: number;
  generationMode: 'text' | 'visual' | 'mixed';
  visualDependency?: 'none' | 'linked' | 'required';
  needsVisualAudit: boolean;
  similarityToSuggested?: number;
};

export type GeneratedDuplicateCluster = {
  clusterId: string;
  familyKey: string;
  suggestedWinnerId: string;
  suggestedWinnerScore: number;
  suggestedWinnerReason: string;
  classification: 'duplicate_family';
  reviewerSummary?: string;
  chapterIds: string[];
  members: GeneratedDuplicateClusterMember[];
};

export type GeneratedDuplicateArtifact = {
  buildId: string;
  runId?: string;
  sourceBuildId?: string;
  generatedAt: string;
  clusterCount: number;
  similarityMethod?: 'hybrid_local_v1';
  clusters: GeneratedDuplicateCluster[];
};

export type FoundryDuplicateReviewDecision = {
  runId: string;
  clusterId: string;
  familyKey: string;
  suggestedWinnerId: string;
  selectedExternalIds: string[];
  decisionMode: GeneratedDuplicateClusterDecisionMode;
  reviewedAt: string;
};
