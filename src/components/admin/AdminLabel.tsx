import type { ReactNode } from 'react';

type Variant = 'section-header' | 'field-label' | 'metadata' | 'hint';

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  htmlFor?: string;
};

const variantStyles: Record<Variant, string> = {
  'section-header': 'block text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-2 mb-4',
  'field-label': 'block text-sm font-medium text-neutral-900 mb-2',
  'metadata': 'text-xs font-normal text-neutral-500 uppercase tracking-wider',
  'hint': 'text-xs font-normal text-neutral-600 mt-1',
};

export function AdminLabel({
  children,
  variant = 'field-label',
  className = '',
  htmlFor,
}: Props) {
  const TagName = htmlFor ? 'label' : 'div';

  return (
    <TagName htmlFor={htmlFor} className={`${variantStyles[variant]} ${className}`}>
      {children}
    </TagName>
  );
}
