import { useEffect, useMemo, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AdminButton } from './AdminButton';
import { AdminPanel } from './AdminPanel';
import type { SourceDocument } from '../../types/content';

GlobalWorkerOptions.workerSrc = workerUrl;

type TextChunk = {
  text: string;
  normalized: string;
};

type CropDraft = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type Props = {
  isOpen: boolean;
  sourceDocument: SourceDocument | null;
  page?: number;
  excerpt?: string;
  title?: string;
  subtitle?: string;
  allowDraftTools?: boolean;
  onClose: () => void;
  onApplySelection?: (payload: { text: string; page: number; excerpt?: string }) => void;
  onSaveAsset?: (payload: {
    blob: Blob;
    kind: 'crop' | 'upload';
    page?: number;
    name: string;
    previewDataUrl?: string;
  }) => void;
};

function isPdfUrl(url: string) {
  return /\.pdf($|[?#])/i.test(url);
}

function normalizeForMatch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo convertir el blob.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(blob);
  });
}

export function AdminImportPdfWorkspace({
  isOpen,
  sourceDocument,
  page = 1,
  excerpt,
  title,
  subtitle,
  allowDraftTools = false,
  onClose,
  onApplySelection,
  onSaveAsset,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const cropOverlayRef = useRef<HTMLDivElement | null>(null);
  const [activePage, setActivePage] = useState(page);
  const [pageCount, setPageCount] = useState(0);
  const [pageText, setPageText] = useState<TextChunk[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);

  useEffect(() => {
    setActivePage(page);
  }, [page, sourceDocument?.id]);

  const highlightNeedle = useMemo(() => normalizeForMatch(excerpt ?? ''), [excerpt]);

  useEffect(() => {
    if (!isOpen || !sourceDocument || !isPdfUrl(sourceDocument.url) || !canvasRef.current) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    (async () => {
      try {
        const loadingTask = getDocument(sourceDocument.url);
        const pdf = await loadingTask.promise;
        if (cancelled) {
          return;
        }

        setPageCount(pdf.numPages);
        const safePage = Math.max(1, Math.min(activePage, pdf.numPages));
        const pdfPage = await pdf.getPage(safePage);
        if (cancelled) {
          return;
        }

        const viewport = pdfPage.getViewport({ scale: 1.3 });
        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('No se pudo inicializar el canvas del PDF.');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({ canvasContext: context, canvas, viewport }).promise;

        const textContent = await pdfPage.getTextContent();
        if (cancelled) {
          return;
        }

        const chunks = textContent.items
          .map((item) => ('str' in item ? String(item.str ?? '') : ''))
          .filter(Boolean)
          .map((text) => ({
            text,
            normalized: normalizeForMatch(text),
          }));

        setPageText(chunks);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo abrir el PDF seleccionado.',
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePage, isOpen, sourceDocument]);

  useEffect(() => {
    const handleSelection = () => {
      if (!isOpen) {
        return;
      }

      const selection = window.getSelection();
      const value = selection?.toString().trim() ?? '';
      setSelectedText(value);
    };

    window.document.addEventListener('selectionchange', handleSelection);
    return () => {
      window.document.removeEventListener('selectionchange', handleSelection);
    };
  }, [isOpen]);

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onSaveAsset) {
      return;
    }

    const previewDataUrl = await blobToDataUrl(file);
    onSaveAsset({
      blob: file,
      kind: 'upload',
      name: file.name,
      previewDataUrl,
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!allowDraftTools) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setCropDraft({
      startX: event.clientX - bounds.left,
      startY: event.clientY - bounds.top,
      endX: event.clientX - bounds.left,
      endY: event.clientY - bounds.top,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropDraft) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setCropDraft((current) =>
      current
        ? {
            ...current,
            endX: event.clientX - bounds.left,
            endY: event.clientY - bounds.top,
          }
        : current,
    );
  };

  const handlePointerUp = async () => {
    if (!cropDraft || !canvasRef.current || !onSaveAsset) {
      setCropDraft(null);
      return;
    }

    const left = Math.min(cropDraft.startX, cropDraft.endX);
    const top = Math.min(cropDraft.startY, cropDraft.endY);
    const width = Math.abs(cropDraft.endX - cropDraft.startX);
    const height = Math.abs(cropDraft.endY - cropDraft.startY);

    if (width < 24 || height < 24) {
      setCropDraft(null);
      return;
    }

    const output = window.document.createElement('canvas');
    output.width = width;
    output.height = height;
    const outputContext = output.getContext('2d');
    if (!outputContext) {
      setCropDraft(null);
      return;
    }

    outputContext.drawImage(canvasRef.current, left, top, width, height, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob((nextBlob) => resolve(nextBlob), 'image/webp', 0.82),
    );
    const previewDataUrl = output.toDataURL('image/webp', 0.82);
    if (blob) {
      onSaveAsset({
        blob,
        kind: 'crop',
        page: activePage,
        name: `manual-crop-p${activePage}.webp`,
        previewDataUrl,
      });
    }
    setCropDraft(null);
  };

  const cropStyle =
    cropDraft && cropOverlayRef.current
      ? {
          left: Math.min(cropDraft.startX, cropDraft.endX),
          top: Math.min(cropDraft.startY, cropDraft.endY),
          width: Math.abs(cropDraft.endX - cropDraft.startX),
          height: Math.abs(cropDraft.endY - cropDraft.startY),
        }
      : null;

  return (
    <AdminPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? sourceDocument?.title ?? 'PDF del manual'}
      subtitle={subtitle ?? 'Visor PDF con selección de texto y referencias visuales.'}
      className="absolute inset-y-0 right-0 z-30 w-full max-w-[980px]"
      bodyClassName="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]"
    >
      <div className="flex min-h-0 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AdminButton variant="ghost" size="sm" onClick={() => setActivePage((current) => Math.max(1, current - 1))}>
            Página anterior
          </AdminButton>
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() => setActivePage((current) => Math.min(pageCount || current, current + 1))}
          >
            Página siguiente
          </AdminButton>
          <span className="text-sm text-slate-600">
            Página {activePage} {pageCount > 0 ? `de ${pageCount}` : ''}
          </span>
        </div>

        <div
          ref={cropOverlayRef}
          className="relative min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-slate-100"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {isLoading ? (
            <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-500">
              Cargando PDF...
            </div>
          ) : errorMessage ? (
            <div className="m-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              {errorMessage}
            </div>
          ) : (
            <canvas ref={canvasRef} className="mx-auto block max-w-full bg-white shadow-sm" />
          )}
          {cropStyle ? (
            <div
              className="pointer-events-none absolute border-2 border-sky-500 bg-sky-500/10"
              style={cropStyle}
            />
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contexto</p>
          <p className="mt-2 text-sm text-slate-700">
            {excerpt ? excerpt : 'Sin excerpt objetivo para esta apertura del PDF.'}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Texto extraído</p>
          <div
            ref={textLayerRef}
            className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700"
          >
            {pageText.length === 0 ? (
              <p className="text-slate-500">Sin texto extraído para esta página.</p>
            ) : (
              pageText.map((chunk, index) => {
                const highlighted =
                  highlightNeedle && chunk.normalized && highlightNeedle.includes(chunk.normalized);
                return (
                  <span
                    key={`${chunk.normalized}-${index}`}
                    className={highlighted ? 'rounded bg-amber-200/70 px-0.5' : ''}
                  >
                    {chunk.text}{' '}
                  </span>
                );
              })
            )}
          </div>
        </div>

        {allowDraftTools ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Herramientas de borrador</p>
            <p className="mt-2 text-sm text-slate-700">
              Selecciona texto del panel derecho para usarlo como grounding preliminar, o recorta una zona del PDF como referencia visual.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => onApplySelection?.({ text: selectedText, page: activePage, excerpt })}
                disabled={!selectedText}
              >
                Usar texto seleccionado
              </AdminButton>
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Importar imagen
                <input type="file" accept="image/*" className="sr-only" onChange={handleUploadImage} />
              </label>
            </div>
            {selectedText ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Selección actual</p>
                <p className="mt-1">{selectedText}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminPanel>
  );
}
