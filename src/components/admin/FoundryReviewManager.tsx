import { useEffect, useMemo, useState } from 'react';
import { AdminButton } from './AdminButton';
import { AdminCard } from './AdminCard';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminImportPdfWorkspace } from './AdminImportPdfWorkspace';
import { AdminPanel } from './AdminPanel';
import {
  getGeneratedBuildManifests,
  loadGeneratedBuildChapter,
} from '../../data/generatedFoundryBuilds';
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
  type ImportDraftWorkspace,
  updateImportDraftItem,
  updatePreparedImportBatch,
  upsertImportDraftItem,
} from '../../lib/localImportDraftStore';
import { saveImportDraftAsset } from '../../lib/localImportDraftAssetStore';
import type { ContentCatalog, SourceDocument } from '../../types/content';
import type {
  GeneratedBuildDiagnosticsSummary,
  GeneratedBuildManifest,
  GeneratedChapterDiagnosticsSummary,
  GeneratedChapterLoadResult,
  GeneratedReviewBucket,
  GeneratedReviewCandidate,
  GeneratedVerifierBand,
} from '../../types/foundry';
import type { PdfGroundingAnchor, PdfRect } from '../../types/pdfReview';

type Props = {
  catalog: ContentCatalog | null;
  sourceDocuments: SourceDocument[];
  actorEmail: string;
  onCatalogUpdated: (catalog: ContentCatalog) => void;
  onOpenCatalogQuestion: (questionId: string) => void;
};

type CandidateStatus = ImportDraftQueueItem['status'] | 'pending';

const MANUAL_SOURCE_DOCUMENT_ID = 'manual-claseb-2026';

function getCandidatePage(candidate: GeneratedReviewCandidate) {
  return candidate.sourcePageStart ?? candidate.sourcePageEnd ?? null;
}

function getChapterTitle(catalog: ContentCatalog | null, chapterId: string) {
  return catalog?.chapters.find((chapter) => chapter.id === chapterId)?.title ?? chapterId;
}

function buildFoundryWarnings(candidate: GeneratedReviewCandidate) {
  const warnings = candidate.sandboxProvenance.verifierIssues.map((issue) => ({
    code: issue.code,
    message: issue.message,
  }));

  if (candidate.needsVisualAudit) {
    warnings.push({
      code: 'needs_visual_audit',
      message: 'Requiere auditoria visual antes de publicarse.',
    });
  }

  return warnings;
}

function renderOptionList(candidate: GeneratedReviewCandidate) {
  const correct = new Set(candidate.correctOptionIndexes);

  return (
    <div className="space-y-2">
      {candidate.options.map((option, index) => (
        <div
          key={`${candidate.externalId}-${index}`}
          className={`rounded-lg border px-3 py-2 text-sm ${
            correct.has(index)
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          <span className="mr-2 font-semibold text-slate-500">
            {String.fromCharCode(65 + index)}.
          </span>
          {option.text}
        </div>
      ))}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return 'Sin fecha';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function getRequiredMediaCount(candidate: GeneratedReviewCandidate) {
  return (
    candidate.sandboxProvenance.requiredMedia?.assetIds.length ??
    candidate.sandboxProvenance.visualSupport?.assetIds.length ??
    0
  );
}

function getCandidateStatus(
  buildId: string | null,
  candidate: GeneratedReviewCandidate,
  draftItemByKey: Map<string, ImportDraftQueueItem>,
): CandidateStatus {
  if (!buildId) {
    return 'pending';
  }

  const key = buildImportDraftKey(buildId, candidate.externalId);
  return draftItemByKey.get(key)?.status ?? 'pending';
}

function getStatusPresentation(status: CandidateStatus) {
  switch (status) {
    case 'staged':
      return {
        label: 'En lote',
        className: 'bg-blue-100 text-blue-800 border border-blue-200',
      };
    case 'discarded':
      return {
        label: 'Descartada',
        className: 'bg-rose-100 text-rose-800 border border-rose-200',
      };
    case 'imported':
      return {
        label: 'Importada',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      };
    default:
      return {
        label: 'Pendiente',
        className: 'bg-slate-100 text-slate-700 border border-slate-200',
      };
  }
}

function getVerifierBand(score: number): GeneratedVerifierBand {
  if (score >= 0.85) {
    return 'high';
  }
  if (score >= 0.7) {
    return 'medium';
  }
  return 'low';
}

function getVerifierBandPresentation(band: GeneratedVerifierBand) {
  switch (band) {
    case 'high':
      return {
        label: 'Alta confianza',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      };
    case 'medium':
      return {
        label: 'Confianza media',
        className: 'bg-amber-100 text-amber-800 border border-amber-200',
      };
    default:
      return {
        label: 'Confianza baja',
        className: 'bg-rose-100 text-rose-800 border border-rose-200',
      };
  }
}

function hasContractGap(candidate: GeneratedReviewCandidate) {
  if (!candidate.prompt.trim()) {
    return true;
  }

  if (!candidate.options.length || !candidate.correctOptionIndexes.length) {
    return true;
  }

  if (!candidate.groundingExcerpt.trim()) {
    return true;
  }

  if (!candidate.sourceReference?.trim() && getCandidatePage(candidate) === null) {
    return true;
  }

  return false;
}

function isMediaDependent(candidate: GeneratedReviewCandidate, draftItem?: ImportDraftQueueItem) {
  const requiredMediaCount = getRequiredMediaCount(candidate);
  const localAssetCount = draftItem?.assets.length ?? 0;
  return candidate.needsVisualAudit || (requiredMediaCount > 0 && localAssetCount < requiredMediaCount);
}

function getCandidateBucket(
  candidate: GeneratedReviewCandidate,
  draftItem?: ImportDraftQueueItem,
): GeneratedReviewBucket {
  if (hasContractGap(candidate)) {
    return 'blocked';
  }

  if (isMediaDependent(candidate, draftItem)) {
    return 'media-dependent';
  }

  if (candidate.sandboxProvenance.verifierIssues.length > 0) {
    return 'warning-only';
  }

  return 'review-ready';
}

function getBucketPresentation(bucket: GeneratedReviewBucket) {
  switch (bucket) {
    case 'blocked':
      return {
        label: 'Bloqueada',
        className: 'bg-rose-100 text-rose-800 border border-rose-200',
      };
    case 'media-dependent':
      return {
        label: 'Requiere apoyo visual',
        className: 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200',
      };
    case 'warning-only':
      return {
        label: 'Con advertencias',
        className: 'bg-amber-100 text-amber-800 border border-amber-200',
      };
    default:
      return {
        label: 'Lista para revision',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      };
  }
}

function summarizeChapter(
  result: GeneratedChapterLoadResult | null,
  buildId: string,
  draftItemByKey: Map<string, ImportDraftQueueItem>,
): GeneratedChapterDiagnosticsSummary {
  const summary: GeneratedChapterDiagnosticsSummary = {
    chapterId: result?.chapterId ?? '',
    totalCount: result?.candidates.length ?? 0,
    blockedCount: 0,
    blockedRowCount: result?.blockedRows.length ?? 0,
    mediaDependentCount: 0,
    warningOnlyCount: 0,
    reviewReadyCount: 0,
  };

  if (!result) {
    return summary;
  }

  result.candidates.forEach((candidate) => {
    const key = buildImportDraftKey(buildId, candidate.externalId);
    const bucket = getCandidateBucket(candidate, draftItemByKey.get(key));
    if (bucket === 'blocked') {
      summary.blockedCount += 1;
    } else if (bucket === 'media-dependent') {
      summary.mediaDependentCount += 1;
    } else if (bucket === 'warning-only') {
      summary.warningOnlyCount += 1;
    } else {
      summary.reviewReadyCount += 1;
    }
  });

  return summary;
}

function buildDiagnosticsSummary(
  buildId: string,
  chapterSummaries: GeneratedChapterDiagnosticsSummary[],
): GeneratedBuildDiagnosticsSummary {
  return chapterSummaries.reduce<GeneratedBuildDiagnosticsSummary>(
    (summary, chapter) => ({
      buildId,
      totalCount: summary.totalCount + chapter.totalCount,
      blockedCount: summary.blockedCount + chapter.blockedCount,
      blockedRowCount: summary.blockedRowCount + chapter.blockedRowCount,
      mediaDependentCount: summary.mediaDependentCount + chapter.mediaDependentCount,
      warningOnlyCount: summary.warningOnlyCount + chapter.warningOnlyCount,
      reviewReadyCount: summary.reviewReadyCount + chapter.reviewReadyCount,
    }),
    {
      buildId,
      totalCount: 0,
      blockedCount: 0,
      blockedRowCount: 0,
      mediaDependentCount: 0,
      warningOnlyCount: 0,
      reviewReadyCount: 0,
    },
  );
}

function getCandidateSummaryLine(
  candidate: GeneratedReviewCandidate,
  draftItem: ImportDraftQueueItem | undefined,
  bucket: GeneratedReviewBucket,
) {
  const warningCount = candidate.sandboxProvenance.verifierIssues.length;
  const mediaCount = getRequiredMediaCount(candidate);
  if (bucket === 'blocked') {
    return 'Falta evidencia minima para revisar o importar este candidato.';
  }
  if (bucket === 'media-dependent') {
    if ((draftItem?.assets.length ?? 0) > 0) {
      return `Tiene ${draftItem?.assets.length ?? 0} referencia(s) local(es) y aun requiere apoyo visual.`;
    }
    return mediaCount > 0
      ? `Requiere ${mediaCount} referencia(s) visual(es) antes de importarse.`
      : 'La auditoria visual sigue pendiente para este candidato.';
  }
  if (bucket === 'warning-only') {
    return `${warningCount} advertencia(s) del verificador; sigue siendo revisable.`;
  }
  return 'Cuenta con evidencia suficiente para revision editorial normal.';
}

function MetricCard({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number | string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'fuchsia';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : tone === 'rose'
          ? 'bg-rose-50 text-rose-900 border-rose-200'
          : tone === 'blue'
            ? 'bg-blue-50 text-blue-900 border-blue-200'
            : tone === 'fuchsia'
              ? 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200'
              : 'bg-slate-50 text-slate-900 border-slate-200';

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {eyebrow}
      </div>
      {title ? <h3 className="mt-1 text-sm font-bold text-slate-900">{title}</h3> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function FoundryReviewManager({
  catalog,
  sourceDocuments,
  actorEmail,
  onCatalogUpdated,
  onOpenCatalogQuestion,
}: Props) {
  const manifests = useMemo(() => getGeneratedBuildManifests(), []);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(
    manifests[0]?.buildId ?? null,
  );
  const selectedBuild = useMemo(
    () => manifests.find((manifest) => manifest.buildId === selectedBuildId) ?? manifests[0] ?? null,
    [manifests, selectedBuildId],
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    selectedBuild?.chapters[0]?.chapterId ?? null,
  );
  const [chapterCandidates, setChapterCandidates] = useState<GeneratedReviewCandidate[]>([]);
  const [blockedRows, setBlockedRows] = useState<Array<{ lineNumber: number; error: string }>>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftWorkspace, setDraftWorkspace] = useState<ImportDraftWorkspace>(() =>
    loadImportDraftWorkspace(),
  );
  const [isPrepareOpen, setIsPrepareOpen] = useState(false);
  const [chapterResultsById, setChapterResultsById] = useState<Record<string, GeneratedChapterLoadResult | null>>(
    {},
  );
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [pdfRequest, setPdfRequest] = useState<{
    page?: number;
    excerpt?: string;
    textAnchor?: PdfGroundingAnchor['textAnchor'];
    bbox?: PdfRect | null;
    bboxSource?: string;
    title?: string;
    itemKey?: string;
  } | null>(null);

  useEffect(() => {
    setSelectedChapterId(selectedBuild?.chapters[0]?.chapterId ?? null);
    setSelectedCandidateId(null);
    setChapterCandidates([]);
    setBlockedRows([]);
    setChapterResultsById({});
  }, [selectedBuild?.buildId]);

  useEffect(() => {
    if (!selectedBuild || !selectedChapterId) {
      setChapterCandidates([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingChapter(true);
    setLoadError(null);

    void loadGeneratedBuildChapter(selectedBuild.buildId, selectedChapterId)
      .then((result) => {
        if (isCancelled) {
          return;
        }

        if (!result) {
          setChapterCandidates([]);
          setBlockedRows([]);
          setLoadError('No se encontro el archivo JSONL de este capitulo.');
          return;
        }

        setChapterCandidates(result.candidates);
        setBlockedRows(result.blockedRows.map((row) => ({ lineNumber: row.lineNumber, error: row.error })));
        setSelectedCandidateId((current) =>
          result.candidates.some((candidate) => candidate.externalId === current)
            ? current
            : result.candidates[0]?.externalId ?? null,
        );
      })
      .catch((error) => {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el capitulo.');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingChapter(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedBuild, selectedChapterId]);

  useEffect(() => {
    if (!selectedBuild) {
      return;
    }

    let isCancelled = false;
    setIsLoadingDiagnostics(true);

    void Promise.all(
      selectedBuild.chapters.map(async (chapter) => ({
        chapterId: chapter.chapterId,
        result: await loadGeneratedBuildChapter(selectedBuild.buildId, chapter.chapterId),
      })),
    )
      .then((entries) => {
        if (isCancelled) {
          return;
        }
        const nextMap: Record<string, GeneratedChapterLoadResult | null> = {};
        entries.forEach(({ chapterId, result }) => {
          nextMap[chapterId] = result;
        });
        setChapterResultsById(nextMap);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingDiagnostics(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedBuild]);

  const buildDraftItems = useMemo(
    () =>
      selectedBuild
        ? draftWorkspace.queue.filter((item) => item.runId === selectedBuild.buildId)
        : [],
    [draftWorkspace.queue, selectedBuild],
  );

  const draftItemByKey = useMemo(
    () => new Map(buildDraftItems.map((item) => [item.key, item] as const)),
    [buildDraftItems],
  );

  const stagedItems = buildDraftItems.filter((item) => item.status === 'staged');
  const latestPreparedBatch = useMemo(
    () =>
      selectedBuild
        ? draftWorkspace.preparedBatches.find(
            (batch) => batch.runId === selectedBuild.buildId && !batch.revertedAt,
          ) ?? null
        : null,
    [draftWorkspace.preparedBatches, selectedBuild],
  );

  const selectedCandidate = useMemo(
    () =>
      chapterCandidates.find((candidate) => candidate.externalId === selectedCandidateId) ??
      chapterCandidates[0] ??
      null,
    [chapterCandidates, selectedCandidateId],
  );

  const selectedCandidateDraftItem = useMemo(() => {
    if (!selectedBuild || !selectedCandidate) {
      return null;
    }
    return draftItemByKey.get(buildImportDraftKey(selectedBuild.buildId, selectedCandidate.externalId)) ?? null;
  }, [draftItemByKey, selectedBuild, selectedCandidate]);

  const selectedCandidateBucket = useMemo(
    () =>
      selectedCandidate
        ? getCandidateBucket(selectedCandidate, selectedCandidateDraftItem ?? undefined)
        : null,
    [selectedCandidate, selectedCandidateDraftItem],
  );

  const selectedPdfSourceDocument =
    sourceDocuments.find((document) => document.id === MANUAL_SOURCE_DOCUMENT_ID) ?? null;

  const chapterDiagnostics = useMemo(() => {
    if (!selectedBuild) {
      return new Map<string, GeneratedChapterDiagnosticsSummary>();
    }

    const map = new Map<string, GeneratedChapterDiagnosticsSummary>();
    selectedBuild.chapters.forEach((chapter) => {
      const summary = summarizeChapter(
        chapterResultsById[chapter.chapterId] ?? null,
        selectedBuild.buildId,
        draftItemByKey,
      );
      map.set(chapter.chapterId, {
        ...summary,
        chapterId: chapter.chapterId,
      });
    });
    return map;
  }, [chapterResultsById, draftItemByKey, selectedBuild]);

  const buildDiagnostics = useMemo(() => {
    if (!selectedBuild) {
      return null;
    }
    return buildDiagnosticsSummary(selectedBuild.buildId, Array.from(chapterDiagnostics.values()));
  }, [chapterDiagnostics, selectedBuild]);

  const syncWorkspace = (workspace: ImportDraftWorkspace) => {
    setDraftWorkspace(workspace);
  };

  const ensureDraftItem = (
    candidate: GeneratedReviewCandidate,
    nextStatus: ImportDraftQueueItem['status'] = 'pending',
  ) => {
    if (!selectedBuild) {
      return null;
    }

    const key = buildImportDraftKey(selectedBuild.buildId, candidate.externalId);
    const existing = draftItemByKey.get(key);
    const item: ImportDraftQueueItem = {
      key,
      runId: selectedBuild.buildId,
      externalId: candidate.externalId,
      source: 'foundry',
      status:
        existing?.status === 'imported'
          ? 'imported'
          : nextStatus === 'staged'
            ? 'staged'
            : existing?.status === 'staged'
              ? 'staged'
              : nextStatus,
      addedAt: existing?.addedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      importedQuestionId: existing?.importedQuestionId,
      candidate,
      warnings: buildFoundryWarnings(candidate),
      errors: existing?.errors ?? [],
      correction: existing?.correction,
      assets: existing?.assets ?? [],
    };

    syncWorkspace(upsertImportDraftItem(item));
    return key;
  };

  const stageCandidate = (candidate: GeneratedReviewCandidate) => {
    return ensureDraftItem(candidate, 'staged');
  };

  const discardCandidate = (candidate: GeneratedReviewCandidate) => {
    const key = ensureDraftItem(candidate, 'discarded');
    if (!key) {
      return;
    }

    syncWorkspace(
      updateImportDraftItem(key, (item) => ({
        ...item,
        status: 'discarded',
        updatedAt: new Date().toISOString(),
      })),
    );
  };

  const openPdfWorkspace = (candidate: GeneratedReviewCandidate) => {
    const key = selectedBuild
      ? buildImportDraftKey(selectedBuild.buildId, candidate.externalId)
      : undefined;
    const primaryAnchor = candidate.sandboxProvenance.groundingAnchors?.[0];
    setPdfRequest({
      page: getCandidatePage(candidate) ?? undefined,
      excerpt: candidate.groundingExcerpt,
      textAnchor: primaryAnchor?.textAnchor,
      bbox:
        primaryAnchor?.bbox && typeof primaryAnchor.bbox === 'object'
          ? (primaryAnchor.bbox as PdfRect)
          : null,
      bboxSource: primaryAnchor?.bboxSource,
      title: candidate.externalId,
      itemKey: key,
    });
  };

  const handleApplyPdfSelection = (payload: { text: string; page: number; excerpt?: string }) => {
    if (!selectedCandidate || !payload.text.trim()) {
      return;
    }

    const itemKey = ensureDraftItem(selectedCandidate, 'pending');
    if (!itemKey) {
      return;
    }

    setPdfRequest((current) => (current ? { ...current, itemKey } : current));

    syncWorkspace(
      updateImportDraftItem(itemKey, (item) => ({
        ...item,
        status:
          item.status === 'imported' ? 'imported' : item.status === 'staged' ? 'staged' : 'pending',
        updatedAt: new Date().toISOString(),
        correction: {
          replacementText: payload.text.trim(),
          source: 'pdf_selection',
          page: payload.page,
          excerpt: payload.excerpt,
          updatedAt: new Date().toISOString(),
        },
      })),
    );
  };

  const handleSaveDraftAsset = async (payload: {
    blob: Blob;
    kind: 'crop' | 'upload';
    page?: number;
    name: string;
    previewDataUrl?: string;
  }) => {
    if (!selectedCandidate) {
      return;
    }

    const itemKey = ensureDraftItem(selectedCandidate, 'pending');
    if (!itemKey) {
      return;
    }

    setPdfRequest((current) => (current ? { ...current, itemKey } : current));
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

    syncWorkspace(
      updateImportDraftItem(itemKey, (item) => ({
        ...item,
        status:
          item.status === 'imported' ? 'imported' : item.status === 'staged' ? 'staged' : 'pending',
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
      })),
    );
  };

  const handleImportStagedBatch = async () => {
    if (!selectedBuild || !catalog || stagedItems.length === 0) {
      return;
    }

    const { catalog: updatedCatalog, preparedBatch } = await importDraftBatchToLocalCatalog({
      catalog,
      runId: selectedBuild.buildId,
      sourceFile: `data/foundry-builds/${selectedBuild.buildId}/manifest.json`,
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
                preparedBatch.importedQuestionIds[preparedBatch.stagedKeys.indexOf(item.key)] ??
                item.importedQuestionId,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    };

    syncWorkspace(workspace);
    onCatalogUpdated(updatedCatalog);
    setIsPrepareOpen(false);
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

  if (manifests.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <AdminEmptyState
          title="Sin builds Foundry"
          message="Promueve un build con npm run foundry:promote -- <buildId> para habilitar revision."
        />
      </div>
    );
  }

  const selectedStatusPresentation = getStatusPresentation(
    selectedBuild && selectedCandidate
      ? getCandidateStatus(selectedBuild.buildId, selectedCandidate, draftItemByKey)
      : 'pending',
  );
  const selectedBucketPresentation = selectedCandidateBucket
    ? getBucketPresentation(selectedCandidateBucket)
    : null;
  const selectedVerifierPresentation = selectedCandidate
    ? getVerifierBandPresentation(getVerifierBand(selectedCandidate.sandboxProvenance.verifierScore))
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
      <div className="mb-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Foundry anual
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold text-slate-900">
              Revision de candidatos generados
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              La prioridad de este carril es revisar evidencia, aclarar el estado editorial y
              preparar borradores importables sin tocar el sandbox.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBuild?.buildId ?? ''}
              onChange={(event) => setSelectedBuildId(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              {manifests.map((manifest) => (
                <option key={manifest.buildId} value={manifest.buildId}>
                  {manifest.buildId}
                </option>
              ))}
            </select>
            <AdminButton
              variant="outline"
              size="sm"
              disabled={!latestPreparedBatch}
              onClick={() => void handleUndoLastBatch()}
            >
              Revertir ultimo lote
            </AdminButton>
            <AdminButton size="sm" disabled={stagedItems.length === 0} onClick={() => setIsPrepareOpen(true)}>
              Preparar importacion ({stagedItems.length})
            </AdminButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <MetricCard label="Build activo" value={selectedBuild?.buildId ?? 'Sin build'} tone="blue" />
          <MetricCard
            label="Generado"
            value={selectedBuild?.generatedAt ? formatDate(selectedBuild.generatedAt) : 'Sin fecha'}
          />
          <MetricCard label="Total candidatos" value={buildDiagnostics?.totalCount ?? 0} />
          <MetricCard label="En lote" value={stagedItems.length} tone="blue" />
          <MetricCard label="Bloqueadas" value={buildDiagnostics?.blockedCount ?? 0} tone="rose" />
          <MetricCard
            label="Listas para revision"
            value={buildDiagnostics?.reviewReadyCount ?? 0}
            tone="emerald"
          />
          <MetricCard
            label="Apoyo visual"
            value={buildDiagnostics?.mediaDependentCount ?? 0}
            tone="fuchsia"
          />
        </div>

        {latestPreparedBatch ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Ultimo lote preparado: {latestPreparedBatch.stagedKeys.length} item(s) el{' '}
            {formatDate(latestPreparedBatch.createdAt)}.
          </div>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[320px_minmax(360px,1fr)_520px]">
        <AdminCard className="min-h-0 overflow-y-auto" padding="compact">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
              Contexto del build
            </div>
            <div className="mt-2 text-lg font-bold">{selectedBuild?.buildId}</div>
            <div className="mt-1 text-sm text-slate-300">
              {selectedBuild?.manualYear ? `Manual ${selectedBuild.manualYear}` : 'Sin ano manual'}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <div className="uppercase tracking-wide text-slate-300">Capitulos</div>
                <div className="mt-1 text-base font-bold">{selectedBuild?.chapters.length ?? 0}</div>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2">
                <div className="uppercase tracking-wide text-slate-300">Filas bloqueadas</div>
                <div className="mt-1 text-base font-bold">{buildDiagnostics?.blockedRowCount ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Capitulos</div>
              <div className="text-xs text-slate-500">
                {isLoadingDiagnostics ? 'Actualizando diagnosticos...' : 'Resumen por capitulo'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {selectedBuild?.chapters.map((chapter) => {
              const summary = chapterDiagnostics.get(chapter.chapterId);
              const chapterIsSelected = selectedChapterId === chapter.chapterId;
              return (
                <button
                  key={chapter.chapterId}
                  type="button"
                  onClick={() => setSelectedChapterId(chapter.chapterId)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    chapterIsSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {getChapterTitle(catalog, chapter.chapterId)}
                      </div>
                      <div
                        className={`mt-1 text-xs ${
                          chapterIsSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {summary?.totalCount ?? chapter.count} candidato(s)
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        chapterIsSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {summary?.blockedCount ?? 0} bloqueadas
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className={`rounded-xl px-2 py-2 ${chapterIsSelected ? 'bg-white/10' : 'bg-emerald-50 text-emerald-900'}`}>
                      <div className={chapterIsSelected ? 'text-slate-300' : 'text-emerald-700'}>
                        Lista
                      </div>
                      <div className="mt-1 font-bold">{summary?.reviewReadyCount ?? 0}</div>
                    </div>
                    <div className={`rounded-xl px-2 py-2 ${chapterIsSelected ? 'bg-white/10' : 'bg-amber-50 text-amber-900'}`}>
                      <div className={chapterIsSelected ? 'text-slate-300' : 'text-amber-700'}>
                        Adv.
                      </div>
                      <div className="mt-1 font-bold">{summary?.warningOnlyCount ?? 0}</div>
                    </div>
                    <div className={`rounded-xl px-2 py-2 ${chapterIsSelected ? 'bg-white/10' : 'bg-fuchsia-50 text-fuchsia-900'}`}>
                      <div className={chapterIsSelected ? 'text-slate-300' : 'text-fuchsia-700'}>
                        Visual
                      </div>
                      <div className="mt-1 font-bold">{summary?.mediaDependentCount ?? 0}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard className="min-h-0 overflow-y-auto" padding="compact">
          <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Cola de revision</div>
                <div className="text-xs text-slate-500">
                  {chapterCandidates.length} candidato(s) en este capitulo
                </div>
              </div>
              {blockedRows.length > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                  {blockedRows.length} fila(s) bloqueadas
                </span>
              ) : null}
            </div>
          </div>

          {isLoadingChapter ? (
            <div className="py-12 text-center text-sm text-slate-500">Cargando capitulo...</div>
          ) : loadError ? (
            <AdminEmptyState title="No se pudo cargar" message={loadError} />
          ) : (
            <div className="space-y-3">
              {chapterCandidates.map((candidate) => {
                const key = selectedBuild ? buildImportDraftKey(selectedBuild.buildId, candidate.externalId) : '';
                const draftItem = draftItemByKey.get(key);
                const status = getCandidateStatus(selectedBuild?.buildId ?? null, candidate, draftItemByKey);
                const statusPresentation = getStatusPresentation(status);
                const bucket = getCandidateBucket(candidate, draftItem);
                const bucketPresentation = getBucketPresentation(bucket);
                const verifierPresentation = getVerifierBandPresentation(
                  getVerifierBand(candidate.sandboxProvenance.verifierScore),
                );
                const page = getCandidatePage(candidate);
                return (
                  <button
                    key={candidate.externalId}
                    type="button"
                    onClick={() => setSelectedCandidateId(candidate.externalId)}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      selectedCandidate?.externalId === candidate.externalId
                        ? 'border-slate-900 bg-slate-950 text-white shadow-lg'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-semibold leading-6">
                          {candidate.prompt}
                        </div>
                        <div
                          className={`mt-2 text-xs leading-relaxed ${
                            selectedCandidate?.externalId === candidate.externalId
                              ? 'text-slate-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {getCandidateSummaryLine(candidate, draftItem, bucket)}
                        </div>
                      </div>
                      <div
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          selectedCandidate?.externalId === candidate.externalId
                            ? 'bg-white/10 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {page ? `Pag. ${page}` : 'Sin pag.'}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className={`rounded-full px-2 py-1 ${statusPresentation.className}`}>
                        {statusPresentation.label}
                      </span>
                      <span className={`rounded-full px-2 py-1 ${bucketPresentation.className}`}>
                        {bucketPresentation.label}
                      </span>
                      <span className={`rounded-full px-2 py-1 ${verifierPresentation.className}`}>
                        {verifierPresentation.label}
                      </span>
                      {candidate.needsVisualAudit ? (
                        <span className="rounded-full border border-fuchsia-200 bg-fuchsia-100 px-2 py-1 text-fuchsia-800">
                          Auditoria visual
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
              {chapterCandidates.length === 0 ? (
                <AdminEmptyState
                  title="Sin candidatos"
                  message="Este capitulo no contiene candidatos review-ready."
                />
              ) : null}
            </div>
          )}
        </AdminCard>

        <AdminCard className="min-h-0 overflow-y-auto" padding="compact">
          {selectedCandidate ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {selectedCandidate.externalId}
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Detalle editorial</h2>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className={`rounded-full px-2 py-1 ${selectedStatusPresentation.className}`}>
                      {selectedStatusPresentation.label}
                    </span>
                    {selectedBucketPresentation ? (
                      <span className={`rounded-full px-2 py-1 ${selectedBucketPresentation.className}`}>
                        {selectedBucketPresentation.label}
                      </span>
                    ) : null}
                    {selectedVerifierPresentation ? (
                      <span className={`rounded-full px-2 py-1 ${selectedVerifierPresentation.className}`}>
                        {selectedVerifierPresentation.label}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <Section eyebrow="Question" title="Pregunta y opciones">
                <p className="text-sm leading-relaxed text-slate-800">{selectedCandidate.prompt}</p>
                <div className="mt-4">{renderOptionList(selectedCandidate)}</div>
              </Section>

              <Section eyebrow="Grounding" title="Soporte manual">
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  {selectedCandidate.sourceReference ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {selectedCandidate.sourceReference}
                    </span>
                  ) : null}
                  {getCandidatePage(selectedCandidate) ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      Pagina {getCandidatePage(selectedCandidate)}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    {selectedCandidate.sandboxProvenance.groundingAnchors?.length
                      ? `${selectedCandidate.sandboxProvenance.groundingAnchors.length} ancla(s)`
                      : 'Sin anclas estructuradas'}
                  </span>
                </div>
                <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                  {selectedCandidate.groundingExcerpt}
                </p>
                {selectedCandidate.sandboxProvenance.groundingAnchors?.length ? (
                  <div className="mt-3 space-y-2">
                    {selectedCandidate.sandboxProvenance.groundingAnchors.slice(0, 2).map((anchor, index) => (
                      <div key={`${selectedCandidate.externalId}-anchor-${index}`} className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                        <div className="font-semibold text-slate-900">
                          {anchor.pageNumber ? `Pagina ${anchor.pageNumber}` : 'Ancla sin pagina'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {anchor.bboxSource ? `Fuente geometrica: ${anchor.bboxSource}` : 'Sin bbox local'}
                        </div>
                        <div className="mt-2 line-clamp-3 text-sm leading-relaxed">{anchor.excerpt}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4">
                  <AdminButton variant="outline" size="sm" onClick={() => openPdfWorkspace(selectedCandidate)}>
                    Abrir PDF
                  </AdminButton>
                </div>
              </Section>

              <Section eyebrow="Verifier" title="Senales del verificador">
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Puntaje {selectedCandidate.sandboxProvenance.verifierScore.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    Modo {selectedCandidate.sandboxProvenance.generationMode}
                  </span>
                </div>
                {selectedCandidate.sandboxProvenance.verifierIssues.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {selectedCandidate.sandboxProvenance.verifierIssues.map((issue, index) => (
                      <li key={`${issue.code}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <div className="font-semibold">{issue.message}</div>
                        <details className="mt-2 text-xs text-amber-800">
                          <summary className="cursor-pointer font-semibold">Detalle tecnico</summary>
                          <div className="mt-2">Codigo: {issue.code}</div>
                          {issue.severity ? <div>Severidad: {issue.severity}</div> : null}
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    Sin advertencias del verificador. La revision puede enfocarse en claridad editorial.
                  </p>
                )}
              </Section>

              <Section eyebrow="Visual" title="Apoyo visual y medios">
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        selectedCandidate.needsVisualAudit
                          ? 'bg-fuchsia-100 text-fuchsia-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedCandidate.needsVisualAudit
                        ? 'Requiere auditoria visual'
                        : 'Sin auditoria visual pendiente'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {getRequiredMediaCount(selectedCandidate)} medio(s) requerido(s)
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {selectedCandidateDraftItem?.assets.length ?? 0} referencia(s) local(es)
                    </span>
                  </div>
                  {selectedCandidate.sandboxProvenance.requiredMedia?.assetIds.length ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      Asset IDs requeridos: {selectedCandidate.sandboxProvenance.requiredMedia.assetIds.join(', ')}
                    </div>
                  ) : null}
                </div>
              </Section>

              <Section eyebrow="Draft state" title="Borrador local y referencias">
                <div className="space-y-3">
                  {selectedCandidateDraftItem?.correction ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                      <div className="font-semibold">Correccion local guardada</div>
                      <div className="mt-2 leading-relaxed">
                        {selectedCandidateDraftItem.correction.replacementText}
                      </div>
                      <div className="mt-2 text-xs text-blue-800">
                        Fuente: {selectedCandidateDraftItem.correction.source} · pagina{' '}
                        {selectedCandidateDraftItem.correction.page ?? 'sin pagina'}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      Sin correccion textual local.
                    </div>
                  )}

                  {selectedCandidateDraftItem?.assets.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedCandidateDraftItem.assets.map((asset) => (
                        <div key={asset.assetId} className="rounded-xl border border-slate-200 bg-white p-3">
                          {asset.previewDataUrl ? (
                            <img
                              src={asset.previewDataUrl}
                              alt={asset.name}
                              className="h-28 w-full rounded-lg border border-slate-200 object-contain"
                            />
                          ) : (
                            <div className="flex h-28 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
                              Sin preview
                            </div>
                          )}
                          <div className="mt-2 text-sm font-semibold text-slate-900">{asset.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {asset.page ? `Pagina ${asset.page}` : 'Sin pagina'} ·{' '}
                            {Math.round(asset.byteSize / 1024)} KB
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      Sin referencias visuales locales guardadas.
                    </div>
                  )}

                  {selectedCandidateDraftItem?.importedQuestionId ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-blue-700"
                      onClick={() => onOpenCatalogQuestion(selectedCandidateDraftItem.importedQuestionId!)}
                    >
                      Abrir borrador importado en Catalogo
                    </button>
                  ) : null}
                </div>
              </Section>

              <Section eyebrow="Actions" title="Acciones del revisor">
                <div className="flex flex-wrap gap-2">
                  <AdminButton size="sm" onClick={() => stageCandidate(selectedCandidate)}>
                    Agregar a lote
                  </AdminButton>
                  <AdminButton variant="outline" size="sm" onClick={() => openPdfWorkspace(selectedCandidate)}>
                    Abrir PDF
                  </AdminButton>
                  <AdminButton variant="ghost" size="sm" onClick={() => discardCandidate(selectedCandidate)}>
                    Descartar
                  </AdminButton>
                </div>
              </Section>
            </div>
          ) : (
            <AdminEmptyState
              title="Selecciona un candidato"
              message="El detalle mostrara pregunta, grounding, verificador, apoyo visual y acciones."
            />
          )}
        </AdminCard>
      </div>

      <AdminPanel
        isOpen={isPrepareOpen}
        onClose={() => setIsPrepareOpen(false)}
        title="Preparar importacion Foundry"
        subtitle={`${stagedItems.length} candidatos seleccionados`}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setIsPrepareOpen(false)}>
              Cancelar
            </AdminButton>
            <AdminButton
              variant="outline"
              onClick={() => {
                let workspace = draftWorkspace;
                stagedItems.forEach((item) => {
                  workspace = removeImportDraftItem(item.key);
                });
                syncWorkspace(workspace);
                setIsPrepareOpen(false);
              }}
            >
              Limpiar lote
            </AdminButton>
            <AdminButton onClick={() => void handleImportStagedBatch()}>
              Importar como borrador
            </AdminButton>
          </>
        }
      >
        <div className="space-y-3">
          {stagedItems.map((item) => {
            const bucket = getCandidateBucket(item.candidate as GeneratedReviewCandidate, item);
            const bucketPresentation = getBucketPresentation(bucket);
            return (
              <div key={item.key} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900">{item.candidate.prompt}</div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${bucketPresentation.className}`}>
                    {bucketPresentation.label}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {item.candidate.chapterId} · {item.warnings.length} advertencia(s) ·{' '}
                  {item.assets.length} referencia(s)
                </div>
                {item.importedQuestionId ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-blue-700"
                    onClick={() => onOpenCatalogQuestion(item.importedQuestionId!)}
                  >
                    Abrir en Catalogo
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </AdminPanel>

      <AdminImportPdfWorkspace
        isOpen={Boolean(pdfRequest)}
        sourceDocument={selectedPdfSourceDocument}
        page={pdfRequest?.page}
        excerpt={pdfRequest?.excerpt}
        textAnchor={pdfRequest?.textAnchor}
        bbox={pdfRequest?.bbox}
        bboxSource={pdfRequest?.bboxSource}
        title={pdfRequest?.title}
        subtitle="Grounding Foundry para revision."
        allowDraftTools
        onClose={() => setPdfRequest(null)}
        onApplySelection={handleApplyPdfSelection}
        onSaveAsset={(payload) => void handleSaveDraftAsset(payload)}
      />
    </div>
  );
}
