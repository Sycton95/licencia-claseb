import { performance } from 'node:perf_hooks';

import { createChapterLikelihoodModel } from './chapterLikelihood.mjs';
import { createFactGate } from './factGate.mjs';
import { createFactNormalizer } from './factNormalizer.mjs';
import { createLexicalRetriever } from './lexicalRetriever.mjs';
import { loadGroundingResource } from './resourceLoader.mjs';
import { rerankCandidates } from './reranker.mjs';
import { buildSegmentWindows, loadBaseSegments } from './segmentBuilder.mjs';
import { createSpanishTextNormalizer } from './spanishTextNormalizer.mjs';
import { computeSupportMetrics, refineSupportWinner } from './supportRefiner.mjs';

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

function compareConfidenceDisposition(left = 'no_grounding', right = 'no_grounding') {
  const ranking = {
    grounded: 3,
    low_confidence: 2,
    no_grounding: 1,
  };
  return (ranking[left] ?? 0) - (ranking[right] ?? 0);
}

function buildPassSelectionScore(passResult) {
  const winner = passResult?.winner;
  if (!winner) {
    return Number.NEGATIVE_INFINITY;
  }

  const confidenceBonus =
    (compareConfidenceDisposition(passResult?.confidence?.disposition, 'no_grounding') / 10) ?? 0;
  const supportCoverage = Number(winner.supportMetrics?.structuredCoverage ?? 0);
  const factScore = Number(winner.factGate?.factScore ?? 0);
  const delta = Number(passResult?.confidence?.delta ?? 0);

  return (
    Number(winner.finalScore ?? 0) * 0.55 +
    supportCoverage * 0.25 +
    factScore * 0.12 +
    Math.min(delta, 0.1) * 0.8 +
    confidenceBonus
  );
}

function shouldTriggerFallback(passResult, chapterLikelihood) {
  const winner = passResult?.winner;
  if (!winner) {
    return false;
  }

  const confidence = passResult?.confidence ?? {};
  const supportCoverage = Number(winner.supportMetrics?.structuredCoverage ?? 0);
  const predictedLikelihood = Number(chapterLikelihood?.predictedLikelihood ?? 0);
  const winnerChapterMatchesPrediction =
    Boolean(winner.chapterId) && chapterLikelihood?.predictedChapterId === winner.chapterId;

  return (
    confidence.disposition !== 'grounded' &&
    (
      Number(confidence.delta ?? 0) < 0.01 ||
      Number(confidence.top1Score ?? 0) < 0.62 ||
      supportCoverage < 0.55 ||
      (predictedLikelihood >= 0.4 && !winnerChapterMatchesPrediction)
    )
  );
}

function toRequiredFacts(entities) {
  return (entities ?? []).map((entity) => ({
    normalized: entity.normalized,
    unit: entity.unit,
  }));
}

function buildRuntimeResources() {
  return {
    stopwords: loadGroundingResource('spanish-stopwords.json'),
    domainRoots: loadGroundingResource('domain-roots.json'),
    unitNormalization: loadGroundingResource('unit-normalization.json'),
    domainFacts: loadGroundingResource('domain-facts.json'),
    domainAliases: loadGroundingResource('domain-aliases.json'),
    chapterStats: loadGroundingResource('chapter-stats.json'),
  };
}

export function createProductionGroundingEngine({ manualSegments }) {
  const resources = buildRuntimeResources();
  const normalizer = createSpanishTextNormalizer({
    stopwords: resources.stopwords,
    domainRoots: resources.domainRoots,
  });
  const factNormalizer = createFactNormalizer({ unitNormalization: resources.unitNormalization });
  const baseSegments = loadBaseSegments(manualSegments, normalizer);
  const segments = buildSegmentWindows(baseSegments, normalizer);
  const allSegmentsById = new Map(segments.map((segment) => [segment.id, segment]));
  const retriever = createLexicalRetriever({ segments, normalizer });
  const factGate = createFactGate({
    domainFacts: resources.domainFacts,
    factNormalizer,
    normalizer,
  });
  const chapterLikelihoodModel = createChapterLikelihoodModel({
    chapterStats: resources.chapterStats,
    normalizer,
    domainAliases: resources.domainAliases,
  });
  const chapterBaseSegments = new Map();

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
    return allSegmentsById.get(segmentId) ?? null;
  }

  function runRetrievalPass({
    searchText,
    queryTokens,
    requiredFacts,
    computeChapterBoost = () => 1,
    filterChapterIds = null,
    topN = 10,
  }) {
    const lexicalCandidates = retriever
      .search(searchText, topN, {
        computeChapterBoost,
        filterChapterIds,
        candidatePoolSize: Math.max(topN * 10, 40),
      })
      .map((candidate) => ({
        ...candidate,
        segment: getSegmentById(candidate.id),
      }));

    if (lexicalCandidates.length === 0) {
      return {
        lexicalCandidates,
        reranked: [],
        winner: null,
        confidence: buildConfidence(null, [], null),
        supportRefinement: {
          attempted: false,
          reason: 'no_candidates',
          originalWinnerId: null,
          originalStructuredCoverage: 0,
          originalWinner: null,
          refinedWinner: null,
        },
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

    const withFactScores = reranked.map((candidate) => ({
      ...candidate,
      factGate: factGate.scoreCandidate(candidate, requiredFacts),
    }));

    const finalRanked = rerankCandidates({
      lexicalCandidates: withFactScores.map((candidate) => ({
        ...candidate,
        score: candidate.score,
      })),
      queryTokens,
      normalizer,
    })
      .map((candidate) => {
        const supportMetrics = computeSupportMetrics(candidate, {
          queryTokens,
          requiredFacts,
          normalizer,
          factNormalizer,
        });
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
      chapterSegments: chapterBaseSegments.get(originalWinner?.chapterId) ?? [],
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
              factGate: factGate.scoreCandidate(candidateSegment, requiredFacts),
            },
          ],
          queryTokens,
          normalizer,
        })[0];
        const supportMetrics = computeSupportMetrics(rerankedCandidate, {
          queryTokens,
          requiredFacts,
          normalizer,
          factNormalizer,
        });
        return {
          ...rerankedCandidate,
          supportMetrics,
          finalScore: supportMetrics.refinedScore,
        };
      },
    });

    const finalWinner = supportRefinement.winner ?? originalWinner;
    const confidenceCandidates = [
      finalWinner,
      ...finalRanked.filter((candidate) => candidate.id !== finalWinner?.id),
    ].filter(Boolean);

    return {
      lexicalCandidates,
      reranked: finalRanked,
      winner: finalWinner,
      confidence: buildConfidence(finalWinner ?? null, confidenceCandidates, null),
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
    };
  }

  function query({ prompt, options = [], topN = 10 }) {
    const startedAt = performance.now();
    const displayText = normalizer.toDisplayText(prompt);
    const evidenceText = normalizer.toDisplayText([prompt, ...options].join(' '));
    const queryTokens = normalizer.tokenize(displayText);
    const evidenceQueryTokens = normalizer.tokenize(evidenceText);
    const extractedEntities = factNormalizer.extractEntities(evidenceText);
    const requiredFacts = toRequiredFacts(extractedEntities);
    const chapterLikelihood = chapterLikelihoodModel.scoreQuery(displayText);
    const lexicalCandidates = retriever.search(displayText, topN, {
      computeChapterBoost: (chapterId) => chapterLikelihoodModel.computeBoost(chapterId, chapterLikelihood),
    }).map((candidate) => ({
      ...candidate,
      segment: getSegmentById(candidate.id),
    }));

    let effectiveChapterLikelihood = chapterLikelihood;
    if (lexicalCandidates.length > 0) {
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

      effectiveChapterLikelihood = {
        ...chapterLikelihood,
        combinedDistribution,
        predictedChapterId: combinedRanked[0]?.chapterId ?? chapterLikelihood.predictedChapterId,
        predictedLikelihood: combinedRanked[0]?.likelihood ?? chapterLikelihood.predictedLikelihood,
        ranked: combinedRanked,
      };
    }
    const firstPass = runRetrievalPass({
      searchText: displayText,
      queryTokens,
      requiredFacts,
      computeChapterBoost: (chapterId) =>
        chapterLikelihoodModel.computeBoost(chapterId, effectiveChapterLikelihood),
      topN,
    });

    let selectedPass = firstPass;
    let fallbackRecovery = {
      attempted: false,
      triggeredBy: null,
      selectedPass: 'initial_chapter_boosted',
      winnerChanged: false,
      candidates: [],
    };

    if (shouldTriggerFallback(firstPass, effectiveChapterLikelihood)) {
      const topChapterIds = (effectiveChapterLikelihood.ranked ?? [])
        .slice(0, 3)
        .map((entry) => entry.chapterId)
        .filter(Boolean);
      const fallbackPasses = [
        {
          label: 'global_unboosted',
          result: runRetrievalPass({
            searchText: evidenceText || displayText,
            queryTokens: evidenceQueryTokens.length > 0 ? evidenceQueryTokens : queryTokens,
            requiredFacts,
            computeChapterBoost: () => 1,
            topN: Math.max(topN, 12),
          }),
        },
        {
          label: 'top_chapters_unboosted',
          result: runRetrievalPass({
            searchText: evidenceText || displayText,
            queryTokens: evidenceQueryTokens.length > 0 ? evidenceQueryTokens : queryTokens,
            requiredFacts,
            computeChapterBoost: () => 1,
            filterChapterIds: topChapterIds,
            topN: Math.max(topN, 12),
          }),
        },
      ];

      const candidates = [
        { label: 'initial_chapter_boosted', result: firstPass },
        ...fallbackPasses,
      ];
      selectedPass = candidates
        .filter((candidate) => candidate.result?.winner)
        .sort(
          (left, right) =>
            buildPassSelectionScore(right.result) - buildPassSelectionScore(left.result),
        )[0]?.result ?? firstPass;

      const selectedLabel =
        candidates.find((candidate) => candidate.result === selectedPass)?.label ??
        'initial_chapter_boosted';
      fallbackRecovery = {
        attempted: true,
        triggeredBy: {
          reason: firstPass.confidence?.reason ?? 'weak_first_pass',
          top1Score: Number(firstPass.confidence?.top1Score ?? 0),
          delta: Number(firstPass.confidence?.delta ?? 0),
          supportCoverage: Number(firstPass.winner?.supportMetrics?.structuredCoverage ?? 0),
        },
        selectedPass: selectedLabel,
        winnerChanged:
          Boolean(firstPass.winner?.id) && firstPass.winner?.id !== selectedPass.winner?.id,
        candidates: candidates.map((candidate) => ({
          label: candidate.label,
          winnerId: candidate.result?.winner?.id ?? null,
          winnerChapterId: candidate.result?.winner?.chapterId ?? null,
          top1Score: Number(candidate.result?.confidence?.top1Score ?? 0),
          delta: Number(candidate.result?.confidence?.delta ?? 0),
          supportCoverage: Number(
            candidate.result?.winner?.supportMetrics?.structuredCoverage ?? 0,
          ),
          finalScore: Number(candidate.result?.winner?.finalScore ?? 0),
          selected: candidate.result === selectedPass,
        })),
      };
    }

    const finalWinner = selectedPass.winner ?? null;
    const finalRanked = selectedPass.reranked ?? [];
    const supportRefinement = selectedPass.supportRefinement ?? null;
    const confidence = buildConfidence(finalWinner ?? null, finalRanked, effectiveChapterLikelihood);

    return {
      query: displayText,
      entities: extractedEntities,
      chapterLikelihood: effectiveChapterLikelihood,
      winner: finalWinner
        ? {
            id: finalWinner.id,
            chapterId: finalWinner.chapterId,
            manualRef: finalWinner.manualRef,
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
      reranked: finalRanked.map((candidate) => ({
        id: candidate.id,
        chapterId: candidate.chapterId,
        manualRef: candidate.manualRef,
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
      supportRefinement,
      fallbackRecovery,
      confidence,
      latencyMs: Number((performance.now() - startedAt).toFixed(3)),
    };
  }

  return {
    query,
    metadata: {
      baseSegmentCount: baseSegments.length,
      workingSegmentCount: segments.length,
      chapterLikelihoodEnabled: true,
    },
  };
}
