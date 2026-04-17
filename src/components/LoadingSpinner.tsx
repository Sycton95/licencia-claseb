export function LoadingSpinner({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 transition-colors duration-200" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary-600)' }}
          role="status"
          aria-label="Cargando contenido"
        />
        <p
          className="text-sm transition-colors duration-200"
          style={{ color: 'var(--color-text-secondary)' }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {message}
        </p>
      </div>
    </div>
  );
}
