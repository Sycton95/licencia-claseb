import { applyEditorialAction, hasV1Schema, saveQuestionWithSchema } from '../_lib/catalogPersistence';
import { requireAdmin } from '../_lib/admin';
import { readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http';
import type { EditorialAction, Question } from '../../src/types/content';

type SaveQuestionBody = {
  question?: Question;
  action?: EditorialAction;
  notes?: string;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Método no permitido.' });
  }

  try {
    const { actorEmail, writeClient } = await requireAdmin(request);
    const body = readJsonBody<SaveQuestionBody>(request);

    if (!body.question || !body.action) {
      return sendJson(response, 400, { error: 'Debes enviar una pregunta y una acción editorial.' });
    }

    const result = applyEditorialAction(body.question, actorEmail, body.action, body.notes);
    const schemaIsV1 = await hasV1Schema(writeClient);
    await saveQuestionWithSchema(writeClient, result.question, result.event, schemaIsV1);

    return sendJson(response, 200, {
      ok: true,
      schema: schemaIsV1 ? 'v1' : 'legacy',
      question: result.question,
      event: result.event,
    });
  } catch (error) {
    return sendJson(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo guardar la pregunta.',
    });
  }
}
