import type { ImportDraftQueueItem } from './localImportDraftStore';
import type {
  FoundryDuplicateReviewDecision,
  GeneratedDuplicateCluster,
} from '../types/foundry';

export type FoundryDuplicateClusterState = {
  cluster: GeneratedDuplicateCluster;
  decision: FoundryDuplicateReviewDecision | null;
  isResolved: boolean;
  hasOverride: boolean;
  isMultiKeep: boolean;
  selectedExternalIds: string[];
};

export type FoundryDuplicateSummary = {
  clusterCount: number;
  unresolvedClusterCount: number;
  overriddenClusterCount: number;
  multiKeepClusterCount: number;
  blockedStagedKeys: string[];
};

export function buildFoundryDuplicateMembershipMap(
  clusters: GeneratedDuplicateCluster[],
) {
  const membership = new Map<
    string,
    { clusterId: string; familyKey: string; suggestedWinnerId: string; similarityToSuggested?: number }
  >();

  clusters.forEach((cluster) => {
    cluster.members.forEach((member) => {
      membership.set(member.externalId, {
        clusterId: cluster.clusterId,
        familyKey: cluster.familyKey,
        suggestedWinnerId: cluster.suggestedWinnerId,
        similarityToSuggested: member.similarityToSuggested,
      });
    });
  });

  return membership;
}

export function buildFoundryDuplicateClusterStates(
  runId: string,
  clusters: GeneratedDuplicateCluster[],
  decisions: FoundryDuplicateReviewDecision[],
): FoundryDuplicateClusterState[] {
  return clusters.map((cluster) => {
    const decision =
      decisions.find(
        (entry) => entry.runId === runId && entry.clusterId === cluster.clusterId,
      ) ?? null;
    const selectedExternalIds = decision?.selectedExternalIds ?? [];
    const isResolved = selectedExternalIds.length > 0;
    const isMultiKeep =
      decision?.decisionMode === 'multi_keep' && selectedExternalIds.length > 1;
    const hasOverride =
      decision !== null &&
      decision.decisionMode === 'manual_winner' &&
      decision.selectedExternalIds[0] !== cluster.suggestedWinnerId;

    return {
      cluster,
      decision,
      isResolved,
      hasOverride,
      isMultiKeep,
      selectedExternalIds,
    };
  });
}

export function summarizeFoundryDuplicateState(args: {
  runId: string;
  clusters: GeneratedDuplicateCluster[];
  decisions: FoundryDuplicateReviewDecision[];
  stagedItems?: ImportDraftQueueItem[];
}) : FoundryDuplicateSummary {
  const clusterStates = buildFoundryDuplicateClusterStates(
    args.runId,
    args.clusters,
    args.decisions,
  );

  const stagedItems = args.stagedItems ?? [];
  const membershipMap = buildFoundryDuplicateMembershipMap(args.clusters);
  const unresolvedClusterIds = new Set(
    clusterStates.filter((state) => !state.isResolved).map((state) => state.cluster.clusterId),
  );

  return {
    clusterCount: clusterStates.length,
    unresolvedClusterCount: clusterStates.filter((state) => !state.isResolved).length,
    overriddenClusterCount: clusterStates.filter((state) => state.hasOverride).length,
    multiKeepClusterCount: clusterStates.filter((state) => state.isMultiKeep).length,
    blockedStagedKeys: stagedItems
      .filter((item) => {
        const membership = membershipMap.get(item.externalId);
        return membership ? unresolvedClusterIds.has(membership.clusterId) : false;
      })
      .map((item) => item.key),
  };
}
