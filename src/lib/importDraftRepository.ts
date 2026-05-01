import type {
  ContentCatalog,
  EditorialEvent,
  Question,
  QuestionMedia,
  QuestionOption,
} from '../types/content';
import type {
  ImportDraftQueueItem,
  PreparedImportBatchRecord,
} from './localImportDraftStore';
import { blobToDataUrl, loadImportDraftAsset } from './localImportDraftAssetStore';
import { loadLocalCatalog, saveLocalCatalog } from './localContentStore';

function buildEvent(
  editionId: string,
  actorEmail: string,
  action: EditorialEvent['action'],
  notes: string,
): EditorialEvent {
  return {
    id: `event-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    editionId,
    actorEmail,
    action,
    notes,
    createdAt: new Date().toISOString(),
  };
}

function buildOptionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function buildQuestionId(batchId: string, externalId: string) {
  return `import-${batchId}-${externalId}`;
}

async function buildMediaAssets(
  item: ImportDraftQueueItem,
  questionId: string,
): Promise<QuestionMedia[]> {
  const assets = [];

  for (const referenceAsset of item.assets.slice(0, 3)) {
    const storedAsset = await loadImportDraftAsset(referenceAsset.assetId);
    if (!storedAsset) {
      continue;
    }

    const dataUrl = await blobToDataUrl(storedAsset.blob);
    assets.push({
      id: `${questionId}-media-${referenceAsset.assetId}`,
      questionId,
      type: 'image' as const,
      url: dataUrl,
      altText:
        referenceAsset.kind === 'crop'
          ? 'Recorte de referencia del manual'
          : 'Imagen de referencia cargada para auditoría visual',
      sourceAttribution: referenceAsset.kind === 'crop' ? 'Recorte del manual' : 'Referencia cargada',
      order: assets.length,
    });
  }

  return assets;
}

export async function importDraftBatchToLocalCatalog({
  catalog,
  runId,
  sourceFile,
  actorEmail,
  items,
}: {
  catalog: ContentCatalog;
  runId: string;
  sourceFile: string;
  actorEmail: string;
  items: ImportDraftQueueItem[];
}) {
  const batchId = `import-batch-${Date.now()}`;
  const editionId = catalog.activeEdition?.id ?? catalog.examRuleSet.editionId;
  const nextCatalog: ContentCatalog = {
    ...catalog,
    questions: [...catalog.questions],
    editorialEvents: [...catalog.editorialEvents],
  };
  const importedQuestionIds: string[] = [];

  for (const item of items) {
    const candidate = item.candidate;
    const questionId = buildQuestionId(batchId, item.externalId);
    const chapter = catalog.chapters.find((entry) => entry.id === candidate.chapterId);
    const options: QuestionOption[] = candidate.options.map((option, index) => ({
      id: `${questionId}-option-${index + 1}`,
      label: buildOptionLabel(index),
      text: option.text,
      isCorrect: candidate.correctOptionIndexes.includes(index),
      order: index,
    }));
    const media = await buildMediaAssets(item, questionId);
    const warnings = [...item.warnings.map((warning) => warning.message)];
    const sandboxProvenance = item.candidate.sandboxProvenance;

    const question: Question = {
      id: questionId,
      editionId,
      chapterId: candidate.chapterId,
      week: chapter?.order ?? 1,
      prompt: candidate.prompt,
      selectionMode: candidate.selectionMode,
      instruction: candidate.instruction,
      sourceDocumentId: 'manual-claseb-2026',
      sourcePage: candidate.sourcePageStart ?? candidate.sourcePageEnd ?? 1,
      sourceReference: candidate.sourceReference,
      explanation: candidate.publicExplanation || candidate.reviewNotes,
      publicExplanation: candidate.publicExplanation,
      status: 'draft',
      isOfficialExamEligible: false,
      doubleWeight: false,
      reviewNotes: [candidate.reviewNotes, `Importado desde ${runId}/${item.externalId}.`]
        .filter(Boolean)
        .join(' '),
      createdBy: actorEmail,
      updatedBy: actorEmail,
      options,
      media,
      importMetadata: {
        importBatchId: batchId,
        importRunId: runId,
        importExternalId: item.externalId,
        importSourceFile: sourceFile,
        importReviewDisposition: candidate.reviewDisposition ?? 'accepted_with_warning',
        groundingDisposition: candidate.groundingAudit?.productionDisposition,
        manualCitationRefs: candidate.manualCitationRefs ?? [],
        manualFactRefs: candidate.manualFactRefs ?? [],
        needsVisualAudit: candidate.needsVisualAudit,
        warnings,
        draftGroundingCorrection: item.correction
          ? {
              replacementText: item.correction.replacementText,
              source: item.correction.source,
              page: item.correction.page,
              segmentId: item.correction.segmentId,
              excerpt: item.correction.excerpt,
              updatedAt: item.correction.updatedAt,
            }
          : undefined,
        buildId: sandboxProvenance?.buildId,
        candidateId: sandboxProvenance?.candidateId,
        unitIds: sandboxProvenance?.unitIds,
        generationMode: sandboxProvenance?.generationMode,
        verifierScore: sandboxProvenance?.verifierScore,
        verifierIssues: sandboxProvenance?.verifierIssues,
        requiredMedia: sandboxProvenance?.requiredMedia,
        groundingAnchors: sandboxProvenance?.groundingAnchors,
        manualAssetId: 'manual-claseb-2026',
        referenceAssets: item.assets.map((asset) => ({
          assetId: asset.assetId,
          kind: asset.kind,
          mimeType: asset.mimeType,
          name: asset.name,
          page: asset.page,
          byteSize: asset.byteSize,
        })),
      },
    };

    nextCatalog.questions.push(question);
    importedQuestionIds.push(question.id);
  }

  nextCatalog.editorialEvents.unshift(
    buildEvent(
      editionId,
      actorEmail,
      'import_commit',
      `Lote ${batchId} importó ${importedQuestionIds.length} preguntas desde ${runId}.`,
    ),
  );

  saveLocalCatalog(nextCatalog);

  const preparedBatch: PreparedImportBatchRecord = {
    id: batchId,
    runId,
    createdAt: new Date().toISOString(),
    actorEmail,
    stagedKeys: items.map((item) => item.key),
    importedQuestionIds,
  };

  return {
    catalog: loadLocalCatalog(),
    preparedBatch,
  };
}

export async function revertPreparedImportBatch({
  catalog,
  batch,
  actorEmail,
}: {
  catalog: ContentCatalog;
  batch: PreparedImportBatchRecord;
  actorEmail: string;
}) {
  const editionId = catalog.activeEdition?.id ?? catalog.examRuleSet.editionId;
  const nextCatalog: ContentCatalog = {
    ...catalog,
    questions: catalog.questions.filter(
      (question) => question.importMetadata?.importBatchId !== batch.id,
    ),
    editorialEvents: [
      buildEvent(
        editionId,
        actorEmail,
        'import_revert',
        `Lote ${batch.id} revertido. Se retiraron ${batch.importedQuestionIds.length} preguntas.`,
      ),
      ...catalog.editorialEvents,
    ],
  };

  saveLocalCatalog(nextCatalog);
  return loadLocalCatalog();
}
