import http from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { getOfficialManualRecord } from '../src/data/manualLibrary.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const execFileAsync = promisify(execFile);
const port = Number(process.env.LOCAL_PDF_WORKER_PORT ?? 4790);
const pythonScript = resolve(repoRoot, 'scripts', 'pdf_worker_tool.py');

type PythonCommand = {
  command: string;
  prefixArgs?: string[];
};

function getPythonCommands(): PythonCommand[] {
  const commands: PythonCommand[] = [];
  const seen = new Set<string>();
  const add = (command: string | undefined, prefixArgs: string[] = []) => {
    if (!command) {
      return;
    }
    const key = `${command}::${prefixArgs.join(' ')}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    commands.push({ command, prefixArgs });
  };

  add(process.env.PYTHON_EXECUTABLE);

  const localVenvPython = resolve(repoRoot, '.venv', 'Scripts', 'python.exe');
  if (existsSync(localVenvPython)) {
    add(localVenvPython);
  }

  add('C:\\Windows\\py.exe', ['-3']);
  add('C:\\Users\\franc\\AppData\\Local\\Programs\\Python\\Python314\\python.exe');
  add('python');

  return commands;
}

function json(response: http.ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

function resolveDocumentPath(documentId: string) {
  const record = getOfficialManualRecord(documentId);
  if (!record) {
    throw new Error(`Manual no registrado: ${documentId}`);
  }
  return resolve(repoRoot, record.assetRelativePath);
}

function resolveCacheDir() {
  return resolve(repoRoot, 'data', 'manual-library', 'cache');
}

function isPythonRuntimeUnavailable(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /No installed Python|No se pudo ejecutar ningun runtime de Python|spawn EPERM|spawn EACCES|Unknown file extension|no se pudo encontrar|not recognized/i.test(
    error.message,
  );
}

function getDegradedHealth(documentId: string, documentPath: string, error: unknown) {
  try {
    accessSync(documentPath, constants.R_OK);
    return {
      workerAvailable: false,
      documentId,
      available: true,
      error: error instanceof Error ? error.message : 'PyMuPDF local no disponible.',
    };
  } catch (readError) {
    return {
      workerAvailable: false,
      documentId,
      available: false,
      error:
        readError instanceof Error
          ? readError.message
          : 'El manual no esta disponible para el worker local.',
    };
  }
}

async function readJsonBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function runPython(operation: string, payload: Record<string, unknown>) {
  let lastError: unknown = null;

  for (const candidate of getPythonCommands()) {
    try {
      const { stdout } = await execFileAsync(candidate.command, [
        ...(candidate.prefixArgs ?? []),
        pythonScript,
        operation,
        JSON.stringify(payload),
      ], {
        cwd: repoRoot,
        timeout: 15000,
        maxBuffer: 16 * 1024 * 1024,
      });

      return JSON.parse(stdout || '{}') as Record<string, unknown>;
    } catch (error) {
      lastError = error;

      if (
        process.platform === 'win32' &&
        error instanceof Error &&
        /EPERM|EACCES|UNKNOWN/i.test(error.message)
      ) {
        try {
          return await runPythonViaCmd(candidate, operation, payload);
        } catch (fallbackError) {
          lastError = fallbackError;
        }
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo ejecutar ningun runtime de Python para el worker PDF.');
}

function quoteCmdArg(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function runPythonViaCmd(
  candidate: PythonCommand,
  operation: string,
  payload: Record<string, unknown>,
) {
  const commandParts = [
    quoteCmdArg(candidate.command),
    ...(candidate.prefixArgs ?? []),
    quoteCmdArg(pythonScript),
    quoteCmdArg(operation),
  ];

  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const child = spawn(
      'cmd.exe',
      ['/d', '/s', '/c', commandParts.join(' ')],
      {
        cwd: repoRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk) => {
      stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    child.stderr.on('data', (chunk) => {
      stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code && code !== 0) {
        reject(new Error(Buffer.concat(stderrChunks).toString('utf8') || `Python fallback fallo con codigo ${code}.`));
        return;
      }
      try {
        const stdout = Buffer.concat(stdoutChunks).toString('utf8');
        resolve(JSON.parse(stdout || '{}') as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

const server = http.createServer(async (request, response) => {
  try {
    if (!request.url) {
      json(response, 400, { error: 'URL invalida.' });
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host ?? '127.0.0.1'}`);

    if (request.method === 'GET' && url.pathname === '/__local/pdf/health') {
      const documentId = url.searchParams.get('documentId');
      if (!documentId) {
        json(response, 400, { error: 'documentId es obligatorio.' });
        return;
      }

      const documentPath = resolveDocumentPath(documentId);
      let result: Record<string, unknown>;
      try {
        result = await runPython('health', {
          documentId,
          documentPath,
        });
      } catch (error) {
        if (!isPythonRuntimeUnavailable(error)) {
          throw error;
        }
        result = getDegradedHealth(documentId, documentPath, error);
      }
      json(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/__local/pdf/locate-anchor') {
      const body = await readJsonBody(request);
      const documentId = String(body.documentId ?? '');
      if (!documentId) {
        json(response, 400, { error: 'documentId es obligatorio.' });
        return;
      }

      let result: Record<string, unknown>;
      try {
        result = await runPython('locate_anchor', {
          ...body,
          documentPath: resolveDocumentPath(documentId),
        });
      } catch (error) {
        if (!isPythonRuntimeUnavailable(error)) {
          throw error;
        }
        result = {
          pageNumber: Number(body.pageNumber ?? 1),
          bbox: null,
          rects: [],
          bboxSource: 'unavailable',
          workerAvailable: false,
          error: error instanceof Error ? error.message : 'PyMuPDF local no disponible.',
        };
      }
      json(response, 200, result);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/__local/pdf/page-images') {
      const body = await readJsonBody(request);
      const documentId = String(body.documentId ?? '');
      if (!documentId) {
        json(response, 400, { error: 'documentId es obligatorio.' });
        return;
      }

      let result: Record<string, unknown>;
      try {
        result = await runPython('page_images', {
          ...body,
          documentPath: resolveDocumentPath(documentId),
          cacheDir: resolveCacheDir(),
        });
      } catch (error) {
        if (!isPythonRuntimeUnavailable(error)) {
          throw error;
        }
        result = {
          images: [],
          workerAvailable: false,
          error: error instanceof Error ? error.message : 'PyMuPDF local no disponible.',
        };
      }
      json(response, 200, result);
      return;
    }

    json(response, 404, { error: 'Ruta PDF local no encontrada.' });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : 'Fallo interno del worker PDF.',
    });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Local PDF worker listening on http://127.0.0.1:${port}`);
});
