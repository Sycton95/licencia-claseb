import type { FoundryDuplicateReviewDecision } from '../types/foundry';

const STORAGE_KEY = 'licencia-claseb-foundry-duplicate-review-v1';

export type FoundryDuplicateReviewWorkspace = {
  decisions: FoundryDuplicateReviewDecision[];
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeWorkspace(
  rawValue: Partial<FoundryDuplicateReviewWorkspace> | null | undefined,
): FoundryDuplicateReviewWorkspace {
  return {
    decisions: Array.isArray(rawValue?.decisions) ? rawValue.decisions : [],
  };
}

export function loadFoundryDuplicateReviewWorkspace(): FoundryDuplicateReviewWorkspace {
  if (!canUseStorage()) {
    return normalizeWorkspace(null);
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return normalizeWorkspace(null);
  }

  try {
    return normalizeWorkspace(
      JSON.parse(rawValue) as Partial<FoundryDuplicateReviewWorkspace>,
    );
  } catch {
    return normalizeWorkspace(null);
  }
}

export function saveFoundryDuplicateReviewWorkspace(
  workspace: FoundryDuplicateReviewWorkspace,
) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

export function upsertFoundryDuplicateDecision(
  decision: FoundryDuplicateReviewDecision,
) {
  const workspace = loadFoundryDuplicateReviewWorkspace();
  const existingIndex = workspace.decisions.findIndex(
    (entry) =>
      entry.runId === decision.runId && entry.clusterId === decision.clusterId,
  );

  if (existingIndex === -1) {
    workspace.decisions.unshift(decision);
  } else {
    workspace.decisions[existingIndex] = decision;
  }

  saveFoundryDuplicateReviewWorkspace(workspace);
  return workspace;
}

export function removeFoundryDuplicateDecision(runId: string, clusterId: string) {
  const workspace = loadFoundryDuplicateReviewWorkspace();
  workspace.decisions = workspace.decisions.filter(
    (entry) => !(entry.runId === runId && entry.clusterId === clusterId),
  );
  saveFoundryDuplicateReviewWorkspace(workspace);
  return workspace;
}
