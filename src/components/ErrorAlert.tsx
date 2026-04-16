import { AlertIcon } from './icons';

export function ErrorAlert({
  message = 'An error occurred. Please try again.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div
        className="rounded-lg p-6 max-w-md shadow-sm transition-colors duration-200"
        style={{ borderColor: 'var(--color-warning-200)', backgroundColor: 'var(--color-warning-50)', borderWidth: '1px' }}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 text-warning-600 mt-0.5" aria-hidden="true">
            <AlertIcon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-warning-900">Error al cargar</h2>
            <p className="mt-2 text-sm text-warning-700">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-warning-600 text-white text-sm font-medium rounded hover:bg-warning-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-500"
                aria-label="Reintentar cargar contenido"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
