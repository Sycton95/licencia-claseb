import type { ReactNode } from 'react';

type Variant = 'default' | 'subtle' | 'section';
type Padding = 'compact' | 'standard' | 'spacious';

type Props = {
  children: ReactNode;
  variant?: Variant;
  padding?: Padding;
  className?: string;
};

const variantStyles: Record<Variant, string> = {
  default: 'bg-white border border-neutral-200 shadow-sm',
  subtle: 'bg-neutral-50 border border-neutral-100',
  section: 'bg-white border border-neutral-200',
};

const paddingStyles: Record<Padding, string> = {
  compact: 'p-3',
  standard: 'p-6',
  spacious: 'p-8',
};

export function AdminCard({
  children,
  variant = 'default',
  padding = 'standard',
  className = '',
}: Props) {
  return (
    <div
      className={`rounded-xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
