import type { SelectionMode } from './content.js';

export type AiSuggestionType = 'new_question' | 'rewrite' | 'flag' | 'coverage_gap';
export type AiSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'applied' | 'deferred';
export type AiProvider = 'heuristic' | 'ollama_qwen25_3b';
export type AiRunStatus = 'completed' | 'failed';
export type AiRunType = 'suggestion_refresh';
export type AiPilotRunMode = 'new_question' | 'rewrite' | 'mixed';
export type AiPilotVerifierSeverity = 'critical' | 'warning';
export type AiPilotVerifierStatus = 'passed' | 'failed';
export type AiPilotVerifierCode =
  | 'invalid_shape'
  | 'missing_grounding'
  | 'invalid_selection_mode'
  | 'invalid_option_count'
  | 'correct_answer_out_of_range'
  | 'empty_text'
  | 'duplicate_prompt'
  | 'weak_distractor'
  | 'instruction_mismatch'
  | 'answer_format';
export type AiPilotRunStatus = 'completed' | 'failed';

export interface SourcePreparationChunk {
  id: string;
  editionId: string;
  chapterId: string;
  sourceDocumentId: string;
  sourcePageStart: number;
  sourcePageEnd: number;
  topicKey: string;
  topicTitle: string;
  referenceLabel: string;
  groundingSummary: string;
  rationale: string;
  benchmarkNote?: string;
  candidateQuestion?: {
    prompt: string;
    selectionMode: SelectionMode;
    instruction: string;
    options: string[];
    correctOptionIndexes: number[];
    publicExplanation?: string;
    reviewNotes?: string;
  };
}

export interface AiSuggestion {
  id: string;
  editionId: string;
  chapterId?: string;
  sourceDocumentId?: string;
  sourceReference: string;
  suggestionType: AiSuggestionType;
  status: AiSuggestionStatus;
  prompt: string;
  selectionMode?: SelectionMode;
  instruction?: string;
  suggestedOptions: string[];
  suggestedCorrectAnswers: number[];
  publicExplanation?: string;
  reviewNotes?: string;
  groundingExcerpt: string;
  rationale: string;
  confidence: number;
  provider: AiProvider;
  dedupeKey: string;
  targetQuestionId?: string;
  aiRunId?: string;
  appliedQuestionId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiRunSummary {
  generatedCount: number;
  newQuestionCount: number;
  rewriteCount: number;
  flagCount: number;
  coverageGapCount: number;
}

export interface AiRun {
  id: string;
  editionId: string;
  actorEmail: string;
  provider: AiProvider;
  runType: AiRunType;
  status: AiRunStatus;
  summary: AiRunSummary;
  createdAt: string;
}

export interface AiWorkspace {
  suggestions: AiSuggestion[];
  runs: AiRun[];
  sourcePreparation: SourcePreparationChunk[];
}

export interface AiPilotVerifierIssue {
  code: AiPilotVerifierCode;
  severity: AiPilotVerifierSeverity;
  message: string;
}

export interface AiPilotSuggestionRecord {
  id: string;
  provider: AiProvider;
  suggestion: AiSuggestion;
  verifierStatus: AiPilotVerifierStatus;
  verifierIssues: AiPilotVerifierIssue[];
  rawOutput?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiPilotRunSummary {
  attemptedCount: number;
  passedCount: number;
  failedCount: number;
  newQuestionCount: number;
  rewriteCount: number;
}

export interface AiPilotEvaluationSet {
  id: string;
  title: string;
  description: string;
  newQuestionChunkIds: string[];
  rewriteQuestionIds: string[];
}

export interface AiPilotEvaluationItemReport {
  evaluationItemId: string;
  targetId: string;
  label: string;
  suggestionType: 'new_question' | 'rewrite';
  verifierStatus: AiPilotVerifierStatus;
  criticalCount: number;
  warningCount: number;
  issueCodes: AiPilotVerifierCode[];
}

export interface AiPilotEvaluationReport {
  id: string;
  evaluationSetId: string;
  runId: string;
  provider: AiProvider;
  model: string;
  mode: AiPilotRunMode;
  createdAt: string;
  durationMs: number;
  attemptedCount: number;
  passedCount: number;
  failedCount: number;
  criticalIssueCount: number;
  warningIssueCount: number;
  issueBreakdown: Partial<Record<AiPilotVerifierCode, number>>;
  items: AiPilotEvaluationItemReport[];
}

export interface AiPilotRun {
  id: string;
  provider: AiProvider;
  model: string;
  actorEmail: string;
  evaluationSetId: string;
  attemptedItemIds: string[];
  mode: AiPilotRunMode;
  status: AiPilotRunStatus;
  summary: AiPilotRunSummary;
  createdAt: string;
  durationMs: number;
}

export interface AiPilotWorkspace {
  suggestions: AiPilotSuggestionRecord[];
  runs: AiPilotRun[];
  reports: AiPilotEvaluationReport[];
  sourcePreparation: SourcePreparationChunk[];
  evaluationSet: AiPilotEvaluationSet;
}
