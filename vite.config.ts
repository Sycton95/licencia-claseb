import { execSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

let buildSha = 'dev';
const localWorkerPort = Number(process.env.LOCAL_OLLAMA_WORKER_PORT ?? 4789);
const localPdfWorkerPort = Number(process.env.LOCAL_PDF_WORKER_PORT ?? 4790);

try {
  buildSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  buildSha = 'dev';
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manual-library',
      apply: 'build',
      closeBundle() {
        const sourceDir = resolve(__dirname, 'data', 'manual-library');
        const targetDir = resolve(__dirname, 'dist', 'data', 'manual-library');
        if (!existsSync(sourceDir)) {
          return;
        }
        cpSync(sourceDir, targetDir, { recursive: true, force: true });
      },
    },
  ],
  server: {
    proxy: {
      '/__local/ollama': {
        target: `http://127.0.0.1:${localWorkerPort}`,
        changeOrigin: false,
      },
      '/__local/pdf': {
        target: `http://127.0.0.1:${localPdfWorkerPort}`,
        changeOrigin: false,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_BUILD__: JSON.stringify(buildSha),
  },
});
