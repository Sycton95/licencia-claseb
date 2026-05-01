import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();

function usage() {
  console.error('Usage: node scripts/promote-foundry-build.mjs <buildId>');
  process.exit(1);
}

const buildId = process.argv[2];
if (!buildId) {
  usage();
}

const sourceRoot = path.join(repoRoot, 'sandbox', 'rag-system', 'artifacts', buildId);
const sourceManifestPath = path.join(sourceRoot, 'review-export', 'manifest.json');
const targetRoot = path.join(repoRoot, 'data', 'foundry-builds', buildId);
const targetReviewDir = path.join(targetRoot, 'review-export');

if (!fs.existsSync(sourceManifestPath)) {
  throw new Error(`Missing sandbox review-export manifest: ${sourceManifestPath}`);
}

fs.mkdirSync(targetReviewDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
const chapters = [];

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
        buildId,
      };
      return JSON.stringify(candidate);
    });
  fs.writeFileSync(targetFile, `${normalizedLines.join('\n')}\n`);
  chapters.push({
    chapterId: chapter.chapterId,
    file: `review-export/${fileName}`,
    count: Number(chapter.count ?? 0),
  });
}

const productionManifest = {
  buildId,
  editionId: manifest.editionId ?? 'manual-2026',
  manualYear: manifest.manualYear ?? 2026,
  sourceDocumentId: manifest.sourceDocumentId ?? 'manual-claseb-2026',
  exportedCount: Number(manifest.exportedCount ?? chapters.reduce((total, chapter) => total + chapter.count, 0)),
  generatedAt: manifest.generatedAt ?? new Date().toISOString(),
  chapters,
};

fs.writeFileSync(
  path.join(targetRoot, 'manifest.json'),
  `${JSON.stringify(productionManifest, null, 2)}\n`,
);

console.log(`Promoted ${buildId} to ${path.relative(repoRoot, targetRoot)}`);
