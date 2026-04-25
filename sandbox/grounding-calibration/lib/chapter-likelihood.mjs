export function createChapterLikelihoodModel({ chapterStats, normalizer, domainAliases }) {
  const chapterEntries = chapterStats?.chapters ?? [];
  const aliasMap = new Map();

  for (const group of domainAliases?.groups ?? []) {
    for (const token of normalizer.tokenize(group.concept)) {
      aliasMap.set(token, group.concept);
    }
    for (const variant of group.variants ?? []) {
      for (const token of normalizer.tokenize(variant)) {
        aliasMap.set(token, group.concept);
      }
    }
  }

  const conceptScoresByChapter = new Map(
    chapterEntries.map((chapter) => [
      chapter.chapterId,
      new Map((chapter.topSignatureTerms ?? []).map((entry) => [entry.concept, entry.signatureScore])),
    ]),
  );

  function canonicalizeQueryConcepts(queryText) {
    return normalizer.tokenize(queryText).map((token) => aliasMap.get(token) ?? token);
  }

  function scoreQuery(queryText) {
    const concepts = canonicalizeQueryConcepts(queryText);
    const rawScores = Object.fromEntries(chapterEntries.map((chapter) => [chapter.chapterId, 0]));
    const matchedConcepts = [];

    for (const concept of concepts) {
      let matched = false;
      for (const chapter of chapterEntries) {
        const score = conceptScoresByChapter.get(chapter.chapterId)?.get(concept) ?? 0;
        if (score > 0) {
          rawScores[chapter.chapterId] += score;
          matched = true;
        }
      }
      if (matched) {
        matchedConcepts.push(concept);
      }
    }

    const total = Object.values(rawScores).reduce((sum, value) => sum + value, 0);
    const neutral = chapterEntries.length > 0 ? 1 / chapterEntries.length : 0;
    const distribution =
      total > 0
        ? Object.fromEntries(Object.entries(rawScores).map(([chapterId, value]) => [chapterId, Number((value / total).toFixed(6))]))
        : Object.fromEntries(chapterEntries.map((chapter) => [chapter.chapterId, Number(neutral.toFixed(6))]));

    const ranked = Object.entries(distribution)
      .sort((left, right) => right[1] - left[1])
      .map(([chapterId, likelihood]) => ({ chapterId, likelihood }));

    return {
      queryConcepts: concepts,
      matchedConcepts,
      rawScores,
      distribution,
      ranked,
      predictedChapterId: ranked[0]?.chapterId ?? null,
      predictedLikelihood: ranked[0]?.likelihood ?? 0,
      neutralLikelihood: neutral,
    };
  }

  function computeBoost(chapterId, likelihoodResult) {
    const neutral = likelihoodResult?.neutralLikelihood ?? 0;
    const likelihood = likelihoodResult?.distribution?.[chapterId] ?? neutral;
    const factor = 1 + (likelihood - neutral) * 0.9;
    return Math.max(0.82, Math.min(1.45, Number(factor.toFixed(6))));
  }

  return {
    scoreQuery,
    computeBoost,
  };
}
