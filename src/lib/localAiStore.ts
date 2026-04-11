import { SOURCE_PREPARATION } from '../data/sourcePreparation';
import type {
  AiPilotRun,
  AiPilotSuggestionRecord,
  AiPilotWorkspace,
  AiRun,
  AiSuggestion,
  AiWorkspace,
} from '../types/ai';

const STORAGE_KEY = 'licencia-claseb-ai-workspace-v1';
const BETA_STORAGE_KEY = 'licencia-claseb-ai-beta-workspace-v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeWorkspace(rawWorkspace: Partial<AiWorkspace>): AiWorkspace {
  return {
    suggestions: rawWorkspace.suggestions ?? [],
    runs: rawWorkspace.runs ?? [],
    sourcePreparation: rawWorkspace.sourcePreparation ?? SOURCE_PREPARATION,
  };
}

function normalizeBetaWorkspace(rawWorkspace: Partial<AiPilotWorkspace>): AiPilotWorkspace {
  return {
    suggestions: rawWorkspace.suggestions ?? [],
    runs: rawWorkspace.runs ?? [],
    sourcePreparation: rawWorkspace.sourcePreparation ?? SOURCE_PREPARATION,
  };
}

export function loadLocalAiWorkspace(): AiWorkspace {
  if (!canUseStorage()) {
    return normalizeWorkspace({});
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return normalizeWorkspace({});
  }

  try {
    return normalizeWorkspace(JSON.parse(rawValue) as Partial<AiWorkspace>);
  } catch {
    return normalizeWorkspace({});
  }
}

export function saveLocalAiWorkspace(workspace: AiWorkspace) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

export function upsertLocalAiSuggestions(suggestions: AiSuggestion[]) {
  const workspace = loadLocalAiWorkspace();
  const nextSuggestions = [...workspace.suggestions];

  for (const suggestion of suggestions) {
    const index = nextSuggestions.findIndex((item) => item.id === suggestion.id);

    if (index >= 0) {
      nextSuggestions[index] = suggestion;
    } else {
      nextSuggestions.unshift(suggestion);
    }
  }

  saveLocalAiWorkspace({
    ...workspace,
    suggestions: nextSuggestions,
  });
}

export function upsertLocalAiRun(run: AiRun) {
  const workspace = loadLocalAiWorkspace();
  const nextRuns = [run, ...workspace.runs.filter((item) => item.id !== run.id)];

  saveLocalAiWorkspace({
    ...workspace,
    runs: nextRuns,
  });
}

export function updateLocalAiSuggestion(
  suggestionId: string,
  updater: (current: AiSuggestion) => AiSuggestion,
) {
  const workspace = loadLocalAiWorkspace();

  saveLocalAiWorkspace({
    ...workspace,
    suggestions: workspace.suggestions.map((suggestion) =>
      suggestion.id === suggestionId ? updater(suggestion) : suggestion,
    ),
  });
}

export function loadLocalAiBetaWorkspace(): AiPilotWorkspace {
  if (!canUseStorage()) {
    return normalizeBetaWorkspace({});
  }

  const rawValue = window.localStorage.getItem(BETA_STORAGE_KEY);

  if (!rawValue) {
    return normalizeBetaWorkspace({});
  }

  try {
    return normalizeBetaWorkspace(JSON.parse(rawValue) as Partial<AiPilotWorkspace>);
  } catch {
    return normalizeBetaWorkspace({});
  }
}

export function saveLocalAiBetaWorkspace(workspace: AiPilotWorkspace) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(BETA_STORAGE_KEY, JSON.stringify(workspace));
}

export function upsertLocalAiPilotSuggestions(suggestions: AiPilotSuggestionRecord[]) {
  const workspace = loadLocalAiBetaWorkspace();
  const nextSuggestions = [...workspace.suggestions];

  for (const suggestion of suggestions) {
    const index = nextSuggestions.findIndex((item) => item.id === suggestion.id);

    if (index >= 0) {
      nextSuggestions[index] = suggestion;
    } else {
      nextSuggestions.unshift(suggestion);
    }
  }

  saveLocalAiBetaWorkspace({
    ...workspace,
    suggestions: nextSuggestions,
  });
}

export function upsertLocalAiPilotRun(run: AiPilotRun) {
  const workspace = loadLocalAiBetaWorkspace();
  const nextRuns = [run, ...workspace.runs.filter((item) => item.id !== run.id)];

  saveLocalAiBetaWorkspace({
    ...workspace,
    runs: nextRuns,
  });
}

export function removeLocalAiPilotSuggestion(suggestionId: string) {
  const workspace = loadLocalAiBetaWorkspace();

  saveLocalAiBetaWorkspace({
    ...workspace,
    suggestions: workspace.suggestions.filter((suggestion) => suggestion.id !== suggestionId),
  });
}
