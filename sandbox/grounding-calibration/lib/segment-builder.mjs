import { loadChapterFile, loadKnowledgeIndex, loadOptionalJsonResource } from './resource-loader.mjs';

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

export async function loadBaseSegments(normalizer) {
  const index = await loadKnowledgeIndex();
  const chapters = await Promise.all(index.chapters.map((chapter) => loadChapterFile(chapter.file)));
  const overrideResource = await loadOptionalJsonResource('segment-overrides.json', { overrides: [] });
  const overrides = new Map((overrideResource?.overrides ?? []).map((override) => [override.id, override]));
  return chapters.flatMap((chapter) =>
    (chapter?.segments ?? []).map((segment) => {
      const merged = {
        ...segment,
        ...(overrides.get(segment.id) ?? {}),
      };

      return {
        ...merged,
        manualRef: normalizer.toDisplayText(merged.manualRef),
        excerpt: normalizer.toDisplayText(merged.excerpt),
        text: normalizer.toDisplayText(merged.text),
        baseSegmentIds: [merged.id],
        parentPageIds: [`${merged.chapterId}:${merged.pageRange.start}-${merged.pageRange.end}`],
        isSyntheticWindow: false,
      };
    }),
  );
}

export function buildSegmentWindows(baseSegments, normalizer) {
  const output = [];
  const byChapter = new Map();
  const maxWindowSegments = 4;
  const maxWindowTokens = 170;

  for (const segment of baseSegments) {
    const bucket = byChapter.get(segment.chapterId) ?? [];
    bucket.push(segment);
    byChapter.set(segment.chapterId, bucket);
  }

  for (const segments of byChapter.values()) {
    const ordered = [...segments].sort((left, right) => {
      if (left.pageRange.start !== right.pageRange.start) {
        return left.pageRange.start - right.pageRange.start;
      }
      return left.id.localeCompare(right.id);
    });

    output.push(...ordered);

    for (let start = 0; start < ordered.length; start += 1) {
      let tokenCount = 0;

      for (let end = start; end < ordered.length && end < start + maxWindowSegments; end += 1) {
        const segment = ordered[end];
        const segmentTokens = normalizer.tokenize(segment.text).length;
        if (end > start && tokenCount + segmentTokens > maxWindowTokens) {
          break;
        }
        tokenCount += segmentTokens;

        const windowSegments = ordered.slice(start, end + 1);
        if (windowSegments.length <= 1) {
          continue;
        }

        const first = windowSegments[0];
        const last = windowSegments[windowSegments.length - 1];
        output.push({
          id: `${first.id}__WIN__${last.id}`,
          chapterId: first.chapterId,
          pageRange: {
            start: first.pageRange.start,
            end: last.pageRange.end,
          },
          manualRef: first.manualRef,
          excerpt: normalizer.toDisplayText(windowSegments.map((segment) => segment.excerpt).join(' ')).slice(0, 420),
          text: normalizer.toDisplayText(windowSegments.map((segment) => segment.text).join(' ')),
          baseSegmentIds: windowSegments.flatMap((segment) => segment.baseSegmentIds),
          parentPageIds: windowSegments.flatMap((segment) => segment.parentPageIds),
          isSyntheticWindow: true,
        });
      }
    }
  }

  return dedupeById(output);
}
