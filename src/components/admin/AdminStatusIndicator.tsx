import type { ReactNode } from 'react';

type Status = 'pending' | 'approved' | 'rejected' | 'draft' | 'review' | 'published';

type Props = {
  status: Status;
  icon?: ReactNode;
  label?: string;
  className?: string;
};

const statusConfig: Record<Status, { color: string; defaultLabel: string }> = {
  pending: { color: 'text-neutral-600 bg-neutral-50', defaultLabel: 'Pendiente' },
  approved: { color: 'text-success-700 bg-success-50', defaultLabel: 'Aprobado' },
  rejected: { color: 'text-warning-700 bg-warning-50', defaultLabel: 'Rechazado' },
  draft: { color: 'text-neutral-600 bg-neutral-50', defaultLabel: 'Borrador' },
  review: { color: 'text-primary-700 bg-primary-50', defaultLabel: 'En revisión' },
  published: { color: 'text-success-700 bg-success-50', defaultLabel: 'Publicado' },
};

export function AdminStatusIndicator({
  status,
  icon,
  label,
  className = '',
}: Props) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
}
