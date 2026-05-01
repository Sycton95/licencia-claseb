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
  type PreparedImportBatchRecord,
  updateImportDraftItem,
  updatePreparedImportBatch,
  upsertImportDraftItem,
} from '../../lib/localImportDraftStore';
import { saveImportDraftAsset } from '../../lib/localImportDraftAssetStore';
import type { ContentCatalog, SourceDocument } from '../../types/content';
import type {
  GeneratedBuildManifest,
  GeneratedReviewCandidate,
} from '../../types/foundry';
import type { PdfGroundingAnchor, PdfRect } from '../../types/pdfReview';

type Props = {
  catalog: ContentCatalog | null;
  sourceDocuments: SourceDocument[];
  actorEmail: string;
  onCatalogUpdated: (catalog: ContentCatalog) => void;
  onOpenCatalogQuestion: (questionId: string) => void;
};

const MANUAL_SOURCE_DOCUMENT_ID = 'manual-claseb-2026';

function getCandidatePage(candidate: GeneratedReviewCandidate) {
  return candidate.sourcePageStart ?? candidate.sourcePageEnd;
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
  const [draftWorkspace, setDraftWorkspace] = useState<ImportDraftWorkspace>(() => loadImportDraftWorkspace());
  const [isPrepareOpen, setIsPrepareOpen] = useState(false);
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
        setBlockedRows(result.blockedRows);
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

  const visualAuditCount = useMemo(
    () => chapterCandidates.filter((candidate) => candidate.needsVisualAudit).length,
    [chapterCandidates],
  );

  const selectedPdfSourceDocument =
    sourceDocuments.find((document) => document.id === MANUAL_SOURCE_DOCUMENT_ID) ?? null;

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
      page: getCandidatePage(candidate),
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
        status: item.status === 'imported' ? 'imported' : item.status === 'staged' ? 'staged' : 'pending',
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
        status: item.status === 'imported' ? 'imported' : item.status === 'staged' ? 'staged' : 'pending',
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Foundry anual
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            Revision de candidatos generados
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Carga por capitulo, revisa evidencia y prepara borradores para Catalogo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedBuild?.buildId ?? ''}
            onChange={(event) => setSelectedBuildId(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
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
          <AdminButton
            size="sm"
            disabled={stagedItems.length === 0}
            onClick={() => setIsPrepareOpen(true)}
          >
            Preparar importacion ({stagedItems.length})
          </AdminButton>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[280px_1fr_440px]">
        <AdminCard className="min-h-0 overflow-y-auto">
          <div className="mb-3 text-sm font-semibold text-slate-900">Capitulos</div>
          <div className="space-y-2">
            {selectedBuild?.chapters.map((chapter) => (
              <button
                key={chapter.chapterId}
                type="button"
                onClick={() => setSelectedChapterId(chapter.chapterId)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedChapterId === chapter.chapterId
                    ? 'border-blue-300 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">{getChapterTitle(catalog, chapter.chapterId)}</div>
                <div className="mt-1 text-xs text-slate-500">{chapter.count} candidatos</div>
              </button>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="min-h-0 overflow-y-auto">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Candidatos</div>
              <div className="text-xs text-slate-500">
                {chapterCandidates.length} cargados · {visualAuditCount} con auditoria visual
              </div>
            </div>
            {blockedRows.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                {blockedRows.length} bloqueados
              </span>
            )}
          </div>

          {isLoadingChapter ? (
            <div className="py-12 text-center text-sm text-slate-500">Cargando capitulo...</div>
          ) : loadError ? (
            <AdminEmptyState title="No se pudo cargar" message={loadError} />
          ) : (
            <div className="space-y-2">
              {chapterCandidates.map((candidate) => {
                const key = selectedBuild
                  ? buildImportDraftKey(selectedBuild.buildId, candidate.externalId)
                  : '';
                const draftItem = draftItemByKey.get(key);
                return (
                  <button
                    key={candidate.externalId}
                    type="button"
                    onClick={() => setSelectedCandidateId(candidate.externalId)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedCandidate?.externalId === candidate.externalId
                        ? 'border-cyan-300 bg-cyan-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                      {candidate.prompt}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                        {candidate.sandboxProvenance.generationMode}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                        {candidate.sandboxProvenance.verifierScore}
                      </span>
                      {draftItem && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                          {draftItem.status === 'imported'
                            ? 'Importada'
                            : draftItem.status === 'staged'
                              ? 'En lote'
                              : draftItem.status === 'discarded'
                                ? 'Descartada'
                                : 'Borrador local'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {chapterCandidates.length === 0 && (
                <AdminEmptyState
                  title="Sin candidatos"
                  message="Este capitulo no contiene candidatos review-ready."
                />
              )}
            </div>
          )}
        </AdminCard>

        <AdminCard className="min-h-0 overflow-y-auto">
          {selectedCandidate ? (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {selectedCandidate.externalId}
                </div>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Detalle del candidato
                </h2>
              </div>
              <section>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Prompt
                </div>
                <p className="text-sm leading-relaxed text-slate-800">{selectedCandidate.prompt}</p>
              </section>
              <section>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Opciones
                </div>
                {renderOptionList(selectedCandidate)}
              </section>
              <section>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Grounding
                </div>
                <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                  {selectedCandidate.groundingExcerpt}
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  {selectedCandidate.sourceReference}
                </div>
              </section>
              <section>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Verificador
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-slate-900">
                    Puntaje {selectedCandidate.sandboxProvenance.verifierScore}
                  </div>
                  {selectedCandidate.sandboxProvenance.verifierIssues.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-slate-600">
                      {selectedCandidate.sandboxProvenance.verifierIssues.map((issue, index) => (
                        <li key={`${issue.code}-${index}`}>{issue.message}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-600">Sin issues del verificador.</p>
                  )}
                </div>
              </section>
              <div className="flex flex-wrap gap-2">
                <AdminButton size="sm" onClick={() => stageCandidate(selectedCandidate)}>
                  Agregar a lote
                </AdminButton>
                <AdminButton
                  variant="outline"
                  size="sm"
                  onClick={() => openPdfWorkspace(selectedCandidate)}
                >
                  Abrir PDF
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => discardCandidate(selectedCandidate)}
                >
                  Descartar
                </AdminButton>
              </div>
            </div>
          ) : (
            <AdminEmptyState
              title="Selecciona un candidato"
              message="El detalle mostrara grounding, verificador y acciones de lote."
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
          {stagedItems.map((item) => (
            <div key={item.key} className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900">{item.candidate.prompt}</div>
              <div className="mt-2 text-xs text-slate-500">
                {item.candidate.chapterId} · {item.warnings.length} advertencias
              </div>
              {item.importedQuestionId && (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-blue-700"
                  onClick={() => onOpenCatalogQuestion(item.importedQuestionId!)}
                >
                  Abrir en Catalogo
                </button>
              )}
            </div>
          ))}
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
