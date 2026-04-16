import { Link } from 'react-router-dom';
import { usePublishedCatalog } from '../hooks/usePublishedCatalog';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { ScalableHeader } from '../components/ScalableHeader';

const ArrowRightIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
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
    <div className="flex min-h-screen w-full flex-col overflow-y-auto bg-slate-50 selection:bg-indigo-200">
      <section className="relative flex w-full flex-1 flex-col items-center px-4 py-12 md:py-20 z-0">

        {/* Background Pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

        {/* Scalable Header Component */}
        <ScalableHeader />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col mt-10 md:mt-14 px-2 md:px-0">

          {/* Cards Container with fixed spacing and no overflow clipping */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-6 md:gap-8 w-full justify-center">

            {/* Práctica Libre Card */}
            <Link
              to="/practice"
              className="group relative flex flex-1 min-h-[14rem] sm:min-h-[16rem] flex-col justify-between text-left rounded-2xl border-[3px] border-white bg-[#244ba6] p-6 md:p-8 text-white shadow-[0_0_0_4px_#244ba6] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_0_4px_#244ba6,0_15px_30px_-5px_rgba(36,75,166,0.4)] active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
            >
              <div className="relative z-10">
                <span className="inline-block bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-[#244ba6] rounded-md shadow-sm">
                  5-35 MIN
                </span>

                <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-none text-white uppercase">
                  Práctica
                  <br />
                  Libre
                </h2>

                <p className="mt-3 text-sm md:text-base font-bold text-white/90 max-w-[90%]">
                  Personaliza tu aprendizaje. Elige capítulos y cantidad.
                </p>
              </div>

              <div className="relative z-10 mt-6 md:mt-8 flex items-center justify-between w-full">
                <span className="font-black uppercase tracking-widest text-xs sm:text-sm text-white/90 group-hover:text-white transition-colors">
                  Iniciar
                </span>

                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-white/50 bg-transparent transition-all duration-300 group-hover:border-white group-hover:bg-white group-hover:text-[#244ba6]">
                  <ArrowRightIcon />
                </div>
              </div>
            </Link>

            {/* Simulador Oficial Card */}
            <Link
              to="/exam"
              className="group relative flex flex-1 min-h-[14rem] sm:min-h-[16rem] flex-col justify-between text-left rounded-2xl border-[3px] border-white bg-[#00aa89] p-6 md:p-8 text-white shadow-[0_0_0_4px_#00aa89] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_0_4px_#00aa89,0_15px_30px_-5px_rgba(0,170,137,0.4)] active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:ring-offset-2"
            >
              <div className="relative z-10">
                <span className="inline-block bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-[#00aa89] rounded-md shadow-sm">
                  ~40 MIN
                </span>

                <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-none text-white uppercase">
                  Simulador
                  <br />
                  Oficial
                </h2>

                <p className="mt-3 text-sm md:text-base font-bold text-white/90 max-w-[90%]">
                  35 preguntas. Aprobación: 33/38. Reglas oficiales.
                </p>
              </div>

              <div className="relative z-10 mt-6 md:mt-8 flex items-center justify-between w-full">
                <span className="font-black uppercase tracking-widest text-xs sm:text-sm text-white/90 group-hover:text-white transition-colors">
                  Iniciar
                </span>

                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 border-white/50 bg-transparent transition-all duration-300 group-hover:border-white group-hover:bg-white group-hover:text-[#00aa89]">
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