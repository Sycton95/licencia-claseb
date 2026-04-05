import type { ChapterCoverageRow, EditorialWarning, SourceCoverageRow } from '../../lib/editorialDiagnostics';
import type { AdminHealth, AdminReportSummary } from './types';

type DashboardViewProps = {
  activeEditionCode?: string;
  chapterCoverage: ChapterCoverageRow[];
  editorialWarnings: EditorialWarning[];
  health: AdminHealth | null;
  healthNeedsHardening: boolean;
  isSupabaseConfigured: boolean;
  onApplyQuickFilter: (
    preset: 'all' | 'draft' | 'reviewed' | 'published' | 'archived' | 'exam' | 'warnings',
  ) => void;
  onSelectQuestion: (questionId: string) => void;
  sourceCoverage: SourceCoverageRow[];
  summary: AdminReportSummary | null;
};

export function DashboardView({
  activeEditionCode,
  chapterCoverage,
  editorialWarnings,
  health,
  healthNeedsHardening,
  isSupabaseConfigured,
  onApplyQuickFilter,
  onSelectQuestion,
  sourceCoverage,
  summary,
}: DashboardViewProps) {
  return (
    <section className="admin-section-scroll admin-dashboard">
      {summary && (
        <div className="admin-summary-grid">
          <button type="button" className="admin-summary-card" onClick={() => onApplyQuickFilter('all')}>
            <small>Total</small>
            <strong>{summary.totalQuestions}</strong>
          </button>
          <button type="button" className="admin-summary-card" onClick={() => onApplyQuickFilter('draft')}>
            <small>Drafts</small>
            <strong>{summary.draftCount}</strong>
          </button>
          <button type="button" className="admin-summary-card" onClick={() => onApplyQuickFilter('reviewed')}>
            <small>Revisadas</small>
            <strong>{summary.reviewedCount}</strong>
          </button>
          <button type="button" className="admin-summary-card" onClick={() => onApplyQuickFilter('published')}>
            <small>Publicadas</small>
            <strong>{summary.publishedCount}</strong>
          </button>
        </div>
      )}

      <div className="admin-dashboard__grid">
        {isSupabaseConfigured && (
          <section className="panel admin-surface">
            <div className="section-head">
              <div>
                <span className="eyebrow">Operación</span>
                <h3 className="section-title">Estado del sistema</h3>
              </div>
            </div>
            <div className="admin-detail-list">
              <div className="admin-detail-list__row">
                <span>Edición activa</span>
                <strong>{activeEditionCode ?? 'sin datos'}</strong>
              </div>
              <div className="admin-detail-list__row">
                <span>Esquema</span>
                <strong>{health?.schema ?? 'sin datos'}</strong>
              </div>
              <div className="admin-detail-list__row">
                <span>AI schema</span>
                <strong>{health?.aiSchemaReady ? 'activa' : 'pendiente'}</strong>
              </div>
              <div className="admin-detail-list__row">
                <span>Service role</span>
                <strong>{health?.usesServiceRole ? 'activa' : 'pendiente'}</strong>
              </div>
              <div className="admin-detail-list__row">
                <span>Base de datos</span>
                <strong>{health?.databaseReachable ? 'conectada' : 'sin conexión'}</strong>
              </div>
            </div>
            {healthNeedsHardening && (
              <p className="info-text">
                Persisten pendientes operativos. La base debe quedar en esquema v1 con AI schema activa y service role operativa.
              </p>
            )}
          </section>
        )}

        <section className="panel admin-surface">
          <div className="section-head">
            <div>
              <span className="eyebrow">Triage</span>
              <h3 className="section-title">Warnings editoriales</h3>
            </div>
          </div>
          <div className="admin-stack-list">
            {editorialWarnings.length === 0 ? (
              <article className="admin-inline-note">
                <strong>Sin warnings</strong>
                <span>Las reglas actuales no detectan inconsistencias en el catálogo cargado.</span>
              </article>
            ) : (
              editorialWarnings.map((warning) => (
                <button
                  key={warning.id}
                  type="button"
                  className="admin-inline-card"
                  onClick={() => onSelectQuestion(warning.questionId)}
                >
                  <strong>{warning.title}</strong>
                  <span>{warning.detail}</span>
                  <small>{warning.questionId}</small>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel admin-surface">
          <div className="section-head">
            <div>
              <span className="eyebrow">Cobertura</span>
              <h3 className="section-title">Capítulos</h3>
            </div>
          </div>
          <div className="admin-stack-list">
            {chapterCoverage.map((row) => (
              <article key={row.chapterId} className="admin-inline-card">
                <strong>
                  {row.chapterCode} · {row.chapterTitle}
                </strong>
                <small>
                  Total {row.total} · Publicadas {row.published} · Revisadas pendientes {row.reviewedPending}
                </small>
              </article>
            ))}
          </div>
        </section>

        <section className="panel admin-surface">
          <div className="section-head">
            <div>
              <span className="eyebrow">Fuentes</span>
              <h3 className="section-title">Referencia editorial</h3>
            </div>
          </div>
          <div className="admin-stack-list">
            {sourceCoverage.map((row) => (
              <article key={row.sourceDocumentId} className="admin-inline-card">
                <strong>{row.title}</strong>
                <small>
                  Total {row.total} · Sin referencia {row.missingReferenceCount}
                </small>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
