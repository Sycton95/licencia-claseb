import type { InputHTMLAttributes, ReactNode } from 'react';

type InputVariant = 'text' | 'textarea' | 'select' | 'search';

type Props = InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> & {
  variant?: InputVariant;
  label?: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
};

const baseStyles =
  'w-full px-3 py-2.5 text-base rounded-lg border border-neutral-200 text-neutral-900 placeholder-neutral-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed';

const errorStyles = 'border-warning-600 focus:ring-warning-500';

export function AdminInput({
  variant = 'text',
  label,
  error,
  hint,
  className = '',
  disabled = false,
  id,
  ...props
}: Props) {
  const inputId = id || `input-${Math.random()}`;
  const finalClassName = `${baseStyles} ${error ? errorStyles : ''} ${className}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-900"
        >
          {label}
        </label>
      )}

      {variant === 'textarea' ? (
        <textarea
          {...(props as InputHTMLAttributes<HTMLTextAreaElement>)}
          id={inputId}
          disabled={disabled}
          className={`resize-none min-h-24 ${finalClassName}`}
        />
      ) : variant === 'select' ? (
        <select
          {...(props as InputHTMLAttributes<HTMLSelectElement>)}
          id={inputId}
          disabled={disabled}
          className={finalClassName}
        >
          {props.children}
        </select>
      ) : (
        <input
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
          id={inputId}
          disabled={disabled}
          type={variant === 'search' ? 'search' : 'text'}
          className={finalClassName}
        />
      )}

      {error && (
        <span className="text-xs font-medium text-warning-700">{error}</span>
      )}
      {hint && !error && (
        <span className="text-xs font-normal text-neutral-600">{hint}</span>
      )}
    </div>
  );
}
