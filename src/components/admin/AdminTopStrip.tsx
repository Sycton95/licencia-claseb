// src/components/admin/AdminTopStrip.tsx
import { MenuIcon } from './AdminIcons';
import type { AdminSection } from './types';

type Props = {
  activeSection: AdminSection;
  onOpenMobileMenu: () => void;
};

export function AdminTopStrip({ activeSection, onOpenMobileMenu }: Props) {
  const sectionTitles: Record<AdminSection, string> = {
    dashboard: 'Resumen',
    catalog: 'Catálogo de Preguntas',
    ai: 'Cola de Revisión AI'
  };

  return (
    <header className="md:hidden flex items-center px-4 h-14 bg-white border-b border-slate-200 z-30 shrink-0 shadow-sm">
      <button onClick={onOpenMobileMenu} className="p-1.5 -ml-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
        <MenuIcon size={22} />
      </button>
      <h1 className="ml-3 font-semibold text-sm text-slate-900 tracking-tight">
        {sectionTitles[activeSection]}
      </h1>
    </header>
  );
}