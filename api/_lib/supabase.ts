import { createClient } from '@supabase/supabase-js';

function getRequiredEnv(name: 'VITE_SUPABASE_URL') {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable ${name} en el entorno del servidor.`);
  }

  return value;
}

function getPublishableKey() {
  const value =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(
      'Falta la variable VITE_SUPABASE_PUBLISHABLE_KEY en el entorno del servidor.',
    );
  }

  return value;
}

export function getSupabaseServerEnv() {
  return {
    url: getRequiredEnv('VITE_SUPABASE_URL'),
    publishableKey: getPublishableKey(),
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
