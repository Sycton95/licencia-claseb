import type { AiSuggestionStatus, AiSuggestionType } from '../../types/ai';
import type { EditorialStatus } from '../../types/content';

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
};

export type AdminSection = 'dashboard' | 'catalog' | 'ai';

export function getEditorialStatusLabel(status: EditorialStatus) {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'reviewed':
      return 'Revisada';
    case 'published':
      return 'Publicada';
    case 'archived':
      return 'Archivada';
  }
}

export function getEditorialStatusDotClass(status: EditorialStatus) {
  return `status-dot status-dot--${status}`;
}

export function getSuggestionStatusLabel(status: AiSuggestionStatus) {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'accepted':
      return 'Aceptada';
    case 'applied':
      return 'Aplicada';
    case 'deferred':
      return 'Postergada';
    case 'rejected':
      return 'Rechazada';
  }
}

export function getSuggestionStatusDotClass(status: AiSuggestionStatus) {
  return `status-dot status-dot--${status}`;
}

export function getSuggestionTypeLabel(type: AiSuggestionType) {
  switch (type) {
    case 'new_question':
      return 'Nueva';
    case 'rewrite':
      return 'Rewrite';
    case 'flag':
      return 'Flag';
    case 'coverage_gap':
      return 'Brecha';
  }
}
