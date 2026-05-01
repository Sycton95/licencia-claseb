import type {
  PdfGroundingAnchor,
  PdfHighlightResult,
  PdfImageAsset,
  PdfWorkerDocumentStatus,
} from '../types/pdfReview';

async function requestLocalPdfWorker<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const rawText = await response.text();
  const payload = rawText ? (JSON.parse(rawText) as TResponse & { error?: string }) : ({} as TResponse & { error?: string });

  if (!response.ok) {
    throw new Error(payload.error ?? `La operacion PDF local fallo con ${response.status}.`);
  }

  return payload;
}

export async function getLocalPdfWorkerHealth(documentId: string) {
  return requestLocalPdfWorker<PdfWorkerDocumentStatus>(
    `/__local/pdf/health?documentId=${encodeURIComponent(documentId)}`,
  );
}

export async function locateLocalPdfAnchor(payload: {
  documentId: string;
  pageNumber: number;
  excerpt?: string;
  textAnchor?: PdfGroundingAnchor['textAnchor'];
  bbox?: PdfGroundingAnchor['bbox'];
}) {
  return requestLocalPdfWorker<PdfHighlightResult>('/__local/pdf/locate-anchor', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listLocalPdfPageImages(payload: {
  documentId: string;
  pageNumber: number;
}) {
  return requestLocalPdfWorker<{ images: PdfImageAsset[] }>('/__local/pdf/page-images', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
