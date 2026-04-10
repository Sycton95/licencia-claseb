// src/components/admin/DashboardView.tsx
import type { AdminReportSummary, AdminHealth } from './types';
import type { ChapterCoverageRow } from '../../lib/editorialDiagnostics';

type Props = {
  summary: AdminReportSummary | null;
  chapterCoverage: ChapterCoverageRow[];
  health: AdminHealth | null;
};

export function DashboardView({ summary, chapterCoverage, health }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resumen Editorial</h1>
          <p className="text-sm text-slate-500 mt-1">Métricas de cobertura y salud del sistema.</p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Base', value: summary.totalQuestions, color: 'text-slate-900' },
              { label: 'En Borrador', value: summary.draftCount, color: 'text-amber-600' },
              { label: 'En Revisión', value: summary.reviewedCount, color: 'text-blue-600' },
              { label: 'Publicadas', value: summary.publishedCount, color: 'text-emerald-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</span>
                <span className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h3 className="font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 text-sm">Estado del Entorno</h3>
            <div className="space-y-4 text-sm flex-1">
              <div className="flex justify-between items-center"><span className="text-slate-500">Versión Schema</span> <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{health?.schema ?? 'v1'}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Service Role</span> <span className={`px-2 py-0.5 rounded text-xs font-bold ${health?.usesServiceRole ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{health?.usesServiceRole ? 'Activa' : 'Inactiva'}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Motor AI</span> <span className={`px-2 py-0.5 rounded text-xs font-bold ${health?.aiSchemaReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{health?.aiSchemaReady ? 'Operativo' : 'Pendiente Migración'}</span></div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h3 className="font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 text-sm">Cobertura por Capítulo</h3>
            <div className="space-y-3 overflow-y-auto max-h-60 pr-2">
              {chapterCoverage.map(c => (
                <div key={c.chapterId} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 truncate pr-4 font-medium" title={c.chapterTitle}>{c.chapterCode}</span>
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${c.total > 0 ? (c.published / c.total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-500 w-8 text-right">{c.published}</span>
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