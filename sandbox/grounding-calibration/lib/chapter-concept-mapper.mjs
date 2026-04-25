import { loadChapterFile, loadKnowledgeIndex } from './resource-loader.mjs';

function buildAliasLookup(domainAliases, normalizer) {
  const lookup = new Map();

  for (const group of domainAliases?.groups ?? []) {
    const concept = group.concept;
    const phraseVariants = [];
    const tokenVariants = new Set();

    for (const variant of group.variants ?? []) {
      const normalizedPhrase = normalizer.normalizeForCompare(variant);
      if (normalizedPhrase) {
        phraseVariants.push(normalizedPhrase);
      }
      for (const token of normalizer.tokenize(variant)) {
        tokenVariants.add(token);
      }
    }

    lookup.set(concept, {
      concept,
      phraseVariants,
      tokenVariants,
    });
  }

  return lookup;
}

function extractConceptCounts(segmentText, normalizer, aliasLookup) {
  const normalizedText = normalizer.normalizeForCompare(segmentText);
  const tokens = normalizer.tokenize(segmentText);
  const tokenCounts = new Map();
  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
  }

  const conceptCounts = new Map();

  for (const [token, count] of tokenCounts.entries()) {
    conceptCounts.set(token, (conceptCounts.get(token) ?? 0) + count);
  }

  for (const alias of aliasLookup.values()) {
    let matched = false;
    let count = 0;

    for (const phrase of alias.phraseVariants) {
      if (normalizedText.includes(phrase)) {
        matched = true;
      }
    }

    for (const variantToken of alias.tokenVariants) {
      count += tokenCounts.get(variantToken) ?? 0;
    }

    if (matched || count > 0) {
      conceptCounts.set(alias.concept, (conceptCounts.get(alias.concept) ?? 0) + Math.max(count, 1));
    }
  }

  return conceptCounts;
}

export async function buildChapterStats({ normalizer, domainAliases, topTermsPerChapter = 20 }) {
  const index = await loadKnowledgeIndex();
  const chapters = await Promise.all(index.chapters.map((chapter) => loadChapterFile(chapter.file)));
  const aliasLookup = buildAliasLookup(domainAliases, normalizer);
  const chapterStats = [];
  const conceptGlobal = new Map();
  const conceptChapterPresence = new Map();

  for (const chapter of chapters) {
    const conceptCounts = new Map();
    const segmentCount = (chapter.segments ?? []).length;

    for (const segment of chapter.segments ?? []) {
      const perSegment = extractConceptCounts(segment.text, normalizer, aliasLookup);
      const presentConcepts = new Set();

      for (const [concept, count] of perSegment.entries()) {
        conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + count);
        conceptGlobal.set(concept, (conceptGlobal.get(concept) ?? 0) + count);
        presentConcepts.add(concept);
      }

      for (const concept of presentConcepts) {
        const presence = conceptChapterPresence.get(concept) ?? new Set();
        presence.add(chapter.chapterId);
        conceptChapterPresence.set(concept, presence);
      }
    }

    chapterStats.push({
      chapterId: chapter.chapterId,
      label: chapter.label,
      pageRange: chapter.pageRange,
      segmentCount,
      conceptCounts,
    });
  }

  const chapterCount = chapterStats.length;
  const chaptersOutput = chapterStats.map((chapter) => {
    const signatureTerms = [...chapter.conceptCounts.entries()]
      .map(([concept, frequency]) => {
        const globalCount = conceptGlobal.get(concept) ?? frequency;
        const chapterPresence = (conceptChapterPresence.get(concept) ?? new Set()).size || 1;
        const chapterShare = globalCount === 0 ? 0 : frequency / globalCount;
        const rarity = Math.log(1 + chapterCount / chapterPresence);
        const frequencyWeight = Math.log(1 + frequency);
        const signatureScore = Number((chapterShare * rarity * frequencyWeight).toFixed(6));

        return {
          concept,
          frequency,
          globalCount,
          chapterPresence,
          chapterShare: Number(chapterShare.toFixed(6)),
          signatureScore,
        };
      })
      .filter((entry) => entry.frequency > 0)
      .sort((left, right) => right.signatureScore - left.signatureScore)
      .slice(0, topTermsPerChapter);

    return {
      chapterId: chapter.chapterId,
      label: chapter.label,
      pageRange: chapter.pageRange,
      segmentCount: chapter.segmentCount,
      topSignatureTerms: signatureTerms,
    };
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceVersion: index.version,
    topTermsPerChapter,
    chapters: chaptersOutput,
  };
}
