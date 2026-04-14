import type { ReactNode } from 'react';

type Props = {
  title: string;
  metadata?: string;
  statusBadge?: ReactNode;
  actions?: ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function AdminListItem({
  title,
  metadata,
  statusBadge,
  actions,
  isSelected = false,
  onClick,
  className = '',
}: Props) {
  return (
    <div
      onClick={onClick}
      className={`flex min-h-14 items-center justify-between rounded-lg border transition-colors px-4 py-3 ${
        isSelected
          ? 'bg-neutral-100 border-primary-300'
          : 'border-neutral-200 hover:bg-neutral-50'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium text-neutral-900 truncate">{title}</div>
        {metadata && (
          <div className="mt-1 text-xs text-neutral-500 truncate">{metadata}</div>
        )}
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-3">
        {statusBadge && <div>{statusBadge}</div>}
        {actions && <div>{actions}</div>}
      </div>
    </div>
  );
}
