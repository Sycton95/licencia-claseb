import type { ReactNode } from 'react';
import { CloseIcon } from './AdminIcons';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  isMobile?: boolean;
  className?: string;
};

export function AdminPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  isMobile = false,
  className = '',
}: Props) {
  if (!isOpen) return null;

  if (isMobile) {
    // Fullscreen mobile variant
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-4">
          <div>
            <h2 className="font-semibold text-neutral-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs text-neutral-600">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-md"
            aria-label="Cerrar panel"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {footer && (
          <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-4 flex gap-3">
            {footer}
          </div>
        )}
      </div>
    );
  }

  // Desktop side panel variant
  return (
    <div
      className={`flex h-full max-w-2xl flex-col border-l border-neutral-200 bg-white shadow-lg ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-5">
        <div>
          <h2 className="font-semibold text-neutral-900">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-md"
          aria-label="Cerrar panel"
        >
          <CloseIcon size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {children}
      </div>

      {footer && (
        <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-4 flex gap-3">
          {footer}
        </div>
      )}
    </div>
  );
}
