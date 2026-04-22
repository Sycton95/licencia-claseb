import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CHAPTER_WINDOWS,
  MANUAL_KNOWLEDGE_VERSION,
  deriveGroundTruthFromSegments,
  extractManualPages,
  segmentManualPages,
} from './extract-manual-grounding.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const knowledgeRoot = path.resolve(repoRoot, 'data/manual-knowledge');
const versionedKnowledgeRoot = path.join(knowledgeRoot, MANUAL_KNOWLEDGE_VERSION);
const DEFAULT_MANUAL_PDF = path.resolve(repoRoot, 'Libro-ClaseB-2026.pdf');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseCliArgs(argv) {
  let sourceArg = '';
  let chapterFilter = '';

  for (const arg of argv) {
    if (arg.startsWith('--chapter=')) {
      chapterFilter = arg.split('=')[1] ?? '';
      continue;
    }
    if (!sourceArg) {
      sourceArg = arg;
    }
  }

  return { sourceArg, chapterFilter };
}

function validateFacts(facts) {
  const issues = [];
  for (const fact of facts) {
    if (!fact.id) issues.push(`Fact missing id: ${JSON.stringify(fact)}`);
    if (!fact.entity) issues.push(`Fact ${fact.id || '<no-id>'} missing entity.`);
    if (!fact.chapterId) issues.push(`Fact ${fact.id || '<no-id>'} missing chapterId.`);
    if (!fact.manualRef) issues.push(`Fact ${fact.id || '<no-id>'} missing manualRef.`);
    if (!fact.pageRange?.start || !fact.pageRange?.end) {
      issues.push(`Fact ${fact.id || '<no-id>'} missing valid pageRange.`);
    }
    if (!Array.isArray(fact.aliases) || fact.aliases.length === 0) {
      issues.push(`Fact ${fact.id || '<no-id>'} must include at least one alias.`);
    }
  }
  return issues;
}

function validateCitations(citations) {
  const issues = [];
  for (const citation of citations) {
    if (!citation.id) issues.push(`Citation missing id: ${JSON.stringify(citation)}`);
    if (!citation.chapterId) issues.push(`Citation ${citation.id || '<no-id>'} missing chapterId.`);
    if (!citation.manualRef) issues.push(`Citation ${citation.id || '<no-id>'} missing manualRef.`);
    if (!citation.excerpt) issues.push(`Citation ${citation.id || '<no-id>'} missing excerpt.`);
    if (!citation.text) issues.push(`Citation ${citation.id || '<no-id>'} missing text.`);
    if (!citation.pageRange?.start || !citation.pageRange?.end) {
      issues.push(`Citation ${citation.id || '<no-id>'} missing valid pageRange.`);
    }
  }
  return issues;
}

function buildClassifier(existingClassifier) {
  if (existingClassifier?.chapters) {
    return existingClassifier;
  }

  return {
    chapters: Object.fromEntries(
      Object.entries(CHAPTER_WINDOWS).map(([chapterId, chapter]) => [
        chapterId,
        {
          label: chapter.label,
          keywords: {},
        },
      ]),
    ),
    ambiguityMargin: 1,
  };
}

function filterByChapter(items, chapterFilter, field = 'chapterId') {
  if (!chapterFilter) {
    return items;
  }
  return items.filter((item) => item[field] === chapterFilter);
}

function buildVersionedIndex({
  sourcePath,
  extracted,
  segmentedManual,
  facts,
  chapterFilter,
}) {
  const chapters = Object.entries(CHAPTER_WINDOWS)
    .filter(([chapterId]) => !chapterFilter || chapterId === chapterFilter)
    .map(([chapterId, chapter]) => {
      const chapterSegments = filterByChapter(segmentedManual.segments, chapterFilter || chapterId);
      const chapterFacts = filterByChapter(facts, chapterFilter || chapterId);
      return {
        chapterId,
        label: chapter.label,
        pageRange: {
          start: chapter.start,
          end: chapter.end,
        },
        segmentCount: chapterSegments.length,
        factCount: chapterFacts.length,
        file: `chapters/${chapterId}.json`,
      };
    });

  return {
    version: MANUAL_KNOWLEDGE_VERSION,
    sourcePdf: path.relative(repoRoot, sourcePath).split(path.sep).join('/'),
    generatedAt: new Date().toISOString(),
    pageCount: extracted.pageCount,
    segmentCount: segmentedManual.segmentCount,
    factCount: facts.length,
    chapters,
  };
}

async function main() {
  const { sourceArg, chapterFilter } = parseCliArgs(process.argv.slice(2));
  await mkdir(knowledgeRoot, { recursive: true });
  await mkdir(versionedKnowledgeRoot, { recursive: true });
  await mkdir(path.join(versionedKnowledgeRoot, 'chapters'), { recursive: true });

  const sourcePath = sourceArg
    ? path.resolve(repoRoot, sourceArg)
    : DEFAULT_MANUAL_PDF;

  const existingClassifier = await readJson(path.join(knowledgeRoot, 'chapter-classifier.json')).catch(() => null);

  const extracted = await extractManualPages(sourcePath);
  const segmentedManual = segmentManualPages(extracted);
  const groundTruth = deriveGroundTruthFromSegments(segmentedManual);
  const citations = filterByChapter(segmentedManual.segments, chapterFilter);
  const facts = filterByChapter(groundTruth.facts, chapterFilter);
  const validationIssues = [...validateFacts(facts), ...validateCitations(citations)];

  if (validationIssues.length > 0) {
    throw new Error(`Manual knowledge pack validation failed:\n- ${validationIssues.join('\n- ')}`);
  }

  const versionedIndex = buildVersionedIndex({
    sourcePath,
    extracted,
    segmentedManual: {
      ...segmentedManual,
      segments: citations,
      segmentCount: citations.length,
    },
    facts,
    chapterFilter,
  });

  await Promise.all(
    versionedIndex.chapters.map(async (chapter) => {
      const chapterSegments = citations.filter((item) => item.chapterId === chapter.chapterId);
      const chapterFacts = facts.filter((item) => item.chapterId === chapter.chapterId);
      await writeJson(path.join(versionedKnowledgeRoot, chapter.file), {
        version: MANUAL_KNOWLEDGE_VERSION,
        chapterId: chapter.chapterId,
        label: chapter.label,
        pageRange: chapter.pageRange,
        generatedAt: versionedIndex.generatedAt,
        segmentCount: chapterSegments.length,
        factCount: chapterFacts.length,
        segments: chapterSegments,
        facts: chapterFacts,
      });
    }),
  );

  await Promise.all([
    writeJson(path.join(knowledgeRoot, 'extracted-pages.json'), extracted),
    writeJson(path.join(knowledgeRoot, 'segmented-manual.json'), segmentedManual),
    writeJson(path.join(knowledgeRoot, 'ground-truth.json'), facts),
    writeJson(path.join(knowledgeRoot, 'manual-segments.json'), citations),
    writeJson(path.join(knowledgeRoot, 'chapter-classifier.json'), buildClassifier(existingClassifier)),
    writeJson(path.join(versionedKnowledgeRoot, 'index.json'), versionedIndex),
    writeJson(path.join(versionedKnowledgeRoot, 'facts.json'), {
      version: MANUAL_KNOWLEDGE_VERSION,
      generatedAt: versionedIndex.generatedAt,
      factCount: facts.length,
      facts,
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        source: path.relative(repoRoot, sourcePath).split(path.sep).join('/'),
        chapterFilter: chapterFilter || null,
        pageCount: extracted.pageCount,
        segmentCount: segmentedManual.segmentCount,
        writtenCitationCount: citations.length,
        writtenFactCount: facts.length,
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
