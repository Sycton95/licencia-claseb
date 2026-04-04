import { checkSupabaseHealth } from './_lib/catalogPersistence.js';
import { sendJson, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { createWriteSupabaseClient, getSupabaseServerEnv } from './_lib/supabase.js';

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    return sendJson(response, 405, { ok: false, error: 'Método no permitido.' });
  }

  try {
    const env = getSupabaseServerEnv();
    const client = createWriteSupabaseClient();
    const health = await checkSupabaseHealth(client);

    return sendJson(response, health.ok ? 200 : 503, {
      ok: health.ok,
      supabaseConfigured: Boolean(env.url && env.publishableKey),
      usesServiceRole: Boolean(env.serviceRoleKey),
      databaseReachable: health.databaseReachable,
      schema: health.schema,
      error: health.error,
    });
  } catch (error) {
    return sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo ejecutar el health check.',
    });
  }
}
