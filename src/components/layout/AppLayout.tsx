import { NavLink, Outlet } from 'react-router-dom';
import { MobileNav } from './MobileNav';

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/practice', label: 'Practica' },
  { to: '/exam', label: 'Simulador' },
];

export function AppLayout() {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-neutral-50 font-sans">
      <a
        href="#main-content"
        className="absolute left-4 top-3 z-[60] -translate-y-16 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white transition-transform focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
      >
        Saltar al contenido
      </a>
      <header className="z-40 h-14 shrink-0 border-b border-neutral-200 bg-white/90 shadow-sm backdrop-blur-md md:h-16 landscape:h-12">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
          <NavLink
            to="/"
            className="flex items-center space-x-2 text-primary-900 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 focus-visible:ring-offset-2"
          >
            <div className="rounded-lg bg-primary-600 p-1.5 text-white shadow-sm">
              <svg
                width="24"
                height="24"
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
            </div>
            <span className="text-base font-bold tracking-tight md:text-lg">
              Clase B<span className="text-primary-500">.cl</span>
            </span>
          </NavLink>

          <nav className="hidden md:flex md:space-x-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border border-neutral-200/50 bg-neutral-100 text-neutral-900 shadow-inner'
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="main-content" className="relative flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:overflow-hidden md:pb-0 landscape:overflow-y-auto landscape:pb-0 landscape:md:overflow-hidden">
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
