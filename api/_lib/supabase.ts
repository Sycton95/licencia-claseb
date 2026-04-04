import { createClient } from '@supabase/supabase-js';

function getRequiredEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY') {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable ${name} en el entorno del servidor.`);
  }

  return value;
}

export function getSupabaseServerEnv() {
  return {
    url: getRequiredEnv('VITE_SUPABASE_URL'),
    publishableKey: getRequiredEnv('VITE_SUPABASE_ANON_KEY'),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function createUserScopedSupabaseClient(accessToken: string) {
  const { url, publishableKey } = getSupabaseServerEnv();

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function createWriteSupabaseClient(accessToken?: string) {
  const { url, publishableKey, serviceRoleKey } = getSupabaseServerEnv();
  const key = serviceRoleKey ?? publishableKey;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global:
      serviceRoleKey || !accessToken
        ? undefined
        : {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
  });
}
