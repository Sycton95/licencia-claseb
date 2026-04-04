import {
  createDraftQuestionFromAiSuggestion,
  generateAndPersistAiSuggestions,
  loadAiWorkspace,
  loadCatalogV1,
  markAiSuggestionApplied,
  updateAiSuggestionStatus,
} from '../_lib/aiSuggestions.js';
import { requireAdmin } from '../_lib/admin.js';
import { readJsonBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import type { AiSuggestion } from '../../src/types/ai.js';

type RequestBody = {
  operation?: 'list' | 'generate' | 'transition' | 'createDraft' | 'markApplied';
  suggestionId?: string;
  status?: AiSuggestion['status'];
  reviewNotes?: string;
  questionId?: string;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: 'Método no permitido.' });
  }

  try {
    const { actorEmail, writeClient } = await requireAdmin(request);
    const body = readJsonBody<RequestBody>(request);
    const catalog = await loadCatalogV1(writeClient);
    const editionId = catalog.activeEdition?.id ?? catalog.examRuleSet.editionId;
    const operation = body.operation ?? 'list';

    if (operation === 'list') {
      const workspace = await loadAiWorkspace(writeClient, editionId);
      return sendJson(response, 200, { ok: true, workspace });
    }

    if (operation === 'generate') {
      const workspace = await generateAndPersistAiSuggestions(writeClient, actorEmail);
      return sendJson(response, 200, { ok: true, workspace });
    }

    if (operation === 'transition') {
      if (!body.suggestionId || !body.status) {
        return sendJson(response, 400, { error: 'Debes indicar una sugerencia y un estado.' });
      }

      const suggestion = await updateAiSuggestionStatus(
        writeClient,
        body.suggestionId,
        body.status,
        body.reviewNotes,
      );

      return sendJson(response, 200, { ok: true, suggestion });
    }

    if (operation === 'createDraft') {
      if (!body.suggestionId) {
        return sendJson(response, 400, { error: 'Debes indicar la sugerencia a convertir.' });
      }

      const result = await createDraftQuestionFromAiSuggestion(writeClient, body.suggestionId, actorEmail);

      return sendJson(response, 200, { ok: true, ...result });
    }

    if (operation === 'markApplied') {
      if (!body.suggestionId || !body.questionId) {
        return sendJson(response, 400, { error: 'Debes indicar la sugerencia y la pregunta aplicada.' });
      }

      const suggestion = await markAiSuggestionApplied(writeClient, body.suggestionId, body.questionId);
      return sendJson(response, 200, { ok: true, suggestion });
    }

    return sendJson(response, 400, { error: 'Operación AI no soportada.' });
  } catch (error) {
    return sendJson(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo completar la operación AI.',
    });
  }
}
