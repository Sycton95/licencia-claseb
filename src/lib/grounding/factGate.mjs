function overlapsFact(segmentText, aliases) {
  return aliases.some((alias) => segmentText.includes(alias));
}

export function createFactGate({ domainFacts, factNormalizer, normalizer }) {
  const facts = domainFacts?.facts ?? [];

  function scoreCandidate(candidate, requiredEntities) {
    const segmentText = normalizer.normalizeForCompare(candidate.text);
    const segmentEntities = factNormalizer.extractEntities(candidate.text);
    const required = requiredEntities ?? [];

    if (required.length === 0) {
      return {
        factScore: 0.35,
        matchedRequiredEntities: [],
        missingRequiredEntities: [],
        conflictingEntities: [],
        matchedFactIds: [],
      };
    }

    const matchedRequiredEntities = [];
    const missingRequiredEntities = [];

    for (const entity of required) {
      if (factNormalizer.entitiesContain(segmentEntities, entity)) {
        matchedRequiredEntities.push(entity);
      } else {
        missingRequiredEntities.push(entity);
      }
    }

    const matchedFactIds = facts
      .filter((fact) => fact.segmentId === candidate.id || candidate.baseSegmentIds?.includes(fact.segmentId))
      .filter((fact) => overlapsFact(segmentText, (fact.aliases ?? []).map((alias) => normalizer.normalizeForCompare(alias))))
      .map((fact) => fact.id);

    if (missingRequiredEntities.length > 0) {
      return {
        factScore: 0.1,
        matchedRequiredEntities,
        missingRequiredEntities,
        conflictingEntities: missingRequiredEntities,
        matchedFactIds,
      };
    }

    return {
      factScore: 1,
      matchedRequiredEntities,
      missingRequiredEntities,
      conflictingEntities: [],
      matchedFactIds,
    };
  }

  return { scoreCandidate };
}
