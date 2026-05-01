import type { AiSuggestionStatus, AiSuggestionType } from '../../types/ai';
import type { EditorialStatus } from '../../types/content';
import type { ReviewSummary } from '../../lib/editorialDiagnostics';

export type AdminHealth = {
  ok: boolean;
  supabaseConfigured: boolean;
  usesServiceRole: boolean;
  databaseReachable: boolean;
  schema: string;
  aiSchemaReady?: boolean;
  error: string | null;
};

export type AdminReportSummary = {
  totalQuestions: number;
  draftCount: number;
  reviewedCount: number;
  publishedCount: number;
  archivedCount: number;
  examEligibleCount: number;
  reviewSummary: ReviewSummary;
  foundry?: {
    latestBuildId: string | null;
    buildCount: number;
    reviewReadyCount: number;
    stagedCount: number;
    visualAuditCount: number;
  };
};

export type AdminSection = 'dashboard' | 'catalog' | 'foundry' | 'imports' | 'beta';

export function getEditorialStatusColor(status: EditorialStatus) {
  switch (status) {
    case 'draft': return 'bg-amber-500';
    case 'reviewed': return 'bg-blue-500';
    case 'published': return 'bg-emerald-500';
    case 'archived': return 'bg-slate-400';
    default: return 'bg-slate-300';
  }
}

export function getSuggestionStatusColor(status: AiSuggestionStatus) {
  switch (status) {
    case 'pending': return 'bg-amber-500';
    case 'accepted': return 'bg-blue-500';
    case 'applied': return 'bg-emerald-500';
    case 'deferred': return 'bg-slate-400';
    case 'rejected': return 'bg-rose-500';
    default: return 'bg-slate-300';
  }
}
