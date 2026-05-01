import { runAdminLocalRuntime } from './admin-local-runtime.mjs';

await runAdminLocalRuntime({
  mode: 'admin-beta',
  enableBetaPanel: true,
  enableOllamaWorker: true,
});
