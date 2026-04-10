/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ENABLE_LOCAL_ADMIN?: string;
  readonly VITE_ENABLE_PREVIEW_ADMIN_BYPASS?: string;
  readonly VITE_ENABLE_ADMIN_BETA_PANEL?: string;
  readonly VITE_ENABLE_LOCAL_OLLAMA?: string;
  readonly VITE_OLLAMA_BASE_URL?: string;
  readonly VITE_OLLAMA_MODEL?: string;
  readonly VITE_OLLAMA_MAX_GENERATION_MS?: string;
  readonly VITE_OLLAMA_MAX_ITEMS_PER_RUN?: string;
  readonly VITE_PUBLIC_ADMIN_URL?: string;
  readonly VITE_VERCEL_ENV?: string;
  readonly OLLAMA_BASE_URL?: string;
  readonly OLLAMA_MODEL?: string;
  readonly OLLAMA_MAX_GENERATION_MS?: string;
  readonly OLLAMA_MAX_ITEMS_PER_RUN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
declare const __APP_BUILD__: string;
