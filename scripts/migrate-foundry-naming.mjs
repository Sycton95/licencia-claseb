import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sandboxRoot = path.join(repoRoot, 'sandbox', 'rag-system');
const artifactsRoot = path.join(sandboxRoot, 'artifacts');
const prodRoot = path.join(repoRoot, 'data', 'foundry-builds');
const manualPath = path.join(sandboxRoot, 'manual_2026.pdf');
const registryPath = path.join(artifactsRoot, 'run-registry.json');

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function sanitizeStem(stem) {
  return stem.replace(/[^\w-]+/gu, '_').replace(/_+/g, '_').replace(/^[_-]+|[_-]+$/g, '') || 'manual';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function walkFiles(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function replaceStrings(value, replacements) {
  if (typeof value === 'string') {
    let next = value;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    return next;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStrings(item, replacements));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, replaceStrings(inner, replacements)]),
    );
  }
  return value;
}

function rewriteJsonFile(filePath, replacements, adjust) {
  const payload = readJson(filePath);
  const rewritten = replaceStrings(payload, replacements);
  const adjusted = adjust ? adjust(rewritten) : rewritten;
  writeJson(filePath, adjusted);
}

function rewriteJsonlFile(filePath, replacements, adjust) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  const rewritten = lines.map((line) => {
    const payload = JSON.parse(line);
    const replaced = replaceStrings(payload, replacements);
    const adjusted = adjust ? adjust(replaced) : replaced;
    return JSON.stringify(adjusted);
  });
  fs.writeFileSync(filePath, `${rewritten.join('\n')}\n`);
}

function renameDirIfExists(oldPath, newPath) {
  if (!fs.existsSync(oldPath) || oldPath === newPath) return;
  if (fs.existsSync(newPath)) {
    throw new Error(`Target already exists: ${newPath}`);
  }
  fs.renameSync(oldPath, newPath);
}

const manualHash = sha256File(manualPath).slice(0, 12);
const newSource = `${sanitizeStem(path.parse(manualPath).name)}-${manualHash}`;
const oldSource = 'manual-foundry-2026-31abbf7de7c9';
const oldBaseline = 'manual-foundry-2026-31abbf7de7c9-run-20260502-045041+0000-qwen3-4b-instruct';
const oldLegacyRepair = 'manual-foundry-2026-31abbf7de7c9-repaired';

const newLegacy = `${newSource}-legacy`;
const newBaseline = `${newSource}-r01`;
const newLegacyRepair = `${newSource}-fix01`;

const replacements = [
  [oldBaseline, newBaseline],
  [oldLegacyRepair, newLegacyRepair],
  [oldSource, newSource],
];

const registry = readJson(registryPath);
registry.runs = (registry.runs || []).map((run) => {
  const rewritten = replaceStrings(run, replacements);
  if (rewritten.runId === newBaseline) {
    rewritten.buildId = newBaseline;
    rewritten.runId = newBaseline;
    rewritten.sourceBuildId = newSource;
  }
  return rewritten;
});
writeJson(registryPath, registry);

const artifactRenames = [
  [path.join(artifactsRoot, oldSource), path.join(artifactsRoot, newLegacy)],
  [path.join(artifactsRoot, oldLegacyRepair), path.join(artifactsRoot, newLegacyRepair)],
  [path.join(artifactsRoot, oldBaseline), path.join(artifactsRoot, newBaseline)],
];

for (const [oldDir, newDir] of artifactRenames) {
  if (!fs.existsSync(oldDir)) continue;
  const files = walkFiles(oldDir);
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.json') {
      rewriteJsonFile(filePath, replacements, (payload) => {
        if (payload.buildId === newSource) {
          payload.buildId = newLegacy;
          payload.runId = payload.runId || newLegacy;
          payload.runId = newLegacy;
          payload.sourceBuildId = newSource;
        }
        if (payload.buildId === newLegacyRepair) {
          payload.sourceBuildId = newSource;
          payload.parentRunId = newLegacy;
          payload.parentBuildId = newLegacy;
        }
        if (payload.buildId === newBaseline) {
          payload.runId = newBaseline;
          payload.sourceBuildId = newSource;
        }
        return payload;
      });
    } else if (ext === '.jsonl') {
      rewriteJsonlFile(filePath, replacements);
    }
  }
}

for (const [oldDir, newDir] of artifactRenames) {
  renameDirIfExists(oldDir, newDir);
}

const prodOldDir = path.join(prodRoot, oldLegacyRepair);
const prodNewDir = path.join(prodRoot, newLegacyRepair);
if (fs.existsSync(prodOldDir)) {
  const files = walkFiles(prodOldDir);
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.json') {
      rewriteJsonFile(filePath, replacements, (payload) => {
        if (payload.buildId === newLegacyRepair) {
          payload.sourceBuildId = newSource;
        }
        return payload;
      });
    } else if (ext === '.jsonl') {
      rewriteJsonlFile(filePath, replacements);
    }
  }
  renameDirIfExists(prodOldDir, prodNewDir);
}

console.log(JSON.stringify({
  sourceBuildId: newSource,
  legacyArtifact: newLegacy,
  baselineRunId: newBaseline,
  legacyRepairId: newLegacyRepair,
}, null, 2));
