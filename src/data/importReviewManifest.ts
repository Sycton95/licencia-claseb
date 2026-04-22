import rawManifest from '../../data/import-reviews/manifest.json' with { type: 'json' };
import type { ImportReviewManifest } from '../types/importReview';

export const IMPORT_REVIEW_MANIFEST = rawManifest as ImportReviewManifest;
