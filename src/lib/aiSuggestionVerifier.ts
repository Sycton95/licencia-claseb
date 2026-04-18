import { buildDraftQuestionFromSuggestion } from './aiSuggestionEngine.js';
import { getSuggestionDiagnostics } from './editorialDiagnostics.js';
import type { ContentCatalog } from '../types/content.js';
import type {
  AiPilotSuggestionRecord,
  AiPilotVerifierIssue,
  AiPilotVerifierStatus,
  AiSuggestion,
} from '../types/ai.js';

function nowIso() {
  return new Date().toISOString();
}

function buildIssue(
  code: AiPilotVerifierIssue['code'],
  severity: AiPilotVerifierIssue['severity'],
  message: string,
  reference?: Pick<AiPilotVerifierIssue, 'referenceTargetId' | 'referenceTargetType'>,
): AiPilotVerifierIssue {
  return {
    code,
    severity,
    message,
    ...reference,
  };
}

function mapDiagnosticCode(category: string): AiPilotVerifierIssue['code'] {
  switch (category) {
    case 'duplicate_prompt':
      return 'duplicate_prompt';
    case 'weak_distractor':
      return 'weak_distractor';
    case 'instruction_mismatch':
      return 'instruction_mismatch';
    case 'answer_format':
      return 'answer_format';
    default:
      return 'invalid_shape';
  }
}

export function verifyAiSuggestion(
  suggestion: AiSuggestion,
  catalog: ContentCatalog,
): Pick<AiPilotSuggestionRecord, 'verifierIssues' | 'verifierStatus'> {
  const issues: AiPilotVerifierIssue[] = [];

  if (!suggestion.prompt.trim()) {
    issues.push(buildIssue('empty_text', 'critical', 'El enunciado generado está vacío.'));
  }

  if (!suggestion.sourceDocumentId || !suggestion.sourceReference.trim()) {
    issues.push(
      buildIssue(
        'missing_grounding',
        'critical',
        'La sugerencia no incluye grounding suficiente para revisión editorial.',
      ),
    );
  }

  if (!suggestion.selectionMode || !['single', 'multiple'].includes(suggestion.selectionMode)) {
    issues.push(
      buildIssue(
        'invalid_selection_mode',
        'critical',
        'La sugerencia no declara un modo de selección válido.',
      ),
    );
  }

  if (!suggestion.instruction?.trim()) {
    issues.push(
      buildIssue(
        'invalid_shape',
        'critical',
        'La sugerencia no incluye una instrucción visible para la pregunta.',
      ),
    );
  }

  if (suggestion.suggestedOptions.length < 2) {
    issues.push(
      buildIssue(
        'invalid_option_count',
        'critical',
        'La sugerencia debe incluir al menos dos alternativas.',
      ),
    );
  }

  if (suggestion.suggestedOptions.some((option) => !option.trim())) {
    issues.push(
      buildIssue(
        'empty_text',
        'critical',
        'Todas las alternativas sugeridas deben tener texto.',
      ),
    );
  }

  if (
    suggestion.suggestedCorrectAnswers.some(
      (answerIndex) =>
        answerIndex < 0 || answerIndex >= suggestion.suggestedOptions.length,
    )
  ) {
    issues.push(
      buildIssue(
        'correct_answer_out_of_range',
        'critical',
        'La sugerencia contiene índices de respuesta correcta fuera de rango.',
      ),
    );
  }

  const draft = buildDraftQuestionFromSuggestion(suggestion, 'pilot-verifier');
  if (!draft && ['new_question', 'rewrite'].includes(suggestion.suggestionType)) {
    issues.push(
      buildIssue(
        'invalid_shape',
        'critical',
        'La sugerencia no puede convertirse en un draft válido.',
      ),
    );
  }

  for (const diagnostic of getSuggestionDiagnostics(suggestion, catalog.questions)) {
    issues.push(
      buildIssue(
        mapDiagnosticCode(diagnostic.category),
        diagnostic.severity,
        diagnostic.detail,
        {
          referenceTargetId: diagnostic.referenceTargetId,
          referenceTargetType: diagnostic.referenceTargetType,
        },
      ),
    );
  }

  const verifierStatus: AiPilotVerifierStatus = issues.some((issue) => issue.severity === 'critical')
    ? 'failed'
    : 'passed';

  return {
    verifierIssues: issues,
    verifierStatus,
  };
}

export function buildPilotSuggestionRecord(
  provider: AiSuggestion['provider'],
  suggestion: AiSuggestion,
  catalog: ContentCatalog,
  rawOutput?: string,
): AiPilotSuggestionRecord {
  const createdAt = nowIso();
  const verification = verifyAiSuggestion(suggestion, catalog);

  return {
    id: `pilot-${suggestion.id}`,
    provider,
    suggestion,
    rawOutput,
    createdAt,
    updatedAt: createdAt,
    ...verification,
  };
}
