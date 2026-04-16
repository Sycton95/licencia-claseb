import { NavLink, NavLinkProps } from 'react-router-dom';
import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

interface NavItemProps extends Omit<NavLinkProps, 'className' | 'children'> {
  icon: React.FC<IconProps>;
  label: string;
  size?: number;
}

export function NavItem({ icon: Icon, label, size = 20, ...props }: NavItemProps) {
  return (
    <NavLink
      {...props}
      className={({ isActive }) =>
        `relative flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-200
        active:scale-95 hover:scale-105
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
        ${isActive ? 'before:absolute before:inset-0 before:-z-10 before:rounded-lg' : ''}`
      }
      style={({ isActive }) => ({
        color: isActive ? 'var(--color-primary-600)' : 'var(--color-text-secondary)',
      })}
    >
      {/* Icon with smooth color transition */}
      <Icon size={size} />

      {/* Label with smooth color transition */}
      <span className="text-[10px] font-medium leading-tight transition-colors duration-200 text-inherit">
        {label}
      </span>
    </NavLink>
  );
}
