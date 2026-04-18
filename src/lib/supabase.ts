import { createClient } from '@supabase/supabase-js';
import { getLocalOllamaRuntimeConfig } from './ollamaRuntimeConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const vercelEnv = import.meta.env.VITE_VERCEL_ENV?.trim().toLowerCase();
const localAdminEnabled = import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true';
const previewAdminBypassEnabled = import.meta.env.VITE_ENABLE_PREVIEW_ADMIN_BYPASS === 'true';
const adminBetaPanelEnabled = import.meta.env.VITE_ENABLE_ADMIN_BETA_PANEL === 'true';
const localOllamaEnabled = import.meta.env.VITE_ENABLE_LOCAL_OLLAMA === 'true';
const ollamaRuntimeConfig = getLocalOllamaRuntimeConfig();

export const isPreviewAdminBypassEnabled =
  previewAdminBypassEnabled && (vercelEnv === 'preview' || import.meta.env.DEV);

export const useLocalAdminMode =
  localAdminEnabled || isPreviewAdminBypassEnabled || !isSupabaseConfigured;

export const isAdminBetaPanelEnabled = adminBetaPanelEnabled && import.meta.env.DEV;
export const isLocalOllamaEnabled = localOllamaEnabled && import.meta.env.DEV;
export const ollamaBaseUrl = ollamaRuntimeConfig.baseUrl;
export const ollamaModel = ollamaRuntimeConfig.model;
export const ollamaMaxGenerationMs = ollamaRuntimeConfig.maxGenerationMs;
export const ollamaMaxItemsPerRun = ollamaRuntimeConfig.maxItemsPerRun;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
