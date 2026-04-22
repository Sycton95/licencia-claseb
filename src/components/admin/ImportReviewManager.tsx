import { useEffect, useMemo, useState } from 'react';
import { AdminButton } from './AdminButton';
import { AdminCard } from './AdminCard';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminTooltip } from './AdminTooltip';
import { loadImportReviewAcceptedCandidates } from '../../data/importReviewAcceptedCandidates';
import { loadManualKnowledgeChapter } from '../../data/manualKnowledgeChapters';
import { MANUAL_KNOWLEDGE_INDEX } from '../../data/manualKnowledgeIndex';
import { loadImportReviewRunDetail } from '../../data/importReviewRunDetails';
import type {
  ImportReviewActionableReviewState,
  ImportReviewIssue,
  ImportReviewIssueAggregate,
  ImportReviewManifest,
  ImportReviewQuestionRecord,
  ImportReviewRejectedCandidate,
  ImportReviewRunDetail,
  ImportReviewRunManifestSummary,
  VersionedManualChapterSegments,
} from '../../types/importReview';

type Props = {
  manifest: ImportReviewManifest;
};

type RunDetailTab = 'overview' | 'actionable' | 'rejected' | 'duplicates';

const TAB_LABELS: Array<{ id: RunDetailTab; label: string }> = [
  { id: 'overview', label: 'Resumen' },
  { id: 'actionable', label: 'Aceptados con Advertencia' },
  { id: 'rejected', label: 'Rechazados' },
  { id: 'duplicates', label: 'Duplicados' },
];

const ISSUE_CODE_EXPLANATIONS: Record<string, string> = {
  invalid_source_page: 'El numero de pagina no existe o esta fuera del rango esperado para la fuente o el capitulo.',
  chapter_scope_mismatch: 'La pregunta parece pertenecer a otro capitulo distinto al asignado en la corrida.',
  missing_grounding_excerpt: 'No se encontro un excerpt manual suficiente para justificar la pregunta.',
  manual_fact_conflict: 'El contenido contradice un dato regulado del manual y debe corregirse antes de aceptar.',
  referenced_duplicate_in_batch: 'La candidata fue desplazada por otra mejor dentro del mismo lote de importacion.',
  duplicate_prompt_existing_bank: 'El prompt es demasiado similar a una pregunta ya existente en el banco revisado.',
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
        if (!current.message && issue.message) {
          current.message = issue.message;
        }
      } else {
        byCode.set(issue.code, {
          code: issue.code,
          count: 1,
          message: issue.message,
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
        message: issue.message,
        externalIds: [],
      });
    }
  });

  return Array.from(byCode.values()).sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
}

function issueCountFromRejected(rejectedCandidates: ImportReviewRejectedCandidate[], issueKey: 'errors' | 'warnings') {
  return rejectedCandidates.reduce((total, candidate) => total + candidate[issueKey].length, 0);
}

export function ImportReviewManager({ manifest }: Props) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(manifest.runs[0]?.runId ?? null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
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
  const [actionableReviewState, setActionableReviewState] = useState<
    Record<string, ImportReviewActionableReviewState>
  >({});

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
    setActionableReviewState({});
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
        setSelectedManualSegmentId(chapter?.segments[0]?.id ?? null);
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

  const actionableItems = useMemo(() => {
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <RunListPanel
          generatedAt={manifest.generatedAt}
          runs={manifest.runs}
          selectedRunId={selectedRun?.runId ?? null}
          onSelectRun={setSelectedRunId}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {selectedRun ? (
            <>
              <RunSummaryPanel run={selectedRun} />
              <TabBar selectedTab={selectedTab} onSelectTab={setSelectedTab} />
              {isLoadingDetail ? (
                <AdminCard className="mt-4 flex min-h-0 flex-1 items-center justify-center text-sm text-slate-500">
                  Cargando detalle de corrida...
                </AdminCard>
              ) : !runDetail ? (
                <AdminCard className="mt-4 flex min-h-[320px] items-center justify-center">
                  <AdminEmptyState
                    title="Sin run-details"
                    message="No se encontro el archivo run-details.json para esta corrida."
                    className="border-0 bg-transparent py-8"
                  />
                </AdminCard>
              ) : (
                <div className="mt-4 flex min-h-0 flex-1 overflow-hidden">
                  {selectedTab === 'overview' ? (
                    <OverviewTab
                      run={selectedRun}
                      rejectedCandidates={runDetail.rejectedCandidates}
                      aggregatedErrors={aggregatedErrors}
                      aggregatedWarnings={aggregatedWarnings}
                      expandedErrorCode={expandedErrorCode}
                      expandedWarningCode={expandedWarningCode}
                      onToggleErrorCode={(code) =>
                        setExpandedErrorCode((current) => (current === code ? null : code))
                      }
                      onToggleWarningCode={(code) =>
                        setExpandedWarningCode((current) => (current === code ? null : code))
                      }
                    />
                  ) : null}

                  {selectedTab === 'actionable' ? (
                    <ActionableTab
                      isLoading={isLoadingAcceptedCandidates}
                      items={actionableItems}
                      reviewState={actionableReviewState}
                      manualChapter={manualChapter}
                      manualChapterId={selectedManualChapterId}
                      manualChapterOptions={MANUAL_KNOWLEDGE_INDEX.chapters}
                      selectedManualSegmentId={selectedManualSegmentId}
                      isLoadingManualChapter={isLoadingManualChapter}
                      onSelectManualChapter={setSelectedManualChapterId}
                      onSelectManualSegment={setSelectedManualSegmentId}
                      onSetReviewState={(externalId, state) =>
                        setActionableReviewState((current) => ({ ...current, [externalId]: state }))
                      }
                    />
                  ) : null}

                  {selectedTab === 'rejected' ? (
                    <RejectedTab
                      runDetail={runDetail}
                      selectedCandidate={selectedCandidate}
                      selectedCandidateId={selectedCandidateId}
                      manualChapter={manualChapter}
                      manualChapterId={selectedManualChapterId}
                      manualChapterOptions={MANUAL_KNOWLEDGE_INDEX.chapters}
                      selectedManualSegmentId={selectedManualSegmentId}
                      isLoadingManualChapter={isLoadingManualChapter}
                      onSelectManualChapter={setSelectedManualChapterId}
                      onSelectManualSegment={setSelectedManualSegmentId}
                      onSelectCandidate={setSelectedCandidateId}
                    />
                  ) : null}

                  {selectedTab === 'duplicates' ? (
                    <DuplicatesTab runDetail={runDetail} />
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
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
    <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
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
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function RunListPanel({
  generatedAt,
  runs,
  selectedRunId,
  onSelectRun,
}: {
  generatedAt: string;
  runs: ImportReviewRunManifestSummary[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}) {
  return (
    <AdminCard className="flex min-h-0 flex-col p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Corridas</p>
        <p className="mt-1 text-sm text-slate-600">Manifest generado {formatDate(generatedAt)}</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {runs.map((run) => {
          const isActive = run.runId === selectedRunId;
          return (
            <button
              key={run.runId}
              type="button"
              onClick={() => onSelectRun(run.runId)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
                isActive
                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{run.runId}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{run.sourceFile}</p>
                </div>
                <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
                  {run.acceptedCount}/{run.acceptedCount + run.rejectedCount}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <span>Aceptadas: {run.acceptedCount}</span>
                <span>Rechazadas: {run.rejectedCount}</span>
                <span>Auto-ground: {run.autoGroundedAcceptedCount}</span>
                <span>Clusters: {run.duplicateClusterCount}</span>
              </div>
            </button>
          );
        })}
      </div>
    </AdminCard>
  );
}

function RunSummaryPanel({ run }: { run: ImportReviewRunManifestSummary }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-5">
        <AdminCard padding="compact">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aceptadas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{run.acceptedCount}</p>
          <p className="text-sm text-slate-600">listas para merge</p>
        </AdminCard>
        <AdminCard padding="compact">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Con warning</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{run.acceptedWithWarningCount}</p>
          <p className="text-sm text-slate-600">requieren auditoria</p>
        </AdminCard>
        <AdminCard padding="compact">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Auto-ground</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{run.autoGroundedAcceptedCount}</p>
          <p className="text-sm text-slate-600">recuperadas por facts/citas</p>
        </AdminCard>
        <AdminCard padding="compact">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Clusters</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-700">{run.duplicateClusterCount}</p>
          <p className="text-sm text-slate-600">duplicados internos</p>
        </AdminCard>
        <AdminCard padding="compact">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ambiguas</p>
          <p className="mt-2 text-2xl font-semibold text-rose-700">{run.ambiguousCandidateCount}</p>
          <p className="text-sm text-slate-600">capitulo incierto</p>
        </AdminCard>
      </div>

      <AdminCard padding="compact" className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Artefactos</p>
            <p className="mt-1 text-sm text-slate-600">
              Corrida revisada {formatDate(run.reviewedAt)}
            </p>
          </div>
          <div className="grid gap-1 text-right text-xs text-slate-500">
            <span>{run.files.reviewLog}</span>
            <span>{run.files.runDetails}</span>
          </div>
        </div>
      </AdminCard>
    </>
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
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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
                  <p className="text-sm font-semibold text-slate-900">{chapter.chapterId}</p>
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
          <p className="mt-1 text-sm text-slate-600">Agrupado por codigo para evitar miles de filas repetidas.</p>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto scrollbar-thin max-h-[50vh] space-y-3 pr-1">
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
                    <AdminTooltip label={getIssueTooltip(item)}>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${panelTone.chip}`}>
                        {item.code}
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
  reviewState,
  manualChapter,
  manualChapterId,
  manualChapterOptions,
  selectedManualSegmentId,
  isLoadingManualChapter,
  onSelectManualChapter,
  onSelectManualSegment,
  onSetReviewState,
}: {
  isLoading: boolean;
  items: Array<{
    summary: ImportReviewRunDetail['autoGroundedAccepted'][number];
    candidate: ImportReviewQuestionRecord | null;
  }>;
  reviewState: Record<string, ImportReviewActionableReviewState>;
  manualChapter: VersionedManualChapterSegments | null;
  manualChapterId: string;
  manualChapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  selectedManualSegmentId: string | null;
  isLoadingManualChapter: boolean;
  onSelectManualChapter: (chapterId: string) => void;
  onSelectManualSegment: (segmentId: string) => void;
  onSetReviewState: (externalId: string, state: ImportReviewActionableReviewState) => void;
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

  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
      <div className="min-h-0 overflow-y-auto pr-1">
        <div className="grid gap-4">
        {items.map(({ summary, candidate }) => {
          const state = reviewState[summary.externalId] ?? 'pending';
          const stateStyles =
            state === 'approved'
              ? 'border-emerald-300 bg-emerald-50/60'
              : state === 'rejected'
                ? 'border-rose-300 bg-rose-50/60'
                : 'border-slate-200 bg-white';

          return (
            <AdminCard key={summary.externalId} className={`border-2 ${stateStyles}`}>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Candidata accionable
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">{summary.externalId}</h3>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        state === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : state === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {state === 'approved' ? 'Aprobada' : state === 'rejected' ? 'Rechazada' : 'Pendiente'}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Prompt</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {candidate?.prompt ?? 'No se encontro el prompt completo en accepted-candidates.'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Opciones</p>
                    <div className="mt-2">
                      {renderOptionList(
                        candidate?.options?.map((option) => option.text) ?? undefined,
                        candidate?.correctOptionIndexes,
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">Explicacion</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {candidate?.publicExplanation || 'Sin explicacion publica.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grounding</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {summary.groundingMode} · confianza {formatPercent(summary.confidence)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Capitulo</p>
                    <p className="mt-1 text-sm text-slate-700">{summary.chapterId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Excerpt</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{summary.groundingExcerpt}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Fact refs</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {summary.manualFactRefs.length > 0 ? summary.manualFactRefs.join(', ') : 'Ninguna'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Citation refs</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {summary.manualCitationRefs.length > 0 ? summary.manualCitationRefs.join(', ') : 'Ninguna'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <AdminButton
                      variant="secondary"
                      size="sm"
                      onClick={() => onSetReviewState(summary.externalId, 'approved')}
                    >
                      Approve
                    </AdminButton>
                    <AdminButton
                      variant="outline"
                      size="sm"
                      onClick={() => onSetReviewState(summary.externalId, 'rejected')}
                    >
                      Reject
                    </AdminButton>
                    {state !== 'pending' ? (
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onSetReviewState(summary.externalId, 'pending')}
                      >
                        Reset
                      </AdminButton>
                    ) : null}
                  </div>
                </div>
              </div>
            </AdminCard>
          );
        })}
        </div>
      </div>
      <ManualBrowserPanel
        chapter={manualChapter}
        chapterId={manualChapterId}
        chapterOptions={manualChapterOptions}
        isLoading={isLoadingManualChapter}
        selectedSegmentId={selectedManualSegmentId}
        onSelectChapter={onSelectManualChapter}
        onSelectSegment={onSelectManualSegment}
      />
    </div>
  );
}

function RejectedTab({
  runDetail,
  selectedCandidate,
  selectedCandidateId,
  manualChapter,
  manualChapterId,
  manualChapterOptions,
  selectedManualSegmentId,
  isLoadingManualChapter,
  onSelectManualChapter,
  onSelectManualSegment,
  onSelectCandidate,
}: {
  runDetail: ImportReviewRunDetail;
  selectedCandidate: ImportReviewRejectedCandidate | null;
  selectedCandidateId: string | null;
  manualChapter: VersionedManualChapterSegments | null;
  manualChapterId: string;
  manualChapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  selectedManualSegmentId: string | null;
  isLoadingManualChapter: boolean;
  onSelectManualChapter: (chapterId: string) => void;
  onSelectManualSegment: (segmentId: string) => void;
  onSelectCandidate: (externalId: string) => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)_360px]">
      <RejectedCandidateList
        runDetail={runDetail}
        selectedCandidateId={selectedCandidateId}
        onSelectCandidate={onSelectCandidate}
      />
      <RejectedCandidateDetail candidate={selectedCandidate} />
      <ManualBrowserPanel
        chapter={manualChapter}
        chapterId={manualChapterId}
        chapterOptions={manualChapterOptions}
        isLoading={isLoadingManualChapter}
        selectedSegmentId={selectedManualSegmentId}
        onSelectChapter={onSelectManualChapter}
        onSelectSegment={onSelectManualSegment}
      />
    </div>
  );
}

function RejectedCandidateList({
  runDetail,
  selectedCandidateId,
  onSelectCandidate,
}: {
  runDetail: ImportReviewRunDetail;
  selectedCandidateId: string | null;
  onSelectCandidate: (externalId: string) => void;
}) {
  return (
    <AdminCard className="flex min-h-0 flex-col p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rechazadas</p>
        <p className="mt-1 text-sm text-slate-600">
          Selecciona una candidata para revisar diff, grounding assistant y agregados por codigo.
        </p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {runDetail.rejectedCandidates.length === 0 ? (
          <AdminEmptyState
            title="Sin rechazos"
            message="Esta corrida no tiene candidatas rechazadas."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          runDetail.rejectedCandidates.map((candidate) => {
            const isActive = candidate.externalId === selectedCandidateId;
            return (
              <button
                key={candidate.externalId}
                type="button"
                onClick={() => onSelectCandidate(candidate.externalId)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
                  isActive
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p className="truncate text-sm font-semibold text-slate-900">{candidate.externalId}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {candidate.normalizedQuestion.prompt}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-rose-100 px-2 py-1 font-medium text-rose-700">
                    {candidate.errors.length} errores
                  </span>
                  {candidate.warnings.length > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700">
                      {candidate.warnings.length} warnings
                    </span>
                  ) : null}
                  {candidate.duplicateSimilarityScore ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-1 font-medium text-indigo-700">
                      {formatPercent(candidate.duplicateSimilarityScore)}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </AdminCard>
  );
}

function RejectedCandidateDetail({ candidate }: { candidate: ImportReviewRejectedCandidate | null }) {
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

  return (
    <AdminCard className="min-h-0 overflow-y-auto space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Similarity Diff</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{candidate.externalId}</h2>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p>Score: {formatPercent(candidate.duplicateSimilarityScore)}</p>
          <p>
            Match: {candidate.duplicateMatchScope ?? 'N/A'} / {candidate.duplicateMatchId ?? 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Candidata importada</p>
          <div>
            <p className="text-sm font-semibold text-slate-900">Prompt</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{left.prompt}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Opciones</p>
            <div className="mt-2">
              {renderOptionList(left.options.map((option) => option.text), left.correctOptionIndexes)}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Explicacion</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {left.publicExplanation || 'Sin explicacion publica.'}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Match mas cercano</p>
          <div>
            <p className="text-sm font-semibold text-slate-900">Prompt</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {right?.prompt || candidate.duplicateMatchPrompt || 'Sin snapshot disponible.'}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Opciones</p>
            <div className="mt-2">{renderOptionList(right?.options, right?.correctOptionIndexes)}</div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Explicacion</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {right?.publicExplanation || 'Sin explicacion publica.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IssueGroupCard title="Motivos de rechazo" tone="error" items={groupedErrors} />
        <IssueGroupCard title="Senales auxiliares" tone="warning" items={groupedWarnings} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Senales complementarias</p>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>Capitulo: {left.chapterId || 'Sin clasificar'}</p>
          <p>Grounding: {left.groundingExcerpt || 'Sin excerpt generado'}</p>
          <p>Modo grounding: {left.groundingMode || 'missing'}</p>
          <p>Fact refs: {(left.manualFactRefs ?? []).join(', ') || 'Ninguna'}</p>
          <p>Citation refs: {(left.manualCitationRefs ?? []).join(', ') || 'Ninguna'}</p>
          <p>Quality score: {left.qualityScore ?? 'N/A'}</p>
        </div>
      </div>

      <GroundingAssistant candidate={candidate} />
    </AdminCard>
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
              <AdminTooltip label={getIssueTooltip(item)}>
                <span className="font-semibold">{item.code}</span>
              </AdminTooltip>
              <span className="ml-2 text-slate-600">({item.count})</span>
              <div className="mt-1 text-slate-700">{item.message}</div>
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Grounding Assistant</p>
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

function ManualBrowserPanel({
  chapter,
  chapterId,
  chapterOptions,
  isLoading,
  selectedSegmentId,
  onSelectChapter,
  onSelectSegment,
}: {
  chapter: VersionedManualChapterSegments | null;
  chapterId: string;
  chapterOptions: Array<{
    chapterId: string;
    label: string;
    pageRange: { start: number; end: number };
  }>;
  isLoading: boolean;
  selectedSegmentId: string | null;
  onSelectChapter: (chapterId: string) => void;
  onSelectSegment: (segmentId: string) => void;
}) {
  const selectedSegment =
    chapter?.segments.find((segment) => segment.id === selectedSegmentId) ?? chapter?.segments[0] ?? null;

  return (
    <AdminCard className="flex min-h-0 flex-col overflow-hidden p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Manual Browser</p>
        <p className="mt-1 text-sm text-slate-600">Consulta segmentos versionados sin mutar artefactos.</p>
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" htmlFor="manual-chapter-select">
          Capitulo
        </label>
        <select
          id="manual-chapter-select"
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
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-sm text-slate-500">
          Cargando segmentos del manual...
        </div>
      ) : !chapter ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <AdminEmptyState
            title="Sin segmentos"
            message="No se encontro el archivo versionado para este capitulo."
            className="border-0 bg-transparent py-8"
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,0.9fr)_minmax(220px,1.1fr)] overflow-hidden">
          <div className="min-h-0 overflow-y-auto border-b border-slate-200 p-3">
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

          <div className="min-h-0 overflow-y-auto p-4">
            {selectedSegment ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Segmento activo</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{selectedSegment.id}</h3>
                </div>
                <div className="grid gap-2 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Manual ref:</span> {selectedSegment.manualRef}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Paginas:</span> {selectedSegment.pageRange.start}-{selectedSegment.pageRange.end}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Capitulo:</span> {selectedSegment.chapterId}
                  </p>
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
    </AdminCard>
  );
}

function DuplicatesTab({ runDetail }: { runDetail: ImportReviewRunDetail }) {
  if (runDetail.duplicateClusters.length === 0) {
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
      <div className="grid gap-4">
        {runDetail.duplicateClusters.map((cluster) => (
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
