import { NavLink, Outlet } from 'react-router-dom';
import { APP_WATERMARK } from '../../lib/appMeta';

const navigation = [
  { to: '/', label: 'Inicio' },
  { to: '/practice', label: 'Practica' },
  { to: '/exam', label: 'Simulador' },
];

const CarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

export function AppLayout() {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      <a
        className="absolute left-3 top-3 z-[60] -translate-y-24 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0"
        href="#main-content"
      >
        Saltar al contenido
      </a>

      <header className="z-50 h-16 shrink-0 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-3 px-4">
          <NavLink
            to="/"
            className="flex min-w-0 items-center gap-2 text-indigo-950 transition-opacity hover:opacity-85"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-950/15">
              <CarIcon />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-sm font-black tracking-tight sm:text-base">
                Clase B
                <span className="text-indigo-500">.cl</span>
              </span>
              <span className="hidden text-[11px] font-semibold text-slate-500 sm:block">
                Practica guiada para licencia en Chile
              </span>
            </div>
          </NavLink>

          <nav
            aria-label="Navegacion principal"
            className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1"
          >
            {navigation.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all sm:px-4 sm:text-sm ${
                    isActive
                      ? 'border border-slate-200/80 bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      <span className="pointer-events-none absolute bottom-2 right-3 z-40 select-none text-[11px] font-semibold text-slate-400">
        {APP_WATERMARK}
      </span>
    </div>
  );
}
