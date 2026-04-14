import { Link } from 'react-router-dom';
import { usePublishedCatalog } from '../hooks/usePublishedCatalog';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { PracticeIcon, ExamIcon } from '../components/icons';

const ArrowRightIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export function HomePage() {
  const { catalog, error, isLoading } = usePublishedCatalog('No se pudo cargar el catálogo público.');

  if (isLoading) {
    return <LoadingSpinner message="Cargando catálogo..." />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-neutral-50">
      <section className="relative flex min-h-full flex-1 items-center overflow-hidden bg-neutral-900 px-4 py-8 text-white sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#2563EB 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-500/20 to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col justify-center gap-8 py-4 lg:flex-row lg:items-center lg:gap-12">
          <div className="max-w-xl">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              Clase B,
              <br />
              <span className="text-primary-400">modo estudio.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-neutral-300 sm:text-base">
              Entra directo a practicar o simula el examen completo con una interfaz ligera,
              rápida y táctil.
            </p>
            {catalog?.activeEdition?.title && (
              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-neutral-500">
                {catalog.activeEdition.title}
              </p>
            )}
          </div>

          <div className="grid w-full max-w-2xl gap-4">
            <Link
              to="/practice"
              className="group flex min-h-[12rem] flex-col justify-between rounded-[28px] border border-primary-300/30 bg-white/95 p-6 text-neutral-900 shadow-lg shadow-neutral-950/10 transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 focus-visible:ring-offset-2"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                <PracticeIcon size={20} />
              </div>
              <div className="mt-8">
                <h2 className="text-2xl font-black tracking-tight">Practica</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Elige capítulos, define cantidad y empieza a responder.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-primary-600">
                Iniciar práctica
                <ArrowRightIcon />
              </div>
            </Link>

            <Link
              to="/exam"
              className="group flex min-h-[12rem] flex-col justify-between rounded-[28px] border border-sage-300/30 bg-white/95 p-6 text-neutral-900 shadow-lg shadow-neutral-950/10 transition-all hover:-translate-y-1 hover:border-sage-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage-200 focus-visible:ring-offset-2"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
                <ExamIcon size={20} />
              </div>
              <div className="mt-8">
                <h2 className="text-2xl font-black tracking-tight">Simulador</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  Entra a una prueba completa con puntaje y aprobación.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-sage-600">
                Iniciar simulador
                <ArrowRightIcon />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
