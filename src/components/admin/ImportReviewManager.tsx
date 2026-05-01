import { useEffect, useMemo, useState } from 'react';
import { AdminButton } from './AdminButton';
import { AdminCard } from './AdminCard';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminImportPdfWorkspace } from './AdminImportPdfWorkspace';
import { AdminPanel } from './AdminPanel';
import { AdminTooltip } from './AdminTooltip';
import { loadImportReviewAcceptedCandidates } from '../../data/importReviewAcceptedCandidates';
import { loadManualKnowledgeChapter } from '../../data/manualKnowledgeChapters';
import { MANUAL_KNOWLEDGE_INDEX } from '../../data/manualKnowledgeIndex';
import { loadImportReviewRunDetail } from '../../data/importReviewRunDetails';
import {
  importDraftBatchToLocalCatalog,
  revertPreparedImportBatch,
} from '../../lib/importDraftRepository';
import {
  buildImportDraftKey,
  loadImportDraftWorkspace,
  recordPreparedImportBatch,
  removeImportDraftItem,
  type ImportDraftQueueItem,
  type ImportDraftStageSource,
  type ImportDraftWorkspace,
  type PreparedImportBatchRecord,
  updateImportDraftItem,
  updatePreparedImportBatch,
  upsertImportDraftItem,
} from '../../lib/localImportDraftStore';
import { deleteImportDraftAsset, saveImportDraftAsset } from '../../lib/localImportDraftAssetStore';
import type {
  ImportReviewIssue,
  ImportReviewIssueAggregate,
  ImportReviewManifest,
  ImportReviewQuestionRecord,
  ImportReviewQuestionSnapshot,
  ImportReviewRejectedCandidate,
  ImportReviewRunDetail,
  ImportReviewRunManifestSummary,
  VersionedManualChapterSegments,
} from '../../types/importReview';
import type { ContentCatalog, SourceDocument } from '../../types/content';
import type { PdfGroundingAnchor, PdfRect } from '../../types/pdfReview';

type Props = {
  manifest: ImportReviewManifest;
  onOpenReference?: (questionId: string) => void;
  onOpenCatalogQuestion: (questionId: string) => void;
  onCatalogUpdated: (catalog: ContentCatalog) => void;
  catalog: ContentCatalog | null;
  sourceDocuments: SourceDocument[];
  actorEmail: string;
};

type RunDetailTab = 'overview' | 'actionable' | 'rejected' | 'duplicates';

const TAB_LABELS: Array<{ id: RunDetailTab; label: string }> = [
  { id: 'overview', label: 'Resumen' },
  { id: 'actionable', label: 'Aceptados con advertencia' },
  { id: 'rejected', label: 'Rechazados' },
  { id: 'duplicates', label: 'Duplicados' },
];

const MANUAL_SOURCE_DOCUMENT_ID = 'manual-claseb-2026';

const ISSUE_CODE_EXPLANATIONS: Record<string, string> = {
  invalid_source_page: 'La pagina indicada fue corregida automaticamente o requiere revision.',
  invalid_source_page_range: 'El rango de paginas informado no es valido.',
  chapter_scope_mismatch: 'La referencia final no coincide con el capitulo asignado.',
  batch_chapter_mismatch: 'La pregunta quedo asociada a otro capitulo durante la revision.',
  batch_chapter_mismatch_repaired: 'La pregunta fue corregida a otro capitulo segun el grounding.',
  missing_grounding_excerpt: 'No se encontro un excerpt manual suficiente para justificar la pregunta.',
  manual_fact_conflict: 'La respuesta contradice un dato critico del manual.',
  manual_fact_auxiliary_warning: 'El texto auxiliar contiene un dato que no coincide con el manual.',
  referenced_duplicate_in_batch: 'La candidata fue desplazada por otra mejor dentro del mismo lote de importacion.',
  duplicate_prompt_existing_bank: 'El prompt es demasiado similar a una pregunta ya existente en el banco revisado.',
  near_duplicate_prompt_existing_bank: 'La pregunta es muy parecida a una ya existente en el banco.',
  duplicate_prompt_reviewed_import: 'La pregunta ya fue vista en otra corrida de importacion revisada.',
  near_duplicate_prompt_reviewed_import: 'La pregunta es muy parecida a otra ya revisada.',
  metadata_auto_repaired: 'Los metadatos fueron corregidos automaticamente usando el grounding.',
  needs_visual_audit: 'La pregunta requiere revision visual porque el texto puede no ser suficiente.',
  reduced_option_count: 'Pregunta con formato reducido de 3 alternativas.',
  non_standard_option_count: 'La cantidad de alternativas requiere revision manual.',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPercent(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${Math.round(value * 100)}%`;
}

function renderOptionList(options?: string[], selectedIndexes?: number[]) {
  if (!Array.isArray(options) || options.length === 0) {
    return <p className="text-sm text-slate-500">Sin opciones registradas.</p>;
  }

  const selected = new Set(selectedIndexes ?? []);
  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div
          key={`${index}-${option}`}
          className={`rounded-lg border px-3 py-2 text-sm ${
            selected.has(index)
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          <span className="mr-2 font-semibold text-slate-500">{String.fromCharCode(65 + index)}.</span>
          {option}
        </div>
      ))}
    </div>
  );
}

function getIssueTooltip(issue: Pick<ImportReviewIssueAggregate, 'code' | 'message'>) {
  return ISSUE_CODE_EXPLANATIONS[issue.code] ?? issue.message ?? 'Codigo de validacion sin descripcion adicional.';
}

function aggregateIssues(
  rejectedCandidates: ImportReviewRejectedCandidate[],
  issueKey: 'errors' | 'warnings',
): ImportReviewIssueAggregate[] {
  const byCode = new Map<string, ImportReviewIssueAggregate>();

  rejectedCandidates.forEach((candidate) => {
    candidate[issueKey].forEach((issue) => {
      const current = byCode.get(issue.code);
      if (current) {
        current.count += 1;
        current.externalIds.push(candidate.externalId);
        if (!current.message && (issue.localizedMessage || issue.message)) {
          current.message = issue.localizedMessage || issue.message;
        }
      } else {
        byCode.set(issue.code, {
          code: issue.code,
          count: 1,
          message: issue.localizedMessage || issue.message,
          externalIds: [candidate.externalId],
        });
      }
    });
  });

  return Array.from(byCode.values()).sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
}

function groupCandidateIssues(issues: ImportReviewIssue[]): ImportReviewIssueAggregate[] {
  const byCode = new Map<string, ImportReviewIssueAggregate>();

  issues.forEach((issue) => {
    const current = byCode.get(issue.code);
    if (current) {
      current.count += 1;
    } else {
      byCode.set(issue.code, {
        code: issue.code,
        count: 1,
        message: issue.localizedMessage || issue.message,
        externalIds: [],
      });
    }
  });

  return Array.from(byCode.values()).sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
}

function issueCountFromRejected(rejectedCandidates: ImportReviewRejectedCandidate[], issueKey: 'errors' | 'warnings') {
  return rejectedCandidates.reduce((total, candidate) => total + candidate[issueKey].length, 0);
}

function getManualChapterLabel(
  chapterId: string | undefined,
  chapterOptions: Array<{ chapterId: string; label: string; pageRange: { start: number; end: number } }>,
) {
  if (!chapterId) {
    return 'Sin capitulo';
  }

  return chapterOptions.find((option) => option.chapterId === chapterId)?.label ?? chapterId;
}

function getCandidateManualPage(candidate: ImportReviewQuestionRecord | null | undefined) {
  return candidate?.sourcePageStart ?? candidate?.sourcePageEnd;
}

type ActionableItem = {
  summary: ImportReviewRunDetail['autoGroundedAccepted'][number];
  candidate: ImportReviewQuestionRecord | null;
};

type PdfWorkspaceRequest = {
  documentId: string;
  page?: number;
  excerpt?: string;
  textAnchor?: PdfGroundingAnchor['textAnchor'];
  bbox?: PdfRect | null;
  bboxSource?: string;
  title?: string;
  subtitle?: string;
  itemKey?: string;
  allowDraftTools?: boolean;
};

function buildDraftMessages(candidate: ImportReviewQuestionRecord, warnings: ImportReviewIssue[] = []) {
  const messages = warnings.map((warning) => ({
    code: warning.code,
    message: warning.localizedMessage || warning.message,
  }));

  if (candidate.needsVisualAudit) {
    messages.push({
      code: 'needs_visual_audit',
      message: ISSUE_CODE_EXPLANATIONS.needs_visual_audit,
    });
  }

  if (candidate.metadataRepair?.applied) {
    messages.push({
      code: 'metadata_auto_repaired',
      message: ISSUE_CODE_EXPLANATIONS.metadata_auto_repaired,
    });
  }

  if (candidate.groundingAudit?.productionDisposition === 'usable_winner_low_confidence') {
    messages.push({
      code: 'auto_grounded_low_confidence',
      message: 'Grounding usable con baja confianza; requiere revision humana.',
    });
  }

  return messages;
}

function getDraftStatusLabel(status: ImportDraftQueueItem['status']) {
  switch (status) {
    case 'staged':
      return 'En lote';
    case 'discarded':
      return 'Descartada';
    case 'imported':
      return 'Importada';
    default:
      return 'Pendiente';
  }
}

function findDraftItemByExternalId(draftItemByKey: Map<string, ImportDraftQueueItem>, externalId: string) {
  return Array.from(draftItemByKey.values()).find((item) => item.externalId === externalId) ?? null;
}

function buildQuestionRecordFromSnapshot(
  externalId: string,
  snapshot: ImportReviewQuestionSnapshot,
): ImportReviewQuestionRecord {
  return {
    externalId,
    prompt: snapshot.prompt,
    selectionMode: 'single',
    instruction: 'Seleccione una respuesta.',
    options: (snapshot.options ?? []).map((text) => ({ text })),
    correctOptionIndexes: snapshot.correctOptionIndexes ?? [],
    publicExplanation: snapshot.publicExplanation ?? '',
    sourcePageStart: snapshot.sourcePageStart,
    sourcePageEnd: snapshot.sourcePageEnd,
    sourceReference: snapshot.sourceReference ?? '',
    groundingExcerpt: '',
    reviewNotes: 'Recuperada desde cluster de duplicados para revision manual.',
    tags: [],
    chapterId: snapshot.chapterId ?? 'chapter-1',
    manualFactRefs: [],
    manualCitationRefs: [],
    reviewDisposition: 'accepted_with_warning',
    groundingMode: 'missing',
    autoGroundingConfidence: 0,
    extractedEntities: [],
    needsVisualAudit: false,
  };
}

export function ImportReviewManager({
  manifest,
  onOpenReference,
  onOpenCatalogQuestion,
  onCatalogUpdated,
  catalog,
  sourceDocuments,
  actorEmail,
}: Props) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(manifest.runs[0]?.runId ?? null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedActionableId, setSelectedActionableId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<RunDetailTab>('overview');
  const [runDetail, setRunDetail] = useState<ImportReviewRunDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [acceptedCandidates, setAcceptedCandidates] = useState<ImportReviewQuestionRecord[] | null>(null);
  const [isLoadingAcceptedCandidates, setIsLoadingAcceptedCandidates] = useState(false);
  const [expandedErrorCode, setExpandedErrorCode] = useState<string | null>(null);
  const [expandedWarningCode, setExpandedWarningCode] = useState<string | null>(null);
  const [selectedManualChapterId, setSelectedManualChapterId] = useState<string>(
    MANUAL_KNOWLEDGE_INDEX.chapters[0]?.chapterId ?? 'chapter-1',
  );
  const [manualChapter, setManualChapter] = useState<VersionedManualChapterSegments | null>(null);
  const [isLoadingManualChapter, setIsLoadingManualChapter] = useState(false);
  const [selectedManualSegmentId, setSelectedManualSegmentId] = useState<string | null>(null);
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);
  const [draftWorkspace, setDraftWorkspace] = useState<ImportDraftWorkspace>(() => loadImportDraftWorkspace());
  const [isPrepareModalOpen, setIsPrepareModalOpen] = useState(false);
  const [pdfWorkspaceRequest, setPdfWorkspaceRequest] = useState<PdfWorkspaceRequest | null>(null);
  const [snapshotDrawerState, setSnapshotDrawerState] = useState<{
    title: string;
    subtitle?: string;
    snapshot: ImportReviewQuestionSnapshot | null;
  } | null>(null);
  const [actionableSearch, setActionableSearch] = useState('');
  const [actionableChapterFilter, setActionableChapterFilter] = useState('all');
  const [actionableBatchFilter, setActionableBatchFilter] = useState<'all' | 'staged' | 'imported' | 'pending'>('all');
  const [rejectedSearch, setRejectedSearch] = useState('');
  const [rejectedChapterFilter, setRejectedChapterFilter] = useState('all');
  const [rejectedReasonFilter, setRejectedReasonFilter] = useState('all');
  const [rejectedBatchFilter, setRejectedBatchFilter] = useState<'all' | 'staged' | 'imported' | 'pending'>('all');
  const [rejectedVisualFilter, setRejectedVisualFilter] = useState<'all' | 'visual' | 'text'>('all');
  const [duplicateSearch, setDuplicateSearch] = useState('');
  const [duplicateBatchFilter, setDuplicateBatchFilter] = useState<'all' | 'staged' | 'imported' | 'pending'>('all');

  useEffect(() => {
    setSelectedRunId((current) => current ?? manifest.runs[0]?.runId ?? null);
  }, [manifest.runs]);

  const selectedRun = useMemo(
    () => manifest.runs.find((run) => run.runId === selectedRunId) ?? manifest.runs[0] ?? null,
    [manifest.runs, selectedRunId],
  );

  useEffect(() => {
    if (!selectedRun) {
      setRunDetail(null);
      return;
    }

    let isCancelled = false;
    setIsLoadingDetail(true);
    void loadImportReviewRunDetail(selectedRun.runId).then((detail) => {
      if (!isCancelled) {
        setRunDetail(detail);
        setIsLoadingDetail(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedRun]);

  useEffect(() => {
    if (!runDetail) {
      setSelectedCandidateId(null);
      return;
    }

    setSelectedCandidateId((current) =>
      runDetail.rejectedCandidates.some((candidate) => candidate.externalId === current)
        ? current
        : runDetail.rejectedCandidates[0]?.externalId ?? null,
    );
  }, [runDetail]);

  useEffect(() => {
    setSelectedTab('overview');
    setAcceptedCandidates(null);
    setIsLoadingAcceptedCandidates(false);
    setExpandedErrorCode(null);
    setExpandedWarningCode(null);
    setSelectedManualChapterId(MANUAL_KNOWLEDGE_INDEX.chapters[0]?.chapterId ?? 'chapter-1');
    setManualChapter(null);
    setIsLoadingManualChapter(false);
    setSelectedManualSegmentId(null);
    setSelectedActionableId(null);
    setIsManualDrawerOpen(false);
    setPdfWorkspaceRequest(null);
    setSnapshotDrawerState(null);
  }, [selectedRunId]);

  useEffect(() => {
    if (!selectedRun || selectedTab !== 'actionable' || acceptedCandidates) {
      return;
    }

    let isCancelled = false;
    setIsLoadingAcceptedCandidates(true);
    void loadImportReviewAcceptedCandidates(selectedRun.runId).then((candidates) => {
      if (!isCancelled) {
        setAcceptedCandidates(candidates);
        setIsLoadingAcceptedCandidates(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [acceptedCandidates, selectedRun, selectedTab]);

  useEffect(() => {
    let isCancelled = false;
    setIsLoadingManualChapter(true);
    void loadManualKnowledgeChapter(selectedManualChapterId).then((chapter) => {
      if (!isCancelled) {
        setManualChapter(chapter);
        setSelectedManualSegmentId((current) =>
          chapter?.segments.some((segment) => segment.id === current) ? current : chapter?.segments[0]?.id ?? null,
        );
        setIsLoadingManualChapter(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedManualChapterId]);

  const selectedCandidate = useMemo(
    () =>
      runDetail?.rejectedCandidates.find((candidate) => candidate.externalId === selectedCandidateId) ??
      runDetail?.rejectedCandidates[0] ??
      null,
    [selectedCandidateId, runDetail],
  );

  const aggregatedErrors = useMemo(
    () => (runDetail ? aggregateIssues(runDetail.rejectedCandidates, 'errors') : []),
    [runDetail],
  );
  const aggregatedWarnings = useMemo(
    () => (runDetail ? aggregateIssues(runDetail.rejectedCandidates, 'warnings') : []),
    [runDetail],
  );

  const actionableItems = useMemo<ActionableItem[]>(() => {
    if (!runDetail) {
      return [];
    }

    const acceptedWithWarningById = new Map(
      (acceptedCandidates ?? [])
        .filter((candidate) => candidate.reviewDisposition === 'accepted_with_warning')
        .map((candidate) => [candidate.externalId, candidate] as const),
    );

    return runDetail.autoGroundedAccepted.map((item) => ({
      summary: item,
      candidate: acceptedWithWarningById.get(item.externalId) ?? null,
    }));
  }, [acceptedCandidates, runDetail]);

  useEffect(() => {
    if (selectedTab !== 'actionable') {
      return;
    }

    setSelectedActionableId((current) =>
      actionableItems.some((item) => item.summary.externalId === current)
        ? current
        : actionableItems[0]?.summary.externalId ?? null,
    );
  }, [actionableItems, selectedTab]);

  const selectedActionableItem = useMemo(
    () =>
      actionableItems.find((item) => item.summary.externalId === selectedActionableId) ??
      actionableItems[0] ??
      null,
    [actionableItems, selectedActionableId],
  );

  const currentRunDraftItems = useMemo(
    () =>
      selectedRun ? draftWorkspace.queue.filter((item) => item.runId === selectedRun.runId) : [],
    [draftWorkspace.queue, selectedRun],
  );

  const currentRunDraftItemByKey = useMemo(
    () => new Map(currentRunDraftItems.map((item) => [item.key, item] as const)),
    [currentRunDraftItems],
  );

  const latestPreparedBatch = useMemo(
    () =>
      selectedRun
        ? draftWorkspace.preparedBatches.find(
            (batch) => batch.runId === selectedRun.runId && !batch.revertedAt,
          ) ?? null
        : null,
    [draftWorkspace.preparedBatches, selectedRun],
  );

  const syncWorkspace = (workspace: ImportDraftWorkspace) => {
    setDraftWorkspace(workspace);
  };

  const stageCandidate = (
    candidate: ImportReviewQuestionRecord,
    source: ImportDraftStageSource,
    warnings: ImportReviewIssue[] = [],
    errors: ImportReviewIssue[] = [],
  ) => {
    if (!selectedRun) {
      return null;
    }

    const key = buildImportDraftKey(selectedRun.runId, candidate.externalId);
    const existing = currentRunDraftItemByKey.get(key);
    const nextItem: ImportDraftQueueItem = {
      key,
      runId: selectedRun.runId,
      externalId: candidate.externalId,
      source,
      status: existing?.status === 'imported' ? 'imported' : 'staged',
      addedAt: existing?.addedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      importedQuestionId: existing?.importedQuestionId,
      candidate,
      warnings: buildDraftMessages(candidate, warnings),
      errors: errors.map((error) => ({ code: error.code, message: error.localizedMessage || error.message })),
      correction: existing?.correction,
      assets: existing?.assets ?? [],
    };
    syncWorkspace(upsertImportDraftItem(nextItem));
    return key;
  };

  const updateDraftItem = (
    key: string,
    updater: (item: ImportDraftQueueItem) => ImportDraftQueueItem,
  ) => {
    syncWorkspace(updateImportDraftItem(key, updater));
  };

  const openPdfWorkspace = (
    request: Omit<PdfWorkspaceRequest, 'documentId'> & { documentId?: string },
    candidate?: ImportReviewQuestionRecord,
    source: ImportDraftStageSource = 'actionable',
    warnings: ImportReviewIssue[] = [],
    errors: ImportReviewIssue[] = [],
  ) => {
    const key =
      candidate && selectedRun
        ? stageCandidate(candidate, source, warnings, errors)
        : request.itemKey ?? undefined;
    setPdfWorkspaceRequest({
      ...request,
      documentId: request.documentId ?? MANUAL_SOURCE_DOCUMENT_ID,
      itemKey: key ?? request.itemKey,
      allowDraftTools: true,
    });
  };

  const handleApplyPdfSelection = (payload: { text: string; page: number; excerpt?: string }) => {
    if (!pdfWorkspaceRequest?.itemKey || !payload.text.trim()) {
      return;
    }

    updateDraftItem(pdfWorkspaceRequest.itemKey, (item) => ({
      ...item,
      status: item.status === 'imported' ? 'imported' : 'staged',
      updatedAt: new Date().toISOString(),
      correction: {
        replacementText: payload.text.trim(),
        source: 'pdf_selection',
        page: payload.page,
        excerpt: payload.excerpt,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const handleSaveDraftAsset = async (payload: {
    blob: Blob;
    kind: 'crop' | 'upload';
    page?: number;
    name: string;
    previewDataUrl?: string;
  }) => {
    if (!pdfWorkspaceRequest?.itemKey) {
      return;
    }

    const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await saveImportDraftAsset({
      id: assetId,
      kind: payload.kind,
      name: payload.name,
      mimeType: payload.blob.type || 'image/webp',
      byteSize: payload.blob.size,
      createdAt: new Date().toISOString(),
      page: payload.page,
      previewDataUrl: payload.previewDataUrl,
      blob: payload.blob,
    });

    updateDraftItem(pdfWorkspaceRequest.itemKey, (item) => ({
      ...item,
      status: item.status === 'imported' ? 'imported' : 'staged',
      updatedAt: new Date().toISOString(),
      assets: [
        ...item.assets,
        {
          assetId,
          kind: payload.kind,
          name: payload.name,
          mimeType: payload.blob.type || 'image/webp',
          byteSize: payload.blob.size,
          page: payload.page,
          createdAt: new Date().toISOString(),
          previewDataUrl: payload.previewDataUrl,
        },
      ].slice(0, 3),
    }));
  };

  const openManualDrawer = (chapterId?: string, segmentId?: string | null) => {
    if (chapterId) {
      setSelectedManualChapterId(chapterId);
    }
    if (segmentId) {
      setSelectedManualSegmentId(segmentId);
    }
    setIsManualDrawerOpen(true);
  };

  const openSnapshotDrawer = (title: string, subtitle: string | undefined, snapshot: ImportReviewQuestionSnapshot | null) => {
    if (!snapshot) {
      return;
    }
    setSnapshotDrawerState({ title, subtitle, snapshot });
  };

  const stagedItems = currentRunDraftItems.filter((item) => item.status === 'staged');
  const selectedPdfSourceDocument =
    sourceDocuments.find((document) => document.id === (pdfWorkspaceRequest?.documentId ?? MANUAL_SOURCE_DOCUMENT_ID)) ?? null;

  const handleImportStagedBatch = async () => {
    if (!selectedRun || !catalog || stagedItems.length === 0) {
      return;
    }

    const { catalog: updatedCatalog, preparedBatch } = await importDraftBatchToLocalCatalog({
      catalog,
      runId: selectedRun.runId,
      sourceFile: selectedRun.sourceFile,
      actorEmail,
      items: stagedItems,
    });
    let workspace = recordPreparedImportBatch(preparedBatch);
    workspace = {
      ...workspace,
      queue: workspace.queue.map((item) =>
        preparedBatch.stagedKeys.includes(item.key)
          ? {
              ...item,
              status: 'imported',
              importedQuestionId:
                preparedBatch.importedQuestionIds[
                  preparedBatch.stagedKeys.indexOf(item.key)
                ] ?? item.importedQuestionId,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    };
    syncWorkspace(workspace);
    onCatalogUpdated(updatedCatalog);
    setIsPrepareModalOpen(false);
  };

  const handleUndoLastBatch = async () => {
    if (!catalog || !latestPreparedBatch) {
      return;
    }

    const updatedCatalog = await revertPreparedImportBatch({
      catalog,
      batch: latestPreparedBatch,
      actorEmail,
    });
    let workspace = updatePreparedImportBatch(latestPreparedBatch.id, (batch) => ({
      ...batch,
      revertedAt: new Date().toISOString(),
    }));
    workspace = {
      ...workspace,
      queue: workspace.queue.map((item) =>
        latestPreparedBatch.stagedKeys.includes(item.key)
          ? {
              ...item,
              status: 'staged',
              importedQuestionId: undefined,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    };
    syncWorkspace(workspace);
    onCatalogUpdated(updatedCatalog);
  };

  if (manifest.runs.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:p-6">
        <AdminEmptyState
          title="Sin corridas de import review"
          message="Ejecuta el CLI review:import para generar manifest, run-details y artefactos por corrida."
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
      <ImportReviewHeader
        generatedAt={manifest.generatedAt}
        runs={manifest.runs}
        selectedRunId={selectedRun?.runId ?? null}
        selectedTab={selectedTab}
        stagedCount={stagedItems.length}
        latestPreparedBatch={latestPreparedBatch}
        onSelectRun={setSelectedRunId}
        onSelectTab={setSelectedTab}
        onOpenPrepareModal={() => setIsPrepareModalOpen(true)}
        onUndoLastBatch={() => void handleUndoLastBatch()}
      />

      <div className="mt-4 flex min-h-0 flex-1 overflow-hidden">
        {selectedRun ? (
          isLoadingDetail ? (
            <AdminCard className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-500">
              Cargando detalle de corrida...
            </AdminCard>
          ) : !runDetail ? (
            <AdminCard className="flex min-h-[320px] flex-1 items-center justify-center">
              <AdminEmptyState
                title="Sin run-details"
                message="No se encontro el archivo run-details.json para esta corrida."
                className="border-0 bg-transparent py-8"
              />
            </AdminCard>
          ) : (
            <>
              {selectedTab === 'overview' ? (
                <OverviewTab
                  run={selectedRun}
                  rejectedCandidates={runDetail.rejectedCandidates}
                  aggregatedErrors={aggregatedErrors}
                  aggregatedWarnings={aggregatedWarnings}
                  expandedErrorCode={expandedErrorCode}
                  expandedWarningCode={expandedWarningCode}
                  onToggleErrorCode={(code) => setExpandedErrorCode((current) => (current === code ? null : code))}
                  onToggleWarningCode={(code) =>
                    setExpandedWarningCode((current) => (current === code ? null : code))
                  }
                />
              ) : null}

              {selectedTab === 'actionable' ? (
                <ActionableTab
                  isLoading={isLoadingAcceptedCandidates}
                  items={actionableItems}
                  selectedItem={selectedActionableItem}
                  selectedItemId={selectedActionableId}
                  draftItemByKey={currentRunDraftItemByKey}
                  manualChapterOptions={MANUAL_KNOWLEDGE_INDEX.chapters}
                  search={actionableSearch}
                  chapterFilter={actionableChapterFilter}
                  batchFilter={actionableBatchFilter}
                  onSelectItem={setSelectedActionableId}
                  onBackToList={() => setSelectedActionableId(null)}
                  onSearchChange={setActionableSearch}
                  onChapterFilterChange={setActionableChapterFilter}
                  onBatchFilterChange={setActionableBatchFilter}
                  onStageCandidate={(candidate, warnings) => stageCandidate(candidate, 'actionable', warnings)}
                  onDiscardCandidate={(externalId) =>
                    selectedRun
                      ? syncWorkspace(
                          updateImportDraftItem(buildImportDraftKey(selectedRun.runId, externalId), (item) => ({
                            ...item,
                            status: 'discarded',
                            updatedAt: new Date().toISOString(),
                          })),
                        )
                      : undefined
                  }
                  onOpenManualDrawer={openManualDrawer}
                  onOpenPdfWorkspace={(candidate, summary) =>
                    openPdfWorkspace(
                      {
                        page: getCandidateManualPage(candidate),
                        excerpt: candidate?.groundingExcerpt ?? summary.groundingExcerpt,
                        textAnchor: candidate?.sandboxProvenance?.groundingAnchors?.[0]?.textAnchor,
                        bbox:
                          candidate?.sandboxProvenance?.groundingAnchors?.[0]?.bbox &&
                          typeof candidate.sandboxProvenance.groundingAnchors[0].bbox === 'object'
                            ? (candidate.sandboxProvenance.groundingAnchors[0].bbox as PdfRect)
                            : null,
                        bboxSource: candidate?.sandboxProvenance?.groundingAnchors?.[0]?.bboxSource,
                        title: summary.externalId,
                        subtitle: 'Grounding preliminar para aceptada con advertencia.',
                      },
                      candidate ?? undefined,
                      'actionable',
                      [],
                    )
                  }
                  onOpenCatalogQuestion={onOpenCatalogQuestion}
                  onOpenSnapshot={openSnapshotDrawer}
                />
              ) : null}

              {selectedTab === 'rejected' ? (
                <RejectedTab
                  runDetail={runDetail}
                  selectedCandidate={selectedCandidate}
                  selectedCandidateId={selectedCandidateId}
                  draftItemByKey={currentRunDraftItemByKey}
                  manualChapterOptions={MANUAL_KNOWLEDGE_INDEX.chapters}
                  search={rejectedSearch}
                  chapterFilter={rejectedChapterFilter}
                  reasonFilter={rejectedReasonFilter}
                  batchFilter={rejectedBatchFilter}
                  visualFilter={rejectedVisualFilter}
                  onSelectCandidate={setSelectedCandidateId}
                  onBackToList={() => setSelectedCandidateId(null)}
                  onSearchChange={setRejectedSearch}
                  onChapterFilterChange={setRejectedChapterFilter}
                  onReasonFilterChange={setRejectedReasonFilter}
                  onBatchFilterChange={setRejectedBatchFilter}
                  onVisualFilterChange={setRejectedVisualFilter}
                  onStageCandidate={(candidate) =>
                    stageCandidate(candidate.normalizedQuestion, 'rejected', candidate.warnings, candidate.errors)
                  }
                  onDiscardCandidate={(externalId) =>
                    selectedRun
                      ? syncWorkspace(
                          updateImportDraftItem(buildImportDraftKey(selectedRun.runId, externalId), (item) => ({
                            ...item,
                            status: 'discarded',
                            updatedAt: new Date().toISOString(),
                          })),
                        )
                      : undefined
                  }
                  onOpenManualDrawer={openManualDrawer}
                  onOpenPdfWorkspace={(candidate) =>
                    openPdfWorkspace(
                      {
                        page: getCandidateManualPage(candidate.normalizedQuestion),
                        excerpt: candidate.normalizedQuestion.groundingExcerpt,
                        textAnchor:
                          candidate.normalizedQuestion.sandboxProvenance?.groundingAnchors?.[0]?.textAnchor,
                        bbox:
                          candidate.normalizedQuestion.sandboxProvenance?.groundingAnchors?.[0]?.bbox &&
                          typeof candidate.normalizedQuestion.sandboxProvenance.groundingAnchors[0].bbox === 'object'
                            ? (candidate.normalizedQuestion.sandboxProvenance.groundingAnchors[0].bbox as PdfRect)
                            : null,
                        bboxSource:
                          candidate.normalizedQuestion.sandboxProvenance?.groundingAnchors?.[0]?.bboxSource,
                        title: candidate.externalId,
                        subtitle: 'Revision de rechazo y posible rebatimiento.',
                      },
                      candidate.normalizedQuestion,
                      'rejected',
                      candidate.warnings,
                      candidate.errors,
                    )
                  }
                  onOpenReference={onOpenReference}
                  onOpenSnapshot={openSnapshotDrawer}
                />
              ) : null}

              {selectedTab === 'duplicates' ? (
                <DuplicatesTab
                  runDetail={runDetail}
                  draftItemByKey={currentRunDraftItemByKey}
                  search={duplicateSearch}
                  batchFilter={duplicateBatchFilter}
                  onSearchChange={setDuplicateSearch}
                  onBatchFilterChange={setDuplicateBatchFilter}
                  onStageLoser={(candidate) =>
                    stageCandidate(buildQuestionRecordFromSnapshot(candidate.externalId, candidate.question), 'duplicate')
                  }
                  onDiscardLoser={(externalId) =>
                    selectedRun
                      ? syncWorkspace(
                          updateImportDraftItem(buildImportDraftKey(selectedRun.runId, externalId), (item) => ({
                            ...item,
                            status: 'discarded',
                            updatedAt: new Date().toISOString(),
                          })),
                        )
                      : undefined
                  }
                />
              ) : null}
            </>
          )
        ) : null}
      </div>

      <ManualBrowserDrawer
        isOpen={isManualDrawerOpen}
        chapter={manualChapter}
        chapterId={selectedManualChapterId}
        chapterOptions={MANUAL_KNOWLEDGE_INDEX.chapters}
        isLoading={isLoadingManualChapter}
        selectedSegmentId={selectedManualSegmentId}
        onClose={() => setIsManualDrawerOpen(false)}
        onSelectChapter={setSelectedManualChapterId}
        onSelectSegment={setSelectedManualSegmentId}
        onOpenPdf={(page) =>
          setPdfWorkspaceRequest({
            documentId: MANUAL_SOURCE_DOCUMENT_ID,
            page,
            title: 'Manual 2026',
            subtitle: 'Consulta del manual versionado.',
            allowDraftTools: false,
          })
        }
      />
      <PrepareImportPanel
        isOpen={isPrepareModalOpen}
        selectedRun={selectedRun}
        stagedItems={stagedItems}
        chapterOptions={MANUAL_KNOWLEDGE_INDEX.chapters}
        onClose={() => setIsPrepareModalOpen(false)}
        onImport={() => void handleImportStagedBatch()}
        onClear={() => {
          let workspace = draftWorkspace;
          stagedItems.forEach((item) => {
            workspace = removeImportDraftItem(item.key);
          });
          syncWorkspace(workspace);
          setIsPrepareModalOpen(false);
        }}
      />
      <AdminImportPdfWorkspace
        isOpen={Boolean(pdfWorkspaceRequest)}
        sourceDocument={selectedPdfSourceDocument}
        page={pdfWorkspaceRequest?.page}
        excerpt={pdfWorkspaceRequest?.excerpt}
        textAnchor={pdfWorkspaceRequest?.textAnchor}
        bbox={pdfWorkspaceRequest?.bbox}
        bboxSource={pdfWorkspaceRequest?.bboxSource}
        title={pdfWorkspaceRequest?.title}
        subtitle={pdfWorkspaceRequest?.subtitle}
        allowDraftTools={pdfWorkspaceRequest?.allowDraftTools}
        onClose={() => setPdfWorkspaceRequest(null)}
        onApplySelection={handleApplyPdfSelection}
        onSaveAsset={(payload) => void handleSaveDraftAsset(payload)}
      />
      <SnapshotDrawer
        state={snapshotDrawerState}
        onClose={() => setSnapshotDrawerState(null)}
      />
    </div>
  );
}

function ImportReviewHeader({
  generatedAt,
  runs,
  selectedRunId,
  selectedTab,
  stagedCount,
  latestPreparedBatch,
  onSelectRun,
  onSelectTab,
  onOpenPrepareModal,
  onUndoLastBatch,
}: {
  generatedAt: string;
  runs: ImportReviewRunManifestSummary[];
  selectedRunId: string | null;
  selectedTab: RunDetailTab;
  stagedCount: number;
  latestPreparedBatch: PreparedImportBatchRecord | null;
  onSelectRun: (runId: string) => void;
  onSelectTab: (tab: RunDetailTab) => void;
  onOpenPrepareModal: () => void;
  onUndoLastBatch: () => void;
}) {
  const activeRun = runs.find((run) => run.runId === selectedRunId) ?? runs[0] ?? null;

  return (
    <AdminCard className="shrink-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Import review</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">Workspace de revision</h1>
          <p className="mt-1 text-sm text-slate-600">Manifest generado {formatDate(generatedAt)}</p>
        </div>

        <div className="grid gap-3 lg:min-w-[420px]">
          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" htmlFor="run-selector">
            Corrida activa
          </label>
          <select
            id="run-selector"
            value={selectedRunId ?? ''}
            onChange={(event) => onSelectRun(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          >
            {runs.map((run) => (
              <option key={run.runId} value={run.runId}>
                {run.runId} · {run.sourceFile}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeRun ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {activeRun.acceptedCount} aceptadas
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700">
              {activeRun.acceptedWithWarningCount} con advertencia
            </span>
            <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">
              {activeRun.rejectedCount} rechazadas
            </span>
            <span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-700">
              {activeRun.duplicateClusterCount} clusters
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" size="sm" onClick={onOpenPrepareModal}>
              Preparar importacion {stagedCount > 0 ? `(${stagedCount})` : ''}
            </AdminButton>
            {latestPreparedBatch ? (
              <AdminButton variant="outline" size="sm" onClick={onUndoLastBatch}>
                Deshacer ultimo lote
              </AdminButton>
            ) : null}
          </div>
        </div>
      ) : null}

      <TabBar selectedTab={selectedTab} onSelectTab={onSelectTab} />
    </AdminCard>
  );
}

function TabBar({
  selectedTab,
  onSelectTab,
}: {
  selectedTab: RunDetailTab;
  onSelectTab: (tab: RunDetailTab) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
      {TAB_LABELS.map((tab) => {
        const isActive = tab.id === selectedTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function RunSummaryPanel({ run }: { run: ImportReviewRunManifestSummary }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4 xl:grid-cols-5">
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aceptadas</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{run.acceptedCount}</p>
        <p className="text-sm text-slate-600">listas para merge</p>
      </AdminCard>
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Con advertencia</p>
        <p className="mt-2 text-2xl font-semibold text-amber-700">{run.acceptedWithWarningCount}</p>
        <p className="text-sm text-slate-600">requieren auditoria</p>
      </AdminCard>
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recuperadas</p>
        <p className="mt-2 text-2xl font-semibold text-emerald-700">{run.autoGroundedAcceptedCount}</p>
        <p className="text-sm text-slate-600">con grounding automatizado</p>
      </AdminCard>
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recuperables</p>
        <p className="mt-2 text-2xl font-semibold text-sky-700">{run.recoverableAcceptedCount ?? 0}</p>
        <p className="text-sm text-slate-600">warning por grounding</p>
      </AdminCard>
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Baja confianza</p>
        <p className="mt-2 text-2xl font-semibold text-orange-700">{run.usableWinnerLowConfidenceCount ?? 0}</p>
        <p className="text-sm text-slate-600">usables con etiqueta</p>
      </AdminCard>
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Metadatos</p>
        <p className="mt-2 text-2xl font-semibold text-cyan-700">{run.metadataRepairedCount ?? 0}</p>
        <p className="text-sm text-slate-600">autocorregidos</p>
      </AdminCard>
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Duplicados</p>
        <p className="mt-2 text-2xl font-semibold text-indigo-700">{run.duplicateClusterCount}</p>
        <p className="text-sm text-slate-600">clusters internos</p>
      </AdminCard>
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Auditoria visual</p>
        <p className="mt-2 text-2xl font-semibold text-amber-700">{run.visualAuditRequiredCount ?? 0}</p>
        <p className="text-sm text-slate-600">requieren imagen</p>
      </AdminCard>
      <AdminCard padding="compact">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ambiguas</p>
        <p className="mt-2 text-2xl font-semibold text-rose-700">{run.ambiguousCandidateCount}</p>
        <p className="text-sm text-slate-600">capitulo incierto</p>
      </AdminCard>
    </div>
  );
}

function OverviewTab({
  run,
  rejectedCandidates,
  aggregatedErrors,
  aggregatedWarnings,
  expandedErrorCode,
  expandedWarningCode,
  onToggleErrorCode,
  onToggleWarningCode,
}: {
  run: ImportReviewRunManifestSummary;
  rejectedCandidates: ImportReviewRejectedCandidate[];
  aggregatedErrors: ImportReviewIssueAggregate[];
  aggregatedWarnings: ImportReviewIssueAggregate[];
  expandedErrorCode: string | null;
  expandedWarningCode: string | null;
  onToggleErrorCode: (code: string) => void;
  onToggleWarningCode: (code: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <RunSummaryPanel run={run} />

      <div className="mt-4 grid min-h-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <AdminCard className="min-h-0 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resumen operativo</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{run.runId}</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Errores agregados</p>
                <p className="mt-2 text-2xl font-semibold text-rose-700">
                  {issueCountFromRejected(rejectedCandidates, 'errors')}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Warnings agregados</p>
                <p className="mt-2 text-2xl font-semibold text-amber-700">
                  {issueCountFromRejected(rejectedCandidates, 'warnings')}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Split por capitulo</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {run.chapterSummaries.map((chapter) => (
                  <div key={chapter.chapterId} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {getManualChapterLabel(chapter.chapterId, MANUAL_KNOWLEDGE_INDEX.chapters)}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                      <span>Aceptadas {chapter.acceptedCount}</span>
                      <span>Rechazadas {chapter.rejectedCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AdminCard>

        <div className="grid min-h-0 gap-4 lg:grid-cols-2 xl:grid-cols-1">
          <AggregatedIssuePanel
            title="Motivos de rechazo"
            tone="error"
            items={aggregatedErrors}
            expandedCode={expandedErrorCode}
            onToggleCode={onToggleErrorCode}
          />
          <AggregatedIssuePanel
            title="Senales auxiliares"
            tone="warning"
            items={aggregatedWarnings}
            expandedCode={expandedWarningCode}
            onToggleCode={onToggleWarningCode}
          />
        </div>
      </div>
    </div>
  );
}

function AggregatedIssuePanel({
  title,
  tone,
  items,
  expandedCode,
  onToggleCode,
}: {
  title: string;
  tone: 'error' | 'warning';
  items: ImportReviewIssueAggregate[];
  expandedCode: string | null;
  onToggleCode: (code: string) => void;
}) {
  const panelTone =
    tone === 'error'
      ? {
          border: 'border-rose-200',
          bg: 'bg-rose-50/60',
          chip: 'bg-rose-100 text-rose-700',
          text: 'text-rose-700',
        }
      : {
          border: 'border-amber-200',
          bg: 'bg-amber-50/60',
          chip: 'bg-amber-100 text-amber-700',
          text: 'text-amber-700',
        };

  return (
    <AdminCard className={`min-h-0 overflow-hidden ${panelTone.border} ${panelTone.bg}`}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${panelTone.text}`}>{title}</p>
          <p className="mt-1 text-sm text-slate-600">Agrupado por descripcion para evitar filas repetidas.</p>
        </div>
        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Sin items registrados.</p>
          ) : (
            items.map((item) => {
              const isExpanded = expandedCode === item.code;
              return (
                <div key={item.code} className="rounded-xl border border-white/70 bg-white/90 p-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() => onToggleCode(item.code)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <AdminTooltip label={item.code}>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${panelTone.chip}`}>
                        {item.message || getIssueTooltip(item)}
                      </span>
                    </AdminTooltip>
                    <span className="text-sm font-semibold text-slate-700">{item.count}</span>
                  </button>
                  {isExpanded ? (
                    <div className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      <div className="flex flex-wrap gap-2">
                        {item.externalIds.map((externalId) => (
                          <span
                            key={`${item.code}-${externalId}`}
                            className="rounded-full border border-slate-200 bg-white px-2 py-1"
                          >
                            {externalId}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminCard>
  );
}

function ActionableTab({
  isLoading,
  items,
  selectedItem,
  selectedItemId,
  draftItemByKey,
  manualChapterOptions,
  search,
  chapterFilter,
  batchFilter,
  onSelectItem,
  onBackToList,
  onSearchChange,
  onChapterFilterChange,
  onBatchFilterChange,
  onStageCandidate,
  onDiscardCandidate,
  onOpenManualDrawer,
  onOpenPdfWorkspace,
  onOpenCatalogQuestion,
  onOpenSnapshot,
}: {
  isLoading: boolean;
  items: ActionableItem[];
  selectedItem: ActionableItem | null;
  selectedItemId: string | null;
  draftItemByKey: Map<string, ImportDraftQueueItem>;
  manualChapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  search: string;
  chapterFilter: string;
  batchFilter: 'all' | 'staged' | 'imported' | 'pending';
  onSelectItem: (externalId: string | null) => void;
  onBackToList: () => void;
  onSearchChange: (value: string) => void;
  onChapterFilterChange: (value: string) => void;
  onBatchFilterChange: (value: 'all' | 'staged' | 'imported' | 'pending') => void;
  onStageCandidate: (candidate: ImportReviewQuestionRecord, warnings: ImportReviewIssue[]) => void;
  onDiscardCandidate: (externalId: string) => void;
  onOpenManualDrawer: (chapterId?: string, segmentId?: string | null) => void;
  onOpenPdfWorkspace: (candidate: ImportReviewQuestionRecord | null, summary: ActionableItem['summary']) => void;
  onOpenCatalogQuestion: (questionId: string) => void;
  onOpenSnapshot: (title: string, subtitle: string | undefined, snapshot: ImportReviewQuestionSnapshot | null) => void;
}) {
  if (isLoading) {
    return (
      <AdminCard className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-500">
        Cargando accepted-candidates...
      </AdminCard>
    );
  }

  if (items.length === 0) {
    return (
      <AdminCard className="flex min-h-0 flex-1 items-center justify-center">
        <AdminEmptyState
          title="Sin aceptadas con advertencia"
          message="Esta corrida no tiene candidatas auto-grounded para auditoria manual."
          className="border-0 bg-transparent py-8"
        />
      </AdminCard>
    );
  }

  const filteredItems = items.filter(({ summary, candidate }) => {
    const normalizedSearch = search.trim().toLowerCase();
    const draftItem = findDraftItemByExternalId(draftItemByKey, summary.externalId);
    const matchesSearch =
      normalizedSearch.length === 0 ||
      summary.externalId.toLowerCase().includes(normalizedSearch) ||
      (candidate?.prompt ?? '').toLowerCase().includes(normalizedSearch);
    const matchesChapter = chapterFilter === 'all' || summary.chapterId === chapterFilter;
    const matchesBatch =
      batchFilter === 'all' ||
      (batchFilter === 'pending' && !draftItem) ||
      draftItem?.status === batchFilter;
    return matchesSearch && matchesChapter && matchesBatch;
  });

  return (
    <MasterDetailLayout
      listPane={
        <ActionableList
          items={filteredItems}
          selectedItemId={selectedItemId}
          draftItemByKey={draftItemByKey}
          manualChapterOptions={manualChapterOptions}
          search={search}
          chapterFilter={chapterFilter}
          batchFilter={batchFilter}
          onSelectItem={onSelectItem}
          onSearchChange={onSearchChange}
          onChapterFilterChange={onChapterFilterChange}
          onBatchFilterChange={onBatchFilterChange}
        />
      }
      detailPane={
        <ActionableDetail
          item={selectedItem}
          draftItem={
            selectedItem
              ? findDraftItemByExternalId(draftItemByKey, selectedItem.summary.externalId)
              : null
          }
          manualChapterOptions={manualChapterOptions}
          onBackToList={onBackToList}
          onStageCandidate={onStageCandidate}
          onDiscardCandidate={onDiscardCandidate}
          onOpenManualDrawer={onOpenManualDrawer}
          onOpenPdfWorkspace={onOpenPdfWorkspace}
          onOpenCatalogQuestion={onOpenCatalogQuestion}
          onOpenSnapshot={onOpenSnapshot}
        />
      }
      hasSelection={Boolean(selectedItemId)}
    />
  );
}

function ActionableList({
  items,
  selectedItemId,
  draftItemByKey,
  manualChapterOptions,
  search,
  chapterFilter,
  batchFilter,
  onSelectItem,
  onSearchChange,
  onChapterFilterChange,
  onBatchFilterChange,
}: {
  items: ActionableItem[];
  selectedItemId: string | null;
  draftItemByKey: Map<string, ImportDraftQueueItem>;
  manualChapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  search: string;
  chapterFilter: string;
  batchFilter: 'all' | 'staged' | 'imported' | 'pending';
  onSelectItem: (externalId: string) => void;
  onSearchChange: (value: string) => void;
  onChapterFilterChange: (value: string) => void;
  onBatchFilterChange: (value: 'all' | 'staged' | 'imported' | 'pending') => void;
}) {
  return (
    <AdminCard className="flex min-h-0 flex-col p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aceptadas con advertencia</p>
        <p className="mt-1 text-sm text-slate-600">Filtra y prepara las preguntas para importarlas como borrador.</p>
        <div className="mt-3 grid gap-2">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por ID o prompt"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={chapterFilter}
              onChange={(event) => onChapterFilterChange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">Todos los capitulos</option>
              {manualChapterOptions.map((option) => (
                <option key={option.chapterId} value={option.chapterId}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={batchFilter}
              onChange={(event) => onBatchFilterChange(event.target.value as 'all' | 'staged' | 'imported' | 'pending')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">Todo el lote</option>
              <option value="pending">Pendientes</option>
              <option value="staged">En lote</option>
              <option value="imported">Importadas</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.map(({ summary, candidate }) => {
          const draftItem = findDraftItemByExternalId(draftItemByKey, summary.externalId);
          return (
            <ImportReviewListItem
              key={summary.externalId}
              title={summary.externalId}
              prompt={candidate?.prompt ?? 'Prompt no disponible en accepted-candidates.'}
              isSelected={summary.externalId === selectedItemId}
              onClick={() => onSelectItem(summary.externalId)}
              badges={[
                {
                  label: getManualChapterLabel(summary.chapterId, manualChapterOptions),
                  tone: 'neutral',
                },
                {
                  label: `${formatPercent(summary.confidence)} confianza`,
                  tone: 'sky',
                },
                {
                  label: getDraftStatusLabel(draftItem?.status ?? 'pending'),
                  tone:
                    draftItem?.status === 'imported'
                      ? 'success'
                      : draftItem?.status === 'staged'
                        ? 'sky'
                        : draftItem?.status === 'discarded'
                          ? 'danger'
                          : 'warning',
                },
              ]}
              meta={`Grounding ${summary.groundingMode}`}
            />
          );
        })}
      </div>
    </AdminCard>
  );
}

function ActionableDetail({
  item,
  draftItem,
  manualChapterOptions,
  onBackToList,
  onStageCandidate,
  onDiscardCandidate,
  onOpenManualDrawer,
  onOpenPdfWorkspace,
  onOpenCatalogQuestion,
  onOpenSnapshot,
}: {
  item: ActionableItem | null;
  draftItem: ImportDraftQueueItem | null;
  manualChapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  onBackToList: () => void;
  onStageCandidate: (candidate: ImportReviewQuestionRecord, warnings: ImportReviewIssue[]) => void;
  onDiscardCandidate: (externalId: string) => void;
  onOpenManualDrawer: (chapterId?: string, segmentId?: string | null) => void;
  onOpenPdfWorkspace: (candidate: ImportReviewQuestionRecord | null, summary: ActionableItem['summary']) => void;
  onOpenCatalogQuestion: (questionId: string) => void;
  onOpenSnapshot: (title: string, subtitle: string | undefined, snapshot: ImportReviewQuestionSnapshot | null) => void;
}) {
  if (!item) {
    return (
      <AdminCard className="flex min-h-[320px] items-center justify-center">
        <AdminEmptyState
          title="Sin candidata seleccionada"
          message="Selecciona un item accionable para revisar grounding, explicacion y acciones."
          className="border-0 bg-transparent py-8"
        />
      </AdminCard>
    );
  }

  const { summary, candidate } = item;
  const state = draftItem?.status ?? 'pending';
  const stateLabel = getDraftStatusLabel(state);
  const chapterLabel = getManualChapterLabel(summary.chapterId, manualChapterOptions);

  return (
    <AdminCard className="min-h-0 overflow-y-auto">
      <DetailHeader
        eyebrow="Aceptada con advertencia"
        title={summary.externalId}
        subtitle={`${chapterLabel} · ${stateLabel}`}
        onBack={onBackToList}
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <DetailSection title="Prompt">
            <p className="text-sm leading-6 text-slate-700">
              {candidate?.prompt ?? 'No se encontro el prompt completo en accepted-candidates.'}
            </p>
          </DetailSection>

          <DetailSection title="Opciones">
            {renderOptionList(
              candidate?.options?.map((option) => option.text) ?? undefined,
              candidate?.correctOptionIndexes,
            )}
          </DetailSection>

          <DetailSection title="Explicacion">
            <p className="text-sm leading-6 text-slate-700">
              {candidate?.publicExplanation || 'Sin explicacion publica.'}
            </p>
          </DetailSection>

          <CollapsibleSection title="Cita de grounding" defaultOpen>
            <p className="text-sm leading-6 text-slate-700">
              {draftItem?.correction?.replacementText ?? summary.groundingExcerpt}
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Referencias del manual">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fact refs</p>
                <p className="mt-2 text-sm text-slate-700">
                  {summary.manualFactRefs.length > 0 ? summary.manualFactRefs.join(', ') : 'Ninguna'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Citation refs</p>
                <p className="mt-2 text-sm text-slate-700">
                  {summary.manualCitationRefs.length > 0 ? summary.manualCitationRefs.join(', ') : 'Ninguna'}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        <div className="space-y-4">
          <AdminCard variant="subtle" className="border border-slate-200">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado del lote</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{stateLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {candidate ? (
                  <AdminButton variant="secondary" size="sm" onClick={() => onStageCandidate(candidate, [])}>
                    Agregar a lote
                  </AdminButton>
                ) : null}
                {state !== 'discarded' ? (
                  <AdminButton variant="outline" size="sm" onClick={() => onDiscardCandidate(summary.externalId)}>
                    Descartar del lote
                  </AdminButton>
                ) : null}
                {draftItem?.importedQuestionId ? (
                  <AdminButton variant="ghost" size="sm" onClick={() => onOpenCatalogQuestion(draftItem.importedQuestionId!)}>
                    Abrir en catalogo
                  </AdminButton>
                ) : null}
              </div>
            </div>
          </AdminCard>

          <AdminCard variant="subtle" className="border border-slate-200">
            <div className="space-y-3">
              <div className="grid gap-2 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-900">Modo:</span> {summary.groundingMode}</p>
                <p><span className="font-semibold text-slate-900">Confianza:</span> {formatPercent(summary.confidence)}</p>
                <p><span className="font-semibold text-slate-900">Capitulo:</span> {chapterLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton variant="outline" size="sm" onClick={() => onOpenManualDrawer(summary.chapterId)}>
                  Ver segmento manual
                </AdminButton>
                <AdminButton variant="ghost" size="sm" onClick={() => onOpenPdfWorkspace(candidate, summary)}>
                  Abrir PDF
                </AdminButton>
                {candidate?.similarityMatchQuestion ? (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onOpenSnapshot(
                        `Referencia ${candidate.similarityMatchId ?? 'relacionada'}`,
                        'Vista de comparacion del item relacionado.',
                        candidate.similarityMatchQuestion ?? null,
                      )
                    }
                  >
                    Ver comparacion
                  </AdminButton>
                ) : null}
              </div>
              {draftItem?.correction ? (
                <div className="rounded-xl bg-sky-50 px-3 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Correccion preliminar</p>
                  <p className="mt-1">{draftItem.correction.replacementText}</p>
                </div>
              ) : null}
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminCard>
  );
}

function RejectedTab({
  runDetail,
  selectedCandidate,
  selectedCandidateId,
  draftItemByKey,
  manualChapterOptions,
  search,
  chapterFilter,
  reasonFilter,
  batchFilter,
  visualFilter,
  onSelectCandidate,
  onBackToList,
  onSearchChange,
  onChapterFilterChange,
  onReasonFilterChange,
  onBatchFilterChange,
  onVisualFilterChange,
  onStageCandidate,
  onDiscardCandidate,
  onOpenManualDrawer,
  onOpenPdfWorkspace,
  onOpenReference,
  onOpenSnapshot,
}: {
  runDetail: ImportReviewRunDetail;
  selectedCandidate: ImportReviewRejectedCandidate | null;
  selectedCandidateId: string | null;
  draftItemByKey: Map<string, ImportDraftQueueItem>;
  manualChapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  search: string;
  chapterFilter: string;
  reasonFilter: string;
  batchFilter: 'all' | 'staged' | 'imported' | 'pending';
  visualFilter: 'all' | 'visual' | 'text';
  onSelectCandidate: (externalId: string | null) => void;
  onBackToList: () => void;
  onSearchChange: (value: string) => void;
  onChapterFilterChange: (value: string) => void;
  onReasonFilterChange: (value: string) => void;
  onBatchFilterChange: (value: 'all' | 'staged' | 'imported' | 'pending') => void;
  onVisualFilterChange: (value: 'all' | 'visual' | 'text') => void;
  onStageCandidate: (candidate: ImportReviewRejectedCandidate) => void;
  onDiscardCandidate: (externalId: string) => void;
  onOpenManualDrawer: (chapterId?: string, segmentId?: string | null) => void;
  onOpenPdfWorkspace: (candidate: ImportReviewRejectedCandidate) => void;
  onOpenReference?: (questionId: string) => void;
  onOpenSnapshot: (title: string, subtitle: string | undefined, snapshot: ImportReviewQuestionSnapshot | null) => void;
}) {
  const filteredCandidates = runDetail.rejectedCandidates.filter((candidate) => {
    const normalizedSearch = search.trim().toLowerCase();
    const draftItem = draftItemByKey.get(buildImportDraftKey(runDetail.runId, candidate.externalId));
    const matchesSearch =
      normalizedSearch.length === 0 ||
      candidate.externalId.toLowerCase().includes(normalizedSearch) ||
      candidate.normalizedQuestion.prompt.toLowerCase().includes(normalizedSearch);
    const matchesChapter = chapterFilter === 'all' || candidate.normalizedQuestion.chapterId === chapterFilter;
    const matchesReason = reasonFilter === 'all' || candidate.errors.some((error) => error.code === reasonFilter);
    const matchesBatch =
      batchFilter === 'all' ||
      (batchFilter === 'pending' && !draftItem) ||
      draftItem?.status === batchFilter;
    const matchesVisual =
      visualFilter === 'all' ||
      (visualFilter === 'visual' ? candidate.normalizedQuestion.needsVisualAudit : !candidate.normalizedQuestion.needsVisualAudit);
    return matchesSearch && matchesChapter && matchesReason && matchesBatch && matchesVisual;
  });

  return (
    <MasterDetailLayout
      listPane={
        <RejectedCandidateList
          candidates={filteredCandidates}
          selectedCandidateId={selectedCandidateId}
          draftItemByKey={draftItemByKey}
          manualChapterOptions={manualChapterOptions}
          search={search}
          chapterFilter={chapterFilter}
          reasonFilter={reasonFilter}
          batchFilter={batchFilter}
          visualFilter={visualFilter}
          onSelectCandidate={onSelectCandidate}
          onSearchChange={onSearchChange}
          onChapterFilterChange={onChapterFilterChange}
          onReasonFilterChange={onReasonFilterChange}
          onBatchFilterChange={onBatchFilterChange}
          onVisualFilterChange={onVisualFilterChange}
        />
      }
      detailPane={
        <RejectedCandidateDetail
          candidate={selectedCandidate}
          draftItem={
            selectedCandidate
              ? draftItemByKey.get(buildImportDraftKey(runDetail.runId, selectedCandidate.externalId)) ?? null
              : null
          }
          manualChapterOptions={manualChapterOptions}
          onBackToList={onBackToList}
          onStageCandidate={onStageCandidate}
          onDiscardCandidate={onDiscardCandidate}
          onOpenManualDrawer={onOpenManualDrawer}
          onOpenPdfWorkspace={onOpenPdfWorkspace}
          onOpenReference={onOpenReference}
          onOpenSnapshot={onOpenSnapshot}
        />
      }
      hasSelection={Boolean(selectedCandidateId)}
    />
  );
}

function MasterDetailLayout({
  listPane,
  detailPane,
  hasSelection,
}: {
  listPane: JSX.Element;
  detailPane: JSX.Element;
  hasSelection: boolean;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className={hasSelection ? 'hidden md:flex md:min-h-0 md:flex-col' : 'flex min-h-0 flex-col'}>{listPane}</div>
      <div className={hasSelection ? 'flex min-h-0 flex-col' : 'hidden min-h-0 md:flex md:flex-col'}>{detailPane}</div>
    </div>
  );
}

function RejectedCandidateList({
  candidates,
  selectedCandidateId,
  draftItemByKey,
  manualChapterOptions,
  search,
  chapterFilter,
  reasonFilter,
  batchFilter,
  visualFilter,
  onSelectCandidate,
  onSearchChange,
  onChapterFilterChange,
  onReasonFilterChange,
  onBatchFilterChange,
  onVisualFilterChange,
}: {
  candidates: ImportReviewRejectedCandidate[];
  selectedCandidateId: string | null;
  draftItemByKey: Map<string, ImportDraftQueueItem>;
  manualChapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  search: string;
  chapterFilter: string;
  reasonFilter: string;
  batchFilter: 'all' | 'staged' | 'imported' | 'pending';
  visualFilter: 'all' | 'visual' | 'text';
  onSelectCandidate: (externalId: string) => void;
  onSearchChange: (value: string) => void;
  onChapterFilterChange: (value: string) => void;
  onReasonFilterChange: (value: string) => void;
  onBatchFilterChange: (value: 'all' | 'staged' | 'imported' | 'pending') => void;
  onVisualFilterChange: (value: 'all' | 'visual' | 'text') => void;
}) {
  return (
    <AdminCard className="flex min-h-0 flex-col p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rechazadas</p>
        <p className="mt-1 text-sm text-slate-600">Selecciona una candidata para revisar comparacion y señales.</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {candidates.length === 0 ? (
          <AdminEmptyState
            title="Sin rechazos"
            message="Esta corrida no tiene candidatas rechazadas."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          candidates.map((candidate) => (
            <ImportReviewListItem
              key={candidate.externalId}
              title={candidate.externalId}
              prompt={candidate.normalizedQuestion.prompt}
              isSelected={candidate.externalId === selectedCandidateId}
              onClick={() => onSelectCandidate(candidate.externalId)}
              badges={[
                {
                  label: `${candidate.errors.length} errores`,
                  tone: 'danger',
                },
                ...(candidate.warnings.length > 0
                  ? [{ label: `${candidate.warnings.length} warnings`, tone: 'warning' as const }]
                  : []),
                ...(candidate.duplicateSimilarityScore
                  ? [{ label: formatPercent(candidate.duplicateSimilarityScore), tone: 'indigo' as const }]
                  : []),
                {
                  label: getDraftStatusLabel(findDraftItemByExternalId(draftItemByKey, candidate.externalId)?.status ?? 'pending'),
                  tone:
                    findDraftItemByExternalId(draftItemByKey, candidate.externalId)?.status === 'imported'
                      ? 'success'
                      : findDraftItemByExternalId(draftItemByKey, candidate.externalId)?.status === 'staged'
                        ? 'sky'
                        : 'warning',
                },
              ]}
              meta={getManualChapterLabel(candidate.normalizedQuestion.chapterId, manualChapterOptions)}
            />
          ))
        )}
      </div>
    </AdminCard>
  );
}

function RejectedCandidateDetail({
  candidate,
  draftItem,
  manualChapterOptions,
  onBackToList,
  onStageCandidate,
  onDiscardCandidate,
  onOpenManualDrawer,
  onOpenPdfWorkspace,
  onOpenReference,
  onOpenSnapshot,
}: {
  candidate: ImportReviewRejectedCandidate | null;
  draftItem: ImportDraftQueueItem | null;
  manualChapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  onBackToList: () => void;
  onStageCandidate: (candidate: ImportReviewRejectedCandidate) => void;
  onDiscardCandidate: (externalId: string) => void;
  onOpenManualDrawer: (chapterId?: string, segmentId?: string | null) => void;
  onOpenPdfWorkspace: (candidate: ImportReviewRejectedCandidate) => void;
  onOpenReference?: (questionId: string) => void;
  onOpenSnapshot: (title: string, subtitle: string | undefined, snapshot: ImportReviewQuestionSnapshot | null) => void;
}) {
  if (!candidate) {
    return (
      <AdminCard className="flex min-h-[320px] items-center justify-center">
        <AdminEmptyState
          title="Sin candidata seleccionada"
          message="Selecciona un rechazo para revisar el lado a lado con su match mas cercano."
          className="border-0 bg-transparent py-8"
        />
      </AdminCard>
    );
  }

  const left = candidate.normalizedQuestion;
  const right = candidate.duplicateMatchQuestion;
  const groupedErrors = groupCandidateIssues(candidate.errors);
  const groupedWarnings = groupCandidateIssues(candidate.warnings);
  const metadataRows = [
    {
      label: 'Capitulo',
      left: getManualChapterLabel(left.chapterId, manualChapterOptions),
      right: right?.chapterId || candidate.duplicateMatchScope || 'N/A',
    },
    {
      label: 'Referencia',
      left: left.sourceReference || 'Sin referencia',
      right: right?.sourceReference || candidate.duplicateMatchId || 'N/A',
    },
    {
      label: 'Paginas',
      left: `${typeof left.sourcePageStart === 'number' ? left.sourcePageStart : 'N/A'}-${typeof left.sourcePageEnd === 'number' ? left.sourcePageEnd : 'N/A'}`,
      right: `${typeof right?.sourcePageStart === 'number' ? right.sourcePageStart : 'N/A'}-${typeof right?.sourcePageEnd === 'number' ? right.sourcePageEnd : 'N/A'}`,
    },
  ];

  const handleOpenMatch = () => {
    if (candidate.duplicateMatchScope !== 'batch' && candidate.duplicateMatchId && onOpenReference) {
      onOpenReference(candidate.duplicateMatchId);
      return;
    }

    onOpenSnapshot(
      `Match ${candidate.duplicateMatchId ?? 'relacionado'}`,
      `Scope ${candidate.duplicateMatchScope ?? 'desconocido'}`,
      candidate.duplicateMatchQuestion ?? null,
    );
  };

  return (
    <AdminCard className="min-h-0 overflow-y-auto">
      <DetailHeader
        eyebrow="Rechazada"
        title={candidate.externalId}
        subtitle={`Score ${formatPercent(candidate.duplicateSimilarityScore)} · Match ${candidate.duplicateMatchScope ?? 'N/A'}`}
        onBack={onBackToList}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <AdminButton variant="secondary" size="sm" onClick={() => onStageCandidate(candidate)}>
          Rebatir y mover a lote
        </AdminButton>
        {draftItem?.status !== 'discarded' ? (
          <AdminButton variant="outline" size="sm" onClick={() => onDiscardCandidate(candidate.externalId)}>
            Descartar del lote
          </AdminButton>
        ) : null}
        <AdminButton variant="outline" size="sm" onClick={() => onOpenManualDrawer(left.chapterId)}>
          Ver segmento manual
        </AdminButton>
        <AdminButton
          variant="ghost"
          size="sm"
          onClick={() => onOpenPdfWorkspace(candidate)}
        >
          Abrir PDF
        </AdminButton>
        {(candidate.duplicateMatchQuestion || (candidate.duplicateMatchScope !== 'batch' && candidate.duplicateMatchId)) ? (
          <AdminButton variant="ghost" size="sm" onClick={handleOpenMatch}>
            Abrir referencia
          </AdminButton>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-[140px_minmax(0,1fr)] border-b border-slate-200 bg-slate-50">
          <div className="border-r border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Campo
          </div>
          <div className="grid minmax-0 grid-cols-1 lg:grid-cols-2">
            <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 lg:border-b-0 lg:border-r">
              Candidata importada
            </div>
            <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Match mas cercano
            </div>
          </div>
        </div>

        <ComparisonRow
          label="Prompt"
          left={<p className="text-sm leading-6 text-slate-700">{left.prompt}</p>}
          right={<p className="text-sm leading-6 text-slate-700">{right?.prompt || candidate.duplicateMatchPrompt || 'Sin snapshot disponible.'}</p>}
        />
        <ComparisonRow
          label="Opciones"
          left={renderOptionList(left.options.map((option) => option.text), left.correctOptionIndexes)}
          right={renderOptionList(right?.options, right?.correctOptionIndexes)}
        />
        <ComparisonRow
          label="Explicacion"
          left={<p className="text-sm leading-6 text-slate-700">{left.publicExplanation || 'Sin explicacion publica.'}</p>}
          right={<p className="text-sm leading-6 text-slate-700">{right?.publicExplanation || 'Sin explicacion publica.'}</p>}
        />
        <ComparisonRow
          label="Metadatos"
          left={
            <div className="space-y-2 text-sm text-slate-700">
              {metadataRows.map((row) => (
                <p key={`left-${row.label}`}><span className="font-semibold text-slate-900">{row.label}:</span> {row.left}</p>
              ))}
            </div>
          }
          right={
            <div className="space-y-2 text-sm text-slate-700">
              {metadataRows.map((row) => (
                <p key={`right-${row.label}`}><span className="font-semibold text-slate-900">{row.label}:</span> {row.right}</p>
              ))}
            </div>
          }
        />
      </div>

      <div className="mt-4 space-y-4">
        <CollapsibleSection title="Motivos de rechazo" defaultOpen>
          <IssueGroupCard title="Motivos de rechazo" tone="error" items={groupedErrors} />
        </CollapsibleSection>

        <CollapsibleSection title="Senales auxiliares">
          <IssueGroupCard title="Senales auxiliares" tone="warning" items={groupedWarnings} />
        </CollapsibleSection>

        <CollapsibleSection title="Senales complementarias">
          <div className="grid gap-2 text-sm text-slate-700">
            <p>Grounding: {left.groundingExcerpt || 'Sin excerpt generado'}</p>
            <p>Modo grounding: {left.groundingMode || 'missing'}</p>
            <p>Disposicion grounding: {left.groundingAudit?.disposition || 'N/A'}</p>
            <p>Visual audit: {left.needsVisualAudit ? 'Requerido' : 'No'}</p>
            <p>
              Metadata repair: {left.metadataRepair?.applied ? `Si (${left.metadataRepair.fields.join(', ')})` : 'No'}
            </p>
            <p>Fact refs: {(left.manualFactRefs ?? []).join(', ') || 'Ninguna'}</p>
            <p>
              Fact review: {(left.factReview?.suggestions?.length ?? 0) > 0 ? `${left.factReview?.suggestions?.length} sugerencias` : 'Sin sugerencias'}
            </p>
            <p>Citation refs: {(left.manualCitationRefs ?? []).join(', ') || 'Ninguna'}</p>
            <p>Quality score: {left.qualityScore ?? 'N/A'}</p>
          </div>
        </CollapsibleSection>

        {(left.factReview?.suggestions?.length ?? 0) > 0 ? (
          <CollapsibleSection title="Sugerencias de datos manuales">
            <div className="space-y-3">
              {left.factReview?.suggestions.map((suggestion) => (
                <div
                  key={`${suggestion.factId}-${suggestion.importedValue}`}
                  className="rounded-xl border border-cyan-200 bg-white px-3 py-3 text-sm text-slate-700"
                >
                  <p className="font-semibold text-slate-900">{suggestion.entity}</p>
                  <p className="mt-1">Importado: {suggestion.importedValue}</p>
                  <p>Manual: {suggestion.manualValue}</p>
                  <p>Paginas: {suggestion.pageRange.start}-{suggestion.pageRange.end}</p>
                  <p>Motivo: {suggestion.conflictReason}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection title="Grounding assistant">
          <GroundingAssistant candidate={candidate} />
        </CollapsibleSection>
      </div>
    </AdminCard>
  );
}

function ComparisonRow({
  label,
  left,
  right,
}: {
  label: string;
  left: JSX.Element;
  right: JSX.Element;
}) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] border-t border-slate-200">
      <div className="border-r border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900">
        {label}
      </div>
      <div className="grid minmax-0 grid-cols-1 lg:grid-cols-2">
        <div className="border-b border-slate-200 px-4 py-4 lg:border-b-0 lg:border-r">{left}</div>
        <div className="px-4 py-4">{right}</div>
      </div>
    </div>
  );
}

function ImportReviewListItem({
  title,
  prompt,
  badges,
  meta,
  isSelected,
  onClick,
}: {
  title: string;
  prompt: string;
  badges: Array<{ label: string; tone: 'neutral' | 'warning' | 'danger' | 'success' | 'sky' | 'indigo' }>;
  meta?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
        isSelected
          ? 'border-blue-300 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          {meta ? <p className="mt-1 truncate text-xs text-slate-500">{meta}</p> : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">{prompt}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {badges.map((badge) => (
          <span key={`${title}-${badge.label}`} className={`rounded-full px-2 py-1 font-medium ${badgeClasses(badge.tone)}`}>
            {badge.label}
          </span>
        ))}
      </div>
    </button>
  );
}

function badgeClasses(tone: 'neutral' | 'warning' | 'danger' | 'success' | 'sky' | 'indigo') {
  switch (tone) {
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    case 'danger':
      return 'bg-rose-100 text-rose-700';
    case 'success':
      return 'bg-emerald-100 text-emerald-700';
    case 'sky':
      return 'bg-sky-100 text-sky-700';
    case 'indigo':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function DetailHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 md:hidden"
        >
          Volver a la lista
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: JSX.Element;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: JSX.Element;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-slate-200 bg-white p-4"
    >
      <summary className="cursor-pointer list-none font-semibold text-slate-900">
        <span className="inline-flex items-center gap-2">
          <span className="text-slate-400 transition group-open:rotate-90">›</span>
          {title}
        </span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function IssueGroupCard({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'error' | 'warning';
  items: ImportReviewIssueAggregate[];
}) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm">Sin registros.</p>
        ) : (
          items.map((item) => (
            <div key={`${title}-${item.code}`} className="rounded-lg bg-white/80 px-3 py-2 text-sm">
              <AdminTooltip label={item.code}>
                <span className="font-semibold">{item.message || getIssueTooltip(item)}</span>
              </AdminTooltip>
              <span className="ml-2 text-slate-600">({item.count})</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GroundingAssistant({ candidate }: { candidate: ImportReviewRejectedCandidate }) {
  const suggestions = candidate.groundingSuggestions ?? [];

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Grounding assistant</p>
      <p className="mt-1 text-sm text-slate-600">
        Top 3 parrafos sugeridos para auditar preguntas sin grounding suficiente.
      </p>
      <div className="mt-4 space-y-3">
        {suggestions.length === 0 ? (
          <p className="text-sm text-slate-500">No hay sugerencias de grounding para esta candidata.</p>
        ) : (
          suggestions.map((suggestion) => (
            <div key={suggestion.citationId} className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>{suggestion.chapterId}</span>
                <span>
                  {suggestion.manualRef} · {suggestion.pageRange.start}-{suggestion.pageRange.end}
                </span>
                <span>{formatPercent(suggestion.confidence)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{suggestion.excerpt}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ManualBrowserDrawer({
  isOpen,
  chapter,
  chapterId,
  chapterOptions,
  isLoading,
  selectedSegmentId,
  onClose,
  onSelectChapter,
  onSelectSegment,
  onOpenPdf,
}: {
  isOpen: boolean;
  chapter: VersionedManualChapterSegments | null;
  chapterId: string;
  chapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  isLoading: boolean;
  selectedSegmentId: string | null;
  onClose: () => void;
  onSelectChapter: (chapterId: string) => void;
  onSelectSegment: (segmentId: string) => void;
  onOpenPdf: (page?: number) => void;
}) {
  const selectedSegment =
    chapter?.segments.find((segment) => segment.id === selectedSegmentId) ?? chapter?.segments[0] ?? null;

  return (
    <AdminPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Manual browser"
      subtitle="Consulta segmentos versionados sin mantener una tercera columna fija."
      className="absolute inset-y-0 right-0 z-30 w-full max-w-[540px]"
      bodyClassName="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" htmlFor="manual-drawer-chapter">
          Capitulo
        </label>
        <select
          id="manual-drawer-chapter"
          value={chapterId}
          onChange={(event) => onSelectChapter(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        >
          {chapterOptions.map((option) => (
            <option key={option.chapterId} value={option.chapterId}>
              {option.label} ({option.pageRange.start}-{option.pageRange.end})
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-500">
          Cargando segmentos del manual...
        </div>
      ) : !chapter ? (
        <AdminEmptyState
          title="Sin segmentos"
          message="No se encontro el archivo versionado para este capitulo."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 md:grid-rows-[minmax(0,0.9fr)_minmax(240px,1fr)]">
          <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 p-3">
            <div className="space-y-2">
              {chapter.segments.map((segment) => {
                const isActive = segment.id === selectedSegment?.id;
                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => onSelectSegment(segment.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
                      isActive
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {segment.id}
                      </span>
                      <span className="text-xs text-slate-500">
                        {segment.pageRange.start}-{segment.pageRange.end}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{segment.excerpt}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 p-4">
            {selectedSegment ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Segmento activo</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{selectedSegment.id}</h3>
                  </div>
                  <AdminButton variant="ghost" size="sm" onClick={() => onOpenPdf(selectedSegment.pageRange.start)}>
                    Abrir PDF
                  </AdminButton>
                </div>
                <div className="grid gap-2 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Manual ref:</span> {selectedSegment.manualRef}</p>
                  <p><span className="font-semibold text-slate-900">Paginas:</span> {selectedSegment.pageRange.start}-{selectedSegment.pageRange.end}</p>
                  <p><span className="font-semibold text-slate-900">Capitulo:</span> {selectedSegment.chapterId}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Excerpt</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{selectedSegment.excerpt}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Texto completo</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedSegment.text}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Selecciona un segmento para revisar su contenido y procedencia.</p>
            )}
          </div>
        </div>
      )}
    </AdminPanel>
  );
}

function SnapshotDrawer({
  state,
  onClose,
}: {
  state: {
    title: string;
    subtitle?: string;
    snapshot: ImportReviewQuestionSnapshot | null;
  } | null;
  onClose: () => void;
}) {
  return (
    <AdminPanel
      isOpen={Boolean(state?.snapshot)}
      onClose={onClose}
      title={state?.title ?? 'Referencia'}
      subtitle={state?.subtitle}
      className="absolute inset-y-0 right-0 z-30 w-full max-w-[520px]"
    >
      {state?.snapshot ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Capitulo</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {state.snapshot.chapterId ?? 'Sin capitulo'}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fuente</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {state.snapshot.sourceReference ?? 'Sin referencia'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Enunciado</div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">
              {state.snapshot.prompt}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Opciones</div>
            <div className="mt-3">{renderOptionList(state.snapshot.options, state.snapshot.correctOptionIndexes)}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Explicacion</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {state.snapshot.publicExplanation ?? 'Sin explicacion publica.'}
            </p>
          </div>
        </div>
      ) : null}
    </AdminPanel>
  );
}

function PrepareImportPanel({
  isOpen,
  selectedRun,
  stagedItems,
  chapterOptions,
  onClose,
  onImport,
  onClear,
}: {
  isOpen: boolean;
  selectedRun: ImportReviewRunManifestSummary | null;
  stagedItems: ImportDraftQueueItem[];
  chapterOptions: Array<{ chapterId: string; label: string; pageRange: { start: number; end: number } }>;
  onClose: () => void;
  onImport: () => void;
  onClear: () => void;
}) {
  const chapterDistribution = stagedItems.reduce<Record<string, number>>((accumulator, item) => {
    const chapterId = item.candidate.chapterId ?? 'unknown';
    accumulator[chapterId] = (accumulator[chapterId] ?? 0) + 1;
    return accumulator;
  }, {});
  const warningCount = stagedItems.reduce((sum, item) => sum + item.warnings.length, 0);
  const visualCount = stagedItems.filter((item) => item.candidate.needsVisualAudit).length;
  const correctionCount = stagedItems.filter((item) => Boolean(item.correction)).length;

  return (
    <AdminPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Preparar importacion"
      subtitle={selectedRun ? `Corrida ${selectedRun.runId}` : undefined}
      className="absolute inset-y-0 right-0 z-30 w-full max-w-[560px]"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminCard padding="compact">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Seleccionadas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stagedItems.length}</p>
          </AdminCard>
          <AdminCard padding="compact">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Advertencias</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{warningCount}</p>
          </AdminCard>
          <AdminCard padding="compact">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Auditoria visual</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{visualCount}</p>
          </AdminCard>
          <AdminCard padding="compact">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Correcciones</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{correctionCount}</p>
          </AdminCard>
        </div>

        <AdminCard>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Distribucion por capitulo</p>
          <div className="mt-3 space-y-2">
            {Object.entries(chapterDistribution).length === 0 ? (
              <p className="text-sm text-slate-500">No hay items en el lote.</p>
            ) : (
              Object.entries(chapterDistribution).map(([chapterId, count]) => (
                <div key={chapterId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <span>{getManualChapterLabel(chapterId, chapterOptions)}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resumen del lote</p>
          <div className="mt-3 space-y-2">
            {stagedItems.slice(0, 12).map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-200 px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">{item.externalId}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.candidate.prompt}</p>
              </div>
            ))}
          </div>
        </AdminCard>

        <div className="flex flex-wrap justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClear} disabled={stagedItems.length === 0}>
            Vaciar lote
          </AdminButton>
          <AdminButton variant="outline" onClick={onClose}>
            Cancelar
          </AdminButton>
          <AdminButton variant="secondary" onClick={onImport} disabled={stagedItems.length === 0}>
            Importar como borrador
          </AdminButton>
        </div>
      </div>
    </AdminPanel>
  );
}

function DuplicatesTab({
  runDetail,
  draftItemByKey,
  search,
  batchFilter,
  onSearchChange,
  onBatchFilterChange,
  onStageLoser,
  onDiscardLoser,
}: {
  runDetail: ImportReviewRunDetail;
  draftItemByKey: Map<string, ImportDraftQueueItem>;
  search: string;
  batchFilter: 'all' | 'staged' | 'imported' | 'pending';
  onSearchChange: (value: string) => void;
  onBatchFilterChange: (value: 'all' | 'staged' | 'imported' | 'pending') => void;
  onStageLoser: (candidate: ImportReviewRunDetail['duplicateClusters'][number]['losers'][number]) => void;
  onDiscardLoser: (externalId: string) => void;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredClusters = runDetail.duplicateClusters
    .map((cluster) => ({
      ...cluster,
      losers: cluster.losers.filter((loser) => {
        const draftItem = findDraftItemByExternalId(draftItemByKey, loser.externalId);
        const matchesSearch =
          normalizedSearch.length === 0 ||
          loser.externalId.toLowerCase().includes(normalizedSearch) ||
          loser.question.prompt.toLowerCase().includes(normalizedSearch);
        const matchesBatch =
          batchFilter === 'all' ||
          (batchFilter === 'pending' && !draftItem) ||
          draftItem?.status === batchFilter;
        return matchesSearch && matchesBatch;
      }),
    }))
    .filter((cluster) => cluster.losers.length > 0 || normalizedSearch.length === 0);

  if (filteredClusters.length === 0) {
    return (
      <AdminCard className="flex min-h-0 flex-1 items-center justify-center">
        <AdminEmptyState
          title="Sin duplicados"
          message="Esta corrida no contiene clusters de duplicados internos."
          className="border-0 bg-transparent py-8"
        />
      </AdminCard>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <AdminCard className="mb-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por ID o prompt"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
          <select
            value={batchFilter}
            onChange={(event) => onBatchFilterChange(event.target.value as 'all' | 'staged' | 'imported' | 'pending')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">Todo el lote</option>
            <option value="pending">Pendientes</option>
            <option value="staged">En lote</option>
            <option value="imported">Importadas</option>
          </select>
        </div>
      </AdminCard>
      <div className="grid gap-4">
        {filteredClusters.map((cluster) => (
          <AdminCard key={cluster.clusterId}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cluster</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{cluster.clusterId}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminTooltip label="El ganador se selecciona por calidad estructural, grounding util y mejor salud general del item dentro del cluster.">
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      Quality {cluster.winnerQualityScore}
                    </span>
                  </AdminTooltip>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {cluster.losers.length} perdedoras
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Ganadora</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{cluster.winnerId}</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{cluster.winnerQuestion.prompt}</p>
              </div>

              <div className="space-y-3">
                {cluster.losers.map((loser) => (
                  <div key={`${cluster.clusterId}-${loser.externalId}`} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{loser.externalId}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{loser.question.prompt}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>Similitud {formatPercent(loser.similarityScore)}</p>
                        <p>Quality {loser.qualityScore}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminButton variant="secondary" size="sm" onClick={() => onStageLoser(loser)}>
                        Desagrupar y mover a lote
                      </AdminButton>
                      <AdminButton variant="outline" size="sm" onClick={() => onDiscardLoser(loser.externalId)}>
                        Mantener rechazado
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
