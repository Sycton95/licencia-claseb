import { useMemo, useState } from 'react';
import { AdminPanel } from './index';
import type { SourceDocument } from '../../types/content';

type Props = {
  document: SourceDocument | null;
  initialPage?: number;
  onClose: () => void;
};

function isPdfUrl(url: string) {
  return /\.pdf($|[?#])/i.test(url);
}

export function AdminManualReader({ document, initialPage = 1, onClose }: Props) {
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(125);

  const pdfUrl = useMemo(() => {
    if (!document || !isPdfUrl(document.url)) {
      return null;
    }

    return `${document.url}#page=${page}&zoom=${zoom}`;
  }, [document, page, zoom]);

  return (
    <AdminPanel
      isOpen={Boolean(document)}
      onClose={onClose}
      title={document?.title ?? 'Manual'}
      subtitle="Lector local de referencias del manual con apertura por pagina."
      className="w-[720px] max-w-[720px]"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Pagina anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Pagina siguiente
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((current) => Math.max(50, current - 25))}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zoom -
            </button>
            <button
              type="button"
              onClick={() => setZoom(125)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setZoom((current) => Math.min(250, current + 25))}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Zoom +
            </button>
          </div>
        </div>
      }
    >
      {document ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pagina</div>
              <input
                type="number"
                min={1}
                value={page}
                onChange={(event) => setPage(Math.max(1, Number(event.target.value) || 1))}
                className="mt-1 w-24 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Zoom</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{zoom}%</div>
            </div>
            <div className="text-xs text-slate-500">
              {pdfUrl ? 'Si el visor del navegador lo soporta, abrira el PDF en la pagina y zoom seleccionados.' : 'Este documento no esta disponible como PDF local embebible.'}
            </div>
          </div>

          {pdfUrl ? (
            <iframe
              title={document.title}
              src={pdfUrl}
              className="h-[70vh] w-full rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Abrir manual no esta disponible para esta fuente en el contexto actual.
            </div>
          )}
        </div>
      ) : null}
    </AdminPanel>
  );
}
