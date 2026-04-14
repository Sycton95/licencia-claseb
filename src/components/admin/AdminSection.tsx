import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  className?: string;
};

export function AdminSection({
  children,
  title,
  subtitle,
  headerAction,
  className = '',
}: Props) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
