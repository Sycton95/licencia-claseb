import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { MobileNav } from './MobileNav';

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/practice', label: 'Practica' },
  { to: '/exam', label: 'Simulador' },
];

export function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden font-sans" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <a
        href="#main-content"
        className="absolute left-4 top-3 z-[60] -translate-y-16 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white transition-transform focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
      >
        Saltar al contenido
      </a>
      <header className="z-40 h-14 shrink-0 shadow-sm backdrop-blur-md md:h-16 landscape:h-12 transition-colors duration-200" style={{ borderColor: 'var(--color-header-border)', backgroundColor: 'var(--color-header-bg)', borderBottomWidth: '1px' }}>
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
          <NavLink
            to="/"
            className="flex items-center justify-center transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 focus-visible:ring-offset-2"
          >
            <span className="text-sm font-black tracking-tighter md:text-base drop-shadow-sm whitespace-nowrap leading-none" style={{ color: 'var(--color-text-primary)' }}>
              CLASE-B<span className="text-yellow-400">.CL</span>
            </span>
          </NavLink>

          <nav className="hidden md:flex md:space-x-1 items-center">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'border shadow-inner'
                      : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--color-neutral-100)' : 'transparent',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderColor: isActive ? 'var(--color-border)' : 'transparent',
                })}
              >
                {link.label}
              </NavLink>
            ))}
            <button
              onClick={toggleTheme}
              className="ml-2 rounded-xl p-2 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 focus-visible:ring-offset-2 hover:opacity-80"
              style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="relative flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:overflow-hidden md:pb-0 landscape:overflow-y-auto landscape:pb-0 landscape:md:overflow-hidden transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
