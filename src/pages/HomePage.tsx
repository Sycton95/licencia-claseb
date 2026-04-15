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
      <section className="relative flex min-h-full flex-1 items-center overflow-hidden bg-neutral-900 px-3 py-6 text-white sm:px-6 md:py-12 landscape:py-3">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(var(--color-primary-600) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-500/20 to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col justify-center gap-4 py-2 md:gap-8 md:py-4 lg:flex-row lg:items-center lg:gap-12 landscape:gap-3 landscape:py-1">
          <div className="max-w-xl">
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-5xl lg:text-6xl landscape:text-xl">
              Clase B,
              <br className="md:hidden landscape:hidden" />
              <span className="text-primary-400"> modo estudio.</span>
            </h1>
            <p className="mt-1.5 max-w-md text-[12px] leading-4 text-neutral-300 sm:text-sm md:mt-4 md:text-base md:leading-7 landscape:mt-1 landscape:text-xs landscape:leading-3">
              Practica o simula el examen completo. Interfaz ligera y táctil.
            </p>
            {catalog?.activeEdition?.title && (
              <p className="mt-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 md:mt-5 md:text-[11px] landscape:mt-1.5 landscape:text-[8px]">
                {catalog.activeEdition.title}
              </p>
            )}
          </div>

          <div className="grid w-full max-w-2xl gap-4 grid-cols-1 md:grid-cols-2">
    <Link
      to="/practice"
      className="group relative overflow-hidden flex min-h-[12rem] flex-col justify-between rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white shadow-lg shadow-primary-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/40"
    >
      <div className="absolute -right-6 -top-6 opacity-10 text-white">
        <PracticeIcon size={120} />
      </div>
      <div className="relative z-10">
        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">5-35 min</span>
        <h2 className="mt-4 text-2xl font-black tracking-tight">Práctica</h2>
        <p className="mt-1 text-sm font-medium text-primary-100">Elige capítulos y avanza a tu ritmo.</p>
      </div>
      <div className="relative z-10 mt-4 flex items-center gap-2 font-bold group-hover:gap-3 transition-all">
        Iniciar <ArrowRightIcon />
      </div>
    </Link>

    <Link
      to="/exam"
      className="group relative overflow-hidden flex min-h-[12rem] flex-col justify-between rounded-3xl bg-gradient-to-br from-sage-500 to-sage-700 p-6 text-white shadow-lg shadow-sage-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-sage-500/40"
    >
      <div className="absolute -right-6 -top-6 opacity-10 text-white">
        <ExamIcon size={120} />
      </div>
      <div className="relative z-10">
        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">~40 min</span>
        <h2 className="mt-4 text-2xl font-black tracking-tight">Simulador</h2>
        <p className="mt-1 text-sm font-medium text-sage-100">Test completo bajo reglas oficiales.</p>
      </div>
      <div className="relative z-10 mt-4 flex items-center gap-2 font-bold group-hover:gap-3 transition-all">
        Iniciar <ArrowRightIcon />
      </div>
    </Link>
  </div>
        </div>
      </section>
    </div>
  );
}
