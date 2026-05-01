import { runAdminLocalRuntime } from './admin-local-runtime.mjs';

await runAdminLocalRuntime({
  mode: 'admin-local',
  enableBetaPanel: false,
  enableOllamaWorker: false,
});
