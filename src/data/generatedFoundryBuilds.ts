import type {
  GeneratedBuildManifest,
  GeneratedBuildSummary,
  GeneratedChapterLoadResult,
  GeneratedReviewCandidate,
} from '../types/foundry';

const MANIFEST_MODULES = import.meta.glob('../../data/foundry-builds/*/manifest.json', {
  eager: true,
});

const CHAPTER_MODULES = import.meta.glob('../../data/foundry-builds/*/review-export/*.jsonl', {
  query: '?raw',
  import: 'default',
});

function normalizeManifest(rawValue: unknown): GeneratedBuildManifest | null {
  const manifest = rawValue as { default?: unknown };
  const value = (manifest.default ?? rawValue) as Partial<GeneratedBuildManifest>;

  if (!value || typeof value.buildId !== 'string' || !Array.isArray(value.chapters)) {
    return null;
  }

  return {
    buildId: value.buildId,
    editionId: value.editionId,
    manualYear: value.manualYear,
    sourceDocumentId: value.sourceDocumentId,
    exportedCount: Number(value.exportedCount ?? 0),
    generatedAt: value.generatedAt,
    chapters: value.chapters
      .filter((chapter) => chapter && typeof chapter.chapterId === 'string')
      .map((chapter) => ({
        chapterId: chapter.chapterId,
        file: chapter.file,
        count: Number(chapter.count ?? 0),
      })),
  };
}

export function getGeneratedBuildManifests(): GeneratedBuildManifest[] {
  return Object.values(MANIFEST_MODULES)
    .map(normalizeManifest)
    .filter((manifest): manifest is GeneratedBuildManifest => Boolean(manifest))
    .sort((left, right) => right.buildId.localeCompare(left.buildId));
}

export function getGeneratedBuildSummaries(): GeneratedBuildSummary[] {
  return getGeneratedBuildManifests().map((manifest) => ({
    buildId: manifest.buildId,
    exportedCount: manifest.exportedCount,
    generatedAt: manifest.generatedAt,
    chapterCount: manifest.chapters.length,
  }));
}

function validateCandidate(value: unknown): value is GeneratedReviewCandidate {
  const candidate = value as Partial<GeneratedReviewCandidate>;
  return Boolean(
    candidate &&
      typeof candidate.externalId === 'string' &&
      typeof candidate.prompt === 'string' &&
      Array.isArray(candidate.options) &&
      Array.isArray(candidate.correctOptionIndexes) &&
      typeof candidate.chapterId === 'string' &&
      candidate.sandboxProvenance?.buildId &&
      candidate.sandboxProvenance?.candidateId,
  );
}

export async function loadGeneratedBuildChapter(
  buildId: string,
  chapterId: string,
): Promise<GeneratedChapterLoadResult | null> {
  const modulePath = `../../data/foundry-builds/${buildId}/review-export/${chapterId}.jsonl`;
  const loader = CHAPTER_MODULES[modulePath];

  if (!loader) {
    return null;
  }

  const rawContent = (await loader()) as string;
  const candidates: GeneratedReviewCandidate[] = [];
  const blockedRows: GeneratedChapterLoadResult['blockedRows'] = [];

  rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line) {
        return;
      }

      try {
        const parsed = JSON.parse(line) as unknown;
        if (validateCandidate(parsed)) {
          candidates.push(parsed);
        } else {
          blockedRows.push({
            ok: false,
            lineNumber: index + 1,
            error: 'La linea no cumple el contrato minimo de candidato Foundry.',
            raw: line,
          });
        }
      } catch (error) {
        blockedRows.push({
          ok: false,
          lineNumber: index + 1,
          error: error instanceof Error ? error.message : 'JSONL invalido.',
          raw: line,
        });
      }
    });

  return {
    buildId,
    chapterId,
    candidates,
    blockedRows,
  };
}
