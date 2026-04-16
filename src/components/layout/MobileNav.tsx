import { HomeIcon, PracticeIcon, ExamIcon } from '../icons';
import { NavItem } from './NavItem';

const navItems = [
  { to: '/', label: 'Inicio', icon: HomeIcon },
  { to: '/practice', label: 'Práctica', icon: PracticeIcon },
  { to: '/exam', label: 'Simulador', icon: ExamIcon },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden shadow-lg shadow-neutral-950/5 landscape:h-16 transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', borderTopWidth: '1px' }}>
      <div className="flex h-16 landscape:h-16">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            size={20}
          />
        ))}
      </div>
    </nav>
  );
}
