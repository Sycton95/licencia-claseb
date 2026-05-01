import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { runtimeStatePath } from './admin-local-runtime.mjs';

async function readRuntimeState() {
  try {
    const raw = await readFile(runtimeStatePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `No se encontro el runtime state en ${runtimeStatePath}. Inicia primero npm run dev:admin-local o npm run dev:admin-beta.`,
    );
  }
}

async function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if ((response.statusCode ?? 500) >= 400) {
          let detail = '';
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              detail = parsed.error ? `: ${parsed.error}` : `: ${raw}`;
            } catch {
              detail = `: ${raw}`;
            }
          }
          reject(new Error(`HTTP ${response.statusCode} en ${url}${detail}`));
          return;
        }
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.setTimeout(3000, () => {
      request.destroy(new Error(`Timeout consultando ${url}`));
    });
  });
}

async function requestStatus(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    request.on('error', reject);
    request.setTimeout(3000, () => {
      request.destroy(new Error(`Timeout consultando ${url}`));
    });
  });
}

try {
  const state = await readRuntimeState();
  const adminStatus = await requestStatus(state.adminUrl);
  if (adminStatus < 200 || adminStatus >= 500) {
    throw new Error(`Admin no respondio correctamente en ${state.adminUrl}: ${adminStatus}`);
  }

  const healthUrl = `${state.pdfWorkerUrl}/__local/pdf/health?documentId=${encodeURIComponent(state.manualDocumentId)}`;
  const pdfHealth = await requestJson(healthUrl);
  if (!pdfHealth.available) {
    throw new Error(`PDF worker reporto manual no disponible: ${pdfHealth.error ?? 'sin detalle'}`);
  }

  console.log(JSON.stringify({
    mode: state.mode,
    adminUrl: state.adminUrl,
    pdfWorkerUrl: state.pdfWorkerUrl,
    vitePort: state.vitePort,
    pdfWorkerPort: state.pdfWorkerPort,
    adminStatus,
    manualDocumentId: state.manualDocumentId,
    pdfAvailable: pdfHealth.available,
    pageCount: pdfHealth.pageCount ?? null,
  }, null, 2));
} catch (error) {
  let message =
    error instanceof Error
      ? error.message
      : 'Fallo desconocido en smoke:admin-local.';
  if (error instanceof Error && /ECONNREFUSED/i.test(error.message)) {
    message = 'El runtime local no esta activo o ya fue detenido. Inicia primero npm run dev:admin-local o npm run dev:admin-beta.';
  }
  console.error(`smoke:admin-local fallo: ${message}`);
  process.exit(1);
}
