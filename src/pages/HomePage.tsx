import { Link } from 'react-router-dom';
import { usePublishedCatalog } from '../hooks/usePublishedCatalog';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { PracticeIcon, ExamIcon } from '../components/icons';

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

// Iteration 1: Chunky 3D (Tactile/Duolingo style)
const GridStyle1 = () => (
  <div className="grid w-full max-w-2xl gap-4 grid-cols-1 md:grid-cols-2">
    <Link
      to="/practice"
      className="group flex min-h-[12rem] flex-col justify-between rounded-3xl border-2 border-slate-200 border-b-8 bg-white p-6 transition-all hover:bg-slate-50 active:border-b-2 active:translate-y-[6px]"
    >
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
          <PracticeIcon size={24} />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Práctica</h2>
        <p className="mt-2 text-sm leading-5 text-slate-500 font-medium">Personaliza tu aprendizaje. Elige capítulos y cantidad.</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 uppercase tracking-wide">5-35 min</span>
        <div className="flex items-center gap-1 text-sm font-black text-primary-600">Iniciar <ArrowRightIcon /></div>
      </div>
    </Link>

    <Link
      to="/exam"
      className="group flex min-h-[12rem] flex-col justify-between rounded-3xl border-2 border-slate-200 border-b-8 bg-white p-6 transition-all hover:bg-slate-50 active:border-b-2 active:translate-y-[6px]"
    >
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
          <ExamIcon size={24} />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Simulador</h2>
        <p className="mt-2 text-sm leading-5 text-slate-500 font-medium">35 preguntas. Aprobación: 33/38. Reglas oficiales.</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-lg bg-sage-50 px-3 py-1.5 text-xs font-bold text-sage-700 uppercase tracking-wide">~40 min</span>
        <div className="flex items-center gap-1 text-sm font-black text-sage-600">Iniciar <ArrowRightIcon /></div>
      </div>
    </Link>
  </div>
);

// Iteration 2: Neo-Brutalist (Trivia/High-contrast style)
const GridStyle2 = () => (
  <div className="grid w-full max-w-2xl gap-6 grid-cols-1 md:grid-cols-2">
    <Link
      to="/practice"
      className="group flex min-h-[12rem] flex-col justify-between rounded-2xl border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
    >
      <div>
        <h2 className="text-2xl font-black tracking-tight text-black uppercase">Práctica</h2>
        <p className="mt-2 text-sm leading-5 text-neutral-700 font-bold">Personaliza tu aprendizaje. Elige capítulos y cantidad.</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t-4 border-black pt-4">
        <span className="font-mono text-sm font-bold text-black">5-35 MIN</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-400 border-2 border-black text-black">
          <PlayIcon />
        </div>
      </div>
    </Link>

    <Link
      to="/exam"
      className="group flex min-h-[12rem] flex-col justify-between rounded-2xl border-4 border-black bg-primary-300 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
    >
      <div>
        <h2 className="text-2xl font-black tracking-tight text-black uppercase">Simulador</h2>
        <p className="mt-2 text-sm leading-5 text-black font-bold">35 preguntas. Aprobación: 33/38. Timer.</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t-4 border-black pt-4">
        <span className="font-mono text-sm font-bold text-black">~40 MIN</span>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-400 border-2 border-black text-black">
          <PlayIcon />
        </div>
      </div>
    </Link>
  </div>
);

// Iteration 3: Immersive Gradients (Modern App style)
const GridStyle3 = () => (
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
);

// Iteration 4: Soft Neumorphism (Tactile push style)
const GridStyle4 = () => (
  <div className="grid w-full max-w-2xl gap-6 grid-cols-1 md:grid-cols-2">
    <Link
      to="/practice"
      className="group flex min-h-[12rem] flex-col justify-between rounded-[2rem] bg-neutral-100 p-6 shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff] transition-all hover:shadow-[inset_8px_8px_16px_#d1d5db,inset_-8px_-8px_16px_#ffffff]"
    >
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff] text-primary-600">
          <PracticeIcon size={20} />
        </div>
        <h2 className="mt-5 text-xl font-black tracking-tight text-neutral-800">Práctica</h2>
        <p className="mt-1 text-sm text-neutral-500 font-medium">Personaliza tu aprendizaje.</p>
      </div>
      <div className="mt-4 flex justify-end">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform group-active:scale-90">
          <ArrowRightIcon />
        </div>
      </div>
    </Link>

    <Link
      to="/exam"
      className="group flex min-h-[12rem] flex-col justify-between rounded-[2rem] bg-neutral-100 p-6 shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff] transition-all hover:shadow-[inset_8px_8px_16px_#d1d5db,inset_-8px_-8px_16px_#ffffff]"
    >
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff] text-sage-600">
          <ExamIcon size={20} />
        </div>
        <h2 className="mt-5 text-xl font-black tracking-tight text-neutral-800">Simulador</h2>
        <p className="mt-1 text-sm text-neutral-500 font-medium">Test de 35 preguntas oficiales.</p>
      </div>
      <div className="mt-4 flex justify-end">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-600 text-white shadow-lg transition-transform group-active:scale-90">
          <ArrowRightIcon />
        </div>
      </div>
    </Link>
  </div>
);

// Iteration 5: Minimalist Arcade (Clean lines, focus rings)
const GridStyle5 = () => (
  <div className="grid w-full max-w-2xl gap-4 grid-cols-1 md:grid-cols-2">
    <Link
      to="/practice"
      className="group relative flex min-h-[11rem] flex-col justify-center rounded-3xl border-2 border-neutral-200 bg-white p-6 transition-all hover:border-primary-500 hover:ring-4 hover:ring-primary-500/20 active:scale-[0.98]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
          <PlayIcon />
        </div>
        <div>
          <h2 className="text-xl font-black text-neutral-900">Práctica</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Niveles & Capítulos</p>
        </div>
      </div>
    </Link>

    <Link
      to="/exam"
      className="group relative flex min-h-[11rem] flex-col justify-center rounded-3xl border-2 border-neutral-200 bg-white p-6 transition-all hover:border-sage-500 hover:ring-4 hover:ring-sage-500/20 active:scale-[0.98]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-50 text-sage-600 group-hover:bg-sage-600 group-hover:text-white transition-colors">
          <AwardIcon />
        </div>
        <div>
          <h2 className="text-xl font-black text-neutral-900">Simulador</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Examen Oficial</p>
        </div>
      </div>
    </Link>
  </div>
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
      <section className="relative flex min-h-full flex-1 flex-col items-center overflow-x-hidden bg-neutral-900 px-3 py-10 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(var(--color-primary-600) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary-500/20 to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-12">
          <div className="max-w-xl text-center md:text-left pt-6">
            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
              Clase B, <span className="text-primary-400"> modo estudio.</span>
            </h1>
            <p className="mt-4 text-sm text-neutral-300 md:text-base">
              Practica o simula el examen completo. Interfaz ligera y táctil.
            </p>
          </div>

          <div className="flex flex-col gap-12">
            <div>
              <h3 className="text-neutral-500 uppercase tracking-[0.2em] text-xs font-bold mb-4">1. Chunky 3D</h3>
              <GridStyle1 />
            </div>
            
            <div>
              <h3 className="text-neutral-500 uppercase tracking-[0.2em] text-xs font-bold mb-4">2. Neo-Brutalist</h3>
              <GridStyle2 />
            </div>

            <div>
              <h3 className="text-neutral-500 uppercase tracking-[0.2em] text-xs font-bold mb-4">3. Immersive Gradient</h3>
              <GridStyle3 />
            </div>

            <div>
              <h3 className="text-neutral-500 uppercase tracking-[0.2em] text-xs font-bold mb-4">4. Soft Neumorphism</h3>
              <GridStyle4 />
            </div>

            <div>
              <h3 className="text-neutral-500 uppercase tracking-[0.2em] text-xs font-bold mb-4">5. Minimalist Arcade</h3>
              <GridStyle5 />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}