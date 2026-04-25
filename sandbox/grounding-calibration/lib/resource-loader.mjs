import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { benchmarkRoot, manualKnowledgeRoot, resourcesRoot } from './paths.mjs';

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function loadJsonResource(fileName) {
  return readJson(path.join(resourcesRoot, fileName));
}

export async function loadOptionalJsonResource(fileName, fallbackValue = null) {
  try {
    return await readJson(path.join(resourcesRoot, fileName));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
}

export async function loadBenchmarkFile(fileName) {
  return readJson(path.join(benchmarkRoot, fileName));
}

export async function loadAllChapterFiles() {
  const index = await loadKnowledgeIndex();
  return Promise.all(index.chapters.map((chapter) => loadChapterFile(chapter.file)));
}

export async function loadKnowledgeIndex() {
  return readJson(path.join(manualKnowledgeRoot, 'index.json'));
}

export async function loadChapterFile(relativePath) {
  return readJson(path.join(manualKnowledgeRoot, relativePath));
}
