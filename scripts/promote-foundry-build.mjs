import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const DEFAULT_EDITION_ID = 'manual-2026';
const DEFAULT_MANUAL_YEAR = 2026;
const DEFAULT_SOURCE_DOCUMENT_ID = 'manual-claseb-2026';

function usage() {
  console.error('Usage: node scripts/promote-foundry-build.mjs <runId>');
  process.exit(1);
}

const runId = process.argv[2];
if (!runId) {
  usage();
}

const sourceRoot = path.join(repoRoot, 'sandbox', 'rag-system', 'artifacts', runId);
const sourceManifestPath = path.join(sourceRoot, 'review-export', 'manifest.json');
const sourceQuestionCandidatesPath = path.join(sourceRoot, 'question-candidates.json');
const sourceRunManifestPath = path.join(sourceRoot, 'manual-build-manifest.json');
const sourceNoveltyReportPath = path.join(sourceRoot, 'run-novelty-report.json');
const targetRoot = path.join(repoRoot, 'data', 'foundry-builds', runId);
const targetReviewDir = path.join(targetRoot, 'review-export');
const targetDuplicatesPath = path.join(targetRoot, 'duplicates.json');
const runRegistryPath = path.join(repoRoot, 'sandbox', 'rag-system', 'artifacts', 'run-registry.json');

if (!fs.existsSync(sourceManifestPath)) {
  throw new Error(`Missing sandbox review-export manifest: ${sourceManifestPath}`);
}

fs.mkdirSync(targetReviewDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
const runManifest = fs.existsSync(sourceRunManifestPath)
  ? JSON.parse(fs.readFileSync(sourceRunManifestPath, 'utf8'))
  : null;
const noveltyReport = fs.existsSync(sourceNoveltyReportPath)
  ? JSON.parse(fs.readFileSync(sourceNoveltyReportPath, 'utf8'))
  : null;
const chapters = [];
const exportedCandidates = [];

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function promptSimilarity(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (longer.includes(shorter)) {
    return Number((shorter.length / longer.length).toFixed(4));
  }

  const leftTokens = new Set(a.split(' '));
  const rightTokens = new Set(b.split(' '));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return Number((overlap / Math.max(leftTokens.size, rightTokens.size, 1)).toFixed(4));
}

function coverageSimilarity(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (longer.includes(shorter)) {
    return Number((shorter.length / longer.length).toFixed(4));
  }
  return 0;
}

function canonicalCandidateView(exportedMember = {}, sourceMember = {}) {
  const options = exportedMember.options ?? sourceMember.options ?? [];
  const optionTexts = options.map((option) =>
    typeof option === 'object' && option !== null ? option.text ?? '' : String(option ?? ''),
  );
  const correctOptionIndexes =
    exportedMember.correctOptionIndexes ?? sourceMember.correctOptionIndexes ?? [];
  const correctAnswerText = correctOptionIndexes
    .filter((index) => index >= 0 && index < optionTexts.length)
    .map((index) => optionTexts[index])
    .join(' ');

  return {
    prompt: exportedMember.prompt ?? sourceMember.prompt ?? '',
    answer: correctAnswerText,
    options: optionTexts.join(' '),
    grounding: exportedMember.groundingExcerpt ?? sourceMember.groundingExcerpt ?? '',
    explanation:
      exportedMember.publicExplanation ?? sourceMember.publicExplanation ?? '',
  };
}

function hybridSimilarity(left, right) {
  const promptScore = Math.max(
    promptSimilarity(left.prompt, right.prompt),
    coverageSimilarity(left.prompt, right.prompt),
  );
  const answerScore = Math.max(
    promptSimilarity(left.answer, right.answer),
    left.answer && left.answer === right.answer ? 1 : 0,
  );
  const optionsScore = Math.max(
    promptSimilarity(left.options, right.options),
    coverageSimilarity(left.options, right.options),
  );
  const groundingScore = Math.max(
    promptSimilarity(left.grounding, right.grounding),
    coverageSimilarity(left.grounding, right.grounding),
  );
  const explanationScore = Math.max(
    promptSimilarity(left.explanation, right.explanation),
    coverageSimilarity(left.explanation, right.explanation),
  );
  const weighted =
    promptScore * 0.35 +
    answerScore * 0.2 +
    optionsScore * 0.2 +
    groundingScore * 0.2 +
    explanationScore * 0.05;
  return Number(weighted.toFixed(4));
}

function buildDuplicateArtifactFromSandboxCandidates({
  buildId,
  generatedAt,
  candidates,
  exportedById,
}) {
  const clustersByFamily = new Map();

  for (const candidate of candidates) {
    const externalId = candidate?.candidateId;
    const familyKey = candidate?.duplicateFamilyKey;
    if (!externalId || !familyKey || !exportedById.has(externalId)) {
      continue;
    }

    if (!clustersByFamily.has(familyKey)) {
      clustersByFamily.set(familyKey, []);
    }
    clustersByFamily.get(familyKey).push(candidate);
  }

  const clusters = [];
  const sortedFamilies = [...clustersByFamily.keys()].sort((left, right) =>
    String(left).localeCompare(String(right)),
  );

  for (const [index, familyKey] of sortedFamilies.entries()) {
    const members = clustersByFamily.get(familyKey) ?? [];
    if (members.length < 2) {
      continue;
    }

    const rankedMembers = [...members].sort((left, right) => {
      const scoreDelta =
        Number(right?.verifier?.score ?? 0) - Number(left?.verifier?.score ?? 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return String(left?.candidateId ?? '').localeCompare(String(right?.candidateId ?? ''));
    });

    const suggested = rankedMembers[0];
    const suggestedExport = exportedById.get(suggested.candidateId) ?? {};
    const suggestedView = canonicalCandidateView(suggestedExport, suggested);
    const chapterIds = new Set();
    const normalizedMembers = rankedMembers.map((member) => {
      const exportedMember = exportedById.get(member.candidateId) ?? {};
      const memberView = canonicalCandidateView(exportedMember, member);
      const chapterId = exportedMember.chapterId ?? member.chapterId ?? 'unknown';
      chapterIds.add(chapterId);
      return {
        externalId: member.candidateId,
        chapterId,
        prompt: exportedMember.prompt ?? member.prompt ?? '',
        sourcePageStart: exportedMember.sourcePageStart,
        sourcePageEnd: exportedMember.sourcePageEnd,
        sourceReference: exportedMember.sourceReference,
        publicExplanation: exportedMember.publicExplanation,
        groundingExcerpt: exportedMember.groundingExcerpt,
        verifierScore: Number(member?.verifier?.score ?? 0),
        verifierBreakdown: member?.verifier?.verifierBreakdown,
        verifierIssueCount: Array.isArray(member?.verifier?.issues)
          ? member.verifier.issues.length
          : 0,
        generationMode: member?.generationMode ?? 'text',
        visualDependency: member?.visualDependency ?? 'none',
        needsVisualAudit: Boolean(member?.needsVisualAudit),
        similarityToSuggested: hybridSimilarity(memberView, suggestedView),
      };
    });

    clusters.push({
      clusterId: `${buildId}-dup-${String(index + 1).padStart(3, '0')}`,
      familyKey,
      suggestedWinnerId: suggested.candidateId,
      suggestedWinnerScore: Number(suggested?.verifier?.score ?? 0),
      suggestedWinnerReason:
        'Winner ranked by verifier score within the duplicate family.',
      classification: 'duplicate_family',
      reviewerSummary: `Cluster with ${normalizedMembers.length} similar candidates. Suggested winner ${suggested.candidateId} has the strongest verifier score.`,
      chapterIds: [...chapterIds].sort((left, right) => String(left).localeCompare(String(right))),
      members: normalizedMembers,
    });
  }

  return {
    buildId,
    generatedAt,
    clusterCount: clusters.length,
    similarityMethod: 'hybrid_local_v1',
    clusters,
  };
}

for (const chapter of manifest.chapters ?? []) {
  const sourceFile = path.isAbsolute(chapter.file)
    ? chapter.file
    : path.join(sourceRoot, 'review-export', path.basename(chapter.file));
  const fileName = `${chapter.chapterId}.jsonl`;
  const targetFile = path.join(targetReviewDir, fileName);

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Missing chapter JSONL for ${chapter.chapterId}: ${sourceFile}`);
  }

  const normalizedLines = fs
    .readFileSync(sourceFile, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const candidate = JSON.parse(line);
      candidate.sandboxProvenance = {
        ...(candidate.sandboxProvenance ?? {}),
        buildId: runId,
        runId,
        sourceBuildId: runManifest?.sourceBuildId ?? manifest.sourceBuildId ?? runId,
      };
      exportedCandidates.push(candidate);
      return JSON.stringify(candidate);
    });
  fs.writeFileSync(targetFile, `${normalizedLines.join('\n')}\n`);
  chapters.push({
    chapterId: chapter.chapterId,
    file: `review-export/${fileName}`,
    count: Number(chapter.count ?? 0),
  });
}

let duplicateArtifact = null;
const sourceDuplicatesPath = manifest.duplicatesFile
  ? path.isAbsolute(manifest.duplicatesFile)
    ? manifest.duplicatesFile
    : path.join(repoRoot, manifest.duplicatesFile)
  : path.join(sourceRoot, 'duplicates.json');

if (fs.existsSync(sourceDuplicatesPath)) {
  duplicateArtifact = JSON.parse(fs.readFileSync(sourceDuplicatesPath, 'utf8'));
} else if (fs.existsSync(sourceQuestionCandidatesPath)) {
  const sandboxCandidates = JSON.parse(fs.readFileSync(sourceQuestionCandidatesPath, 'utf8'));
  const exportedById = new Map(
    exportedCandidates.map((candidate) => [candidate.externalId, candidate]),
  );
  duplicateArtifact = buildDuplicateArtifactFromSandboxCandidates({
    buildId,
    runId,
    generatedAt: manifest.generatedAt ?? new Date().toISOString(),
    candidates: Array.isArray(sandboxCandidates) ? sandboxCandidates : [],
    exportedById,
  });
}

if (duplicateArtifact) {
  fs.writeFileSync(targetDuplicatesPath, `${JSON.stringify(duplicateArtifact, null, 2)}\n`);
}

const productionManifest = {
  buildId: runId,
  runId,
  sourceBuildId: runManifest?.sourceBuildId ?? manifest.sourceBuildId ?? runId,
  editionId: manifest.editionId ?? DEFAULT_EDITION_ID,
  manualYear: manifest.manualYear ?? DEFAULT_MANUAL_YEAR,
  sourceDocumentId: manifest.sourceDocumentId ?? DEFAULT_SOURCE_DOCUMENT_ID,
  exportedCount: Number(manifest.exportedCount ?? chapters.reduce((total, chapter) => total + chapter.count, 0)),
  generatedAt: manifest.generatedAt ?? new Date().toISOString(),
  duplicateClusterCount: Number(
    manifest.duplicateClusterCount ??
      duplicateArtifact?.clusterCount ??
      0,
  ),
  duplicatesFile: duplicateArtifact ? 'duplicates.json' : undefined,
  noveltyReportFile: noveltyReport ? 'run-novelty-report.json' : undefined,
  exactDuplicateCount: Number(manifest.exactDuplicateCount ?? noveltyReport?.exactDuplicateCount ?? 0),
  nearDuplicateCount: Number(manifest.nearDuplicateCount ?? noveltyReport?.nearDuplicateCount ?? 0),
  novelCandidateCount: Number(manifest.novelCandidateCount ?? noveltyReport?.novelCandidateCount ?? 0),
  noveltyRate: Number(manifest.noveltyRate ?? noveltyReport?.noveltyRate ?? 0),
  noveltyWarning: Boolean(manifest.noveltyWarning ?? noveltyReport?.warning ?? false),
  chapters,
};

if (noveltyReport) {
  fs.writeFileSync(
    path.join(targetRoot, 'run-novelty-report.json'),
    `${JSON.stringify(noveltyReport, null, 2)}\n`,
  );
}

if (fs.existsSync(runRegistryPath)) {
  const registry = JSON.parse(fs.readFileSync(runRegistryPath, 'utf8'));
  if (Array.isArray(registry.runs)) {
    registry.runs = registry.runs.map((entry) =>
      entry?.runId === runId
        ? {
            ...entry,
            status: 'promoted',
            promotedAt: new Date().toISOString(),
            exactDuplicateCount: productionManifest.exactDuplicateCount,
            nearDuplicateCount: productionManifest.nearDuplicateCount,
            novelCandidateCount: productionManifest.novelCandidateCount,
            noveltyRate: productionManifest.noveltyRate,
            noveltyWarning: productionManifest.noveltyWarning,
            exportCount: productionManifest.exportedCount,
          }
        : entry,
    );
    registry.generatedAt = new Date().toISOString();
    fs.writeFileSync(runRegistryPath, `${JSON.stringify(registry, null, 2)}\n`);
  }
}

fs.writeFileSync(
  path.join(targetRoot, 'manifest.json'),
  `${JSON.stringify(productionManifest, null, 2)}\n`,
);

if (productionManifest.noveltyWarning) {
  console.warn(
    `Warning: run ${runId} has weak novelty (${productionManifest.noveltyRate}). ` +
      `Exact duplicates: ${productionManifest.exactDuplicateCount}, near duplicates: ${productionManifest.nearDuplicateCount}.`,
  );
}

console.log(`Promoted ${runId} to ${path.relative(repoRoot, targetRoot)}`);
