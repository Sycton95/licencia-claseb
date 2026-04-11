import { MenuIcon } from './AdminIcons';
import type { AdminSection } from './types';

type Props = {
  activeSection: AdminSection;
  onOpenMobileMenu: () => void;
};

export function AdminTopStrip({ activeSection, onOpenMobileMenu }: Props) {
  const sectionTitles: Record<AdminSection, string> = {
    dashboard: 'Resumen',
    catalog: 'Catalogo de preguntas',
    ai: 'Cola de revision AI',
    beta: 'Beta local Ollama',
  };

  return (
    <header className="z-30 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 shadow-sm md:hidden">
      <button
        onClick={onOpenMobileMenu}
        className="-ml-1.5 rounded-md p-1.5 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
        aria-label="Abrir menu lateral"
        type="button"
      >
        <MenuIcon size={22} />
      </button>
      <h1 className="ml-3 text-sm font-semibold tracking-tight text-slate-900">
        {sectionTitles[activeSection]}
      </h1>
    </header>
  );
}
