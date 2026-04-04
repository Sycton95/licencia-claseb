import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Inicio' },
  { to: '/practice', label: 'Práctica' },
  { to: '/exam', label: 'Examen' },
  { to: '/admin', label: 'Admin' },
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
              Plataforma de práctica, simulación y revisión editorial basada en fuentes formales.
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
          <span>Prioridad editorial: exactitud de preguntas, fuentes y trazabilidad.</span>
          <span>Vercel + Supabase como base para la siguiente etapa pública.</span>
        </footer>
      </section>
    </main>
  );
}
