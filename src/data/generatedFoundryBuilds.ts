import type {
  GeneratedDuplicateArtifact,
  GeneratedBuildManifest,
  GeneratedBuildSummary,
  GeneratedChapterLoadResult,
  GeneratedReviewCandidate,
} from '../types/foundry';

const MANIFEST_MODULES = import.meta.glob('../../data/foundry-builds/*/manifest.json', {
  eager: true,
});

const CHAPTER_MODULES = import.meta.glob('../../data/foundry-builds/*/review-export/*.jsonl', {
  query: '?raw',
  import: 'default',
});

const DUPLICATE_MODULES = import.meta.glob('../../data/foundry-builds/*/duplicates.json', {
  eager: true,
});

function normalizeManifest(rawValue: unknown): GeneratedBuildManifest | null {
  const manifest = rawValue as { default?: unknown };
  const value = (manifest.default ?? rawValue) as Partial<GeneratedBuildManifest>;

  if (!value || typeof value.buildId !== 'string' || !Array.isArray(value.chapters)) {
    return null;
  }

  return {
    buildId: value.buildId,
    runId: typeof value.runId === 'string' ? value.runId : value.buildId,
    sourceBuildId:
      typeof value.sourceBuildId === 'string' ? value.sourceBuildId : undefined,
    editionId: value.editionId,
    manualYear: value.manualYear,
    sourceDocumentId: value.sourceDocumentId,
    exportedCount: Number(value.exportedCount ?? 0),
    generatedAt: value.generatedAt,
    duplicateClusterCount: Number(value.duplicateClusterCount ?? 0),
    duplicatesFile:
      typeof value.duplicatesFile === 'string' ? value.duplicatesFile : undefined,
    noveltyReportFile:
      typeof value.noveltyReportFile === 'string' ? value.noveltyReportFile : undefined,
    exactDuplicateCount:
      typeof value.exactDuplicateCount === 'number' ? value.exactDuplicateCount : undefined,
    nearDuplicateCount:
      typeof value.nearDuplicateCount === 'number' ? value.nearDuplicateCount : undefined,
    novelCandidateCount:
      typeof value.novelCandidateCount === 'number' ? value.novelCandidateCount : undefined,
    noveltyRate:
      typeof value.noveltyRate === 'number' ? value.noveltyRate : undefined,
    noveltyWarning:
      typeof value.noveltyWarning === 'boolean' ? value.noveltyWarning : undefined,
    chapters: value.chapters
      .filter((chapter) => chapter && typeof chapter.chapterId === 'string')
      .map((chapter) => ({
        chapterId: chapter.chapterId,
        file: chapter.file,
        count: Number(chapter.count ?? 0),
      })),
  };
}

export function getGeneratedBuildManifests(): GeneratedBuildManifest[] {
  return Object.values(MANIFEST_MODULES)
    .map(normalizeManifest)
    .filter((manifest): manifest is GeneratedBuildManifest => Boolean(manifest))
    .sort((left, right) => right.buildId.localeCompare(left.buildId));
}

export function getGeneratedBuildSummaries(): GeneratedBuildSummary[] {
  return getGeneratedBuildManifests().map((manifest) => ({
    buildId: manifest.buildId,
    runId: manifest.runId,
    sourceBuildId: manifest.sourceBuildId,
    exportedCount: manifest.exportedCount,
    generatedAt: manifest.generatedAt,
    chapterCount: manifest.chapters.length,
    visualAuditCount: undefined,
  }));
}

function normalizeDuplicateArtifact(rawValue: unknown): GeneratedDuplicateArtifact | null {
  const payload = rawValue as { default?: unknown };
  const value = (payload.default ?? rawValue) as Partial<GeneratedDuplicateArtifact>;
  if (!value || typeof value.buildId !== 'string' || !Array.isArray(value.clusters)) {
    return null;
  }

  return {
    buildId: value.buildId,
    runId: typeof value.runId === 'string' ? value.runId : value.buildId,
    sourceBuildId:
      typeof value.sourceBuildId === 'string' ? value.sourceBuildId : undefined,
    generatedAt:
      typeof value.generatedAt === 'string'
        ? value.generatedAt
        : new Date().toISOString(),
    clusterCount: Number(value.clusterCount ?? value.clusters.length ?? 0),
    similarityMethod: value.similarityMethod === 'hybrid_local_v1' ? 'hybrid_local_v1' : undefined,
    clusters: value.clusters
      .filter(
        (cluster) =>
          cluster &&
          typeof cluster.clusterId === 'string' &&
          Array.isArray(cluster.members),
      )
      .map((cluster) => ({
        clusterId: cluster.clusterId,
        familyKey: cluster.familyKey ?? cluster.clusterId,
        suggestedWinnerId: cluster.suggestedWinnerId ?? '',
        suggestedWinnerScore: Number(cluster.suggestedWinnerScore ?? 0),
        suggestedWinnerReason:
          typeof cluster.suggestedWinnerReason === 'string'
            ? cluster.suggestedWinnerReason
            : 'Winner ranked by verifier score and duplicate family grouping.',
        classification: 'duplicate_family',
        reviewerSummary:
          typeof cluster.reviewerSummary === 'string'
            ? cluster.reviewerSummary
            : undefined,
        chapterIds: Array.isArray(cluster.chapterIds)
          ? cluster.chapterIds.filter((chapterId): chapterId is string => typeof chapterId === 'string')
          : [],
        members: cluster.members
          .filter(
            (member) =>
              member &&
              typeof member.externalId === 'string' &&
              typeof member.chapterId === 'string' &&
              typeof member.prompt === 'string',
          )
          .map((member) => ({
            externalId: member.externalId,
            chapterId: member.chapterId,
            prompt: member.prompt,
            sourcePageStart:
              typeof member.sourcePageStart === 'number'
                ? member.sourcePageStart
                : undefined,
            sourcePageEnd:
              typeof member.sourcePageEnd === 'number'
                ? member.sourcePageEnd
                : undefined,
            sourceReference:
              typeof member.sourceReference === 'string'
                ? member.sourceReference
                : undefined,
            publicExplanation:
              typeof member.publicExplanation === 'string'
                ? member.publicExplanation
                : undefined,
            groundingExcerpt:
              typeof member.groundingExcerpt === 'string'
                ? member.groundingExcerpt
                : undefined,
            verifierScore: Number(member.verifierScore ?? 0),
            verifierBreakdown:
              member.verifierBreakdown && typeof member.verifierBreakdown === 'object'
                ? {
                    schemaQuality: Number(member.verifierBreakdown.schemaQuality ?? member.verifierScore ?? 0),
                    groundingQuality: Number(member.verifierBreakdown.groundingQuality ?? member.verifierScore ?? 0),
                    answerQuality: Number(member.verifierBreakdown.answerQuality ?? member.verifierScore ?? 0),
                    distractorQuality: Number(member.verifierBreakdown.distractorQuality ?? member.verifierScore ?? 0),
                    visualSupportQuality: Number(member.verifierBreakdown.visualSupportQuality ?? member.verifierScore ?? 0),
                    duplicateRiskPenalty: Number(member.verifierBreakdown.duplicateRiskPenalty ?? 0),
                    overallReviewScore: Number(member.verifierBreakdown.overallReviewScore ?? member.verifierScore ?? 0),
                  }
                : undefined,
            verifierIssueCount: Number(member.verifierIssueCount ?? 0),
            generationMode:
              member.generationMode === 'visual' || member.generationMode === 'mixed'
                ? member.generationMode
                : 'text',
            visualDependency:
              member.visualDependency === 'required' || member.visualDependency === 'linked'
                ? member.visualDependency
                : 'none',
            needsVisualAudit: Boolean(member.needsVisualAudit),
            similarityToSuggested:
              typeof member.similarityToSuggested === 'number'
                ? member.similarityToSuggested
                : undefined,
          })),
      })),
  };
}

function validateCandidate(value: unknown): value is GeneratedReviewCandidate {
  const candidate = value as Partial<GeneratedReviewCandidate>;
  return Boolean(
    candidate &&
      (typeof candidate.runId === 'undefined' || typeof candidate.runId === 'string') &&
      (typeof candidate.sourceBuildId === 'undefined' || typeof candidate.sourceBuildId === 'string') &&
      typeof candidate.externalId === 'string' &&
      typeof candidate.prompt === 'string' &&
      Array.isArray(candidate.options) &&
      Array.isArray(candidate.correctOptionIndexes) &&
      typeof candidate.chapterId === 'string' &&
      candidate.sandboxProvenance?.buildId &&
      candidate.sandboxProvenance?.candidateId,
  );
}

export async function loadGeneratedBuildChapter(
  buildId: string,
  chapterId: string,
): Promise<GeneratedChapterLoadResult | null> {
  const modulePath = `../../data/foundry-builds/${buildId}/review-export/${chapterId}.jsonl`;
  const loader = CHAPTER_MODULES[modulePath];

  if (!loader) {
    return null;
  }

  const rawContent = (await loader()) as string;
  const candidates: GeneratedReviewCandidate[] = [];
  const blockedRows: GeneratedChapterLoadResult['blockedRows'] = [];

  rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line) {
        return;
      }

      try {
        const parsed = JSON.parse(line) as unknown;
        if (validateCandidate(parsed)) {
          candidates.push(parsed);
        } else {
          blockedRows.push({
            ok: false,
            lineNumber: index + 1,
            error: 'La linea no cumple el contrato minimo de candidato Foundry.',
            raw: line,
          });
        }
      } catch (error) {
        blockedRows.push({
          ok: false,
          lineNumber: index + 1,
          error: error instanceof Error ? error.message : 'JSONL invalido.',
          raw: line,
        });
      }
    });

  return {
    buildId,
    chapterId,
    candidates,
    blockedRows,
  };
}

export function loadGeneratedBuildDuplicates(
  buildId: string,
): GeneratedDuplicateArtifact | null {
  const modulePath = `../../data/foundry-builds/${buildId}/duplicates.json`;
  const payload = DUPLICATE_MODULES[modulePath];
  if (!payload) {
    return null;
  }

  return normalizeDuplicateArtifact(payload);
}
