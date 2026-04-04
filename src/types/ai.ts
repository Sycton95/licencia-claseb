import type { SelectionMode } from './content';

export type AiSuggestionType = 'new_question' | 'rewrite' | 'flag' | 'coverage_gap';
export type AiSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'applied' | 'deferred';
export type AiProvider = 'heuristic';
export type AiRunStatus = 'completed' | 'failed';
export type AiRunType = 'suggestion_refresh';

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
