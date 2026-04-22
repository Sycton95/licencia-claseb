import type { ImportReviewQuestionRecord } from '../types/importReview';

const ACCEPTED_CANDIDATE_MODULES = import.meta.glob('../../data/import-reviews/*/accepted-candidates.json');

export async function loadImportReviewAcceptedCandidates(
  runId: string,
): Promise<ImportReviewQuestionRecord[] | null> {
  const modulePath = `../../data/import-reviews/${runId}/accepted-candidates.json`;
  const loader = ACCEPTED_CANDIDATE_MODULES[modulePath];

  if (!loader) {
    return null;
  }

  const loaded = (await loader()) as { default?: ImportReviewQuestionRecord[] };
  return (loaded.default ?? null) as ImportReviewQuestionRecord[] | null;
}
