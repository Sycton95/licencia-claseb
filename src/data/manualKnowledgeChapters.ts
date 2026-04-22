import type { VersionedManualChapterSegments } from '../types/importReview';

const MANUAL_CHAPTER_MODULES = import.meta.glob('../../data/manual-knowledge/2026/chapters/*.json');

export async function loadManualKnowledgeChapter(
  chapterId: string,
): Promise<VersionedManualChapterSegments | null> {
  const modulePath = `../../data/manual-knowledge/2026/chapters/${chapterId}.json`;
  const loader = MANUAL_CHAPTER_MODULES[modulePath];

  if (!loader) {
    return null;
  }

  const loaded = (await loader()) as { default?: VersionedManualChapterSegments };
  return (loaded.default ?? null) as VersionedManualChapterSegments | null;
}
