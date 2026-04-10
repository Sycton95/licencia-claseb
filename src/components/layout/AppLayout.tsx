import { NavLink, Outlet } from 'react-router-dom';

const CarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
    <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
  </svg>
);

export function AppLayout() {
  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 font-sans overflow-hidden">
      <header className="shrink-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
          <NavLink to="/" className="flex items-center space-x-2 text-indigo-900 hover:opacity-80 transition-opacity">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm"><CarIcon /></div>
            <span className="font-bold text-lg tracking-tight">Clase B<span className="text-indigo-500">.cl</span></span>
          </NavLink>
          <nav className="hidden md:flex space-x-1">
            {[
              { to: '/', label: 'Inicio' },
              { to: '/practice', label: 'Práctica' },
              { to: '/exam', label: 'Simulador' }
            ].map(link => (
              <NavLink 
                key={link.to} 
                to={link.to} 
                className={({ isActive }) => `px-4 py-2 rounded-xl font-medium text-sm transition-all ${isActive ? 'bg-slate-100 text-slate-900 shadow-inner border border-slate-200/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <Outlet />
      </main>
    </div>
  );
}