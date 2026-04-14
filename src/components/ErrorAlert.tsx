export function ErrorAlert({
  message = 'An error occurred. Please try again.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 max-w-md shadow-sm">
        <div className="flex items-start gap-4">
          <div className="shrink-0 text-rose-600 mt-0.5">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-rose-900">Error al cargar</h2>
            <p className="mt-2 text-sm text-rose-700">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded hover:bg-rose-700 transition-colors"
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
