import { MenuIcon } from './AdminIcons';
import type { AdminHealth, AdminSection } from './types';

type AdminTopStripProps = {
  activeEditionCode?: string;
  activeSection: AdminSection;
  error: string | null;
  health: AdminHealth | null;
  isBusy: boolean;
  isSupabaseConfigured: boolean;
  message: string | null;
  onOpenSidebar: () => void;
  onSeed: () => void;
  onSignOut: () => void;
  sessionEmail: string | null;
};

function getSectionTitle(activeSection: AdminSection) {
  switch (activeSection) {
    case 'summary':
      return 'Resumen editorial';
    case 'catalog':
      return 'Catálogo';
    case 'ai':
      return 'Cola AI';
    case 'editor':
      return 'Editor';
  }
}

export function AdminTopStrip({
  activeEditionCode,
  activeSection,
  error,
  health,
  isBusy,
  isSupabaseConfigured,
  message,
  onOpenSidebar,
  onSeed,
  onSignOut,
  sessionEmail,
}: AdminTopStripProps) {
  return (
    <header className="admin-top-strip">
      <div className="admin-top-strip__row">
        <div className="admin-top-strip__title-group">
          <button
            type="button"
            className="admin-top-strip__menu"
            onClick={onOpenSidebar}
            aria-label="Abrir navegación"
          >
            <MenuIcon className="admin-icon" />
          </button>
          <div>
            <span className="eyebrow">Backoffice editorial</span>
            <h2 className="admin-top-strip__title">{getSectionTitle(activeSection)}</h2>
          </div>
        </div>

        <div className="admin-top-strip__actions">
          {isSupabaseConfigured && (
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={onSeed}
              disabled={isBusy}
            >
              Sembrar base
            </button>
          )}
          {isSupabaseConfigured && (
            <button
              className="secondary-button secondary-button--compact"
              type="button"
              onClick={onSignOut}
              disabled={isBusy}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      <div className="admin-top-strip__status-row">
        {activeEditionCode && <span className="admin-inline-chip">Edición {activeEditionCode}</span>}
        {health && <span className="admin-inline-chip">Esquema {health.schema}</span>}
        {health && (
          <span className={health.aiSchemaReady ? 'admin-inline-chip admin-inline-chip--ok' : 'admin-inline-chip admin-inline-chip--warning'}>
            AI {health.aiSchemaReady ? 'lista' : 'pendiente'}
          </span>
        )}
        {health && (
          <span className={health.usesServiceRole ? 'admin-inline-chip admin-inline-chip--ok' : 'admin-inline-chip admin-inline-chip--warning'}>
            Service role {health.usesServiceRole ? 'activa' : 'pendiente'}
          </span>
        )}
        {sessionEmail && <span className="admin-inline-chip admin-inline-chip--subtle">{sessionEmail}</span>}
      </div>

      {message && <p className="success-banner admin-top-strip__banner">{message}</p>}
      {error && <p className="error-banner admin-top-strip__banner">{error}</p>}
    </header>
  );
}
