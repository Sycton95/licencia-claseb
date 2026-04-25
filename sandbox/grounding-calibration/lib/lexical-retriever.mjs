import MiniSearch from 'minisearch';

export function createLexicalRetriever({ segments, normalizer }) {
  const tokenIndex = segments.map((segment) => ({
    ...segment,
    tokenSet: new Set(normalizer.tokenize(segment.text)),
  }));

  const docs = segments.map((segment) => ({
    id: segment.id,
    chapterId: segment.chapterId,
    manualRef: segment.manualRef,
    pageStart: segment.pageRange.start,
    pageEnd: segment.pageRange.end,
    searchText: normalizer.toSearchText([segment.manualRef, segment.excerpt, segment.text]),
    text: segment.text,
  }));

  const miniSearch = new MiniSearch({
    fields: ['searchText'],
    storeFields: ['id', 'chapterId', 'manualRef', 'pageStart', 'pageEnd', 'text'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.1,
      boost: { searchText: 1 },
    },
    processTerm: (term) => {
      const [token] = normalizer.tokenize(term);
      return token ?? null;
    },
  });

  miniSearch.addAll(docs);

  function search(queryText, topN = 10, options = {}) {
    const queryTokens = normalizer.tokenize(queryText);
    const searchText = queryTokens.join(' ');
    if (!searchText) {
      return [];
    }

    const candidatePoolSize = Math.max(topN * 8, 30);
    const computeChapterBoost = options.computeChapterBoost ?? (() => 1);

    const primary = miniSearch
      .search(searchText, { combineWith: 'OR' })
      .slice(0, candidatePoolSize)
      .map((candidate) => {
        const chapterBoost = computeChapterBoost(candidate.chapterId);
        return {
          ...candidate,
          rawScore: candidate.score,
          chapterBoost,
          score: candidate.score * chapterBoost,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, topN);
    if (primary.length > 0) {
      return primary;
    }

    return tokenIndex
      .map((segment) => {
        let overlap = 0;
        for (const token of queryTokens) {
          if (segment.tokenSet.has(token)) {
            overlap += 1;
          }
        }
        return {
          id: segment.id,
          chapterId: segment.chapterId,
          manualRef: segment.manualRef,
          pageStart: segment.pageRange.start,
          pageEnd: segment.pageRange.end,
          text: segment.text,
          rawScore: overlap / Math.max(queryTokens.length, 1),
        };
      })
      .filter((candidate) => candidate.rawScore > 0)
      .map((candidate) => {
        const chapterBoost = computeChapterBoost(candidate.chapterId);
        return {
          ...candidate,
          chapterBoost,
          score: candidate.rawScore * chapterBoost,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, topN);
  }

  return { search };
}
