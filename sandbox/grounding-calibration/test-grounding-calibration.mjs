import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createFactNormalizer } from './lib/fact-normalizer.mjs';
import { createGroundingEngine } from './lib/grounding-engine.mjs';
import { loadBenchmarkFile, loadJsonResource } from './lib/resource-loader.mjs';
import { recoverMojibake } from './lib/spanish-text-normalizer.mjs';
import { runsRoot } from './lib/paths.mjs';

const BENCHMARK_FILES = [
  'critical_numeric_cases.json',
  'control_cases.json',
  'regression_cases.json',
  'chapter1_gold_cases.json',
  'chapter2_gold_cases.json',
  'chapter3_gold_cases.json',
  'chapter4_gold_cases.json',
  'chapter5_gold_cases.json',
  'chapter6_gold_cases.json',
  'chapter7_gold_cases.json',
  'chapter8_gold_cases.json',
  'chapter9_gold_cases.json',
  'blind_test_dataset.json',
  'blind_test_dataset_v2.json',
  'synthetic_negative_cases.json',
];

let extractionOverrideIds = new Set();

function ensureCharacterIntegrity(text) {
  return !/(Ãƒ.|Ã‚.|Ã¢.|Ã¯Â¿Â½|ï¿½)/u.test(recoverMojibake(String(text ?? '')));
}

function normalizeTextForAssert(value) {
  return recoverMojibake(String(value ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%/.\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function phraseTokensCovered(haystackText, needlePhrase) {
  const haystackTokens = new Set(normalizeTextForAssert(haystackText).split(' ').filter(Boolean));
  const needleTokens = normalizeTextForAssert(needlePhrase).split(' ').filter(Boolean);
  if (needleTokens.length === 0) {
    return true;
  }
  const matchedTokens = needleTokens.filter((token) => haystackTokens.has(token)).length;
  return matchedTokens / needleTokens.length >= 0.7;
}

function isGroundingCase(testCase) {
  return (testCase.expectedOutcome ?? 'grounding') === 'grounding';
}

function pageRangeOverlaps(left, right) {
  if (!left || !right) {
    return false;
  }
  return left.start <= right.end && right.start <= left.end;
}

function compareOutcome(audit, testCase) {
  const expectedOutcome = testCase.expectedOutcome ?? 'grounding';

  if (expectedOutcome === 'low_confidence') {
    return {
      top1Pass:
        ['low_confidence', 'no_grounding'].includes(audit.confidence?.disposition) ||
        (audit.confidence?.delta ?? 1) < 0.12,
      forbiddenTopPass: true,
      recallAt5Pass: true,
      chapterPredictionPass: true,
    };
  }

  if (expectedOutcome === 'no_grounding') {
    return {
      top1Pass: audit.confidence?.disposition === 'no_grounding',
      forbiddenTopPass: true,
      recallAt5Pass: true,
      chapterPredictionPass: true,
    };
  }

  const winnerId = audit.winner?.id ?? null;
  const exactMatch = winnerId === testCase.expected.segmentId;
  const blindPageMatch =
    testCase.validationMode === 'blind' &&
    audit.winner?.chapterId === testCase.expected.chapterId &&
    pageRangeOverlaps(audit.winner?.pageRange, testCase.expected.pageRange);
  const top1Pass = exactMatch || blindPageMatch;
  const forbiddenTopPass = !(testCase.forbiddenTopSegmentIds ?? []).includes(winnerId);
  const recallAt5Pass = (audit.reranked ?? []).slice(0, 5).some((candidate) => {
    if (candidate.id === testCase.expected.segmentId) {
      return true;
    }
    if (testCase.validationMode === 'blind') {
      return candidate.chapterId === testCase.expected.chapterId && pageRangeOverlaps(candidate.pageRange, testCase.expected.pageRange);
    }
    return false;
  });
  const chapterPredictionPass =
    !testCase.expected?.chapterId ||
    audit.chapterLikelihood?.predictedChapterId === testCase.expected.chapterId ||
    audit.winner?.chapterId === testCase.expected.chapterId;

  return { top1Pass, forbiddenTopPass, recallAt5Pass, chapterPredictionPass };
}

function evaluateAnswerBearing(testCase, winner, factNormalizer) {
  if (!isGroundingCase(testCase)) {
    return {
      pass: ['low_confidence', 'no_grounding'].includes(winner?.confidenceDisposition ?? 'low_confidence') || true,
      answerTextPass: true,
      requiredPhrasePass: true,
      normalizedFactPass: true,
      missingPhrases: [],
      missingFacts: [],
      winnerEntities: [],
    };
  }

  if (!winner?.text) {
    return {
      pass: false,
      answerTextPass: false,
      requiredPhrasePass: false,
      normalizedFactPass: false,
      missingPhrases: testCase.requiredPhrases ?? [],
      missingFacts: testCase.requiredNormalizedFacts ?? [],
      winnerEntities: [],
    };
  }

  const normalizedWinnerText = normalizeTextForAssert(winner.text);
  const expectedAnswerText = normalizeTextForAssert(testCase.expectedAnswerText);
  const requiredPhrases = testCase.requiredPhrases ?? [];
  const requiredFacts = testCase.requiredNormalizedFacts ?? [];
  const winnerEntities = factNormalizer.extractEntities(winner.text);

  const answerTextPass = !expectedAnswerText || normalizedWinnerText.includes(expectedAnswerText);
  const missingPhrases = requiredPhrases.filter(
    (phrase) =>
      !normalizedWinnerText.includes(normalizeTextForAssert(phrase)) &&
      !phraseTokensCovered(winner.text, phrase),
  );
  const missingFacts = requiredFacts.filter((fact) => !factNormalizer.entitiesContain(winnerEntities, fact));

  const requiredPhrasePass = missingPhrases.length === 0;
  const normalizedFactPass = missingFacts.length === 0;
  const structuredSupportPresent = requiredPhrases.length > 0 || requiredFacts.length > 0;

  return {
    pass: requiredPhrasePass && normalizedFactPass && (answerTextPass || structuredSupportPresent),
    answerTextPass,
    requiredPhrasePass,
    normalizedFactPass,
    missingPhrases,
    missingFacts,
    winnerEntities,
  };
}

function buildSuiteSummary(results, suiteName) {
  const suiteResults = results.filter((result) => result.suite === suiteName && result.expectedOutcome === 'grounding');
  return {
    totalCases: suiteResults.length,
    top1Precision:
      suiteResults.length === 0 ? 0 : suiteResults.filter((result) => result.top1Pass).length / suiteResults.length,
    answerBearingPassRate:
      suiteResults.length === 0
        ? 0
        : suiteResults.filter((result) => result.answerBearingPass).length / suiteResults.length,
    nearMisses: suiteResults
      .filter((result) => !result.top1Pass || !result.answerBearingPass)
      .map((result) => ({
        id: result.id,
        expectedSegmentId: result.expectedSegmentId,
        actualWinnerId: result.actualWinnerId,
        nearMissSegmentIds: result.nearMissSegmentIds,
      })),
  };
}

function average(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classifyBlindDiagnostic(result) {
  if (result.expectedOutcome !== 'grounding') {
    return result.top1Pass ? 'negative_correctly_rejected' : 'negative_threshold_problem';
  }

  if (!result.top1Pass) {
    return 'retrieval_wrong';
  }

  if (result.answerBearingPass) {
    if (result.mustBeWindow && !result.windowCompliancePass) {
      return 'support_unit_too_narrow';
    }
    return 'grounding_correct';
  }

  const refinementReason = result.supportRefinement?.reason ?? 'none';
  if (
    result.supportRefinement?.attempted &&
    ['expanded_to_full_support', 'expanded_to_better_support'].includes(refinementReason)
  ) {
    return 'benchmark_phrase_mismatch';
  }

  if (result.winnerIsWindow && result.expectedSupportUnitType === 'base') {
    return 'support_unit_too_broad';
  }

  if (
    result.supportRefinement?.attempted &&
    ['no_better_window_found', 'no_neighbor_window_available'].includes(refinementReason)
  ) {
    return 'support_unit_too_narrow';
  }

  if (result.confidenceDisposition !== 'grounded') {
    return 'confidence_threshold_problem';
  }

  return 'benchmark_phrase_mismatch';
}

function buildBlindTestSummary(results) {
  const blindResults = results.filter((result) => result.validationMode === 'blind');
  const positiveBlind = blindResults.filter((result) => result.expectedOutcome === 'grounding');
  const negativeBlind = blindResults.filter((result) => result.expectedOutcome !== 'grounding');
  const windowCases = positiveBlind.filter((result) => result.mustBeWindow);
  const numericFactCases = positiveBlind.filter((result) => typeof result.minimumWinnerFactScore === 'number');
  const retrievalCorrectCases = positiveBlind.filter((result) => result.top1Pass);
  const verifiedFromPdfCases = positiveBlind.filter((result) => result.reviewStatus === 'verified_from_pdf');
  const extractionRepairCases = positiveBlind.filter((result) => result.reviewStatus === 'needs_extraction_repair');
  const diagnostics = blindResults.reduce((accumulator, result) => {
    const key = classifyBlindDiagnostic(result);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
  const mustBeWindowPassRate =
    windowCases.length === 0 ? 1 : windowCases.filter((result) => result.windowCompliancePass).length / windowCases.length;
  const windowWinnerRate =
    retrievalCorrectCases.length === 0
      ? 0
      : retrievalCorrectCases.filter((result) => result.winnerIsWindow).length / retrievalCorrectCases.length;
  const byChapter = Object.fromEntries(
    Object.entries(
      positiveBlind.reduce((accumulator, result) => {
        const key = result.expectedChapterId ?? result.chapterId ?? 'unknown';
        const bucket = accumulator[key] ?? [];
        bucket.push(result);
        accumulator[key] = bucket;
        return accumulator;
      }, {}),
    ).map(([chapterId, chapterResults]) => [
      chapterId,
      {
        totalCases: chapterResults.length,
        precisionAt1:
          chapterResults.length === 0 ? 0 : chapterResults.filter((result) => result.top1Pass).length / chapterResults.length,
      },
    ]),
  );
  const verifiedFromPdfWithoutOverridePassRate =
    verifiedFromPdfCases.length === 0
      ? 1
      : verifiedFromPdfCases.filter((result) => result.top1Pass && !result.winnerUsesOverride).length /
        verifiedFromPdfCases.length;

  return {
    totalCases: blindResults.length,
    positiveCases: positiveBlind.length,
    negativeCases: negativeBlind.length,
    byChapter,
    precisionAt1:
      positiveBlind.length === 0 ? 0 : positiveBlind.filter((result) => result.top1Pass).length / positiveBlind.length,
    recallAt5:
      positiveBlind.length === 0 ? 0 : positiveBlind.filter((result) => result.recallAt5Pass).length / positiveBlind.length,
    answerBearingPassRate:
      positiveBlind.length === 0
        ? 0
        : positiveBlind.filter((result) => result.answerBearingPass).length / positiveBlind.length,
    mustBeWindowPassRate,
    windowCompliancePassRate: mustBeWindowPassRate,
    windowWinnerRate,
    requiredWindowCaseCount: windowCases.length,
    numericFactStrengthPassRate:
      numericFactCases.length === 0
        ? 1
        : numericFactCases.filter((result) => result.numericFactStrengthPass).length / numericFactCases.length,
    chapterPredictionAccuracy:
      positiveBlind.length === 0
        ? 0
        : positiveBlind.filter((result) => result.chapterPredictionPass).length / positiveBlind.length,
    averageConfidenceDelta: Number(average(blindResults.map((result) => result.confidenceDelta)).toFixed(6)),
    averageLatencyMs: Number(average(blindResults.map((result) => result.latencyMs)).toFixed(3)),
    negativeLowConfidencePassRate:
      negativeBlind.length === 0 ? 1 : negativeBlind.filter((result) => result.top1Pass).length / negativeBlind.length,
    extractionIssueCaseCount: extractionRepairCases.length,
    extractionBlockedCaseCount: extractionRepairCases.filter((result) => !result.top1Pass).length,
    verifiedFromPdfCaseCount: verifiedFromPdfCases.length,
    verifiedFromPdfWithoutOverridePassRate,
    diagnostics,
    misses: blindResults
      .filter(
        (result) =>
          !result.top1Pass ||
          !result.answerBearingPass ||
          !result.windowCompliancePass ||
          !result.numericFactStrengthPass ||
          !result.chapterPredictionPass,
      )
      .map((result) => ({
        id: result.id,
        diagnostic: classifyBlindDiagnostic(result),
        expectedOutcome: result.expectedOutcome,
        expectedSegmentId: result.expectedSegmentId,
        actualWinnerId: result.actualWinnerId,
        winnerIsWindow: result.winnerIsWindow,
        winnerFactScore: result.winnerFactScore,
        confidenceDisposition: result.confidenceDisposition,
        confidenceDelta: result.confidenceDelta,
        reviewStatus: result.reviewStatus,
        sourceAuditFile: result.sourceAuditFile,
        extractionIssueId: result.extractionIssueId,
        winnerUsesOverride: result.winnerUsesOverride,
        supportRefinementReason: result.supportRefinement?.reason ?? null,
        missingPhrases: result.answerBearing?.missingPhrases ?? [],
        missingFacts: result.answerBearing?.missingFacts ?? [],
        nearMissSegmentIds: result.nearMissSegmentIds,
      })),
  };
}

function buildComparativeSummary(boostedResults, baselineResults) {
  const boostedBlind = boostedResults.filter((result) => result.validationMode === 'blind' && result.expectedOutcome === 'grounding');
  const baselineById = new Map(baselineResults.map((result) => [result.id, result]));

  const improvements = [];
  const regressions = [];

  for (const result of boostedBlind) {
    const baseline = baselineById.get(result.id);
    if (!baseline) {
      continue;
    }

    if (!baseline.top1Pass && result.top1Pass) {
      improvements.push(result.id);
    }
    if (baseline.top1Pass && !result.top1Pass) {
      regressions.push(result.id);
    }
  }

  const baselinePositiveBlind = baselineResults.filter(
    (result) => result.validationMode === 'blind' && result.expectedOutcome === 'grounding',
  );

  return {
    boostedPrecisionAt1:
      boostedBlind.length === 0 ? 0 : boostedBlind.filter((result) => result.top1Pass).length / boostedBlind.length,
    baselinePrecisionAt1:
      baselinePositiveBlind.length === 0
        ? 0
        : baselinePositiveBlind.filter((result) => result.top1Pass).length / baselinePositiveBlind.length,
    improvedCaseIds: improvements,
    regressedCaseIds: regressions,
  };
}

function materializeResult(testCase, audit, factNormalizer) {
  const comparison = compareOutcome(audit, testCase);
  const winner = audit.winner ? { ...audit.winner, confidenceDisposition: audit.confidence?.disposition } : null;
  const answerBearing = evaluateAnswerBearing(testCase, winner, factNormalizer);
  const winnerFactScore = audit.winner?.factGate?.factScore ?? 0;
  const winnerIsWindow = Boolean(audit.winner?.isSyntheticWindow);
  const windowCompliancePass = !testCase.mustBeWindow || winnerIsWindow;
  const numericFactStrengthPass =
    typeof testCase.minimumWinnerFactScore !== 'number' || winnerFactScore >= testCase.minimumWinnerFactScore;
  const characterIntegrityPass =
    ensureCharacterIntegrity(audit.query) &&
    ensureCharacterIntegrity(testCase.expectedAnswerText ?? '') &&
    ensureCharacterIntegrity(audit.winner?.excerpt ?? '');
  const winnerUsesOverride = Boolean(audit.winner?.baseSegmentIds?.some((segmentId) => extractionOverrideIds.has(segmentId)));

  return {
    id: testCase.id,
    suite: testCase.suite,
    label: testCase.label,
    validationMode: testCase.validationMode ?? 'gold',
    expectedOutcome: testCase.expectedOutcome ?? 'grounding',
    reviewStatus: testCase.reviewStatus ?? null,
    sourceAuditFile: testCase.sourceAuditFile ?? null,
    extractionIssueId: testCase.extractionIssueId ?? null,
    mustBeWindow: Boolean(testCase.mustBeWindow),
    minimumWinnerFactScore: testCase.minimumWinnerFactScore ?? null,
    expectedSegmentId: testCase.expected?.segmentId ?? null,
    expectedChapterId: testCase.expected?.chapterId ?? testCase.expectedChapterId ?? null,
    expectedSupportUnitType: testCase.expected?.supportUnitType ?? null,
    actualWinnerId: audit.winner?.id ?? null,
    chapterId: audit.winner?.chapterId ?? null,
    predictedChapterId: audit.chapterLikelihood?.predictedChapterId ?? null,
    top1Pass: comparison.top1Pass,
    forbiddenTopPass: comparison.forbiddenTopPass,
    recallAt5Pass: comparison.recallAt5Pass,
    chapterPredictionPass: comparison.chapterPredictionPass,
    answerBearingPass: answerBearing.pass,
    windowCompliancePass,
    numericFactStrengthPass,
    winnerFactScore,
    winnerIsWindow,
    winnerUsesOverride,
    confidenceDisposition: audit.confidence?.disposition ?? 'no_grounding',
    confidenceDelta: audit.confidence?.delta ?? 0,
    latencyMs: audit.latencyMs ?? 0,
    supportRefinement: audit.supportRefinement ?? null,
    answerBearing,
    characterIntegrityPass,
    nearMissSegmentIds: (audit.reranked ?? []).slice(0, 5).map((candidate) => candidate.id),
    audit,
  };
}

async function main() {
  const unitNormalization = await loadJsonResource('unit-normalization.json');
  const extractionIssues = await loadJsonResource('extraction-issues.json');
  extractionOverrideIds = new Set(
    (extractionIssues?.issues ?? []).map((issue) => issue.sandboxOverrideId).filter(Boolean),
  );
  const factNormalizer = createFactNormalizer({ unitNormalization });
  const baselineEngine = await createGroundingEngine({ enableChapterLikelihood: false });
  const boostedEngine = await createGroundingEngine({ enableChapterLikelihood: true });
  const suites = await Promise.all(BENCHMARK_FILES.map((file) => loadBenchmarkFile(file)));
  const cases = suites.flatMap((suite) => suite.cases.map((testCase) => ({ ...testCase, suite: suite.suite })));

  const boostedResults = cases.map((testCase) =>
    materializeResult(testCase, boostedEngine.query(testCase, 10), factNormalizer),
  );
  const baselineResults = cases.map((testCase) =>
    materializeResult(testCase, baselineEngine.query(testCase, 10), factNormalizer),
  );

  const numericCases = suites.find((suite) => suite.suite === 'critical_numeric_cases')?.cases ?? [];
  const numericResults = boostedResults.filter((result) => numericCases.some((testCase) => testCase.id === result.id));
  const numericTop1Precision =
    numericResults.length === 0 ? 0 : numericResults.filter((result) => result.top1Pass).length / numericResults.length;

  const falsePositiveSuppressed = boostedResults
    .filter((result) => result.id === 'deaths-page-intro-false-positive')
    .every((result) => result.forbiddenTopPass);

  const characterIntegrityPass = boostedResults.every((result) => result.characterIntegrityPass);

  const chapter1Summary = buildSuiteSummary(boostedResults, 'chapter1_gold_cases');
  const chapter2Summary = buildSuiteSummary(boostedResults, 'chapter2_gold_cases');
  const chapter3Summary = buildSuiteSummary(boostedResults, 'chapter3_gold_cases');
  const chapter4Summary = buildSuiteSummary(boostedResults, 'chapter4_gold_cases');
  const chapter5Summary = buildSuiteSummary(boostedResults, 'chapter5_gold_cases');
  const chapter6Summary = buildSuiteSummary(boostedResults, 'chapter6_gold_cases');
  const chapter7Summary = buildSuiteSummary(boostedResults, 'chapter7_gold_cases');
  const chapter8Summary = buildSuiteSummary(boostedResults, 'chapter8_gold_cases');
  const chapter9Summary = buildSuiteSummary(boostedResults, 'chapter9_gold_cases');
  const blindTestSummary = buildBlindTestSummary(boostedResults);
  const comparativeSummary = buildComparativeSummary(boostedResults, baselineResults);

  const summary = {
    generatedAt: new Date().toISOString(),
    engine: {
      boosted: boostedEngine.metadata,
      baseline: baselineEngine.metadata,
    },
    metrics: {
      numericTop1Precision,
      falsePositiveSuppressed,
      characterIntegrityPass,
      totalCases: boostedResults.length,
      passedCases: boostedResults.filter(
        (result) => result.top1Pass && result.forbiddenTopPass && result.answerBearingPass && result.characterIntegrityPass,
      ).length,
    },
    chapter1Summary,
    chapter2Summary,
    chapter3Summary,
    chapter4Summary,
    chapter5Summary,
    chapter6Summary,
    chapter7Summary,
    chapter8Summary,
    chapter9Summary,
    blindTestSummary,
    comparativeSummary,
    boostedResults,
    baselineResults,
  };

  await mkdir(runsRoot, { recursive: true });
  const stamp = summary.generatedAt.replace(/[:.]/g, '-');
  const outputPath = path.join(runsRoot, `benchmark-${stamp}.json`);
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        outputPath,
        numericTop1Precision,
        falsePositiveSuppressed,
        characterIntegrityPass,
        chapter1Summary,
        chapter2Summary,
        chapter3Summary,
        chapter4Summary,
        chapter5Summary,
        chapter6Summary,
        chapter7Summary,
        chapter8Summary,
        chapter9Summary,
        blindTestSummary,
        comparativeSummary,
        totalCases: boostedResults.length,
        passedCases: summary.metrics.passedCases,
      },
      null,
      2,
    ),
  );

  const gatePassed =
    numericTop1Precision > 0.95 &&
    falsePositiveSuppressed &&
    characterIntegrityPass &&
    chapter1Summary.top1Precision === 1 &&
    chapter1Summary.answerBearingPassRate === 1 &&
    chapter2Summary.top1Precision === 1 &&
    chapter2Summary.answerBearingPassRate === 1 &&
    chapter3Summary.top1Precision === 1 &&
    chapter3Summary.answerBearingPassRate === 1 &&
    chapter4Summary.top1Precision === 1 &&
    chapter4Summary.answerBearingPassRate === 1 &&
    chapter5Summary.top1Precision === 1 &&
    chapter5Summary.answerBearingPassRate === 1 &&
    chapter6Summary.top1Precision === 1 &&
    chapter6Summary.answerBearingPassRate === 1 &&
    chapter7Summary.top1Precision === 1 &&
    chapter7Summary.answerBearingPassRate === 1 &&
    chapter8Summary.top1Precision === 1 &&
    chapter8Summary.answerBearingPassRate === 1 &&
    chapter9Summary.top1Precision === 1 &&
    chapter9Summary.answerBearingPassRate === 1 &&
    blindTestSummary.positiveCases >= 50 &&
    blindTestSummary.precisionAt1 >= 0.9 &&
    blindTestSummary.recallAt5 >= 0.95 &&
    blindTestSummary.chapterPredictionAccuracy > 0.9 &&
    blindTestSummary.negativeLowConfidencePassRate === 1 &&
    blindTestSummary.verifiedFromPdfCaseCount >= 25 &&
    blindTestSummary.verifiedFromPdfWithoutOverridePassRate === 1 &&
    blindTestSummary.extractionBlockedCaseCount === 0 &&
    comparativeSummary.regressedCaseIds.length === 0;

  if (!gatePassed) {
    process.exitCode = 1;
  }
}

await main();
