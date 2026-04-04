import { NavLink, Outlet } from 'react-router-dom';
import { APP_WATERMARK } from '../../lib/appMeta';

const navigation = [
  { to: '/', label: 'Inicio' },
  { to: '/practice', label: 'Práctica' },
  { to: '/exam', label: 'Examen' },
];

export function AppLayout() {
  return (
    <main className="app-shell">
      <div className="ambient ambient--left" aria-hidden="true" />
      <div className="ambient ambient--right" aria-hidden="true" />

      <section className="app-frame app-frame--wide">
        <header className="app-header app-header--layout">
          <div>
            <span className="brand-pill">Clase B Chile</span>
            <p className="app-subtitle">
              Practica desde el móvil y revisa con más espacio desde escritorio.
            </p>
          </div>

          <nav className="top-nav" aria-label="Navegación principal">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'top-nav__link top-nav__link--active' : 'top-nav__link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <Outlet />

        <footer className="app-footer">
          <span>Contenido de práctica basado en fuentes formales y revisión continua.</span>
        </footer>
      </section>

      <span className="app-watermark" aria-hidden="true">
        {APP_WATERMARK}
      </span>
    </main>
  );
}
