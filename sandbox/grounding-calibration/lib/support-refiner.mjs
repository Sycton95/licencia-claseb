function buildRequiredPhraseMatches(candidate, caseRecord, normalizer) {
  const normalizedText = normalizer.normalizeForCompare(candidate.text);
  const requiredPhrases = caseRecord.requiredPhrases ?? [];
  const phraseMatches = requiredPhrases.filter((phrase) =>
    normalizedText.includes(normalizer.normalizeForCompare(phrase)),
  );

  return {
    normalizedText,
    requiredPhrases,
    phraseMatches,
    phraseCoverage: requiredPhrases.length === 0 ? 1 : phraseMatches.length / requiredPhrases.length,
  };
}

export function computeSupportMetrics(candidate, caseRecord, normalizer, factNormalizer) {
  const phraseSignals = buildRequiredPhraseMatches(candidate, caseRecord, normalizer);
  const requiredFacts = caseRecord.requiredNormalizedFacts ?? [];
  const candidateEntities = factNormalizer.extractEntities(candidate.text);
  const matchedFacts = requiredFacts.filter((fact) => factNormalizer.entitiesContain(candidateEntities, fact));
  const missingFacts = requiredFacts.filter((fact) => !factNormalizer.entitiesContain(candidateEntities, fact));
  const factCoverage = requiredFacts.length === 0 ? 1 : matchedFacts.length / requiredFacts.length;
  const presentSignals = [phraseSignals.requiredPhrases.length > 0, requiredFacts.length > 0].filter(Boolean).length;
  const structuredCoverage =
    presentSignals === 0
      ? 1
      : ((phraseSignals.requiredPhrases.length > 0 ? phraseSignals.phraseCoverage : 0) +
          (requiredFacts.length > 0 ? factCoverage : 0)) /
        presentSignals;
  const spanSize = candidate.baseSegmentIds?.length ?? 1;
  const spanPenaltyRate = structuredCoverage === 1 ? 0.02 : 0.012;
  const supportSpanPenalty = Math.max(0, (spanSize - 1) * spanPenaltyRate);
  const exactSupportBonus = structuredCoverage === 1 ? 0.08 : 0;
  const faithfulWindowBonus =
    candidate.isSyntheticWindow && structuredCoverage > 0.75 ? Math.min(0.05, structuredCoverage * 0.05) : 0;
  const incompleteCoveragePenalty = structuredCoverage < 1 ? (1 - structuredCoverage) * 0.22 : 0;
  const refinedScore =
    candidate.finalScore +
    structuredCoverage * 0.95 +
    factCoverage * 0.12 +
    candidate.compactnessScore * 0.04 +
    exactSupportBonus +
    faithfulWindowBonus -
    supportSpanPenalty -
    incompleteCoveragePenalty;

  return {
    requiredPhraseMatches: phraseSignals.phraseMatches,
    phraseCoverage: phraseSignals.phraseCoverage,
    factCoverage,
    matchedFacts,
    missingFacts,
    structuredCoverage,
    supportSpanPenalty,
    exactSupportBonus,
    faithfulWindowBonus,
    incompleteCoveragePenalty,
    refinedScore,
  };
}

function compareCoverage(left, right) {
  const scoreDelta = (right.supportMetrics?.structuredCoverage ?? 0) - (left.supportMetrics?.structuredCoverage ?? 0);
  if (scoreDelta > 0.0001) {
    return 1;
  }
  if (scoreDelta < -0.0001) {
    return -1;
  }

  const rightFactScore = right.factGate?.factScore ?? 0;
  const leftFactScore = left.factGate?.factScore ?? 0;
  if (rightFactScore !== leftFactScore) {
    return rightFactScore > leftFactScore ? 1 : -1;
  }

  const leftSpan = left.baseSegmentIds?.length ?? 1;
  const rightSpan = right.baseSegmentIds?.length ?? 1;
  if (leftSpan !== rightSpan) {
    return rightSpan < leftSpan ? 1 : -1;
  }

  return (right.finalScore ?? 0) > (left.finalScore ?? 0) ? 1 : -1;
}

export function refineSupportWinner({
  winner,
  caseRecord,
  chapterSegments,
  allSegmentsById,
  scoreSupportCandidate,
}) {
  const originalSupportCoverage = winner?.supportMetrics?.structuredCoverage ?? 0;
  const originalFactScore = winner?.factGate?.factScore ?? 0;
  const originalSpan = winner?.baseSegmentIds?.length ?? 1;

  if (!winner) {
    return {
      winner: null,
      refinement: {
        attempted: false,
        reason: 'no_winner',
      },
    };
  }

  if (originalSupportCoverage >= 1) {
    return {
      winner,
      refinement: {
        attempted: false,
        reason: 'not_needed',
        originalWinnerId: winner.id,
        originalStructuredCoverage: originalSupportCoverage,
      },
    };
  }

  if (originalFactScore <= 0 && (winner.finalScore ?? 0) < 0.5) {
    return {
      winner,
      refinement: {
        attempted: false,
        reason: 'insufficient_signal',
        originalWinnerId: winner.id,
        originalStructuredCoverage: originalSupportCoverage,
      },
    };
  }

  const baseIds = winner.baseSegmentIds ?? [winner.id];
  const firstBaseId = baseIds[0];
  const lastBaseId = baseIds[baseIds.length - 1];
  const startIndex = chapterSegments.findIndex((segment) => segment.id === firstBaseId);
  const endIndex = chapterSegments.findIndex((segment) => segment.id === lastBaseId);

  if (startIndex < 0 || endIndex < 0) {
    return {
      winner,
      refinement: {
        attempted: false,
        reason: 'base_segment_lookup_failed',
        originalWinnerId: winner.id,
        originalStructuredCoverage: originalSupportCoverage,
      },
    };
  }

  const candidateWindows = [];
  const minStart = Math.max(0, endIndex - 2);
  const maxEnd = Math.min(chapterSegments.length - 1, startIndex + 2);

  for (let start = minStart; start <= startIndex; start += 1) {
    for (let end = endIndex; end <= maxEnd; end += 1) {
      const span = end - start + 1;
      if (span <= originalSpan || span > 3) {
        continue;
      }

      const windowSegments = chapterSegments.slice(start, end + 1);
      const first = windowSegments[0];
      const last = windowSegments[windowSegments.length - 1];
      const windowId = `${first.id}__WIN__${last.id}`;
      const candidate = allSegmentsById.get(windowId);
      if (!candidate) {
        continue;
      }
      candidateWindows.push(scoreSupportCandidate(candidate));
    }
  }

  if (candidateWindows.length === 0) {
    return {
      winner,
      refinement: {
        attempted: true,
        reason: 'no_neighbor_window_available',
        originalWinnerId: winner.id,
        originalStructuredCoverage: originalSupportCoverage,
      },
    };
  }

  candidateWindows.sort((left, right) => {
    const comparison = compareCoverage(left, right);
    if (comparison !== 0) {
      return comparison > 0 ? -1 : 1;
    }
    return (right.finalScore ?? 0) - (left.finalScore ?? 0);
  });

  const refined = candidateWindows[0];
  const improvedCoverage = (refined.supportMetrics?.structuredCoverage ?? 0) - originalSupportCoverage;
  const materiallyBetter =
    improvedCoverage > 0.249 ||
    ((refined.supportMetrics?.structuredCoverage ?? 0) === 1 && originalSupportCoverage < 1) ||
    ((refined.supportMetrics?.structuredCoverage ?? 0) > originalSupportCoverage &&
      ((refined.factGate?.factScore ?? 0) >= originalFactScore));

  if (!materiallyBetter) {
    return {
      winner,
      refinement: {
        attempted: true,
        reason: 'no_better_window_found',
        originalWinnerId: winner.id,
        originalStructuredCoverage: originalSupportCoverage,
        bestExpansionCandidateId: refined.id,
        bestExpansionStructuredCoverage: refined.supportMetrics?.structuredCoverage ?? 0,
      },
    };
  }

  return {
    winner: refined,
    refinement: {
      attempted: true,
      reason:
        (refined.supportMetrics?.structuredCoverage ?? 0) === 1
          ? 'expanded_to_full_support'
          : 'expanded_to_better_support',
      originalWinnerId: winner.id,
      originalStructuredCoverage: originalSupportCoverage,
      refinedWinnerId: refined.id,
      refinedStructuredCoverage: refined.supportMetrics?.structuredCoverage ?? 0,
      coverageDelta: Number(improvedCoverage.toFixed(6)),
      originalSupportUnitType: winner.isSyntheticWindow ? 'window' : 'base',
      refinedSupportUnitType: refined.isSyntheticWindow ? 'window' : 'base',
    },
  };
}
