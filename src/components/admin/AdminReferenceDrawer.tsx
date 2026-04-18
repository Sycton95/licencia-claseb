import { AdminBadge, AdminPanel } from './index';
import type { Chapter, Question, SourceDocument } from '../../types/content';

type Props = {
  chapter: Chapter | null;
  question: Question | null;
  sourceDocument: SourceDocument | null;
  onClose: () => void;
};

export function AdminReferenceDrawer({ chapter, question, sourceDocument, onClose }: Props) {
  return (
    <AdminPanel
      isOpen={Boolean(question)}
      onClose={onClose}
      title={question ? `Referencia ${question.id}` : 'Referencia'}
      subtitle="Vista de solo lectura para revisar una coincidencia o pregunta relacionada."
      className="w-[420px] max-w-[420px]"
    >
      {question ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
              {question.id}
            </code>
            <AdminBadge variant="neutral" size="xs">
              {question.status}
            </AdminBadge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Capitulo</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {chapter ? `${chapter.code} - ${chapter.title}` : question.chapterId}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fuente</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {question.sourceReference ?? `Pag. ${question.sourcePage}`}
              </div>
              {sourceDocument && (
                <div className="mt-1 text-xs text-slate-500">{sourceDocument.title}</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enunciado</div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">
              {question.prompt}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Opciones</div>
            <div className="mt-3 space-y-2">
              {question.options.map((option) => (
                <div
                  key={option.id}
                  className={`rounded-lg border p-3 text-sm ${
                    option.isCorrect
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="mr-2 font-bold">{option.label}.</span>
                  {option.text}
                </div>
              ))}
            </div>
          </div>

          {(question.publicExplanation || question.explanation) && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Explicacion</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {question.publicExplanation ?? question.explanation}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </AdminPanel>
  );
}
