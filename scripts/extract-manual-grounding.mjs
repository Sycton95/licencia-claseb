import { readFile } from 'node:fs/promises';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const MANUAL_KNOWLEDGE_VERSION = '2026';

export const CHAPTER_WINDOWS = {
  'chapter-1': { start: 6, end: 10, label: 'Los siniestros de tránsito' },
  'chapter-2': { start: 11, end: 32, label: 'Los principios de la conducción' },
  'chapter-3': { start: 33, end: 36, label: 'Convivencia vial' },
  'chapter-4': { start: 37, end: 67, label: 'La persona en el tránsito' },
  'chapter-5': { start: 68, end: 76, label: 'Las y los usuarios vulnerables' },
  'chapter-6': { start: 77, end: 108, label: 'Normas de circulación' },
  'chapter-7': { start: 109, end: 126, label: 'Conducción en circunstancias especiales' },
  'chapter-8': { start: 127, end: 135, label: 'Conducción eficiente' },
  'chapter-9': { start: 136, end: 148, label: 'Informaciones importantes' },
};

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function normalizeExtractedText(value) {
  return normalizeWhitespace(
    String(value ?? '')
      .replace(/(\p{L})-\s+(\p{L})/gu, '$1$2')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([¿¡])\s+/g, '$1')
      .replace(/\s+/g, ' '),
  );
}

function getChapterMeta(pageNumber) {
  const entry = Object.entries(CHAPTER_WINDOWS).find(([, window]) => {
    return pageNumber >= window.start && pageNumber <= window.end;
  });

  if (!entry) {
    return {
      chapterId: '',
      chapterLabel: '',
    };
  }

  return {
    chapterId: entry[0],
    chapterLabel: entry[1].label,
  };
}

function groupItemsIntoLines(items) {
  const lineMap = new Map();

  for (const item of items) {
    const text = normalizeWhitespace(item.str ?? '');
    if (!text) {
      continue;
    }

    const y = Math.round(Number(item.transform?.[5] ?? 0) * 10) / 10;
    const x = Number(item.transform?.[4] ?? 0);
    const bucket = lineMap.get(y) ?? [];
    bucket.push({ x, text });
    lineMap.set(y, bucket);
  }

  return [...lineMap.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, line]) =>
      normalizeExtractedText(
        line
          .sort((left, right) => left.x - right.x)
          .map((item) => item.text)
          .join(' '),
      ),
    )
    .filter(Boolean);
}

function stripPageChrome(text, pageNumber) {
  const escapedPage = String(pageNumber).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let next = normalizeExtractedText(text);
  const chromePatterns = [
    new RegExp(`^libro para la conduccion en chile\\s+.+?\\s+${escapedPage}\\s+`, 'iu'),
    new RegExp(`^libro para la conducción en chile\\s+.+?\\s+${escapedPage}\\s+`, 'iu'),
    new RegExp(`^libro para la conducciÃ³n en chile\\s+.+?\\s+${escapedPage}\\s+`, 'iu'),
    new RegExp(`^LIBRO PARA LA CONDUCCION EN CHILE\\s+.+?\\s+${escapedPage}\\s+`, 'u'),
    /^libro para la conduccion en chile\s+/iu,
    /^libro para la conducción en chile\s+/iu,
    /^libro para la conducciÃ³n en chile\s+/iu,
  ];

  for (const pattern of chromePatterns) {
    next = next.replace(pattern, '');
  }

  return normalizeExtractedText(next);
}

function buildStableSegmentId(chapterId, pageNumber, index) {
  const chapterNumber = String(chapterId ?? '').replace('chapter-', '');
  return `${MANUAL_KNOWLEDGE_VERSION}-CH${chapterNumber}-P${String(pageNumber).padStart(2, '0')}-S${index + 1}`;
}

function splitIntoSentenceWindows(text) {
  const normalized = normalizeExtractedText(text);
  const sentences = normalized
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 35);

  const segments = [];
  let current = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const nextLength = currentLength + sentence.length + 1;
    if (current.length >= 3 || nextLength > 650) {
      const textBlock = normalizeExtractedText(current.join(' '));
      if (textBlock.length >= 120) {
        segments.push(textBlock);
      }
      current = [];
      currentLength = 0;
    }
    current.push(sentence);
    currentLength += sentence.length + 1;
  }

  const trailing = normalizeExtractedText(current.join(' '));
  if (trailing.length >= 120) {
    segments.push(trailing);
  }

  if (segments.length === 0 && normalized.length >= 120) {
    segments.push(normalized);
  }

  return segments;
}

function deriveFactAliases(context, chapterLabel) {
  const lowered = context.toLowerCase();
  const aliases = new Set();

  const rules = [
    { pattern: /alcoholemia|alcohol|ebriedad|ley emilia/u, values: ['alcoholemia', 'alcohol', 'ebriedad', 'ley emilia'] },
    { pattern: /velocidad|km\/h/u, values: ['velocidad', 'límite de velocidad', 'km/h'] },
    { pattern: /utm|multa/u, values: ['utm', 'multa'] },
    { pattern: /licencia/u, values: ['licencia de conducir'] },
    { pattern: /suspensión|cancelación|inhabilidad/u, values: ['suspensión de licencia', 'cancelación de licencia'] },
    { pattern: /cinturón|airbag|sri/u, values: ['seguridad vial', 'cinturón', 'airbag', 'sistema de retención infantil'] },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(lowered)) {
      for (const value of rule.values) {
        aliases.add(value);
      }
    }
  }

  if (aliases.size === 0) {
    const fallback = normalizeExtractedText(context)
      .split(/\s+/u)
      .slice(0, 6)
      .join(' ')
      .toLowerCase();
    if (fallback) {
      aliases.add(fallback);
    }
  }

  return [...aliases];
}

function deriveFactEntity(context, pageNumber, value, unit) {
  const lowered = context.toLowerCase();
  const normalizedUnit = String(unit ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'none';
  if (/alcoholemia|alcohol|ebriedad|ley emilia/u.test(lowered)) {
    return `alcohol_fact_${pageNumber}_${value}_${normalizedUnit}`;
  }
  if (/velocidad|km\/h/u.test(lowered)) {
    return `speed_fact_${pageNumber}_${value}_${normalizedUnit}`;
  }
  if (/utm|multa/u.test(lowered)) {
    return `fine_fact_${pageNumber}_${value}_${normalizedUnit}`;
  }
  if (/licencia|suspensión|cancelación|inhabilidad/u.test(lowered)) {
    return `license_fact_${pageNumber}_${value}_${normalizedUnit}`;
  }
  return `manual_fact_${pageNumber}_${value}_${normalizedUnit}`;
}

function deriveFactStrictness(context) {
  return /alcoholemia|alcohol|ebriedad|ley emilia|velocidad|utm|multa|licencia|suspensión|cancelación|inhabilidad/u.test(
    context.toLowerCase(),
  )
    ? 'hard'
    : 'soft';
}

function extractFactsFromSegments(segments) {
  const facts = [];
  const seen = new Set();
  const factPattern =
    /\b(\d+(?:[.,]\d+)?)\s*(km\/h|g\/l|gramos por mil|utm|%|años?|meses?|días?)\b/giu;

  for (const segment of segments) {
    const matches = [...segment.text.matchAll(factPattern)];
    for (const match of matches) {
      const value = Number(String(match[1]).replace(',', '.'));
      const unit = normalizeExtractedText(match[2] ?? '');
      const key = `${segment.pageRange.start}:${value}:${unit}:${segment.chapterId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      facts.push({
        id: `fact-${segment.chapterId}-${segment.pageRange.start}-${facts.length + 1}`,
        entity: deriveFactEntity(segment.text, segment.pageRange.start, value, unit),
        value,
        unit,
        chapterId: segment.chapterId,
        pageRange: segment.pageRange,
        manualRef: segment.manualRef,
        aliases: deriveFactAliases(segment.text, segment.manualRef),
        strictness: deriveFactStrictness(segment.text),
        excerpt: segment.excerpt,
      });
    }
  }

  return facts;
}

export async function extractManualPages(pdfPath) {
  const sourcePath = path.resolve(pdfPath);
  const data = await readFile(sourcePath);
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(data),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = groupItemsIntoLines(textContent.items);
    const pageText = stripPageChrome(lines.join(' '), pageNumber);
    const chapterMeta = getChapterMeta(pageNumber);
    pages.push({
      pageNumber,
      chapterId: chapterMeta.chapterId,
      chapterLabel: chapterMeta.chapterLabel,
      text: pageText,
      lines,
    });
  }

  return {
    sourcePdf: sourcePath,
    extractedAt: new Date().toISOString(),
    pageCount: pages.length,
    pages,
  };
}

export function segmentManualPages(extractedPages) {
  const segments = [];
  for (const page of extractedPages.pages ?? []) {
    if (!page.chapterId || !page.text) {
      continue;
    }

    const windows = splitIntoSentenceWindows(page.text);
    windows.forEach((text, index) => {
      segments.push({
        id: buildStableSegmentId(page.chapterId, page.pageNumber, index),
        chapterId: page.chapterId,
        pageRange: {
          start: page.pageNumber,
          end: page.pageNumber,
        },
        manualRef: page.chapterLabel,
        excerpt: text.slice(0, 280),
        text,
        conceptRefs: deriveFactAliases(text, page.chapterLabel),
      });
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    segmentCount: segments.length,
    segments,
  };
}

export function deriveGroundTruthFromSegments(segmentedManual) {
  const facts = extractFactsFromSegments(segmentedManual.segments ?? []);
  return {
    generatedAt: new Date().toISOString(),
    factCount: facts.length,
    facts,
  };
}
