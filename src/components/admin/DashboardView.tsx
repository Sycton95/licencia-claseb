import type { AdminHealth, AdminReportSummary } from './types';
import type { ChapterCoverageRow } from '../../lib/editorialDiagnostics';

type Props = {
  summary: AdminReportSummary | null;
  chapterCoverage: ChapterCoverageRow[];
  health: AdminHealth | null;
};

export function DashboardView({ summary, chapterCoverage, health }: Props) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resumen editorial</h1>
          <p className="mt-1 text-sm text-slate-500">
            Métricas de cobertura y estado operativo del sistema.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Total base', value: summary.totalQuestions, color: 'text-slate-900' },
              { label: 'En borrador', value: summary.draftCount, color: 'text-amber-600' },
              { label: 'En revisión', value: summary.reviewedCount, color: 'text-blue-600' },
              { label: 'Publicadas', value: summary.publishedCount, color: 'text-emerald-600' },
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
      </div>
    </div>
  );
}
