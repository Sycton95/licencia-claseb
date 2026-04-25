import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildChapterStats } from './lib/chapter-concept-mapper.mjs';
import { resourcesRoot } from './lib/paths.mjs';
import { loadJsonResource } from './lib/resource-loader.mjs';
import { createSpanishTextNormalizer } from './lib/spanish-text-normalizer.mjs';

async function main() {
  const [stopwords, domainRoots, domainAliases] = await Promise.all([
    loadJsonResource('spanish-stopwords.json'),
    loadJsonResource('domain-roots.json'),
    loadJsonResource('domain-aliases.json'),
  ]);

  const normalizer = createSpanishTextNormalizer({ stopwords, domainRoots });
  const stats = await buildChapterStats({ normalizer, domainAliases, topTermsPerChapter: 80 });
  const outputPath = path.join(resourcesRoot, 'chapter-stats.json');
  await writeFile(outputPath, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputPath, chapters: stats.chapters.length }, null, 2));
}

await main();
