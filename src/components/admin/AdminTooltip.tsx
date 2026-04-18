import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminTooltip({ label, children, className = '' }: Props) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      <span tabIndex={0} className="inline-flex focus:outline-none">
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-left text-[11px] leading-relaxed text-white shadow-xl group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  );
}
