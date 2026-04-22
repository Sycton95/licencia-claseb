import type { ImportReviewRunDetail } from '../types/importReview';

const RUN_DETAIL_MODULES = import.meta.glob('../../data/import-reviews/*/run-details.json');

export async function loadImportReviewRunDetail(
  runId: string,
): Promise<ImportReviewRunDetail | null> {
  const modulePath = `../../data/import-reviews/${runId}/run-details.json`;
  const loader = RUN_DETAIL_MODULES[modulePath];

  if (!loader) {
    return null;
  }

  const loaded = (await loader()) as { default?: ImportReviewRunDetail };
  return (loaded.default ?? null) as ImportReviewRunDetail | null;
}
