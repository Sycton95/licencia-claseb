import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const runtimeDir = resolve(repoRoot, '.tmp');
const runtimeStatePath = resolve(runtimeDir, 'admin-local-runtime.json');

function getViteCommand(vitePort) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', `npm run dev -- --host 127.0.0.1 --port ${vitePort}`],
    };
  }

  return {
    command: 'npm',
    args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(vitePort)],
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    const candidate = startPort + index;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(candidate)) {
      return candidate;
    }
  }
  throw new Error(`No se encontro un puerto libre desde ${startPort}.`);
}

function spawnProcess(command, args, options = {}, state) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });

  state.childProcesses.push(child);
  child.on('exit', (code) => {
    if (code && code !== 0) {
      void shutdown(code, state);
    }
  });
  child.on('error', (error) => {
    console.error(`No se pudo iniciar ${command}:`, error);
    void shutdown(1, state);
  });

  return child;
}

async function removeRuntimeState() {
  await rm(runtimeStatePath, { force: true }).catch(() => {});
}

async function writeRuntimeState(payload) {
  await mkdir(runtimeDir, { recursive: true });
  await writeFile(runtimeStatePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function waitForHttp(url, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const statusCode = await new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        });
        request.on('error', reject);
        request.setTimeout(2000, () => {
          request.destroy(new Error('timeout'));
        });
      });

      if (statusCode >= 200 && statusCode < 500) {
        return true;
      }
    } catch {}

    // eslint-disable-next-line no-await-in-loop
    await delay(2000);
  }

  return false;
}

function openBrowser(url) {
  if (process.env.CODEX_SKIP_AUTO_OPEN === 'true') {
    return false;
  }

  if (process.platform === 'win32') {
    const child = spawn('cmd.exe', ['/c', 'start', '', url], {
      cwd: repoRoot,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return true;
  }

  if (process.platform === 'darwin') {
    const child = spawn('open', [url], {
      cwd: repoRoot,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return true;
  }

  const child = spawn('xdg-open', [url], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return true;
}

async function shutdown(exitCode = 0, state) {
  if (state.shuttingDown) {
    return;
  }
  state.shuttingDown = true;

  if (!state.wroteRuntimeState) {
    await removeRuntimeState();
  }

  for (const child of state.childProcesses) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => process.exit(exitCode), 250);
}

export async function runAdminLocalRuntime({
  mode,
  enableBetaPanel,
  enableOllamaWorker,
}) {
  const state = {
    childProcesses: [],
    shuttingDown: false,
    wroteRuntimeState: false,
  };

  process.on('SIGINT', () => {
    void shutdown(0, state);
  });
  process.on('SIGTERM', () => {
    void shutdown(0, state);
  });

  await removeRuntimeState();

  const vitePort = await findAvailablePort(Number(process.env.ADMIN_DEV_PORT ?? 5173));
  const ollamaWorkerPort = enableOllamaWorker
    ? await findAvailablePort(Number(process.env.LOCAL_OLLAMA_WORKER_PORT ?? 4789))
    : null;
  const pdfWorkerPort = await findAvailablePort(Number(process.env.LOCAL_PDF_WORKER_PORT ?? 4790));

  const sharedEnv = {
    ...process.env,
    VITE_ENABLE_LOCAL_ADMIN: 'true',
    VITE_ENABLE_ADMIN_BETA_PANEL: enableBetaPanel ? 'true' : 'false',
    LOCAL_OLLAMA_WORKER_PORT: ollamaWorkerPort ? String(ollamaWorkerPort) : process.env.LOCAL_OLLAMA_WORKER_PORT,
    LOCAL_PDF_WORKER_PORT: String(pdfWorkerPort),
    ADMIN_DEV_PORT: String(vitePort),
  };

  const adminUrl = `http://127.0.0.1:${vitePort}/admin`;
  const pdfWorkerUrl = `http://127.0.0.1:${pdfWorkerPort}`;
  const autoOpenEnabled = process.env.CODEX_SKIP_AUTO_OPEN !== 'true';

  console.log(`Admin mode: ${mode}`);
  console.log(`Admin dev port: ${vitePort}`);
  if (ollamaWorkerPort) {
    console.log(`Local Ollama worker port: ${ollamaWorkerPort}`);
  }
  console.log(`Local PDF worker port: ${pdfWorkerPort}`);
  console.log(`Admin URL: ${adminUrl}`);
  console.log(`Browser auto-open: ${autoOpenEnabled ? 'enabled' : 'skipped'}`);

  const viteCommand = getViteCommand(vitePort);

  spawnProcess(viteCommand.command, viteCommand.args, { env: sharedEnv }, state);
  if (enableOllamaWorker) {
    spawnProcess(process.execPath, ['--experimental-strip-types', 'scripts/local-ollama-worker.ts'], { env: sharedEnv }, state);
  }
  spawnProcess(process.execPath, ['--experimental-strip-types', 'scripts/local-pdf-worker.ts'], { env: sharedEnv }, state);

  const ready = await waitForHttp(adminUrl);
  if (!ready) {
    console.error(`Admin no estuvo listo a tiempo: ${adminUrl}`);
    await shutdown(1, state);
    return;
  }

  await writeRuntimeState({
    startedAt: new Date().toISOString(),
    mode,
    vitePort,
    pdfWorkerPort,
    adminUrl,
    pdfWorkerUrl,
    manualDocumentId: 'manual-claseb-2026',
  });
  state.wroteRuntimeState = true;

  console.log(`Admin listo en ${adminUrl}`);
  if (openBrowser(adminUrl)) {
    console.log('Browser auto-opened.');
  } else {
    console.log('Browser auto-open skipped.');
  }
}

export { runtimeStatePath };
