import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resourcesRoot = path.join(__dirname, 'resources');
const cache = new Map();

export function loadGroundingResource(name) {
  if (!cache.has(name)) {
    const filePath = path.join(resourcesRoot, name);
    cache.set(name, JSON.parse(readFileSync(filePath, 'utf8')));
  }
  return cache.get(name);
}
