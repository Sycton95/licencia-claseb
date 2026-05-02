import React, { useState, useEffect, useMemo } from 'react';
import { AdminImportPdfWorkspace } from './AdminImportPdfWorkspace';
import { AdminButton } from './AdminButton';
import { AdminEmptyState } from './AdminEmptyState';
import {
  getGeneratedBuildManifests,
  loadGeneratedBuildChapter,
  loadGeneratedBuildDuplicates,
} from '../../data/generatedFoundryBuilds';
import {
  buildImportDraftKey,
  loadImportDraftWorkspace,
  saveImportDraftWorkspace,
  type ImportDraftQueueItem,
  type ImportDraftWorkspace,
} from '../../lib/localImportDraftStore';
import {
  buildFoundryDuplicateMembershipMap,
  summarizeFoundryDuplicateState,
} from '../../lib/foundryDuplicateReview';
import {
  loadFoundryDuplicateReviewWorkspace,
  removeFoundryDuplicateDecision,
  upsertFoundryDuplicateDecision,
  type FoundryDuplicateReviewWorkspace,
} from '../../lib/foundryDuplicateReviewStore';
import type { ContentCatalog, SourceDocument } from '../../types/content';
import type {
  GeneratedBuildManifest,
  GeneratedDuplicateArtifact,
  GeneratedDuplicateCluster,
  FoundryDuplicateReviewDecision,
  GeneratedReviewCandidate,
} from '../../types/foundry';
import type { PdfRect } from '../../types/pdfReview';
import {
  AlertTriangleIcon as AlertTriangle,
  CloseIcon as X,
  BookOpenIcon as BookOpen,
  ArrowLeftIcon as ArrowLeft,
  ChevronRightIcon as ChevronRight,
  DatabaseIcon as Database,
  SearchIcon,
} from './AdminIcons';

type Props = {
  catalog: ContentCatalog | null;
  sourceDocuments: SourceDocument[];
  actorEmail: string;
  onCatalogUpdated: (catalog: ContentCatalog) => void;
  onOpenCatalogQuestion: (questionId: string) => void;
};

const MANUAL_SOURCE_DOCUMENT_ID = 'manual-claseb-2026';

type CandidateStatus = ImportDraftQueueItem['status'] | 'pending';

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
        className: 'bg-blue-100 text-blue-800',
      };
    case 'discarded':
      return {
        label: 'Descartada',
        className: 'bg-rose-100 text-rose-800',
      };
    case 'imported':
      return {
        label: 'Importada',
        className: 'bg-emerald-100 text-emerald-800',
      };
    default:
      return {
        label: 'Pendiente',
        className: 'bg-slate-100 text-slate-700',
      };
  }
}

export function FoundryReviewManager({
  catalog,
  sourceDocuments,
  actorEmail,
  onCatalogUpdated,
  onOpenCatalogQuestion,
}: Props) {
  const manifests = useMemo(() => getGeneratedBuildManifests(), []);
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState<boolean>(false);

  // Data fetching state for the active build
  const [candidates, setCandidates] = useState<GeneratedReviewCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [draftWorkspace, setDraftWorkspace] = useState<ImportDraftWorkspace>(() => loadImportDraftWorkspace());
  const [duplicateArtifact, setDuplicateArtifact] = useState<GeneratedDuplicateArtifact | null>(null);
  const [duplicateReviewWorkspace, setDuplicateReviewWorkspace] =
    useState<FoundryDuplicateReviewWorkspace>(() => loadFoundryDuplicateReviewWorkspace());

  const activeManifest = useMemo(
    () => manifests.find((m) => m.buildId === activeBuildId),
    [manifests, activeBuildId],
  );

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.externalId === selectedQuestionId) ?? null,
    [candidates, selectedQuestionId],
  );

  const buildDraftItems = useMemo(
    () =>
      activeManifest
        ? draftWorkspace.queue.filter((item) => item.runId === activeManifest.buildId)
        : [],
    [draftWorkspace.queue, activeManifest],
  );

  const duplicateDecisions = useMemo(
    () =>
      duplicateReviewWorkspace.decisions.filter(
        (decision) => decision.runId === activeBuildId,
      ),
    [duplicateReviewWorkspace.decisions, activeBuildId],
  );

  const duplicateMembershipMap = useMemo(
    () =>
      buildFoundryDuplicateMembershipMap(duplicateArtifact?.clusters ?? []),
    [duplicateArtifact],
  );

  const duplicateSummary = useMemo(
    () =>
      activeBuildId
        ? summarizeFoundryDuplicateState({
            runId: activeBuildId,
            clusters: duplicateArtifact?.clusters ?? [],
            decisions: duplicateDecisions,
            stagedItems: buildDraftItems.filter((item) => item.status === 'staged'),
          })
        : null,
    [activeBuildId, buildDraftItems, duplicateArtifact, duplicateDecisions],
  );

  const selectedDuplicateCluster = useMemo(() => {
    if (!selectedCandidate) {
      return null;
    }
    const membership = duplicateMembershipMap.get(selectedCandidate.externalId);
    if (!membership) {
      return null;
    }
    return (
      duplicateArtifact?.clusters.find(
        (cluster) => cluster.clusterId === membership.clusterId,
      ) ?? null
    );
  }, [duplicateArtifact, duplicateMembershipMap, selectedCandidate]);

  const selectedDuplicateDecision = useMemo(() => {
    if (!selectedDuplicateCluster || !activeBuildId) {
      return null;
    }
    return (
      duplicateDecisions.find(
        (decision) =>
          decision.runId === activeBuildId &&
          decision.clusterId === selectedDuplicateCluster.clusterId,
      ) ?? null
    );
  }, [activeBuildId, duplicateDecisions, selectedDuplicateCluster]);

  const draftItemByKey = useMemo(
    () => new Map(buildDraftItems.map((item) => [item.key, item] as const)),
    [buildDraftItems],
  );

  const selectedPdfSourceDocument =
    sourceDocuments.find((document) => document.id === MANUAL_SOURCE_DOCUMENT_ID) ?? null;

  // Setup PDF state logic mapped from candidate anchors
  const primaryAnchor = selectedCandidate?.sandboxProvenance.groundingAnchors?.[0];
  const pdfRequest = selectedCandidate ? {
    page: selectedCandidate.sourcePageStart ?? selectedCandidate.sourcePageEnd ?? undefined,
    excerpt: selectedCandidate.groundingExcerpt,
    textAnchor: primaryAnchor?.textAnchor,
    bbox: primaryAnchor?.bbox && typeof primaryAnchor.bbox === 'object' ? (primaryAnchor.bbox as PdfRect) : null,
    bboxSource: primaryAnchor?.bboxSource,
  } : null;

  // Ensure cleanup on state transitions
  const handleCloseInspector = () => {
    setSelectedQuestionId(null);
    setIsPdfOpen(false);
  };

  const handleBackToBuilds = () => {
    setActiveBuildId(null);
    handleCloseInspector();
  };

  useEffect(() => {
    if (!activeManifest) {
      setCandidates([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingCandidates(true);

    Promise.all(
      activeManifest.chapters.map((ch) =>
        loadGeneratedBuildChapter(activeManifest.buildId, ch.chapterId),
      ),
    )
      .then((results) => {
        if (isCancelled) return;
        const allCandidates = results.flatMap((r) => (r ? r.candidates : []));
        setCandidates(allCandidates);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingCandidates(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeManifest]);

  useEffect(() => {
    if (!activeManifest) {
      setDuplicateArtifact(null);
      return;
    }
    setDuplicateArtifact(loadGeneratedBuildDuplicates(activeManifest.buildId));
  }, [activeManifest]);

  const applyDuplicateDecision = (
    cluster: GeneratedDuplicateCluster,
    selectedExternalIds: string[],
    decisionMode: FoundryDuplicateReviewDecision['decisionMode'],
  ) => {
    if (!activeBuildId) {
      return;
    }

    const decision: FoundryDuplicateReviewDecision = {
      runId: activeBuildId,
      clusterId: cluster.clusterId,
      familyKey: cluster.familyKey,
      suggestedWinnerId: cluster.suggestedWinnerId,
      selectedExternalIds,
      decisionMode,
      reviewedAt: new Date().toISOString(),
    };

    const nextWorkspace = upsertFoundryDuplicateDecision(decision);
    setDuplicateReviewWorkspace(nextWorkspace);

    const memberMap = new Map(
      cluster.members.map((member) => [member.externalId, member] as const),
    );
    setDraftWorkspace((previousWorkspace) => {
      const queue = previousWorkspace.queue.map((item) => {
        if (item.runId !== activeBuildId || !memberMap.has(item.externalId)) {
          return item;
        }
        const member = memberMap.get(item.externalId);
        return {
          ...item,
          updatedAt: decision.reviewedAt,
          duplicateReview: {
            clusterId: cluster.clusterId,
            familyKey: cluster.familyKey,
            suggestedWinnerId: cluster.suggestedWinnerId,
            decisionMode,
            selectedExternalIds,
            similarityToSuggested: member?.similarityToSuggested,
            reviewerSummary: cluster.reviewerSummary,
            reviewedAt: decision.reviewedAt,
          },
        };
      });
      const nextDraftWorkspace = {
        ...previousWorkspace,
        queue,
      };
      saveImportDraftWorkspace(nextDraftWorkspace);
      return nextDraftWorkspace;
    });
  };

  const clearDuplicateDecision = (cluster: GeneratedDuplicateCluster) => {
    if (!activeBuildId) {
      return;
    }
    const nextWorkspace = removeFoundryDuplicateDecision(
      activeBuildId,
      cluster.clusterId,
    );
    setDuplicateReviewWorkspace(nextWorkspace);

    const memberIds = new Set(cluster.members.map((member) => member.externalId));
    setDraftWorkspace((previousWorkspace) => {
      const queue = previousWorkspace.queue.map((item) => {
        if (item.runId !== activeBuildId || !memberIds.has(item.externalId)) {
          return item;
        }
        return {
          ...item,
          updatedAt: new Date().toISOString(),
          duplicateReview: undefined,
        };
      });
      const nextDraftWorkspace = {
        ...previousWorkspace,
        queue,
      };
      saveImportDraftWorkspace(nextDraftWorkspace);
      return nextDraftWorkspace;
    });
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-50">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {activeBuildId === null ? (
          <MasterListMode manifests={manifests} onSelect={setActiveBuildId} />
        ) : (
          <>
            {isPdfOpen ? (
              <AdminImportPdfWorkspace
                inline
                isOpen={true}
                sourceDocument={selectedPdfSourceDocument}
                page={pdfRequest?.page}
                excerpt={pdfRequest?.excerpt}
                textAnchor={pdfRequest?.textAnchor}
                bbox={pdfRequest?.bbox}
                bboxSource={pdfRequest?.bboxSource}
                title={selectedCandidate?.externalId}
                allowDraftTools={false}
                onClose={() => setIsPdfOpen(false)}
              />
            ) : (
              <WorkspaceGrid
                manifest={activeManifest}
                candidates={candidates}
                draftItemByKey={draftItemByKey}
                duplicateArtifact={duplicateArtifact}
                duplicateMembershipMap={duplicateMembershipMap}
                resolvedDuplicateClusterIds={
                  new Set(duplicateDecisions.map((decision) => decision.clusterId))
                }
                duplicateSummary={duplicateSummary}
                isLoading={isLoadingCandidates}
                selectedId={selectedQuestionId}
                onSelect={(id) => {
                  setSelectedQuestionId(id);
                  setIsPdfOpen(false);
                }}
                onBack={handleBackToBuilds}
              />
            )}

            {selectedQuestionId !== null && selectedCandidate && (
              <InspectorPanel
                candidate={selectedCandidate}
                duplicateCluster={selectedDuplicateCluster}
                duplicateDecision={selectedDuplicateDecision}
                onClose={handleCloseInspector}
                isPdfOpen={isPdfOpen}
                onOpenPdf={() => setIsPdfOpen(true)}
                onApplyDuplicateDecision={applyDuplicateDecision}
                onClearDuplicateDecision={clearDuplicateDecision}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MasterListMode({
  manifests,
  onSelect,
}: {
  manifests: GeneratedBuildManifest[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 font-serif text-3xl font-bold text-slate-900">
          Builds Maestros
        </h1>
        {manifests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <AdminEmptyState
              title="Sin builds Foundry"
              message="Promueve un build con npm run foundry:promote -- <buildId> para habilitar revision."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {manifests.map((manifest) => (
              <button
                key={manifest.buildId}
                onClick={() => onSelect(manifest.buildId)}
                className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-center gap-5">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Database size={24} />
                  </div>
                  <div>
                    <h3 className="font-mono text-lg font-bold text-slate-900">
                      {manifest.buildId}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {manifest.manualYear ? `Manual ${manifest.manualYear}` : 'Sin año manual'}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>{manifest.chapters.length} capítulo(s)</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="flex gap-6 text-sm">
                    <div className="flex flex-col text-right">
                      <span className="text-slate-500">Total de Items</span>
                      <span className="font-semibold text-slate-900">{manifest.exportedCount}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-slate-500">Duplicados</span>
                      <span className="font-semibold text-slate-900">
                        {manifest.duplicateClusterCount ?? 0}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-400 opacity-50 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceGrid({
  manifest,
  candidates,
  draftItemByKey,
  duplicateArtifact,
  duplicateMembershipMap,
  resolvedDuplicateClusterIds,
  duplicateSummary,
  isLoading,
  selectedId,
  onSelect,
  onBack,
}: {
  manifest?: GeneratedBuildManifest;
  candidates: GeneratedReviewCandidate[];
  draftItemByKey: Map<string, ImportDraftQueueItem>;
  duplicateArtifact: GeneratedDuplicateArtifact | null;
  duplicateMembershipMap: Map<
    string,
    {
      clusterId: string;
      familyKey: string;
      suggestedWinnerId: string;
      similarityToSuggested?: number;
    }
  >;
  resolvedDuplicateClusterIds: Set<string>;
  duplicateSummary: ReturnType<typeof summarizeFoundryDuplicateState> | null;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [trustFilter, setTrustFilter] = useState<'all' | 'high' | 'low'>('all');
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [alertsOnly, setAlertsOnly] = useState(false);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Search
      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        if (
          !c.externalId.toLowerCase().includes(lowerQ) &&
          !c.prompt.toLowerCase().includes(lowerQ)
        ) {
          return false;
        }
      }
      // Chapter Filter
      if (chapterFilter !== 'all' && c.chapterId !== chapterFilter) return false;
      // Review score
      if (trustFilter === 'high' && c.sandboxProvenance.verifierScore < 80) return false;
      if (trustFilter === 'low' && c.sandboxProvenance.verifierScore >= 80) return false;
      // Alerts
      if (alertsOnly && c.sandboxProvenance.verifierIssues.length === 0) return false;

      return true;
    });
  }, [candidates, searchQuery, chapterFilter, trustFilter, alertsOnly]);

  const uniqueChapters = useMemo(() => {
    const chapters = new Set(candidates.map((c) => c.chapterId));
    return Array.from(chapters).sort();
  }, [candidates]);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Workspace
            </div>
            <div className="font-mono text-sm font-bold text-slate-900">
              {manifest?.buildId ?? 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50/50 px-6 py-3">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Buscar por ID o Pregunta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={chapterFilter}
          onChange={(e) => setChapterFilter(e.target.value)}
        >
          <option value="all">Todos los capítulos</option>
          {uniqueChapters.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={trustFilter}
          onChange={(e) => setTrustFilter(e.target.value as any)}
        >
          <option value="all">Cualquier puntaje de revisión</option>
          <option value="high">&ge; 80 Alta Confianza</option>
          <option value="low">&lt; 80 Baja Confianza</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            checked={alertsOnly}
            onChange={(e) => setAlertsOnly(e.target.checked)}
          />
          Solo con Alertas
        </label>
      </div>

      <div className="grid grid-cols-4 gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <MetricCard
          label="Duplicados"
          value={duplicateArtifact?.clusterCount ?? 0}
          tone="slate"
        />
        <MetricCard
          label="Sin resolver"
          value={duplicateSummary?.unresolvedClusterCount ?? 0}
          tone={(duplicateSummary?.unresolvedClusterCount ?? 0) > 0 ? 'amber' : 'emerald'}
        />
        <MetricCard
          label="Overrides"
          value={duplicateSummary?.overriddenClusterCount ?? 0}
          tone="blue"
        />
        <MetricCard
          label="Multi-keep"
          value={duplicateSummary?.multiKeepClusterCount ?? 0}
          tone="violet"
        />
      </div>

      <div className="relative flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Cargando candidatos...
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm backdrop-blur">
              <tr>
                <th className="border-b border-slate-200 px-6 py-3 font-semibold text-slate-600">
                  ID de Pregunta
                </th>
                <th className="w-40 border-b border-slate-200 px-6 py-3 font-semibold text-slate-600">
                  Puntaje de revisión
                </th>
                <th className="w-24 border-b border-slate-200 px-6 py-3 font-semibold text-slate-600">
                  Alertas
                </th>
                <th className="border-b border-slate-200 px-6 py-3 font-semibold text-slate-600">
                  Vista Previa
                </th>
                <th className="border-b border-slate-200 px-6 py-3 font-semibold text-slate-600">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((c) => {
                const isSelected = selectedId === c.externalId;
                const scorePercent = Math.round(c.sandboxProvenance.verifierScore);
                const isHighTrust = scorePercent >= 80;
                const alertsCount = c.sandboxProvenance.verifierIssues.length;
                const draftStatus = getCandidateStatus(manifest?.buildId ?? null, c, draftItemByKey);
                const statusPresentation = getStatusPresentation(draftStatus);
                const duplicateMembership = duplicateMembershipMap.get(c.externalId);
                const hasUnresolvedDuplicate =
                  duplicateMembership !== undefined &&
                  !resolvedDuplicateClusterIds.has(duplicateMembership.clusterId);

                return (
                  <tr
                    key={c.externalId}
                    onClick={() => onSelect(c.externalId)}
                    className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">
                      {c.externalId}
                    </td>
                    <td className="px-6 py-4" title={`Puntaje de revisión: ${scorePercent}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full ${isHighTrust ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[11px] font-bold text-slate-600">
                          {scorePercent}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {alertsCount > 0 ? (
                        <div 
                          className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 w-fit px-2 py-1 rounded-md border border-amber-200"
                          title={`${alertsCount} alerta(s) de verificación`}
                        >
                          <AlertTriangle size={14} />
                          {alertsCount}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="max-w-md truncate px-6 py-4 text-slate-900">
                      {c.prompt}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusPresentation.className}`}>
                          {statusPresentation.label}
                        </span>
                        {duplicateMembership ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                              hasUnresolvedDuplicate
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-violet-100 text-violet-800'
                            }`}
                            title={`Cluster ${duplicateMembership.clusterId}`}
                          >
                            {hasUnresolvedDuplicate ? 'Duplicado pendiente' : 'Duplicado resuelto'}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCandidates.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-sm text-slate-500">
                    No hay candidatos que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InspectorPanel({
  candidate,
  duplicateCluster,
  duplicateDecision,
  onClose,
  isPdfOpen,
  onOpenPdf,
  onApplyDuplicateDecision,
  onClearDuplicateDecision,
}: {
  candidate: GeneratedReviewCandidate;
  duplicateCluster: GeneratedDuplicateCluster | null;
  duplicateDecision: FoundryDuplicateReviewDecision | null;
  onClose: () => void;
  isPdfOpen: boolean;
  onOpenPdf: () => void;
  onApplyDuplicateDecision: (
    cluster: GeneratedDuplicateCluster,
    selectedExternalIds: string[],
    decisionMode: FoundryDuplicateReviewDecision['decisionMode'],
  ) => void;
  onClearDuplicateDecision: (cluster: GeneratedDuplicateCluster) => void;
}) {
  const scorePercent = Math.round(candidate.sandboxProvenance.verifierScore);

  return (
    <div className="z-20 flex w-[600px] flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl xl:w-[800px]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Inspector
          </div>
          <h2 className="font-mono text-sm font-bold text-slate-900">
            {candidate.externalId}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
          title="Cerrar panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          
          {/* A. Question */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Pregunta
            </h3>
            <p className="text-base font-medium leading-relaxed text-slate-900">
              {candidate.prompt}
            </p>

            <ul className="mt-4 space-y-3">
              {candidate.options.map((opt, i) => {
                const isCorrect = candidate.correctOptionIndexes.includes(i);
                return (
                  <li
                    key={i}
                    className={`rounded-xl border p-4 text-sm transition-colors ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[11px] font-bold ${
                          isCorrect
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="leading-relaxed font-medium">{opt.text}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {candidate.publicExplanation && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Explicación Pública
                </h4>
                <p className="text-sm text-slate-700">{candidate.publicExplanation}</p>
              </div>
            )}
          </div>

          {/* B. Grounding */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Fundamentación
              </h3>
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Pág. {candidate.sourcePageStart ?? '?'} 
                {candidate.sourcePageEnd && candidate.sourcePageEnd !== candidate.sourcePageStart ? `-${candidate.sourcePageEnd}` : ''}
              </div>
            </div>
            
            <div className="relative rounded-xl bg-slate-50 p-4">
              <p className="whitespace-pre-wrap font-serif text-sm italic leading-relaxed text-slate-700">
                "{candidate.groundingExcerpt}"
              </p>
            </div>

            {!isPdfOpen && (
              <button
                onClick={onOpenPdf}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <BookOpen size={18} />
                Abrir PDF
              </button>
            )}
          </div>

          {/* C. Verifier */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Verificador
            </h3>
            
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Puntaje de revisión
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-lg font-bold ${scorePercent >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {scorePercent}%
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    {scorePercent >= 80 ? 'Alta Confianza' : 'Baja Confianza'}
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Modo de generación
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {candidate.sandboxProvenance.generationMode}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Dependencia visual
                </div>
                <div className="font-mono text-sm font-semibold text-slate-900">
                  {candidate.sandboxProvenance.visualDependency === 'required'
                    ? 'visual'
                    : candidate.sandboxProvenance.visualDependency === 'linked'
                      ? 'mixto'
                      : 'texto'}
                </div>
              </div>
            </div>

            {candidate.sandboxProvenance.verifierIssues.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <AlertTriangle size={16} />
                  Alertas Heurísticas ({candidate.sandboxProvenance.verifierIssues.length})
                </div>
                <ul className="list-inside list-disc space-y-1">
                  {candidate.sandboxProvenance.verifierIssues.map((i, idx) => (
                    <li key={idx}>{i.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* D. Visual requirements (Lightweight for now) */}
          {candidate.needsVisualAudit && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                Apoyo Visual Requerido
              </h3>
              <p className="text-sm text-blue-900">
                Este candidato requiere un elemento visual para ser evaluado correctamente.
              </p>
            </div>
          )}

          {duplicateCluster ? (
            <DuplicateClusterSection
              cluster={duplicateCluster}
              activeExternalId={candidate.externalId}
              decision={duplicateDecision}
              onApplyDecision={onApplyDuplicateDecision}
              onClearDecision={onClearDuplicateDecision}
            />
          ) : null}

        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'amber' | 'emerald' | 'blue' | 'violet';
}) {
  const toneClasses =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : tone === 'blue'
          ? 'border-blue-200 bg-blue-50 text-blue-900'
          : tone === 'violet'
            ? 'border-violet-200 bg-violet-50 text-violet-900'
            : 'border-slate-200 bg-slate-50 text-slate-900';

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function DuplicateClusterSection({
  cluster,
  activeExternalId,
  decision,
  onApplyDecision,
  onClearDecision,
}: {
  cluster: GeneratedDuplicateCluster;
  activeExternalId: string;
  decision: FoundryDuplicateReviewDecision | null;
  onApplyDecision: (
    cluster: GeneratedDuplicateCluster,
    selectedExternalIds: string[],
    decisionMode: FoundryDuplicateReviewDecision['decisionMode'],
  ) => void;
  onClearDecision: (cluster: GeneratedDuplicateCluster) => void;
}) {
  const [multiKeepSelection, setMultiKeepSelection] = useState<string[]>(
    decision?.selectedExternalIds.length
      ? decision.selectedExternalIds
      : [cluster.suggestedWinnerId],
  );

  useEffect(() => {
    setMultiKeepSelection(
      decision?.selectedExternalIds.length
        ? decision.selectedExternalIds
        : [cluster.suggestedWinnerId],
    );
  }, [cluster.clusterId, cluster.suggestedWinnerId, decision]);

  const toggleSelection = (externalId: string) => {
    setMultiKeepSelection((current) =>
      current.includes(externalId)
        ? current.filter((value) => value !== externalId)
        : [...current, externalId],
    );
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-800">
            Revisión de duplicados
          </h3>
          <p className="mt-2 text-sm text-violet-950">
            {cluster.reviewerSummary ??
              `Cluster duplicado con ${cluster.members.length} candidatos competidores.`}
          </p>
          <p className="mt-1 text-xs text-violet-700">
            Sugerida: <span className="font-mono font-semibold">{cluster.suggestedWinnerId}</span>
          </p>
        </div>
        {decision ? (
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-800">
            {decision.decisionMode === 'multi_keep'
              ? 'Multi-keep'
              : decision.decisionMode === 'manual_winner'
                ? 'Override'
                : 'Sugerida'}
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Pendiente
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {cluster.members.map((member) => {
          const isSuggested = member.externalId === cluster.suggestedWinnerId;
          const isActive = member.externalId === activeExternalId;
          const isSelected = multiKeepSelection.includes(member.externalId);

          return (
            <div
              key={member.externalId}
              className={`rounded-xl border p-4 ${
                isActive
                  ? 'border-violet-400 bg-white'
                  : 'border-violet-200 bg-white/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700">
                      {member.externalId}
                    </span>
                    {isSuggested ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Sugerida
                      </span>
                    ) : null}
                    {isActive ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                        Abierta
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{member.prompt}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                    <span>Capítulo: {member.chapterId}</span>
                    <span>Página: {member.sourcePageStart ?? 's/d'}</span>
                    <span>Score: {Math.round(member.verifierScore)}</span>
                    <span>Issues: {member.verifierIssueCount}</span>
                    <span>
                      Similitud: {member.similarityToSuggested != null ? Math.round(member.similarityToSuggested * 100) : 0}%
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(member.externalId)}
                  />
                  Mantener
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AdminButton
          variant="primary"
          size="sm"
          onClick={() =>
            onApplyDecision(cluster, [cluster.suggestedWinnerId], 'suggested_winner')
          }
        >
          Aceptar sugerida
        </AdminButton>
        <AdminButton
          label="Guardar selección"
          size="sm"
          tone="secondary"
          onClick={() => {
            if (multiKeepSelection.length === 0) {
              return;
            }
            if (multiKeepSelection.length === 1) {
              const selectedId = multiKeepSelection[0];
              onApplyDecision(
                cluster,
                [selectedId],
                selectedId === cluster.suggestedWinnerId
                  ? 'suggested_winner'
                  : 'manual_winner',
              );
              return;
            }
            onApplyDecision(cluster, multiKeepSelection, 'multi_keep');
          }}
        />
        {decision ? (
          <AdminButton
            label="Limpiar decisión"
            size="sm"
            tone="ghost"
            onClick={() => onClearDecision(cluster)}
          />
        ) : null}
      </div>
    </div>
  );
}
