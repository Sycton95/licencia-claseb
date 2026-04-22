import {
  CatalogIcon,
  CloseIcon,
  DashboardIcon,
  FlaskIcon,
  ImportReviewIcon,
  LogOutIcon,
  SparkIcon,
} from './AdminIcons';
import type { AdminSection } from './types';

type Props = {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  sessionEmail: string | null;
  onSignOut: () => void;
  isSupabaseConfigured: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  showBeta: boolean;
};

export function AdminSidebar({
  activeSection,
  onNavigate,
  sessionEmail,
  onSignOut,
  isSupabaseConfigured,
  isMobileOpen,
  onCloseMobile,
  showBeta,
}: Props) {
  const navItems = [
    { id: 'dashboard', label: 'Resumen', Icon: DashboardIcon },
    { id: 'catalog', label: 'Catalogo', Icon: CatalogIcon },
    { id: 'ai', label: 'Cola AI', Icon: SparkIcon },
    { id: 'imports' as const, label: 'Imports', Icon: ImportReviewIcon },
    ...(showBeta ? [{ id: 'beta' as const, label: 'Beta', Icon: FlaskIcon }] : []),
  ] as const;

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out md:static
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 p-4">
          <h2 className="text-sm font-bold tracking-wide text-white">ADMINISTRACION</h2>
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-600 md:hidden"
            onClick={onCloseMobile}
            aria-label="Cerrar menu lateral"
            type="button"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id as AdminSection);
                  onCloseMobile();
                }}
                className={`flex w-full items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-between border-t border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Usuario
            </span>
            <span className="truncate pr-2 text-xs text-slate-300">
              {sessionEmail?.split('@')[0] || 'Modo local'}
            </span>
          </div>
          {isSupabaseConfigured && (
            <button
              onClick={onSignOut}
              className="shrink-0 rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
              aria-label="Cerrar sesion"
              type="button"
            >
              <LogOutIcon size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
