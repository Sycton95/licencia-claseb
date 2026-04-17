import type { ReactNode } from 'react';

type Variant = 'success' | 'warning' | 'neutral' | 'primary' | 'secondary';
type Size = 'xs' | 'sm' | 'md';

type Props = {
  children: ReactNode;
  icon?: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

const variantStyles: Record<Variant, string> = {
  success: 'bg-success-50 text-success-700 border border-success-200',
  warning: 'bg-warning-50 text-warning-700 border border-warning-200',
  neutral: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
  primary: 'bg-primary-50 text-primary-700 border border-primary-200',
  secondary: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
};

const sizeStyles: Record<Size, string> = {
  xs: 'px-2 py-0.5 text-xs gap-1',
  sm: 'px-2.5 py-1 text-sm gap-1.5',
  md: 'px-3 py-1.5 text-base gap-2',
};

export function AdminBadge({
  children,
  icon,
  variant = 'neutral',
  size = 'sm',
  className = '',
}: Props) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
