import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const vercelEnv = import.meta.env.VITE_VERCEL_ENV?.trim().toLowerCase();
const localAdminEnabled = import.meta.env.VITE_ENABLE_LOCAL_ADMIN === 'true';
const previewAdminBypassEnabled = import.meta.env.VITE_ENABLE_PREVIEW_ADMIN_BYPASS === 'true';

export const isPreviewAdminBypassEnabled =
  previewAdminBypassEnabled && (vercelEnv === 'preview' || import.meta.env.DEV);

export const useLocalAdminMode =
  localAdminEnabled || isPreviewAdminBypassEnabled || !isSupabaseConfigured;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
