import type { OfficialManualRecord } from '../types/pdfReview';

const manualClaseBConaset2026Url = '/data/manual-library/official/2026/manual-claseb-conaset-2026.pdf';

export const OFFICIAL_MANUAL_LIBRARY: OfficialManualRecord[] = [
  {
    documentId: 'manual-claseb-2026',
    title: 'Libro del Nuevo Conductor Clase B 2026',
    issuer: 'Conaset',
    year: 2026,
    official: true,
    localOnly: false,
    assetRelativePath: 'data/manual-library/official/2026/manual-claseb-conaset-2026.pdf',
    assetUrl: manualClaseBConaset2026Url,
  },
];

export function getOfficialManualRecord(documentId: string) {
  return OFFICIAL_MANUAL_LIBRARY.find((record) => record.documentId === documentId) ?? null;
}
