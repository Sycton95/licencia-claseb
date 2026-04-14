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
      <section className="relative flex min-h-full flex-1 items-center overflow-hidden bg-neutral-900 px-4 py-8 text-white sm:px-6 md:py-12 landscape:py-4">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(var(--color-primary-600) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-500/20 to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col justify-center gap-6 py-3 md:gap-8 md:py-4 lg:flex-row lg:items-center lg:gap-12 landscape:gap-4 landscape:py-2">
          <div className="max-w-xl">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl landscape:text-2xl">
              Clase B,
              <br className="md:hidden landscape:hidden" />
              <span className="text-primary-400"> modo estudio.</span>
            </h1>
            <p className="mt-2 max-w-md text-xs leading-5 text-neutral-300 sm:text-sm md:mt-4 md:text-base md:leading-7 landscape:mt-1.5 landscape:text-xs landscape:leading-4">
              Entra directo a practicar o simula el examen completo con una interfaz ligera, rápida y táctil.
            </p>
            {catalog?.activeEdition?.title && (
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500 md:mt-5 md:text-[11px] landscape:mt-2 landscape:text-[9px]">
                {catalog.activeEdition.title}
              </p>
            )}
          </div>

          <div className="grid w-full max-w-2xl gap-3 md:gap-4 landscape:gap-2">
            <Link
              to="/practice"
              className="group flex min-h-[11rem] flex-col justify-between rounded-[28px] border border-primary-300/30 bg-white/95 p-4 text-neutral-900 shadow-lg shadow-neutral-950/10 transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-200 focus-visible:ring-offset-2 md:min-h-[14rem] md:p-6 landscape:min-h-[8.5rem] landscape:p-3"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 md:h-12 md:w-12">
                  <PracticeIcon size={18} />
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight md:mt-4 md:text-2xl landscape:mt-1.5 landscape:text-lg">Práctica</h2>
                <p className="mt-1 text-xs leading-5 text-neutral-600 md:mt-2 md:text-sm md:leading-6 landscape:mt-1 landscape:text-xs landscape:leading-4">
                  Personaliza tu aprendizaje. Elige capítulos y define la cantidad de preguntas.
                </p>
              </div>
              <div className="space-y-2 md:space-y-3 landscape:space-y-1.5">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-primary-50 px-2.5 py-1.5 md:gap-3 md:px-3 md:py-2 landscape:gap-2 landscape:px-2 landscape:py-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary-700 md:text-xs landscape:text-[9px]">Tiempo estimado</span>
                  <span className="text-xs font-black text-primary-900 md:text-sm landscape:text-xs">5-35 min</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-primary-600 group-hover:gap-3 transition-all md:text-sm landscape:text-xs">
                  Iniciar práctica
                  <ArrowRightIcon />
                </div>
              </div>
            </Link>

            <Link
              to="/exam"
              className="group flex min-h-[11rem] flex-col justify-between rounded-[28px] border border-sage-300/30 bg-white/95 p-4 text-neutral-900 shadow-lg shadow-neutral-950/10 transition-all hover:-translate-y-1 hover:border-sage-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sage-200 focus-visible:ring-offset-2 md:min-h-[14rem] md:p-6 landscape:min-h-[8.5rem] landscape:p-3"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-100 text-sage-600 md:h-12 md:w-12">
                  <ExamIcon size={18} />
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight md:mt-4 md:text-2xl landscape:mt-1.5 landscape:text-lg">Simulador</h2>
                <p className="mt-1 text-xs leading-5 text-neutral-600 md:mt-2 md:text-sm md:leading-6 landscape:mt-1 landscape:text-xs landscape:leading-4">
                  35 preguntas reales. Aprobación: 33/38. Cronómetro incluido.
                </p>
              </div>
              <div className="space-y-2 md:space-y-3 landscape:space-y-1.5">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-sage-50 px-2.5 py-1.5 md:gap-3 md:px-3 md:py-2 landscape:gap-2 landscape:px-2 landscape:py-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-sage-700 md:text-xs landscape:text-[9px]">Tiempo estimado</span>
                  <span className="text-xs font-black text-sage-900 md:text-sm landscape:text-xs">~40 min</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-sage-600 group-hover:gap-3 transition-all md:text-sm landscape:text-xs">
                  Iniciar simulador
                  <ArrowRightIcon />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
