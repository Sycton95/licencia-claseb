import { Link } from 'react-router-dom';
import { usePublishedCatalog } from '../hooks/usePublishedCatalog';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { PracticeIcon, ExamIcon } from '../components/icons';

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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-neutral-50">
      <section className="relative flex w-full flex-col items-center overflow-x-hidden px-4 py-12 md:py-20 min-h-full bg-white">
        {/* Background Pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[20]"
          style={{
            backgroundImage: `radial-gradient(#4f46e5 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-12">
          {/* Asfalto Header (Intersection) */}
          <div className="max-w-2xl text-center md:text-left pt-6 flex flex-col items-center md:items-start mx-auto md:mx-0 w-full overflow-hidden">
            <div className="flex flex-row items-stretch mx-auto md:mx-0 w-max max-w-full">
              {/* Left Column (Lines & Text) */}
              <div className="flex flex-col items-center justify-between w-max max-w-full">
                {/* Top Stripped Lines */}
                <div className="flex flex-row items-center w-full gap-10">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 rounded-none transition-colors duration-300"
                      style={{
                        height: '10px',
                        flex: '1 1 12%',
                      }}
                    />
                  ))}
                </div>

                {/* Text */}
                <h1
                  className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-none text-slate-900 drop-shadow-sm"
                  style={{
                    marginTop: '24px',
                    marginBottom: '24px',
                  }}
                >
                  CLASE-B.CL
                </h1>

                {/* Bottom Yellow Line */}
                <div
                  className="bg-yellow-400 w-full rounded-none"
                  style={{ height: '10px' }}
                />
              </div>

              {/* Right Column (Crosswalk) */}
              <div className="flex flex-col justify-between ml-4 sm:ml-6 md:ml-8 shrink-0" style={{ width: '120px' }}>
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-900 rounded-none transition-colors duration-300"
                    style={{
                      height: '20px',
                      width: '100%',
                    }}
                  />
                ))}
              </div>
            </div>

            <p className="mt-8 text-lg md:text-2xl font-bold whitespace-nowrap leading-relaxed mx-auto md:mx-0 px-4 md:px-0 text-slate-600">
              Practica y Aprende. Tu licencia te espera!
            </p>
          </div>

          {/* Cards Container */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full justify-center">
            {/* Práctica Libre Card */}
            <Link
              to="/practice"
              className="group relative overflow-hidden flex flex-1 min-h-[16rem] flex-col justify-between text-left rounded-2xl border-[3px] border-white bg-[#244ba6] p-6 md:p-8 text-white shadow-[0_0_0_4px_#244ba6] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_0_4px_#244ba6,0_15px_30px_-5px_rgba(36,75,166,0.4)] active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
            >
              <div className="relative z-10">
                <span className="inline-block bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-[#244ba6] rounded-md shadow-sm">
                  5-35 MIN
                </span>

                <h2 className="mt-6 text-4xl md:text-5xl font-black tracking-tighter leading-none text-white uppercase">
                  Práctica
                  <br />
                  Libre
                </h2>

                <p className="mt-3 text-sm md:text-base font-bold text-white/90 max-w-[85%]">
                  Personaliza tu aprendizaje. Elige capítulos y cantidad.
                </p>
              </div>

              <div className="relative z-10 mt-8 flex items-center justify-between w-full">
                <span className="font-black uppercase tracking-widest text-sm text-white/90 group-hover:text-white transition-colors">
                  Iniciar
                </span>

                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/50 bg-transparent transition-all duration-300 group-hover:border-white group-hover:bg-white group-hover:text-[#244ba6]">
                  <ArrowRightIcon />
                </div>
              </div>
            </Link>

            {/* Simulador Oficial Card */}
            <Link
              to="/exam"
              className="group relative overflow-hidden flex flex-1 min-h-[16rem] flex-col justify-between text-left rounded-2xl border-[3px] border-white bg-[#00aa89] p-6 md:p-8 text-white shadow-[0_0_0_4px_#00aa89] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_0_4px_#00aa89,0_15px_30px_-5px_rgba(0,170,137,0.4)] active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:ring-offset-2"
            >
              <div className="relative z-10">
                <span className="inline-block bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-[#00aa89] rounded-md shadow-sm">
                  ~40 MIN
                </span>

                <h2 className="mt-6 text-4xl md:text-5xl font-black tracking-tighter leading-none text-white uppercase">
                  Simulador
                  <br />
                  Oficial
                </h2>

                <p className="mt-3 text-sm md:text-base font-bold text-white/90 max-w-[85%]">
                  35 preguntas. Aprobación: 33/38. Reglas oficiales.
                </p>
              </div>

              <div className="relative z-10 mt-8 flex items-center justify-between w-full">
                <span className="font-black uppercase tracking-widest text-sm text-white/90 group-hover:text-white transition-colors">
                  Iniciar
                </span>

                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/50 bg-transparent transition-all duration-300 group-hover:border-white group-hover:bg-white group-hover:text-[#00aa89]">
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
