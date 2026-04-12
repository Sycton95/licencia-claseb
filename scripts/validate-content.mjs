import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src', 'api', 'docs'];
const singleFiles = ['README.md', 'plan.md'];
const invalidPatterns = [/ÃƒÆ’Ã¢â‚¬Å¡/g, /ÃƒÆ’Ã†â€™/g, /ÃƒÆ’Ã‚Â°/g, /Ãƒâ€š/g, /ÃƒÆ’/g, /ÃƒÂ°/g, /ï¿½/g];
const allowlistedFiles = new Set([
  'src/data/seedContent.ts',
  'src/data/reviewedImports.ts',
  'src/lib/textEncoding.ts',
  'src/lib/importReview.mjs',
]);

function walk(directory) {
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist') {
      continue;
    }

    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

const filesToCheck = [...roots.flatMap((root) => walk(root)), ...singleFiles];
const matches = [];

for (const file of filesToCheck) {
  const normalizedFile = file.replace(/\\/g, '/');
  if (allowlistedFiles.has(normalizedFile)) {
    continue;
  }

  const content = readFileSync(file, 'utf8');

  for (const pattern of invalidPatterns) {
    if (pattern.test(content)) {
      matches.push(`${file}: contiene patrón inválido ${pattern}`);
    }
  }
}

if (matches.length > 0) {
  console.error(matches.join('\n'));
  process.exit(1);
}

console.log('Content validation passed.');
