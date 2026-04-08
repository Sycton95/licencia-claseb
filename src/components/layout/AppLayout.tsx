import { NavLink, Outlet } from 'react-router-dom';
import { APP_WATERMARK } from '../../lib/appMeta';

const navigation = [
  { to: '/', label: 'Inicio' },
  { to: '/practice', label: 'Práctica' },
  { to: '/exam', label: 'Examen' },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <div className="ambient ambient--left" aria-hidden="true" />
      <div className="ambient ambient--right" aria-hidden="true" />

      <section className="app-frame app-frame--wide">
        <header className="app-header app-header--layout">
          <div className="app-header__row">
            <div className="app-heading">
              <span className="brand-pill">Clase B Chile</span>
              <div className="app-heading__copy">
                <h1 className="app-title">Simulador de práctica y examen</h1>
                <p className="app-subtitle">
                  Estudia desde el móvil y trabaja el backoffice con más espacio desde escritorio.
                </p>
              </div>
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
          </div>

          <div className="app-header__note">
            <span>Catálogo publicado y revisión editorial continua.</span>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>

        <footer className="app-footer">
          <span>
            Práctica digital para licencia Clase B. El contenido visible siempre sale del catálogo
            publicado.
          </span>
        </footer>
      </section>

      <span className="app-watermark" aria-hidden="true">
        {APP_WATERMARK}
      </span>
    </div>
  );
}
