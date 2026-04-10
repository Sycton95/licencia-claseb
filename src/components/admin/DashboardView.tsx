import type { AdminHealth, AdminReportSummary } from './types';
import type { ChapterCoverageRow, ReviewTask } from '../../lib/editorialDiagnostics';

type Props = {
  summary: AdminReportSummary | null;
  chapterCoverage: ChapterCoverageRow[];
  health: AdminHealth | null;
  reviewTasks: ReviewTask[];
};

function getSeverityClasses(severity: ReviewTask['severity']) {
  return severity === 'critical'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

export function DashboardView({ summary, chapterCoverage, health, reviewTasks }: Props) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resumen editorial</h1>
          <p className="mt-1 text-sm text-slate-500">
            Métricas de cobertura, tareas de revisión y estado operativo del sistema.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              { label: 'Total base', value: summary.totalQuestions, color: 'text-slate-900' },
              { label: 'En borrador', value: summary.draftCount, color: 'text-amber-600' },
              { label: 'En revisión', value: summary.reviewedCount, color: 'text-blue-600' },
              { label: 'Publicadas', value: summary.publishedCount, color: 'text-emerald-600' },
              { label: 'Alertas críticas', value: summary.reviewSummary.critical, color: 'text-rose-600' },
              { label: 'Alertas moderadas', value: summary.reviewSummary.warning, color: 'text-amber-600' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </span>
                <span className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">
              Estado del entorno
            </h3>
            <div className="flex-1 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Versión schema</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">
                  {health?.schema ?? 'v1'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Service role</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    health?.usesServiceRole
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {health?.usesServiceRole ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Motor AI</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    health?.aiSchemaReady
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {health?.aiSchemaReady ? 'Operativo' : 'Migración pendiente'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">
              Cobertura por capítulo
            </h3>
            <div className="max-h-60 space-y-3 overflow-y-auto pr-2">
              {chapterCoverage.map((chapter) => (
                <div key={chapter.chapterId} className="flex items-center justify-between text-sm">
                  <span
                    className="truncate pr-4 font-medium text-slate-600"
                    title={chapter.chapterTitle}
                  >
                    {chapter.chapterCode}
                  </span>
                  <div className="flex shrink-0 items-center space-x-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-emerald-400"
                        style={{
                          width: `${chapter.total > 0 ? (chapter.published / chapter.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-xs text-slate-500">
                      {chapter.published}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">Tareas de revisión</h3>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {reviewTasks.length} abiertas
              </span>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
              {reviewTasks.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay alertas activas para la base actual.
                </p>
              ) : (
                reviewTasks.slice(0, 10).map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-xl border p-3.5 ${getSeverityClasses(task.severity)}`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                        {task.questionId}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {task.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="mt-1 text-sm leading-relaxed">{task.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">
              Distribución de alertas
            </h3>
            {summary && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Duplicados / similares</span>
                  <span className="font-semibold text-slate-900">
                    {summary.reviewSummary.duplicatePromptCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Distractores débiles</span>
                  <span className="font-semibold text-slate-900">
                    {summary.reviewSummary.weakDistractorCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Instrucciones inconsistentes</span>
                  <span className="font-semibold text-slate-900">
                    {summary.reviewSummary.instructionMismatchCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Formato de respuesta</span>
                  <span className="font-semibold text-slate-900">
                    {summary.reviewSummary.answerFormatCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
