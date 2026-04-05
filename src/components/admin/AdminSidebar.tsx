import { APP_WATERMARK } from '../../lib/appMeta';
import { CatalogIcon, CloseIcon, DashboardIcon, SparkIcon } from './AdminIcons';
import type { AdminSection } from './types';

type AdminSidebarProps = {
  activeSection: AdminSection;
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (section: AdminSection) => void;
};

const items: Array<{
  id: AdminSection;
  label: string;
  Icon: typeof DashboardIcon;
}> = [
  { id: 'dashboard', label: 'Resumen', Icon: DashboardIcon },
  { id: 'catalog', label: 'Catálogo', Icon: CatalogIcon },
  { id: 'ai', label: 'Cola AI', Icon: SparkIcon },
];

export function AdminSidebar({
  activeSection,
  isOpen,
  onClose,
  onSelectSection,
}: AdminSidebarProps) {
  return (
    <>
      <button
        type="button"
        className={isOpen ? 'admin-sidebar__backdrop admin-sidebar__backdrop--visible' : 'admin-sidebar__backdrop'}
        onClick={onClose}
        aria-label="Cerrar navegación"
      />
      <aside className={isOpen ? 'admin-sidebar admin-sidebar--open' : 'admin-sidebar'}>
        <div className="admin-sidebar__head">
          <div>
            <span className="eyebrow">Admin privado</span>
            <h1 className="admin-sidebar__title">Admin Workspace</h1>
            <p className="admin-sidebar__subtitle">Clase B Chile</p>
          </div>
          <button type="button" className="admin-sidebar__close" onClick={onClose} aria-label="Cerrar menú">
            <CloseIcon className="admin-icon" />
          </button>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Secciones admin">
          {items.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={activeSection === id ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link'}
              onClick={() => {
                onSelectSection(id);
                onClose();
              }}
            >
              <Icon className="admin-icon" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <span>{APP_WATERMARK}</span>
        </div>
      </aside>
    </>
  );
}
