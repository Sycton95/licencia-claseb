import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderReviewSummary, reviewImportBatch } from '../src/lib/importReview.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function toRepoRelativePath(filePath) {
  const relative = path.relative(repoRoot, filePath);
  return relative.split(path.sep).join('/');
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function parseCliArgs(argv) {
  const args = [...argv];
  let inputArg = '';
  let chapterFilter = '';

  for (const arg of args) {
    if (arg.startsWith('--chapter=')) {
      chapterFilter = arg.split('=')[1] ?? '';
      continue;
    }
    if (!inputArg) {
      inputArg = arg;
    }
  }

  return { inputArg, chapterFilter };
}

function tokenizeConcatenatedArrays(text) {
  const source = String(text ?? '').trim();
  const arrays = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  let started = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (!started) {
      if (/\s/u.test(character)) {
        continue;
      }
      if (character !== '[') {
        throw new SyntaxError(`Unexpected token "${character}" before first JSON array.`);
      }
      started = true;
    }

    current += character;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '[') {
      depth += 1;
      continue;
    }

    if (character === ']') {
      depth -= 1;
      if (depth < 0) {
        throw new SyntaxError('Unexpected closing bracket while tokenizing JSON arrays.');
      }
      if (depth === 0) {
        arrays.push(current.trim());
        current = '';
        started = false;
      }
    }
  }

  if (depth !== 0 || inString) {
    throw new SyntaxError('Unterminated JSON array or string in import source.');
  }

  if (current.trim()) {
    throw new SyntaxError('Unexpected trailing content after parsing concatenated arrays.');
  }

  return arrays;
}

function parseReviewInput(text) {
  try {
    return {
      rawBatch: JSON.parse(text),
      parserWarnings: [],
    };
  } catch {
    const arrayBlocks = tokenizeConcatenatedArrays(text);
    if (arrayBlocks.length === 0) {
      throw new SyntaxError('The import source did not contain any JSON arrays.');
    }

    const merged = [];
    for (const block of arrayBlocks) {
      const parsed = JSON.parse(block);
      if (!Array.isArray(parsed)) {
        throw new SyntaxError('Flattening only supports concatenated top-level JSON arrays.');
      }
      merged.push(...parsed);
    }

    return {
      rawBatch: merged,
      parserWarnings: [
        {
          code: 'flattened_concatenated_arrays',
          message: `Source contained ${arrayBlocks.length} concatenated JSON arrays and was flattened before review.`,
        },
      ],
    };
  }
}

async function loadKnowledgePack() {
  const knowledgeRoot = path.resolve(repoRoot, 'data/manual-knowledge');
  const versionedRoot = path.join(knowledgeRoot, '2026');
  const [versionedIndex, chapterClassifier] = await Promise.all([
    readJsonIfExists(path.join(versionedRoot, 'index.json')),
    readJsonIfExists(path.join(knowledgeRoot, 'chapter-classifier.json')),
  ]);

  if (versionedIndex?.chapters) {
    const chapterFiles = await Promise.all(
      versionedIndex.chapters.map((chapter) =>
        readJsonIfExists(path.join(versionedRoot, chapter.file)),
      ),
    );

    const manualSegments = chapterFiles.flatMap((chapter) => chapter?.segments ?? []);
    const groundTruth = chapterFiles.flatMap((chapter) => chapter?.facts ?? []);

    return {
      groundTruth,
      chapterClassifier,
      manualSegments,
    };
  }

  const [groundTruth, manualSegments] = await Promise.all([
    readJsonIfExists(path.join(knowledgeRoot, 'ground-truth.json')),
    readJsonIfExists(path.join(knowledgeRoot, 'manual-segments.json')),
  ]);

  return {
    groundTruth: Array.isArray(groundTruth) ? groundTruth : groundTruth?.facts ?? [],
    chapterClassifier,
    manualSegments: Array.isArray(manualSegments) ? manualSegments : manualSegments?.citations ?? [],
  };
}

async function loadEmbeddingCache() {
  return readJsonIfExists(path.resolve(repoRoot, 'data/import-cache/prompt-embeddings.json'));
}

async function loadReviewedImportQuestions(currentBatchStem) {
  const importReviewsRoot = path.resolve(repoRoot, 'data/import-reviews');
  const entries = await readdir(importReviewsRoot, { withFileTypes: true });
  const accepted = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === currentBatchStem) {
      continue;
    }

    const acceptedPath = path.join(importReviewsRoot, entry.name, 'accepted-candidates.json');
    const candidates = await readJsonIfExists(acceptedPath);
    if (Array.isArray(candidates)) {
      accepted.push(...candidates);
    }
  }

  return accepted;
}

async function writeChapterOutputs(outputDir, chapterAcceptedMap) {
  const chaptersRoot = path.join(outputDir, 'chapters');
  await mkdir(chaptersRoot, { recursive: true });

  await Promise.all(
    Object.entries(chapterAcceptedMap ?? {}).map(async ([chapterId, questions]) => {
      const chapterDir = path.join(chaptersRoot, chapterId);
      await mkdir(chapterDir, { recursive: true });
      await writeFile(
        path.join(chapterDir, 'accepted-candidates.json'),
        `${JSON.stringify(questions ?? [], null, 2)}\n`,
        'utf8',
      );
    }),
  );

  return chaptersRoot;
}

function buildRunManifestSummary(outputDirRelative, reviewLog) {
  const runId = outputDirRelative.split('/').pop() ?? reviewLog.batch.batchId;
  return {
    runId,
    sourceFile: reviewLog.sourceFile,
    reviewedAt: reviewLog.reviewedAt,
    acceptedCount: reviewLog.summary.acceptedCount,
    acceptedWithWarningCount: reviewLog.summary.acceptedWithWarningCount ?? 0,
    rejectedCount: reviewLog.summary.rejectedCount,
    warningCount: reviewLog.summary.warningCount,
    errorCount: reviewLog.summary.errorCount,
    autoGroundedAcceptedCount: reviewLog.summary.autoGroundedAcceptedCount ?? 0,
    duplicateClusterCount: reviewLog.summary.duplicateClusterCount ?? 0,
    ambiguousCandidateCount: (reviewLog.ambiguousCandidates ?? []).length,
    chapterSummaries: reviewLog.chapterSummaries ?? [],
    files: {
      reviewLog: `${outputDirRelative}/review-log.json`,
      reviewSummary: `${outputDirRelative}/review-summary.md`,
      acceptedCandidates: `${outputDirRelative}/accepted-candidates.json`,
      rejectedCandidates: `${outputDirRelative}/rejected-candidates.json`,
      chaptersRoot: `${outputDirRelative}/chapters`,
      runDetails: `${outputDirRelative}/run-details.json`,
    },
  };
}

function buildRunDetail(reviewLog, rejectedCandidates, runId) {
  return {
    runId,
    sourceFile: reviewLog.sourceFile,
    reviewedAt: reviewLog.reviewedAt,
    duplicateClusters: reviewLog.duplicateClusters ?? [],
    ambiguousCandidates: reviewLog.ambiguousCandidates ?? [],
    autoGroundedAccepted: reviewLog.autoGroundedAccepted ?? [],
    rejectedCandidates,
  };
}

async function buildManifest() {
  const importReviewsRoot = path.resolve(repoRoot, 'data/import-reviews');
  const entries = await readdir(importReviewsRoot, { withFileTypes: true });
  const runs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const runDir = path.join(importReviewsRoot, entry.name);
    const reviewLog = await readJsonIfExists(path.join(runDir, 'review-log.json'));
    if (!reviewLog) {
      continue;
    }

    runs.push(buildRunManifestSummary(toRepoRelativePath(runDir), reviewLog));
  }

  runs.sort((left, right) => right.reviewedAt.localeCompare(left.reviewedAt));

  return {
    generatedAt: new Date().toISOString(),
    runs,
  };
}

async function main() {
  const { inputArg, chapterFilter } = parseCliArgs(process.argv.slice(2));

  if (!inputArg) {
    console.error('Usage: node scripts/review-import.mjs data/imports/<file>.json [--chapter=chapter-2]');
    process.exit(1);
  }

  const inputPath = path.resolve(repoRoot, inputArg);
  const inputText = await readFile(inputPath, 'utf8');
  const { rawBatch, parserWarnings } = parseReviewInput(inputText);
  const seedContentText = await readFile(path.resolve(repoRoot, 'src/data/seedContent.ts'), 'utf8');
  const baseStem = path.basename(inputPath, path.extname(inputPath));
  const batchStem = chapterFilter ? `${baseStem}--${chapterFilter}` : baseStem;

  const [knowledgePack, reviewedImportQuestions, embeddingCache] = await Promise.all([
    loadKnowledgePack(),
    loadReviewedImportQuestions(batchStem),
    loadEmbeddingCache(),
  ]);

  const { reviewLog, acceptedCandidates, rejectedCandidates, chapterAcceptedMap } = reviewImportBatch(rawBatch, {
    sourceFile: toRepoRelativePath(inputPath),
    seedContentText,
    knowledgePack,
    reviewedImportQuestions,
    embeddingCache,
    parserWarnings,
    chapterFilter,
  });

  const outputDir = path.resolve(repoRoot, 'data/import-reviews', batchStem);
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    path.join(outputDir, 'review-log.json'),
    `${JSON.stringify(reviewLog, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(outputDir, 'accepted-candidates.json'),
    `${JSON.stringify(acceptedCandidates, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(outputDir, 'rejected-candidates.json'),
    `${JSON.stringify(rejectedCandidates, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(outputDir, 'review-summary.md'),
    renderReviewSummary(reviewLog),
    'utf8',
  );
  await writeFile(
    path.join(outputDir, 'run-details.json'),
    `${JSON.stringify(buildRunDetail(reviewLog, rejectedCandidates, batchStem), null, 2)}\n`,
    'utf8',
  );

  const chaptersRoot = await writeChapterOutputs(outputDir, chapterAcceptedMap);
  const manifest = await buildManifest();
  await writeFile(
    path.resolve(repoRoot, 'data/import-reviews/manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        outputDir: toRepoRelativePath(outputDir),
        chaptersRoot: toRepoRelativePath(chaptersRoot),
        manifest: 'data/import-reviews/manifest.json',
        chapterFilter: chapterFilter || null,
        acceptedCount: reviewLog.summary.acceptedCount,
        acceptedWithWarningCount: reviewLog.summary.acceptedWithWarningCount ?? 0,
        autoGroundedAcceptedCount: reviewLog.summary.autoGroundedAcceptedCount ?? 0,
        rejectedCount: reviewLog.summary.rejectedCount,
        duplicateClusterCount: reviewLog.summary.duplicateClusterCount ?? 0,
        warningCount: reviewLog.summary.warningCount,
        errorCount: reviewLog.summary.errorCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
