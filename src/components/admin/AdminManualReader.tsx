import { AdminImportPdfWorkspace } from './AdminImportPdfWorkspace';
import type { SourceDocument } from '../../types/content';

type Props = {
  document: SourceDocument | null;
  initialPage?: number;
  onClose: () => void;
};

export function AdminManualReader({ document, initialPage = 1, onClose }: Props) {
  return (
    <AdminImportPdfWorkspace
      isOpen={Boolean(document)}
      sourceDocument={document}
      page={initialPage}
      title={document?.title ?? 'Manual'}
      subtitle="Visor PDF editorial unificado."
      allowDraftTools={false}
      onClose={onClose}
    />
  );
}
