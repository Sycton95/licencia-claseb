import rawIndex from '../../data/manual-knowledge/2026/index.json' with { type: 'json' };
import type { ManualKnowledgePackIndex } from '../types/importReview';

export const MANUAL_KNOWLEDGE_INDEX = rawIndex as ManualKnowledgePackIndex;
