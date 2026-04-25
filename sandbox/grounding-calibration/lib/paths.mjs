import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sandboxRoot = path.resolve(__dirname, '..');
export const repoRoot = path.resolve(sandboxRoot, '..', '..');
export const resourcesRoot = path.join(sandboxRoot, 'resources');
export const benchmarkRoot = path.join(sandboxRoot, 'benchmark');
export const runsRoot = path.join(sandboxRoot, 'runs');
export const manualKnowledgeRoot = path.join(repoRoot, 'data', 'manual-knowledge', '2026');
