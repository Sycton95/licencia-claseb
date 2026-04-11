import { mkdir, readFile, writeFile } from 'node:fs/promises';
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

async function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    console.error('Usage: node scripts/review-import.mjs data/imports/<file>.json');
    process.exit(1);
  }

  const inputPath = path.resolve(repoRoot, inputArg);
  const inputText = await readFile(inputPath, 'utf8');
  const rawBatch = JSON.parse(inputText);
  const seedContentText = await readFile(path.resolve(repoRoot, 'src/data/seedContent.ts'), 'utf8');

  const { reviewLog, acceptedCandidates, rejectedCandidates } = reviewImportBatch(rawBatch, {
    sourceFile: toRepoRelativePath(inputPath),
    seedContentText,
  });

  const batchStem = path.basename(inputPath, path.extname(inputPath));
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

  console.log(
    JSON.stringify(
      {
        outputDir: toRepoRelativePath(outputDir),
        acceptedCount: reviewLog.summary.acceptedCount,
        rejectedCount: reviewLog.summary.rejectedCount,
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
