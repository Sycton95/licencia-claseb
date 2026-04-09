// src/components/admin/AdminSidebar.tsx
import { DashboardIcon, CatalogIcon, SparkIcon, CloseIcon, LogOutIcon } from './AdminIcons';
import type { AdminSection } from './types';

type Props = {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  sessionEmail: string | null;
  onSignOut: () => void;
  isSupabaseConfigured: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
};

export function AdminSidebar({ activeSection, onNavigate, sessionEmail, onSignOut, isSupabaseConfigured, isMobileOpen, onCloseMobile }: Props) {
  const navItems = [
    { id: 'dashboard', label: 'Resumen', Icon: DashboardIcon },
    { id: 'catalog', label: 'Catálogo', Icon: CatalogIcon },
    { id: 'ai', label: 'Cola AI', Icon: SparkIcon },
  ];

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={onCloseMobile} />
      )}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-60 bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center shrink-0 h-14">
          <div>
            <h2 className="text-white font-bold text-sm tracking-wide">ADMINISTRACIÓN</h2>
          </div>
          <button className="md:hidden text-slate-400 p-1 hover:text-white rounded-md hover:bg-slate-800" onClick={onCloseMobile}>
            <CloseIcon size={18} />
          </button>
        </div>
        
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id as AdminSection); onCloseMobile(); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
              >
                <item.Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usuario</span>
            <span className="text-xs text-slate-300 truncate pr-2">{sessionEmail?.split('@')[0] || 'Modo Local'}</span>
          </div>
          {isSupabaseConfigured && (
            <button onClick={onSignOut} className="text-slate-500 hover:text-rose-400 transition-colors p-2 rounded-md hover:bg-slate-800 shrink-0" title="Cerrar sesión">
              <LogOutIcon size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}