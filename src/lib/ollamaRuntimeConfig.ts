export type LocalOllamaRuntimeConfig = {
  baseUrl: string;
  model: string;
  maxGenerationMs: number;
  maxItemsPerRun: number;
};

type RuntimeEnvMap = Record<string, string | undefined>;

function getImportMetaEnv(): RuntimeEnvMap | null {
  try {
    return ((import.meta as ImportMeta & { env?: RuntimeEnvMap }).env ?? null);
  } catch {
    return null;
  }
}

function getProcessEnv(): RuntimeEnvMap | null {
  const runtimeProcess = (globalThis as { process?: { env?: RuntimeEnvMap } }).process;

  if (!runtimeProcess?.env) {
    return null;
  }

  return runtimeProcess.env;
}

function readEnvValue(...keys: string[]) {
  const importMetaEnv = getImportMetaEnv();
  const processEnv = getProcessEnv();

  for (const key of keys) {
    const fromImportMeta = importMetaEnv?.[key]?.trim();
    if (fromImportMeta) {
      return fromImportMeta;
    }

    const fromProcess = processEnv?.[key]?.trim();
    if (fromProcess) {
      return fromProcess;
    }
  }

  return undefined;
}

function readEnvNumber(defaultValue: number, ...keys: string[]) {
  const rawValue = readEnvValue(...keys);
  const parsedValue = rawValue ? Number(rawValue) : Number.NaN;

  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

export function getLocalOllamaRuntimeConfig(
  overrides: Partial<LocalOllamaRuntimeConfig> = {},
): LocalOllamaRuntimeConfig {
  return {
    baseUrl:
      overrides.baseUrl ??
      readEnvValue('VITE_OLLAMA_BASE_URL', 'OLLAMA_BASE_URL') ??
      'http://127.0.0.1:11434',
    model:
      overrides.model ??
      readEnvValue('VITE_OLLAMA_MODEL', 'OLLAMA_MODEL') ??
      'qwen2.5:3b',
    maxGenerationMs:
      overrides.maxGenerationMs ??
      readEnvNumber(15000, 'VITE_OLLAMA_MAX_GENERATION_MS', 'OLLAMA_MAX_GENERATION_MS'),
    maxItemsPerRun:
      overrides.maxItemsPerRun ??
      readEnvNumber(3, 'VITE_OLLAMA_MAX_ITEMS_PER_RUN', 'OLLAMA_MAX_ITEMS_PER_RUN'),
  };
}
