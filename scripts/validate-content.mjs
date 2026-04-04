import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['src', 'docs'];
const singleFiles = ['README.md', 'plan.md'];
const invalidPatterns = [/Ã‚/g, /Ãƒ/g, /Ã°/g, /Â/g, /Ã/g, /ð/g];

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
