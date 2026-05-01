export type PdfTextAnchor = {
  exact?: string;
  prefix?: string;
  suffix?: string;
};

export type PdfRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfGroundingAnchor = {
  pageNumber: number;
  blockId?: string;
  excerpt: string;
  textAnchor?: PdfTextAnchor;
  bbox?: PdfRect | null;
  bboxSource?: string;
};

export type PdfHighlightResult = {
  pageNumber: number;
  bbox: PdfRect | null;
  rects?: PdfRect[];
  bboxSource:
    | 'candidate'
    | 'pymupdf_search'
    | 'pymupdf_exact'
    | 'pymupdf_excerpt'
    | 'pymupdf_prefix'
    | 'unavailable';
  matchedText?: string;
};

export type PdfImageAsset = {
  id: string;
  pageNumber: number;
  bbox: PdfRect;
  mimeType: string;
  dataUrl: string;
  extractionMode?: 'embedded' | 'page_clip_fallback';
};

export type PdfWorkerDocumentStatus = {
  workerAvailable: boolean;
  documentId: string;
  available: boolean;
  pageCount?: number;
  error?: string;
};

export type OfficialManualRecord = {
  documentId: string;
  title: string;
  issuer: string;
  year: number;
  official: boolean;
  localOnly: boolean;
  assetRelativePath: string;
  assetUrl: string;
};
