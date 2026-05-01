import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties } from 'react';
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AdminButton } from './AdminButton';
import { AdminPanel } from './AdminPanel';
import type { SourceDocument } from '../../types/content';
import {
  getLocalPdfWorkerHealth,
  listLocalPdfPageImages,
  locateLocalPdfAnchor,
} from '../../lib/localPdfWorkerClient';
import type {
  PdfGroundingAnchor,
  PdfHighlightResult,
  PdfImageAsset,
  PdfRect,
} from '../../types/pdfReview';

GlobalWorkerOptions.workerSrc = workerUrl;

type TextChunk = {
  text: string;
  normalized: string;
};

type NormalizedText = {
  normalized: string;
  map: number[];
};

type TextMatchSegment = {
  itemIndex: number;
  startOffset: number;
  endOffset: number;
};

type TextLayerMatch = {
  source: 'text_anchor_exact' | 'excerpt' | 'text_anchor_prefix';
  needle: string;
  segments: TextMatchSegment[];
};

type PdfLoadPhase =
  | 'idle'
  | 'load_started'
  | 'document_loaded'
  | 'page_loaded'
  | 'render_started'
  | 'render_completed'
  | 'text_loaded'
  | 'load_failed'
  | 'load_cancelled';

type PdfDebugState = {
  phase: PdfLoadPhase;
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

type Props = {
  isOpen: boolean;
  sourceDocument: SourceDocument | null;
  page?: number;
  excerpt?: string;
  textAnchor?: PdfGroundingAnchor['textAnchor'];
  bbox?: PdfRect | null;
  bboxSource?: string;
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

function normalizeWithMap(value: string): NormalizedText {
  const output: string[] = [];
  const map: number[] = [];
  let pendingWhitespace = false;

  for (let index = 0; index < value.length; index += 1) {
    const rawChar = value[index];
    const normalizedChar = rawChar
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (!normalizedChar) {
      continue;
    }

    if (/\s/.test(normalizedChar)) {
      pendingWhitespace = output.length > 0;
      continue;
    }

    if (pendingWhitespace) {
      output.push(' ');
      map.push(index);
      pendingWhitespace = false;
    }

    for (const finalChar of normalizedChar) {
      output.push(finalChar);
      map.push(index);
    }
  }

  while (output[0] === ' ') {
    output.shift();
    map.shift();
  }
  while (output[output.length - 1] === ' ') {
    output.pop();
    map.pop();
  }

  return {
    normalized: output.join(''),
    map,
  };
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo convertir el blob.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(blob);
  });
}

async function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen detectada.'));
    image.src = src;
  });
}

async function flattenImageDataUrlToWhite(dataUrl: string) {
  const image = await loadImageElement(dataUrl);
  const canvas = window.document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo preparar la imagen para fondo blanco.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

async function normalizePdfImageAsset(image: PdfImageAsset): Promise<PdfImageAsset> {
  const dataUrl = await flattenImageDataUrlToWhite(image.dataUrl);
  return {
    ...image,
    dataUrl,
    mimeType: 'image/png',
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildNeedles(excerpt?: string, textAnchor?: PdfGroundingAnchor['textAnchor']) {
  const values: Array<{ source: TextLayerMatch['source']; needle: string }> = [];
  const exact = textAnchor?.exact?.trim();
  const excerptValue = excerpt?.trim();
  const prefix = textAnchor?.prefix?.trim();

  if (exact) {
    values.push({ source: 'text_anchor_exact', needle: exact });
  }
  if (excerptValue) {
    values.push({ source: 'excerpt', needle: excerptValue });
  }
  if (prefix) {
    values.push({ source: 'text_anchor_prefix', needle: prefix });
  }

  return values.filter((entry, index, list) =>
    list.findIndex((candidate) => normalizeForMatch(candidate.needle) === normalizeForMatch(entry.needle)) === index,
  );
}

function buildTextIndex(items: string[]) {
  const ranges: Array<{
    start: number;
    end: number;
    raw: string;
    normalized: string;
    map: number[];
  }> = [];
  let cursor = 0;
  const parts: string[] = [];

  items.forEach((item, index) => {
    const normalizedItem = normalizeWithMap(item);
    const normalized = normalizedItem.normalized;
    if (!normalized) {
      ranges.push({
        start: cursor,
        end: cursor,
        raw: item,
        normalized: '',
        map: [],
      });
      return;
    }

    if (index > 0 && parts.length > 0) {
      parts.push(' ');
      cursor += 1;
    }

    const start = cursor;
    parts.push(normalized);
    cursor += normalized.length;
    ranges.push({
      start,
      end: cursor,
      raw: item,
      normalized,
      map: normalizedItem.map,
    });
  });

  return {
    fullText: parts.join(''),
    ranges,
  };
}

function mapNormalizedOffsetToRawOffset(
  map: number[],
  rawText: string,
  normalizedOffset: number,
  mode: 'start' | 'end',
) {
  if (map.length === 0) {
    return 0;
  }

  if (mode === 'start') {
    if (normalizedOffset <= 0) {
      return 0;
    }
    if (normalizedOffset >= map.length) {
      return rawText.length;
    }
    return clamp(map[normalizedOffset] ?? 0, 0, rawText.length);
  }

  if (normalizedOffset <= 0) {
    return 0;
  }
  if (normalizedOffset >= map.length) {
    return rawText.length;
  }

  const rawIndex = map[normalizedOffset] ?? rawText.length;
  return clamp(rawIndex, 0, rawText.length);
}

function findTextLayerMatch(
  items: string[],
  excerpt?: string,
  textAnchor?: PdfGroundingAnchor['textAnchor'],
): TextLayerMatch | null {
  if (items.length === 0) {
    return null;
  }

  const index = buildTextIndex(items);
  if (!index.fullText) {
    return null;
  }

  for (const entry of buildNeedles(excerpt, textAnchor)) {
    const needle = normalizeForMatch(entry.needle);
    if (!needle) {
      continue;
    }

    const matchStart = index.fullText.indexOf(needle);
    if (matchStart === -1) {
      continue;
    }

    const matchEnd = matchStart + needle.length;
    const segments: TextMatchSegment[] = [];

    index.ranges.forEach((range, itemIndex) => {
      if (range.start === range.end || !range.normalized) {
        return;
      }

      const overlapStart = Math.max(matchStart, range.start);
      const overlapEnd = Math.min(matchEnd, range.end);
      if (overlapStart >= overlapEnd) {
        return;
      }

      const localStart = overlapStart - range.start;
      const localEnd = overlapEnd - range.start;
      const startOffset = mapNormalizedOffsetToRawOffset(range.map, range.raw, localStart, 'start');
      const endOffset = mapNormalizedOffsetToRawOffset(range.map, range.raw, localEnd, 'end');

      if (endOffset > startOffset) {
        segments.push({
          itemIndex,
          startOffset,
          endOffset,
        });
      }
    });

    if (segments.length > 0) {
      return {
        source: entry.source,
        needle: entry.needle,
        segments,
      };
    }
  }

  return null;
}

function getTextNodeFromElement(element: HTMLElement) {
  const walker = window.document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  return walker.nextNode();
}

function buildTextLayerHighlightRects(textDivs: HTMLElement[], match: TextLayerMatch, container: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const rects: Array<{ key: string; style: CSSProperties }> = [];

  match.segments.forEach((segment, segmentIndex) => {
    const element = textDivs[segment.itemIndex];
    const textNode = element ? getTextNodeFromElement(element) : null;
    const rawText = textNode?.textContent ?? '';
    if (!textNode || !rawText) {
      return;
    }

    const safeStart = clamp(segment.startOffset, 0, rawText.length);
    const safeEnd = clamp(segment.endOffset, safeStart + 1, rawText.length);
    if (safeEnd <= safeStart) {
      return;
    }

    const range = window.document.createRange();
    range.setStart(textNode, safeStart);
    range.setEnd(textNode, safeEnd);

    Array.from(range.getClientRects()).forEach((rect, rectIndex) => {
      rects.push({
        key: `${segment.itemIndex}-${segmentIndex}-${rectIndex}-${rect.left}-${rect.top}`,
        style: {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        },
      });
    });

    range.detach?.();
  });

  return rects;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

export function AdminImportPdfWorkspace({
  isOpen,
  sourceDocument,
  page = 1,
  excerpt,
  textAnchor,
  bbox,
  bboxSource,
  title,
  subtitle,
  allowDraftTools = false,
  onClose,
  onApplySelection,
  onSaveAsset,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerContainerRef = useRef<HTMLDivElement | null>(null);
  const textLayerInstanceRef = useRef<InstanceType<typeof TextLayer> | null>(null);
  const textLayerDivsRef = useRef<HTMLElement[]>([]);
  const textLayerItemsRef = useRef<string[]>([]);
  const [activePage, setActivePage] = useState(page);
  const [pageCount, setPageCount] = useState(0);
  const [pageText, setPageText] = useState<TextChunk[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewportScale, setViewportScale] = useState(1.3);
  const [highlightResult, setHighlightResult] = useState<PdfHighlightResult | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [isPdfWorkerAvailable, setIsPdfWorkerAvailable] = useState(true);
  const [pageImages, setPageImages] = useState<PdfImageAsset[]>([]);
  const [isLoadingPageImages, setIsLoadingPageImages] = useState(false);
  const [hasLoadedPageImages, setHasLoadedPageImages] = useState(false);
  const [draftToolMessage, setDraftToolMessage] = useState<string | null>(null);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [canvasMetrics, setCanvasMetrics] = useState({ width: 0, height: 0 });
  const [pdfDebugState, setPdfDebugState] = useState<PdfDebugState>({ phase: 'idle' });
  const [textLayerMatch, setTextLayerMatch] = useState<TextLayerMatch | null>(null);
  const [inlineHighlightRects, setInlineHighlightRects] = useState<Array<{ key: string; style: CSSProperties }>>([]);

  const debugEnabled = import.meta.env.DEV;

  useEffect(() => {
    setActivePage(page);
  }, [page, sourceDocument?.id]);

  const highlightNeedle = useMemo(() => normalizeForMatch(excerpt ?? ''), [excerpt]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setIsLoading(false);
    setErrorMessage(null);
    setPageText([]);
    setPageCount(0);
    setSelectedText('');
    setPageImages([]);
    setHasLoadedPageImages(false);
    setDraftToolMessage(null);
    setIsPdfReady(false);
    setCanvasMetrics({ width: 0, height: 0 });
    setPdfDebugState({ phase: 'idle' });
    setTextLayerMatch(null);
    setInlineHighlightRects([]);
  }, [isOpen]);

  useEffect(() => {
    if (!debugEnabled) {
      return;
    }

    console.debug('[AdminImportPdfWorkspace]', {
      phase: pdfDebugState.phase,
      page: activePage,
      pageCount,
      canvasWidth: canvasMetrics.width,
      canvasHeight: canvasMetrics.height,
      textCount: pageText.length,
      error: pdfDebugState.error ?? null,
    });
  }, [
    activePage,
    canvasMetrics.height,
    canvasMetrics.width,
    debugEnabled,
    pageCount,
    pageText.length,
    pdfDebugState.error,
    pdfDebugState.phase,
  ]);

  useEffect(() => {
    if (!isOpen || !sourceDocument || !isPdfUrl(sourceDocument.url)) {
      return;
    }

    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;
    let pageRenderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;
    const markPhase = (
      phase: PdfLoadPhase,
      next: Partial<Omit<PdfDebugState, 'phase'>> = {},
    ) => {
      if (cancelled) {
        return;
      }

      setPdfDebugState((current) => ({
        ...current,
        ...next,
        phase,
      }));
    };

    setIsLoading(true);
    setIsPdfReady(false);
    setErrorMessage(null);
    setPageText([]);
    setPageCount(0);
    setCanvasMetrics({ width: 0, height: 0 });
    setTextLayerMatch(null);
    setInlineHighlightRects([]);
    setSelectedText('');
    setHasLoadedPageImages(false);
    markPhase('load_started', {
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      error: undefined,
    });

    (async () => {
      try {
        const canvas = canvasRef.current;
        const textLayerContainer = textLayerContainerRef.current;
        if (!canvas) {
          throw new Error('No se encontro el canvas del visor PDF.');
        }
        if (!textLayerContainer) {
          throw new Error('No se encontro la capa de texto del visor PDF.');
        }

        textLayerInstanceRef.current?.cancel();
        textLayerInstanceRef.current = null;
        textLayerDivsRef.current = [];
        textLayerItemsRef.current = [];
        textLayerContainer.innerHTML = '';

        loadingTask = getDocument(sourceDocument.url);
        const pdf = await withTimeout(
          loadingTask.promise,
          15000,
          'La carga del documento PDF supero el tiempo de espera.',
        );
        if (cancelled) {
          return;
        }

        markPhase('document_loaded');
        setPageCount(pdf.numPages);
        const safePage = Math.max(1, Math.min(activePage, pdf.numPages));
        const pdfPage = await pdf.getPage(safePage);
        if (cancelled) {
          return;
        }

        markPhase('page_loaded');
        const viewport = pdfPage.getViewport({ scale: 1.3 });
        setViewportScale(viewport.scale);
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('No se pudo inicializar el canvas del PDF.');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        markPhase('render_started');
        pageRenderTask = pdfPage.render({ canvasContext: context, canvas, viewport });
        renderTask = pageRenderTask;
        await pageRenderTask.promise;
        if (cancelled) {
          return;
        }

        setCanvasMetrics({
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });
        setIsPdfReady(true);
        markPhase('render_completed');

        const textContent = await pdfPage.getTextContent();
        if (cancelled) {
          return;
        }

        const textLayer = new TextLayer({
          textContentSource: textContent,
          container: textLayerContainer,
          viewport,
        });
        textLayerInstanceRef.current = textLayer;
        await textLayer.render();
        if (cancelled) {
          return;
        }

        textLayerDivsRef.current = textLayer.textDivs;
        textLayerItemsRef.current = textLayer.textContentItemsStr;
        const chunks = textLayer.textContentItemsStr
          .map((text) => String(text ?? ''))
          .filter(Boolean)
          .map((text) => ({ text, normalized: normalizeForMatch(text) }));

        setPageText(chunks);
        markPhase('text_loaded', {
          completedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'No se pudo abrir el PDF seleccionado.';
          setErrorMessage(message);
          setIsPdfReady(false);
          markPhase('load_failed', {
            completedAt: new Date().toISOString(),
            error: message,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      setPdfDebugState((current) =>
        current.phase === 'text_loaded' || current.phase === 'load_failed'
          ? current
          : {
              ...current,
              completedAt: new Date().toISOString(),
              phase: 'load_cancelled',
            },
      );
      try {
        renderTask?.cancel();
      } catch {}
      try {
        textLayerInstanceRef.current?.cancel();
      } catch {}
      try {
        textLayerInstanceRef.current = null;
        textLayerDivsRef.current = [];
        textLayerItemsRef.current = [];
        textLayerContainerRef.current?.replaceChildren();
      } catch {}
      try {
        void loadingTask?.destroy();
      } catch {}
    };
  }, [activePage, isOpen, sourceDocument?.id, sourceDocument?.url]);

  useEffect(() => {
    if (!isOpen || !sourceDocument || sourceDocument.type !== 'manual') {
      setHighlightResult(null);
      setWorkerError(null);
      setIsPdfWorkerAvailable(true);
      return;
    }

    if (bbox) {
      setHighlightResult({
        pageNumber: activePage,
        bbox,
        rects: [bbox],
        bboxSource: 'candidate',
      });
      return;
    }

    if (!excerpt && !textAnchor) {
      setHighlightResult(null);
      return;
    }

    let cancelled = false;
    setWorkerError(null);
    setIsPdfWorkerAvailable(true);

    void getLocalPdfWorkerHealth(sourceDocument.id)
      .then((status) => {
        if (cancelled) {
          return null;
        }

        setIsPdfWorkerAvailable(status.workerAvailable);

        if (!status.available) {
          if (!cancelled && status.error) {
            setWorkerError(status.error);
          }
          return null;
        }

        if (!status.workerAvailable) {
          if (status.error) {
            setWorkerError(`PyMuPDF local no disponible. Se usara el fallback textual del navegador. Detalle: ${status.error}`);
          }
          return null;
        }

        return locateLocalPdfAnchor({
          documentId: sourceDocument.id,
          pageNumber: activePage,
          excerpt,
          textAnchor,
        });
      })
      .then((result) => {
        if (!cancelled && result) {
          setHighlightResult(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setWorkerError(
            error instanceof Error ? error.message : 'No se pudo resolver el highlight local.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activePage, bbox, excerpt, isOpen, sourceDocument, textAnchor]);

  useEffect(() => {
    const textDivs = textLayerDivsRef.current;
    const container = textLayerContainerRef.current;
    if (!isOpen || !isPdfReady || textDivs.length === 0 || !container) {
      setTextLayerMatch(null);
      setInlineHighlightRects([]);
      return;
    }

    const match = findTextLayerMatch(textLayerItemsRef.current, excerpt, textAnchor);
    if (!match) {
      setTextLayerMatch(null);
      setInlineHighlightRects([]);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setInlineHighlightRects(buildTextLayerHighlightRects(textDivs, match, container));
      setTextLayerMatch(match);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activePage, excerpt, isOpen, isPdfReady, pageText.length, textAnchor]);

  useEffect(() => {
    const handleSelection = () => {
      if (!isOpen) {
        setSelectedText('');
        return;
      }

      const selection = window.getSelection();
      const value = selection?.toString().trim() ?? '';
      const anchorNode = selection?.anchorNode ?? null;
      const focusNode = selection?.focusNode ?? null;
      const container = textLayerContainerRef.current;
      const insideTextLayer =
        container !== null &&
        anchorNode !== null &&
        focusNode !== null &&
        container.contains(anchorNode) &&
        container.contains(focusNode);
      setSelectedText(insideTextLayer ? value : '');
    };

    window.document.addEventListener('selectionchange', handleSelection);
    return () => {
      window.document.removeEventListener('selectionchange', handleSelection);
    };
  }, [isOpen]);

  useEffect(() => {
    setPageImages([]);
    setHasLoadedPageImages(false);
  }, [activePage, sourceDocument?.id]);

  const viewerStatusText = useMemo(
    () =>
      [
        `fase=${pdfDebugState.phase}`,
        `pagina=${activePage}`,
        `paginas=${pageCount}`,
        `texto=${pageText.length}`,
        `canvas=${canvasMetrics.width}x${canvasMetrics.height}`,
      ].join(' '),
    [
      activePage,
      canvasMetrics.height,
      canvasMetrics.width,
      pageCount,
      pageText.length,
      pdfDebugState.phase,
    ],
  );

  const loadPageImages = async () => {
    if (!sourceDocument || sourceDocument.type !== 'manual') {
      return;
    }

    if (!isPdfWorkerAvailable) {
      setHasLoadedPageImages(true);
      setPageImages([]);
      setWorkerError(
        'La extraccion PyMuPDF no esta disponible en este entorno. El visor sigue operando con fallback textual y sin extraccion local de imagenes.',
      );
      setDraftToolMessage('Extraccion embebida no disponible en este entorno local.');
      return;
    }

    setIsLoadingPageImages(true);
    setHasLoadedPageImages(true);
    try {
      const result = await listLocalPdfPageImages({
        documentId: sourceDocument.id,
        pageNumber: activePage,
      });
      const normalizedImages = await Promise.all(result.images.map(normalizePdfImageAsset));
      setPageImages(normalizedImages);
      setWorkerError(null);
      setDraftToolMessage(
        normalizedImages.length > 0
          ? `Se detectaron ${normalizedImages.length} imagenes en la pagina.`
          : 'No se detectaron imagenes embebidas en esta pagina.',
      );
    } catch (error) {
      setWorkerError(
        error instanceof Error ? error.message : 'No se pudieron obtener las imagenes de la pagina.',
      );
    } finally {
      setIsLoadingPageImages(false);
    }
  };

  const dataUrlToBlob = async (dataUrl: string) => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const saveDetectedPageImage = async (image: PdfImageAsset) => {
    if (!onSaveAsset) {
      return;
    }

    const blob = await dataUrlToBlob(image.dataUrl);
    onSaveAsset({
      blob,
      kind: 'crop',
      page: image.pageNumber,
      name: `manual-page-${image.pageNumber}-${image.id}.png`,
      previewDataUrl: image.dataUrl,
    });
  };

  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
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

  const highlightRects = useMemo(() => {
    const canvas = canvasRef.current;
    if (inlineHighlightRects.length > 0 || !canvas) {
      return [];
    }

    const rects =
      highlightResult?.rects && highlightResult.rects.length > 0
        ? highlightResult.rects
        : highlightResult?.bbox
          ? [highlightResult.bbox]
          : [];

    return rects.map((rect, index) => ({
      key: `${index}-${rect.x}-${rect.y}-${rect.width}-${rect.height}`,
      style: {
        left: canvas.offsetLeft + rect.x * viewportScale,
        top: canvas.offsetTop + rect.y * viewportScale,
        width: rect.width * viewportScale,
        height: rect.height * viewportScale,
      },
    }));
  }, [highlightResult, inlineHighlightRects.length, viewportScale]);

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
          className="relative min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-slate-100"
          data-testid="admin-pdf-workspace"
          data-pdf-phase={pdfDebugState.phase}
          data-pdf-page={activePage}
          data-pdf-page-count={pageCount}
          data-pdf-text-count={pageText.length}
          data-pdf-canvas-width={canvasMetrics.width}
          data-pdf-canvas-height={canvasMetrics.height}
          data-pdf-ready={isPdfReady ? 'true' : 'false'}
        >
          <div className="relative mx-auto w-fit">
            <canvas
              ref={canvasRef}
              data-testid="admin-pdf-canvas"
              className={`admin-pdf-canvas block max-w-full bg-white shadow-sm transition-opacity ${
                isPdfReady ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <div
              ref={textLayerContainerRef}
              data-testid="admin-pdf-text-layer"
              className="admin-pdf-text-layer"
            />
            <div className="pointer-events-none absolute inset-0 z-[2]">
              {inlineHighlightRects.map((highlightRect) => (
                <div
                  key={highlightRect.key}
                  className="admin-pdf-highlight-inline absolute"
                  style={highlightRect.style}
                />
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="absolute inset-0 flex min-h-[420px] items-center justify-center bg-slate-100/95 text-sm text-slate-500">
              Cargando PDF...
            </div>
          ) : errorMessage ? (
            <div className="absolute inset-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              {errorMessage}
            </div>
          ) : null}
          {highlightRects.map((highlightRect) => (
            <div
              key={highlightRect.key}
              className="admin-pdf-highlight-rect pointer-events-none absolute"
              style={highlightRect.style}
            />
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contexto</p>
          <p className="mt-2 text-sm text-slate-700">
            {excerpt ? excerpt : 'Sin excerpt objetivo para esta apertura del PDF.'}
          </p>
          {textLayerMatch ? (
            <p className="mt-2 text-xs text-emerald-700">
              Highlight textual: {textLayerMatch.source}
            </p>
          ) : highlightResult?.bboxSource ? (
            <p className="mt-2 text-xs text-slate-500">
              Highlight geométrico: {highlightResult.bboxSource}
            </p>
          ) : null}
          {workerError ? (
            <p className="mt-2 text-xs text-amber-700">{workerError}</p>
          ) : null}
          {debugEnabled ? (
            <div
              data-testid="pdf-debug-status"
              className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
            >
              {viewerStatusText}
              {pdfDebugState.error ? ` error=${pdfDebugState.error}` : ''}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Texto extraído</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
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
              Selecciona texto directamente sobre el PDF para correcciones y usa la extracción de imágenes embebidas como referencia visual local. La extracción se prepara con fondo blanco para evitar transparencias confusas.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => onApplySelection?.({ text: selectedText, page: activePage, excerpt })}
                disabled={!selectedText || !isPdfReady}
              >
                Usar texto seleccionado
              </AdminButton>
              <AdminButton
                variant="outline"
                size="sm"
                onClick={() => void loadPageImages()}
                disabled={isLoadingPageImages || !isPdfReady}
              >
                {isLoadingPageImages ? 'Extrayendo imágenes...' : 'Extraer imágenes embebidas'}
              </AdminButton>
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Importar imagen
                <input type="file" accept="image/*" className="sr-only" onChange={handleUploadImage} />
              </label>
            </div>
            {draftToolMessage ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {draftToolMessage}
              </div>
            ) : null}
            {selectedText ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Selección actual</p>
                <p className="mt-1">{selectedText}</p>
              </div>
            ) : null}
            {!isLoadingPageImages && hasLoadedPageImages && pageImages.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Esta página no tiene imágenes embebidas detectables en la estructura del PDF.
              </div>
            ) : null}
            {pageImages.length > 0 ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm font-semibold text-slate-900">Imágenes embebidas detectadas</p>
                <div className="space-y-3">
                  {pageImages.map((image) => (
                    <div key={image.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {image.extractionMode === 'embedded'
                            ? 'Extracto embebido'
                            : 'Fallback de recorte'}
                        </p>
                      </div>
                      <img
                        src={image.dataUrl}
                        alt={`Imagen detectada en pagina ${image.pageNumber}`}
                        className="max-h-40 rounded-lg border border-slate-200"
                      />
                      <div className="mt-2 flex justify-end">
                        <AdminButton
                          variant="secondary"
                          size="sm"
                          onClick={() => void saveDetectedPageImage(image)}
                        >
                          Guardar referencia
                        </AdminButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminPanel>
  );
}
