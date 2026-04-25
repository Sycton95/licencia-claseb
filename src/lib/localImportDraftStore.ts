import type { ImportReviewQuestionRecord } from '../types/importReview';

const STORAGE_KEY = 'licencia-claseb-import-draft-workspace-v1';

export type ImportDraftStageStatus = 'pending' | 'staged' | 'discarded' | 'imported';
export type ImportDraftStageSource = 'actionable' | 'rejected' | 'duplicate';
export type ImportDraftCorrectionSource = 'manual_segment' | 'pdf_selection';

export type ImportDraftGroundingCorrection = {
  replacementText: string;
  source: ImportDraftCorrectionSource;
  page?: number;
  segmentId?: string;
  excerpt?: string;
  updatedAt: string;
};

export type ImportDraftReferenceAsset = {
  assetId: string;
  kind: 'crop' | 'upload';
  name: string;
  mimeType: string;
  byteSize: number;
  page?: number;
  createdAt: string;
  previewDataUrl?: string;
};

export type ImportDraftQueueItem = {
  key: string;
  runId: string;
  externalId: string;
  source: ImportDraftStageSource;
  status: ImportDraftStageStatus;
  addedAt: string;
  updatedAt: string;
  importedQuestionId?: string;
  candidate: ImportReviewQuestionRecord;
  warnings: Array<{ code: string; message: string }>;
  errors: Array<{ code: string; message: string }>;
  correction?: ImportDraftGroundingCorrection;
  assets: ImportDraftReferenceAsset[];
};

export type PreparedImportBatchRecord = {
  id: string;
  runId: string;
  createdAt: string;
  actorEmail: string;
  stagedKeys: string[];
  importedQuestionIds: string[];
  revertedAt?: string;
};

export type ImportDraftWorkspace = {
  queue: ImportDraftQueueItem[];
  preparedBatches: PreparedImportBatchRecord[];
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeWorkspace(rawValue: Partial<ImportDraftWorkspace> | null | undefined): ImportDraftWorkspace {
  return {
    queue: Array.isArray(rawValue?.queue) ? rawValue.queue : [],
    preparedBatches: Array.isArray(rawValue?.preparedBatches) ? rawValue.preparedBatches : [],
  };
}

export function buildImportDraftKey(runId: string, externalId: string) {
  return `${runId}::${externalId}`;
}

export function loadImportDraftWorkspace(): ImportDraftWorkspace {
  if (!canUseStorage()) {
    return normalizeWorkspace(null);
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return normalizeWorkspace(null);
  }

  try {
    return normalizeWorkspace(JSON.parse(rawValue) as Partial<ImportDraftWorkspace>);
  } catch {
    return normalizeWorkspace(null);
  }
}

export function saveImportDraftWorkspace(workspace: ImportDraftWorkspace) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

export function upsertImportDraftItem(nextItem: ImportDraftQueueItem) {
  const workspace = loadImportDraftWorkspace();
  const existingIndex = workspace.queue.findIndex((item) => item.key === nextItem.key);
  if (existingIndex === -1) {
    workspace.queue.unshift(nextItem);
  } else {
    workspace.queue[existingIndex] = nextItem;
  }
  saveImportDraftWorkspace(workspace);
  return workspace;
}

export function updateImportDraftItem(
  key: string,
  updater: (item: ImportDraftQueueItem) => ImportDraftQueueItem,
) {
  const workspace = loadImportDraftWorkspace();
  workspace.queue = workspace.queue.map((item) =>
    item.key === key ? updater(item) : item,
  );
  saveImportDraftWorkspace(workspace);
  return workspace;
}

export function removeImportDraftItem(key: string) {
  const workspace = loadImportDraftWorkspace();
  workspace.queue = workspace.queue.filter((item) => item.key !== key);
  saveImportDraftWorkspace(workspace);
  return workspace;
}

export function recordPreparedImportBatch(batch: PreparedImportBatchRecord) {
  const workspace = loadImportDraftWorkspace();
  workspace.preparedBatches = [batch, ...workspace.preparedBatches];
  saveImportDraftWorkspace(workspace);
  return workspace;
}

export function updatePreparedImportBatch(
  batchId: string,
  updater: (batch: PreparedImportBatchRecord) => PreparedImportBatchRecord,
) {
  const workspace = loadImportDraftWorkspace();
  workspace.preparedBatches = workspace.preparedBatches.map((batch) =>
    batch.id === batchId ? updater(batch) : batch,
  );
  saveImportDraftWorkspace(workspace);
  return workspace;
}
