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
            className="flex items-center justify-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 focus-visible:ring-offset-2"
          >
            <span className="text-sm font-black tracking-tighter md:text-base text-slate-900 drop-shadow-sm whitespace-nowrap leading-none">
              CLASE-B<span className="text-yellow-400">.CL</span>
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
