import { AdminCard, AdminSection, AdminBadge, AdminLabel, AdminEmptyState } from './index';
import type { AdminHealth, AdminReportSummary } from './types';
import type { ChapterCoverageRow, ReviewTask } from '../../lib/editorialDiagnostics';

type Props = {
  summary: AdminReportSummary | null;
  chapterCoverage: ChapterCoverageRow[];
  health: AdminHealth | null;
  reviewTasks: ReviewTask[];
};

export function DashboardView({ summary, chapterCoverage, health, reviewTasks }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-y-auto bg-neutral-50 p-4 md:p-8">
      <div className="mx-auto min-h-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Resumen editorial</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Métricas de cobertura, tareas de revisión y estado operativo del sistema.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              { label: 'Total base', value: summary.totalQuestions },
              { label: 'En borrador', value: summary.draftCount },
              { label: 'En revisión', value: summary.reviewedCount },
              { label: 'Publicadas', value: summary.publishedCount },
              { label: 'Alertas críticas', value: summary.reviewSummary.critical },
              { label: 'Alertas moderadas', value: summary.reviewSummary.warning },
            ].map((stat) => (
              <AdminCard key={stat.label} padding="compact">
                <AdminLabel variant="metadata">{stat.label}</AdminLabel>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-neutral-900">{stat.value}</span>
                </div>
              </AdminCard>
            ))}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <AdminCard>
            <AdminLabel variant="section-header">Estado del entorno</AdminLabel>
            <div className="flex-1 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Versión schema</span>
                <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono">
                  {health?.schema ?? 'v1'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Service role</span>
                <AdminBadge
                  variant={health?.usesServiceRole ? 'success' : 'warning'}
                  size="xs"
                >
                  {health?.usesServiceRole ? 'Activa' : 'Inactiva'}
                </AdminBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Motor AI</span>
                <AdminBadge
                  variant={health?.aiSchemaReady ? 'success' : 'warning'}
                  size="xs"
                >
                  {health?.aiSchemaReady ? 'Operativo' : 'Migración pendiente'}
                </AdminBadge>
              </div>
            </div>
          </AdminCard>

          <AdminCard>
            <AdminLabel variant="section-header">Cobertura por capítulo</AdminLabel>
            <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
              {chapterCoverage.map((chapter) => (
                <div key={chapter.chapterId} className="flex items-center justify-between text-sm">
                  <span
                    className="truncate pr-4 font-medium text-neutral-600"
                    title={chapter.chapterTitle}
                  >
                    {chapter.chapterCode}
                  </span>
                  <div className="flex shrink-0 items-center space-x-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full bg-success-600"
                        style={{
                          width: `${chapter.total > 0 ? (chapter.published / chapter.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-xs text-neutral-600">
                      {chapter.published}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <AdminCard>
            <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-4">
              <h3 className="text-sm font-semibold text-neutral-900">Tareas de revisión</h3>
              <AdminBadge variant="neutral" size="xs">
                {reviewTasks.length} abiertas
              </AdminBadge>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
              {reviewTasks.length === 0 ? (
                <AdminEmptyState
                  title="Sin alertas"
                  message="No hay alertas activas para la base actual."
                />
              ) : (
                reviewTasks.slice(0, 10).map((task) => (
                  <AdminCard
                    key={task.id}
                    variant="subtle"
                    padding="compact"
                    className="border-l-2 border-l-warning-600"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <code className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                        {task.questionId}
                      </code>
                      <AdminBadge variant="warning" size="xs">
                        {task.category.replace('_', ' ')}
                      </AdminBadge>
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{task.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-700">{task.detail}</p>
                  </AdminCard>
                ))
              )}
            </div>
          </AdminCard>

          <AdminCard>
            <AdminLabel variant="section-header">Distribución de alertas</AdminLabel>
            {summary && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Duplicados / similares</span>
                  <span className="font-semibold text-neutral-900">
                    {summary.reviewSummary.duplicatePromptCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Distractores débiles</span>
                  <span className="font-semibold text-neutral-900">
                    {summary.reviewSummary.weakDistractorCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Instrucciones inconsistentes</span>
                  <span className="font-semibold text-neutral-900">
                    {summary.reviewSummary.instructionMismatchCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Formato de respuesta</span>
                  <span className="font-semibold text-neutral-900">
                    {summary.reviewSummary.answerFormatCount}
                  </span>
                </div>
              </div>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
