// src/components/admin/AdminIcons.tsx
type IconProps = { className?: string; size?: number };

const baseProps = (size = 20, className = '') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

export const MenuIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

export const CloseIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export const ChevronLeftIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><path d="m15 18-6-6 6-6"/></svg>
);

export const SearchIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

export const DashboardIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);

export const CatalogIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
);

export const SparkIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);

export const FlaskIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><path d="M10 2v7.31"/><path d="M14 9.3V2"/><path d="M8.5 2h7"/><path d="m14 9.3 4.38 7.58A2 2 0 0 1 16.65 20H7.35a2 2 0 0 1-1.73-3.02L10 9.3"/><path d="M7 16h10"/></svg>
);

export const LogOutIcon = ({ className, size }: IconProps) => (
  <svg {...baseProps(size, className)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
);
