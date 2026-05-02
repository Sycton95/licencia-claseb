export type ImportReviewIssue = {
  code: string;
  message: string;
  field?: string;
  localizedMessage?: string;
};

export type ImportReviewQuestionOption = {
  text: string;
};

export type ImportReviewQuestionSnapshot = {
  id: string;
  prompt: string;
  options?: string[];
  correctOptionIndexes?: number[];
  publicExplanation?: string;
  chapterId?: string;
  sourceReference?: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
};

export type ImportReviewExtractedEntity = {
  raw: string;
  value: string;
  unit?: string;
  factRefIds?: string[];
};

export type ImportReviewGroundingSuggestion = {
  citationId: string;
  chapterId: string;
  manualRef: string;
  pageRange: {
    start: number;
    end: number;
  };
  excerpt: string;
  confidence: number;
};

export type ImportReviewGroundingAudit = {
  disposition: 'grounded' | 'low_confidence' | 'no_grounding';
  productionDisposition?:
    | 'grounded'
    | 'grounded_recoverable'
    | 'usable_winner_low_confidence'
    | 'no_grounding';
  reason: string;
  predictedChapterId?: string;
  predictedLikelihood?: number;
  winnerId?: string;
  winnerChapterId?: string;
  winnerPageRange?: {
    start: number;
    end: number;
  } | null;
  supportCoverage?: number;
  factScore?: number;
  top1Score?: number;
  delta?: number;
  answerSupportCoverage?: number;
  answerTokenCoverage?: number;
  supportRefinement?: Record<string, unknown> | null;
  fallbackRecovery?: Record<string, unknown> | null;
  latencyMs?: number;
};

export type ImportReviewMetadataRepair = {
  applied: boolean;
  fields: string[];
  before: Record<string, string | number | null>;
  after: Record<string, string | number | null>;
  basis: 'grounding_winner';
  recoveryTier?: 'grounded' | 'grounded_recoverable' | 'usable_winner_low_confidence';
  winnerId?: string;
  winnerChapterId?: string;
  winnerPageRange?: {
    start: number;
    end: number;
  } | null;
};

export type ImportReviewFactReviewSuggestion = {
  factId: string;
  chapterId: string;
  pageRange: {
    start: number;
    end: number;
  };
  supportUnitId?: string;
  entity: string;
  importedValue: string;
  manualValue: string;
  unit?: string;
  issueCode: 'manual_fact_fix_suggested' | 'manual_fact_auxiliary_warning';
  conflictReason: string;
  excerpt?: string;
};

export type ImportReviewFactReview = {
  advisoryOnly: boolean;
  winnerScopedFactIds: string[];
  suggestions: ImportReviewFactReviewSuggestion[];
};

export type ImportReviewSandboxProvenance = {
  buildId: string;
  runId?: string;
  sourceBuildId?: string;
  candidateId: string;
  unitIds: string[];
  generationMode: 'text' | 'visual' | 'mixed';
  visualDependency?: 'none' | 'linked' | 'required';
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
  verifierIssues: Array<{
    code: string;
    severity?: string;
    message: string;
  }>;
  requiredMedia?: {
    assetIds: string[];
    cropHints?: Array<{
      assetId: string;
      reason: string;
    }>;
  };
  visualSupport?: {
    required: boolean;
    assetIds: string[];
  };
  groundingAnchors?: Array<{
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
  }>;
};

export type ImportReviewQuestionRecord = {
  externalId: string;
  runId?: string;
  sourceBuildId?: string;
  prompt: string;
  selectionMode: 'single' | 'multiple';
  instruction: string;
  options: ImportReviewQuestionOption[];
  correctOptionIndexes: number[];
  publicExplanation?: string;
  sourcePageStart?: number;
  sourcePageEnd?: number;
  sourceReference?: string;
  groundingExcerpt: string;
  reviewNotes: string;
  tags: string[];
  chapterId: string;
  manualFactRefs?: string[];
  manualCitationRefs?: string[];
  classificationScores?: Record<string, number>;
  reviewDisposition?: 'accepted' | 'accepted_with_warning' | 'rejected';
  groundingMode?: 'manual' | 'fact_auto' | 'citation_auto' | 'missing';
  autoGroundingConfidence?: number;
  extractedEntities?: ImportReviewExtractedEntity[];
  groundingAudit?: ImportReviewGroundingAudit;
  metadataRepair?: ImportReviewMetadataRepair;
  factReview?: ImportReviewFactReview;
  needsVisualAudit?: boolean;
  visualDependency?: 'none' | 'linked' | 'required';
  duplicateClusterId?: string;
  duplicateWinnerId?: string;
  duplicateResolution?: 'winner' | 'referenced_duplicate';
  qualityScore?: number;
  similarityScore?: number;
  similarityScope?: 'existing_bank' | 'reviewed_import' | 'batch';
  similarityMatchId?: string;
  similarityMatchPrompt?: string;
  similarityMatchQuestion?: ImportReviewQuestionSnapshot;
  sandboxProvenance?: ImportReviewSandboxProvenance;
  iterationMetadata?: {
    classification:
      | 'novel'
      | 'near_duplicate_previous_run'
      | 'duplicate_previous_run'
      | 'same_grounding_reworded';
    matchedRunId?: string | null;
    matchedCandidateId?: string | null;
    similarity?: number;
    reason?: string;
  };
};

export type ImportReviewRejectedCandidate = {
  externalId: string;
  errors: ImportReviewIssue[];
  warnings: ImportReviewIssue[];
  normalizedQuestion: ImportReviewQuestionRecord;
  groundingSuggestions?: ImportReviewGroundingSuggestion[];
  duplicateSimilarityScore?: number;
  duplicateMatchId?: string;
  duplicateMatchScope?: 'existing_bank' | 'reviewed_import' | 'batch';
  duplicateMatchPrompt?: string;
  duplicateMatchQuestion?: ImportReviewQuestionSnapshot;
};

export type ImportReviewDuplicateCluster = {
  clusterId: string;
  winnerId: string;
  winnerQualityScore: number;
  winnerQuestion: ImportReviewQuestionSnapshot;
  losers: Array<{
    externalId: string;
    similarityScore: number;
    qualityScore: number;
    question: ImportReviewQuestionSnapshot;
  }>;
};

export type ImportReviewChapterSummary = {
  chapterId: string;
  acceptedCount: number;
  rejectedCount: number;
};

export type ImportReviewRunManifestSummary = {
  runId: string;
  sourceFile: string;
  reviewedAt: string;
  acceptedCount: number;
  acceptedWithWarningCount: number;
  rejectedCount: number;
  warningCount: number;
  errorCount: number;
  autoGroundedAcceptedCount: number;
  recoverableAcceptedCount?: number;
  usableWinnerLowConfidenceCount?: number;
  recoveredValidRejectCount?: number;
  remainingRecoverableWinnerRejectCount?: number;
  duplicateBlockedRejectCount?: number;
  factBlockedRejectCount?: number;
  factReviewSuggestedCount?: number;
  auxiliaryOnlyMismatchCount?: number;
  metadataRepairedCount?: number;
  metadataRepairedByTier?: Partial<
    Record<'grounded' | 'grounded_recoverable' | 'usable_winner_low_confidence', number>
  >;
  visualAuditRequiredCount?: number;
  chapterFallbackRecoveredCount?: number;
  unresolvedMetadataRejectCount?: number;
  trueNoGroundingRejectCount?: number;
  duplicateClusterCount: number;
  ambiguousCandidateCount: number;
  chapterSummaries: ImportReviewChapterSummary[];
  files: {
    reviewLog: string;
    reviewSummary: string;
    acceptedCandidates: string;
    rejectedCandidates: string;
    chaptersRoot?: string;
    runDetails: string;
  };
};

export type ImportReviewManifest = {
  generatedAt: string;
  runs: ImportReviewRunManifestSummary[];
};

export type ImportReviewRunDetail = {
  runId: string;
  sourceFile: string;
  reviewedAt: string;
  summary?: {
    recoverableAcceptedCount: number;
    usableWinnerLowConfidenceCount?: number;
    recoveredValidRejectCount?: number;
    remainingRecoverableWinnerRejectCount?: number;
    duplicateBlockedRejectCount?: number;
    factBlockedRejectCount?: number;
    factReviewSuggestedCount?: number;
    auxiliaryOnlyMismatchCount?: number;
    metadataRepairedCount: number;
    metadataRepairedByTier?: Partial<
      Record<'grounded' | 'grounded_recoverable' | 'usable_winner_low_confidence', number>
    >;
    visualAuditRequiredCount: number;
    chapterFallbackRecoveredCount?: number;
    unresolvedMetadataRejectCount?: number;
    trueNoGroundingRejectCount?: number;
  };
  duplicateClusters: ImportReviewDuplicateCluster[];
  ambiguousCandidates: Array<{
    externalId: string;
    classificationScores: Record<string, number>;
  }>;
  autoGroundedAccepted: Array<{
    externalId: string;
    groundingMode: 'fact_auto' | 'citation_auto';
    confidence: number;
    chapterId: string;
    manualFactRefs: string[];
    manualCitationRefs: string[];
    groundingExcerpt: string;
  }>;
  rejectedCandidates: ImportReviewRejectedCandidate[];
};

export type ImportReviewIssueAggregate = {
  code: string;
  count: number;
  message: string;
  externalIds: string[];
};

export type ImportReviewActionableReviewState = 'pending' | 'approved' | 'rejected';

export type GroundTruthFact = {
  id: string;
  entity: string;
  value: number | string;
  unit?: string;
  chapterId: string;
  pageRange: {
    start: number;
    end: number;
  };
  manualRef: string;
  aliases: string[];
  strictness: 'hard' | 'soft';
};

export type ManualCitation = {
  id: string;
  chapterId: string;
  pageRange: {
    start: number;
    end: number;
  };
  manualRef: string;
  excerpt: string;
  text: string;
  conceptRefs?: string[];
};

export type VersionedManualChapterSegments = {
  version: string;
  chapterId: string;
  label: string;
  pageRange: {
    start: number;
    end: number;
  };
  generatedAt: string;
  segmentCount: number;
  factCount: number;
  segments: ManualCitation[];
  facts: GroundTruthFact[];
};

export type ManualKnowledgePackIndex = {
  version: string;
  sourcePdf: string;
  generatedAt: string;
  pageCount: number;
  segmentCount: number;
  factCount: number;
  chapters: Array<{
    chapterId: string;
    label: string;
    pageRange: {
      start: number;
      end: number;
    };
    segmentCount: number;
    factCount: number;
    file: string;
  }>;
};
