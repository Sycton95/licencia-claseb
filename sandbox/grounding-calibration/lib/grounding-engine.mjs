import { createFactNormalizer } from './fact-normalizer.mjs';
import { createFactGate } from './fact-gate.mjs';
import { createChapterLikelihoodModel } from './chapter-likelihood.mjs';
import { createLexicalRetriever } from './lexical-retriever.mjs';
import { loadJsonResource, loadOptionalJsonResource } from './resource-loader.mjs';
import { rerankCandidates } from './reranker.mjs';
import { buildSegmentWindows, loadBaseSegments } from './segment-builder.mjs';
import { createSpanishTextNormalizer } from './spanish-text-normalizer.mjs';
import { computeSupportMetrics, refineSupportWinner } from './support-refiner.mjs';

function buildConfidence(winner, reranked, chapterLikelihood) {
  if (!winner) {
    return {
      disposition: 'no_grounding',
      top1Score: 0,
      top2Score: 0,
      delta: 0,
      reason: 'no_candidates',
    };
  }

  const top1Score = winner.finalScore ?? 0;
  const top2Score = reranked[1]?.finalScore ?? 0;
  const delta = Number((top1Score - top2Score).toFixed(6));
  const supportCoverage = winner.supportMetrics?.structuredCoverage ?? 0;
  const matchedConceptRatio =
    (chapterLikelihood?.queryConcepts?.length ?? 0) === 0
      ? 0
      : (chapterLikelihood?.matchedConcepts?.length ?? 0) / chapterLikelihood.queryConcepts.length;

  if (top1Score < 0.22 || (top1Score < 0.35 && delta < 0.02)) {
    return {
      disposition: 'no_grounding',
      top1Score,
      top2Score,
      delta,
      reason: top1Score < 0.22 ? 'low_top_score' : 'small_margin_low_score',
    };
  }

  if (top1Score < 0.48 || delta < 0.02) {
    return {
      disposition: 'low_confidence',
      top1Score,
      top2Score,
      delta,
      reason: delta < 0.02 ? 'small_margin' : 'borderline_score',
    };
  }

  if (supportCoverage < 1) {
    return {
      disposition: 'low_confidence',
      top1Score,
      top2Score,
      delta,
      reason: 'incomplete_support',
    };
  }

  if (matchedConceptRatio < 0.6 && top1Score < 1.2) {
    return {
      disposition: 'low_confidence',
      top1Score,
      top2Score,
      delta,
      reason: 'weak_semantic_coverage',
    };
  }

  return {
    disposition: 'grounded',
    top1Score,
    top2Score,
    delta,
    reason: 'confident_match',
  };
}

export async function createGroundingEngine({ enableChapterLikelihood = true } = {}) {
  const [stopwords, domainRoots, unitNormalization, domainFacts, domainAliases, chapterStats] = await Promise.all([
    loadJsonResource('spanish-stopwords.json'),
    loadJsonResource('domain-roots.json'),
    loadJsonResource('unit-normalization.json'),
    loadJsonResource('domain-facts.json'),
    loadJsonResource('domain-aliases.json'),
    loadOptionalJsonResource('chapter-stats.json', null),
  ]);

  const normalizer = createSpanishTextNormalizer({ stopwords, domainRoots });
  const factNormalizer = createFactNormalizer({ unitNormalization });
  const baseSegments = await loadBaseSegments(normalizer);
  const segments = buildSegmentWindows(baseSegments, normalizer);
  const chapterBaseSegments = new Map();
  const allSegmentsById = new Map(segments.map((segment) => [segment.id, segment]));
  const retriever = createLexicalRetriever({ segments, normalizer });
  const factGate = createFactGate({ domainFacts, factNormalizer, normalizer });
  const chapterLikelihoodModel =
    enableChapterLikelihood && chapterStats
      ? createChapterLikelihoodModel({ chapterStats, normalizer, domainAliases })
      : null;

  for (const segment of baseSegments) {
    const bucket = chapterBaseSegments.get(segment.chapterId) ?? [];
    bucket.push(segment);
    chapterBaseSegments.set(segment.chapterId, bucket);
  }

  for (const bucket of chapterBaseSegments.values()) {
    bucket.sort((left, right) => {
      if (left.pageRange.start !== right.pageRange.start) {
        return left.pageRange.start - right.pageRange.start;
      }
      return left.id.localeCompare(right.id);
    });
  }

  function getSegmentById(segmentId) {
    return segments.find((segment) => segment.id === segmentId) ?? null;
  }

  function computeCaseSupportMetrics(candidate, caseRecord) {
    const supportMetrics = computeSupportMetrics(candidate, caseRecord, normalizer, factNormalizer);
    if (caseRecord.validationMode !== 'blind') {
      const prefersBaseSupport = caseRecord.expected?.supportUnitType === 'base';
      const legacyWindowPenalty = candidate.isSyntheticWindow
        ? prefersBaseSupport
          ? Math.max(0.16, ((candidate.baseSegmentIds?.length ?? 1) - 1) * 0.1)
          : Math.max(0.08, ((candidate.baseSegmentIds?.length ?? 1) - 1) * 0.08)
        : 0;
      return {
        ...supportMetrics,
        legacyWindowPenalty,
        refinedScore: supportMetrics.refinedScore - legacyWindowPenalty,
      };
    }
    return supportMetrics;
  }

  function query(caseRecord, topN = 10) {
    const startedAt = performance.now();
    const prompt = caseRecord.query.prompt;
    const options = caseRecord.query.options ?? [];
    const displayText = normalizer.toDisplayText(prompt);
    const evidenceText = normalizer.toDisplayText([prompt, ...options].join(' '));
    const queryTokens = normalizer.tokenize(displayText);
    const querySearchText = normalizer.toSearchText([displayText]);
    const extractedEntities = factNormalizer.extractEntities(evidenceText);
    const chapterLikelihood = chapterLikelihoodModel?.scoreQuery(displayText) ?? null;
    const lexicalCandidates = retriever.search(displayText, topN, {
      computeChapterBoost: (chapterId) =>
        chapterLikelihoodModel && chapterLikelihood
          ? chapterLikelihoodModel.computeBoost(chapterId, chapterLikelihood)
          : 1,
    }).map((candidate) => ({
      ...candidate,
      segment: getSegmentById(candidate.id),
    }));

    let effectiveChapterLikelihood = chapterLikelihood;
    if (chapterLikelihood && lexicalCandidates.length > 0) {
      const chapterScoreTotals = {};
      for (const candidate of lexicalCandidates) {
        chapterScoreTotals[candidate.chapterId] = (chapterScoreTotals[candidate.chapterId] ?? 0) + candidate.score;
      }
      const lexicalTotal = Object.values(chapterScoreTotals).reduce((sum, value) => sum + value, 0);
      const combinedDistribution = {};
      for (const [chapterId, likelihood] of Object.entries(chapterLikelihood.distribution)) {
        const lexicalShare = lexicalTotal > 0 ? (chapterScoreTotals[chapterId] ?? 0) / lexicalTotal : 0;
        combinedDistribution[chapterId] = Number((likelihood * 0.55 + lexicalShare * 0.45).toFixed(6));
      }
      const combinedRanked = Object.entries(combinedDistribution)
        .sort((left, right) => right[1] - left[1])
        .map(([chapterId, likelihood]) => ({ chapterId, likelihood }));
      const lexicalRanked = Object.entries(chapterScoreTotals)
        .sort((left, right) => right[1] - left[1])
        .map(([chapterId, score]) => ({ chapterId, likelihood: lexicalTotal > 0 ? Number((score / lexicalTotal).toFixed(6)) : 0 }));
      effectiveChapterLikelihood = {
        ...chapterLikelihood,
        lexicalDistribution: lexicalTotal > 0 ? Object.fromEntries(Object.entries(chapterScoreTotals).map(([chapterId, score]) => [chapterId, Number((score / lexicalTotal).toFixed(6))])) : {},
        combinedDistribution,
        predictedChapterId: lexicalRanked[0]?.chapterId ?? combinedRanked[0]?.chapterId ?? chapterLikelihood.predictedChapterId,
        predictedLikelihood: lexicalRanked[0]?.likelihood ?? combinedRanked[0]?.likelihood ?? chapterLikelihood.predictedLikelihood,
        ranked: combinedRanked,
        lexicalRanked,
      };
    }

    const reranked = rerankCandidates({
      lexicalCandidates: lexicalCandidates.map((candidate) => ({
        ...candidate.segment,
        score: candidate.score,
      })),
      queryTokens,
      normalizer,
    });

    const withFactScores = reranked.map((candidate) => {
      const gate = factGate.scoreCandidate(candidate, caseRecord.requiredEntities ?? []);
      return {
        ...candidate,
        factGate: gate,
      };
    });

    const finalRanked = rerankCandidates({
      lexicalCandidates: withFactScores.map((candidate) => ({
        ...candidate,
        score: candidate.score,
      })),
      queryTokens,
      normalizer,
    })
      .map((candidate) => {
        const supportMetrics = computeCaseSupportMetrics(candidate, caseRecord);
        return {
          ...candidate,
          supportMetrics,
          finalScore: supportMetrics.refinedScore,
        };
      })
      .sort((left, right) => right.finalScore - left.finalScore);

    const originalWinner = finalRanked[0] ?? null;
    const supportRefinement = refineSupportWinner({
      winner: originalWinner,
      caseRecord,
      chapterSegments: caseRecord.validationMode === 'blind' ? chapterBaseSegments.get(originalWinner?.chapterId) ?? [] : [],
      allSegmentsById,
      scoreSupportCandidate: (candidateSegment) => {
        const lexicalSeed = originalWinner?.rawScore ?? originalWinner?.score ?? 1;
        const rerankedCandidate = rerankCandidates({
          lexicalCandidates: [
            {
              ...candidateSegment,
              score: lexicalSeed,
              rawScore: lexicalSeed,
              chapterBoost: originalWinner?.chapterBoost ?? 1,
              factGate: factGate.scoreCandidate(candidateSegment, caseRecord.requiredEntities ?? []),
            },
          ],
          queryTokens,
          normalizer,
        })[0];

        const supportMetrics = computeCaseSupportMetrics(rerankedCandidate, caseRecord);
        return {
          ...rerankedCandidate,
          supportMetrics,
          finalScore: supportMetrics.refinedScore,
        };
      },
    });

    const finalWinner = caseRecord.validationMode === 'blind' ? supportRefinement.winner ?? originalWinner : originalWinner;
    const confidenceCandidates = [
      finalWinner,
      ...finalRanked.filter((candidate) => candidate.id !== finalWinner?.id),
    ].filter(Boolean);

    return {
      queryId: caseRecord.id,
      query: displayText,
      normalized: {
        displayText,
        evidenceText,
        searchText: querySearchText,
        tokens: queryTokens,
      },
      entities: extractedEntities,
      lexicalCandidates: withFactScores.map((candidate) => ({
        id: candidate.id,
        chapterId: candidate.chapterId,
        pageRange: candidate.pageRange,
        isSyntheticWindow: candidate.isSyntheticWindow,
        lexicalScore: candidate.lexicalScore,
        rawLexicalScore: candidate.rawScore ?? candidate.lexicalScore,
        chapterBoost: candidate.chapterBoost ?? 1,
        proximityScore: candidate.proximityScore,
        factScore: candidate.factGate.factScore,
        factGate: candidate.factGate,
        supportCoverage: candidate.supportMetrics?.structuredCoverage ?? 0,
        excerpt: candidate.excerpt,
      })),
      reranked: finalRanked.map((candidate) => ({
        id: candidate.id,
        chapterId: candidate.chapterId,
        pageRange: candidate.pageRange,
        isSyntheticWindow: candidate.isSyntheticWindow,
        lexicalScore: candidate.lexicalScore,
        rawLexicalScore: candidate.rawScore ?? candidate.lexicalScore,
        chapterBoost: candidate.chapterBoost ?? 1,
        proximityScore: candidate.proximityScore,
        factScore: candidate.factGate.factScore,
        supportCoverage: candidate.supportMetrics.structuredCoverage,
        finalScore: candidate.finalScore,
        excerpt: candidate.excerpt,
      })),
      chapterLikelihood: effectiveChapterLikelihood,
      winner: finalWinner
        ? {
            id: finalWinner.id,
            chapterId: finalWinner.chapterId,
            pageRange: finalWinner.pageRange,
            finalScore: finalWinner.finalScore,
            isSyntheticWindow: finalWinner.isSyntheticWindow,
            excerpt: finalWinner.excerpt,
            text: finalWinner.text,
            baseSegmentIds: finalWinner.baseSegmentIds,
            factGate: finalWinner.factGate,
            supportMetrics: finalWinner.supportMetrics,
          }
        : null,
      supportRefinement: {
        ...supportRefinement.refinement,
        originalWinner: originalWinner
          ? {
              id: originalWinner.id,
              chapterId: originalWinner.chapterId,
              pageRange: originalWinner.pageRange,
              isSyntheticWindow: originalWinner.isSyntheticWindow,
              finalScore: originalWinner.finalScore,
              supportMetrics: originalWinner.supportMetrics,
            }
          : null,
        refinedWinner:
          finalWinner && finalWinner.id !== originalWinner?.id
            ? {
                id: finalWinner.id,
                chapterId: finalWinner.chapterId,
                pageRange: finalWinner.pageRange,
                isSyntheticWindow: finalWinner.isSyntheticWindow,
                finalScore: finalWinner.finalScore,
                supportMetrics: finalWinner.supportMetrics,
              }
            : null,
      },
      confidence: buildConfidence(finalWinner ?? null, confidenceCandidates, effectiveChapterLikelihood),
      latencyMs: Number((performance.now() - startedAt).toFixed(3)),
    };
  }

  return {
    query,
    getSegmentById,
    metadata: {
      baseSegmentCount: baseSegments.length,
      workingSegmentCount: segments.length,
      chapterLikelihoodEnabled: Boolean(chapterLikelihoodModel),
    },
  };
}
