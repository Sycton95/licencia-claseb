import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const tsxCliPath = resolve(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const childProcesses = [];

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });

  childProcesses.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });

  return child;
}

function shutdown(exitCode = 0) {
  for (const child of childProcesses) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => process.exit(exitCode), 250);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

spawnProcess('npm', ['run', 'dev'], {
  shell: process.platform === 'win32',
});
spawnProcess(process.execPath, [tsxCliPath, 'scripts/local-ollama-worker.ts']);
