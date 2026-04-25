import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createFactNormalizer } from './lib/fact-normalizer.mjs';
import { loadAllChapterFiles, loadJsonResource } from './lib/resource-loader.mjs';
import { sandboxRoot } from './lib/paths.mjs';

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildContextLabel(text, rawValue) {
  const source = String(text ?? '').replace(/\s+/g, ' ').trim();
  const raw = String(rawValue ?? '').trim();
  if (!source || !raw) {
    return 'numeric_fact';
  }

  const normalizedSource = source.toLowerCase();
  const rawIndex = normalizedSource.indexOf(raw.toLowerCase());
  if (rawIndex < 0) {
    return source.split(/\s+/u).slice(0, 6).join(' ');
  }

  const before = source.slice(0, rawIndex).split(/\s+/u).filter(Boolean).slice(-6);
  const after = source.slice(rawIndex + raw.length).split(/\s+/u).filter(Boolean).slice(0, 4);
  const contextTokens = [...before, ...after].filter((token) => token.length >= 3);
  return contextTokens.slice(0, 6).join(' ') || 'numeric_fact';
}

function buildAliases(segment, label, entity) {
  return Array.from(
    new Set(
      [entity.raw, label, segment.manualRef]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  );
}

function estimateConfidence(segment, entity, label) {
  let score = 0.45;
  if (entity.unit) {
    score += 0.2;
  }
  if (entity.normalizedEnd !== null && entity.normalizedEnd !== undefined) {
    score += 0.1;
  }
  if (label && label !== 'numeric_fact') {
    score += 0.15;
  }
  if ((segment.text ?? '').length > 120) {
    score += 0.1;
  }
  return Number(Math.min(score, 0.95).toFixed(3));
}

async function main() {
  const [chapterFiles, unitNormalization] = await Promise.all([
    loadAllChapterFiles(),
    loadJsonResource('unit-normalization.json'),
  ]);

  const factNormalizer = createFactNormalizer({ unitNormalization });
  const proposals = [];
  const dedupe = new Set();

  for (const chapter of chapterFiles) {
    for (const segment of chapter?.segments ?? []) {
      const entities = factNormalizer.extractEntities(segment.text ?? segment.excerpt ?? '');
      for (const entity of entities) {
        const label = buildContextLabel(segment.text ?? segment.excerpt ?? '', entity.raw);
        const entityKey = normalizeKey(`${chapter.chapterId}-${label}-${entity.unit || 'unitless'}`);
        const proposalId = `${segment.id}-${normalizeKey(entity.raw)}-${entity.unit || 'unitless'}`;
        if (dedupe.has(proposalId)) {
          continue;
        }
        dedupe.add(proposalId);

        proposals.push({
          id: proposalId,
          chapterId: chapter.chapterId,
          pageRange: segment.pageRange,
          supportUnitId: segment.id,
          entityKey,
          entityLabel: label,
          value: entity.raw,
          normalizedValue: entity.normalized,
          normalizedValueEnd: entity.normalizedEnd ?? null,
          unit: entity.unit || '',
          excerpt: segment.excerpt ?? segment.text ?? '',
          aliases: buildAliases(segment, label, entity),
          source: 'harvested',
          reviewStatus: 'proposed',
          confidence: estimateConfidence(segment, entity, label),
        });
      }
    }
  }

  const output = {
    version: '2026',
    generatedAt: new Date().toISOString(),
    totalProposals: proposals.length,
    facts: proposals,
  };

  const generatedRoot = path.join(sandboxRoot, 'generated');
  await mkdir(generatedRoot, { recursive: true });
  const outputPath = path.join(generatedRoot, 'fact-proposals-2026.json');
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        outputPath,
        totalProposals: proposals.length,
        chapters: chapterFiles.length,
      },
      null,
      2,
    ),
  );
}

await main();
