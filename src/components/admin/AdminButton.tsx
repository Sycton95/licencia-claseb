import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  isLoading?: boolean;
};

const baseStyles = 'font-medium transition-all duration-150 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 disabled:active:scale-100';

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 active:translate-y-[2px]',
  secondary:
    'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-400 active:translate-y-[2px]',
  danger:
    'bg-warning-600 text-white hover:bg-warning-700 focus-visible:ring-warning-500 active:translate-y-[2px]',
  outline:
    'border-2 border-neutral-200 text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-400',
  ghost:
    'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-400',
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm h-9',
  md: 'px-4 py-2.5 text-base h-11',
  lg: 'px-6 py-3 text-base h-12',
};

export function AdminButton({
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  disabled = false,
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
