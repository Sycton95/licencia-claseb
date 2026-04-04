import { seedCatalogWithSchema } from '../_lib/catalogPersistence.js';
import { requireAdmin } from '../_lib/admin.js';
import { readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';

type SeedBody = {
  replace?: boolean;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Método no permitido.' });
  }

  try {
    const { writeClient } = await requireAdmin(request);
    const body = readJsonBody<SeedBody>(request);
    const result = await seedCatalogWithSchema(writeClient, Boolean(body.replace));

    return sendJson(response, 200, {
      ok: true,
      ...result,
    });
  } catch (error) {
    return sendJson(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo sembrar el contenido.',
    });
  }
}
