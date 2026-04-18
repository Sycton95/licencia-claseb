import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

let buildSha = 'dev';
const localWorkerPort = Number(process.env.LOCAL_OLLAMA_WORKER_PORT ?? 4789);

try {
  buildSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  buildSha = 'dev';
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/__local': {
        target: `http://127.0.0.1:${localWorkerPort}`,
        changeOrigin: false,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_BUILD__: JSON.stringify(buildSha),
  },
});
