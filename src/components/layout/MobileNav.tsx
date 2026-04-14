import { NavLink } from 'react-router-dom';
import { HomeIcon, PracticeIcon, ExamIcon } from '../icons';

const navItems = [
  { to: '/', label: 'Inicio', icon: HomeIcon },
  { to: '/practice', label: 'Práctica', icon: PracticeIcon },
  { to: '/exam', label: 'Simulador', icon: ExamIcon },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-neutral-200 shadow-lg shadow-neutral-950/5">
      <div className="flex h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-neutral-100 text-primary-600'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
