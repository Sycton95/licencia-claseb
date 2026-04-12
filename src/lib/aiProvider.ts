import { SOURCE_PREPARATION } from '../data/sourcePreparation.js';
import { AI_PILOT_BASELINE_EVALUATION_SET } from '../data/aiPilotEvaluation.js';
import { generateAiSuggestions } from './aiSuggestionEngine.js';
import { runLocalOllamaPilot } from './localOllamaPilot.js';
import type { ContentCatalog, Question } from '../types/content.js';
import type {
  AiPilotRunMode,
  AiPilotWorkspace,
  AiProvider,
  AiWorkspace,
  SourcePreparationChunk,
} from '../types/ai.js';

type ProviderContext = {
  catalog: ContentCatalog;
  actorEmail: string;
};

type PilotProviderContext = ProviderContext & {
  evaluationSetId?: string;
  chunks?: SourcePreparationChunk[];
  questions?: Question[];
  maxItems?: number;
  mode?: AiPilotRunMode;
};

export function generateHeuristicWorkspace({
  catalog,
  actorEmail,
}: ProviderContext): AiWorkspace {
  const result = generateAiSuggestions(catalog, actorEmail);
  const editionId = catalog.activeEdition?.id ?? catalog.examRuleSet.editionId;

  return {
    suggestions: result.suggestions,
    runs: [result.run],
    sourcePreparation: SOURCE_PREPARATION.filter((item) => item.editionId === editionId),
  };
}

export async function generateLocalPilotWorkspace(
  provider: AiProvider,
  {
    catalog,
    actorEmail,
    evaluationSetId,
    chunks,
    questions,
    maxItems,
    mode,
  }: PilotProviderContext,
): Promise<AiPilotWorkspace> {
  switch (provider) {
    case 'ollama_qwen25_3b': {
      const result = await runLocalOllamaPilot(catalog, actorEmail, {
        evaluationSetId,
        provider,
        chunks,
        questions,
        maxItems,
        mode,
      });
      const editionId = catalog.activeEdition?.id ?? catalog.examRuleSet.editionId;

      return {
        evaluationSet: AI_PILOT_BASELINE_EVALUATION_SET,
        reports: [result.report],
        suggestions: result.suggestions,
        runs: [result.run],
        sourcePreparation: SOURCE_PREPARATION.filter((item) => item.editionId === editionId),
      };
    }
    default:
      throw new Error('El proveedor solicitado no tiene un piloto local configurado.');
  }
}
