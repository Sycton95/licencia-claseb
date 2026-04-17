import type { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

export function AdminEmptyState({
  icon,
  title,
  message,
  action,
  className = '',
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 py-12 px-4 text-center ${className}`}
    >
      {icon && <div className="mb-4 text-4xl text-neutral-400">{icon}</div>}

      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-neutral-600">{message}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
