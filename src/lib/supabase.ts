import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const vercelEnv = import.meta.env.VITE_VERCEL_ENV?.trim().toLowerCase();
const localAdminEnabled = import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true';
const previewAdminBypassEnabled = import.meta.env.VITE_ENABLE_PREVIEW_ADMIN_BYPASS === 'true';
const adminBetaPanelEnabled = import.meta.env.VITE_ENABLE_ADMIN_BETA_PANEL === 'true';
const localOllamaEnabled = import.meta.env.VITE_ENABLE_LOCAL_OLLAMA === 'true';

export const isPreviewAdminBypassEnabled =
  previewAdminBypassEnabled && (vercelEnv === 'preview' || import.meta.env.DEV);

export const useLocalAdminMode =
  localAdminEnabled || isPreviewAdminBypassEnabled || !isSupabaseConfigured;

export const isAdminBetaPanelEnabled = adminBetaPanelEnabled && import.meta.env.DEV;
export const isLocalOllamaEnabled = localOllamaEnabled && import.meta.env.DEV;
export const ollamaBaseUrl =
  import.meta.env.VITE_OLLAMA_BASE_URL?.trim() ||
  import.meta.env.OLLAMA_BASE_URL?.trim() ||
  'http://127.0.0.1:11434';
export const ollamaModel =
  import.meta.env.VITE_OLLAMA_MODEL?.trim() ||
  import.meta.env.OLLAMA_MODEL?.trim() ||
  'qwen2.5:3b';
export const ollamaMaxGenerationMs = Number(
  import.meta.env.VITE_OLLAMA_MAX_GENERATION_MS ??
    import.meta.env.OLLAMA_MAX_GENERATION_MS ??
    15000,
);
export const ollamaMaxItemsPerRun = Number(
  import.meta.env.VITE_OLLAMA_MAX_ITEMS_PER_RUN ??
    import.meta.env.OLLAMA_MAX_ITEMS_PER_RUN ??
    3,
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
