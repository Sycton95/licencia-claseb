function computeProximity(tokens, text, normalizer) {
  const haystack = normalizer.tokenize(text);
  const matchedPositions = [];

  for (let index = 0; index < haystack.length; index += 1) {
    if (tokens.includes(haystack[index])) {
      matchedPositions.push(index);
    }
  }

  if (matchedPositions.length <= 1) {
    return matchedPositions.length === 1 ? 0.65 : 0.2;
  }

  const span = matchedPositions[matchedPositions.length - 1] - matchedPositions[0] + 1;
  return Math.max(0.2, Math.min(1, matchedPositions.length / span));
}

function computeCompactness(text, normalizer) {
  const size = normalizer.tokenize(text).length;
  if (size <= 0) {
    return 0.4;
  }
  return Math.max(0.45, Math.min(1, 170 / size));
}

export function rerankCandidates({ lexicalCandidates, queryTokens, defaultFactGate = { factScore: 0.35 }, normalizer }) {
  const maxLexicalScore = Math.max(...lexicalCandidates.map((candidate) => candidate.score), 1);

  return lexicalCandidates
    .map((candidate) => {
      const factGate = candidate.factGate ?? defaultFactGate;
      const lexicalScore = candidate.score / maxLexicalScore;
      const proximityScore = computeProximity(queryTokens, candidate.text, normalizer);
      const compactnessScore = computeCompactness(candidate.text, normalizer);
      const finalScore = lexicalScore * 0.3 + factGate.factScore * 0.7;
      const adjustedFinalScore = finalScore * (0.58 + proximityScore * 0.28 + compactnessScore * 0.14);

      return {
        ...candidate,
        lexicalScore,
        proximityScore,
        compactnessScore,
        factGate,
        finalScore: adjustedFinalScore,
      };
    })
    .sort((left, right) => right.finalScore - left.finalScore);
}
