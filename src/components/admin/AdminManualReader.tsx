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

  const pdfUrl = useMemo(() => {
    if (!document || !isPdfUrl(document.url)) {
      return null;
    }

    return `${document.url}#page=${page}`;
  }, [document, page]);

  return (
    <AdminPanel
      isOpen={Boolean(document)}
      onClose={onClose}
      title={document?.title ?? 'Manual'}
      subtitle="Visor PDF embebido con controles nativos del navegador."
      className="absolute inset-y-0 right-0 z-30 w-full max-w-none"
      bodyClassName="flex min-h-0 flex-1 flex-col p-0"
    >
      {document ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {pdfUrl ? (
            <iframe
              title={document.title}
              src={pdfUrl}
              className="h-full min-h-0 w-full bg-white"
            />
          ) : (
            <div className="m-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Abrir manual no esta disponible para esta fuente en el contexto actual.
            </div>
          )}
        </div>
      ) : null}
    </AdminPanel>
  );
}
