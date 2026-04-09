import { Link } from 'react-router-dom';
import { usePublishedCatalog } from '../hooks/usePublishedCatalog';

const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const AwardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export function HomePage() {
  const { catalog } = usePublishedCatalog('No se pudo cargar el catalogo publico.');

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white pt-12 pb-24 px-4 text-center relative shrink-0 border-b border-slate-800">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="max-w-2xl mx-auto relative z-10">
          <span className="inline-block py-1.5 px-4 rounded-full bg-slate-800 border border-slate-700 text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-6 shadow-sm">
            Plataforma de Estudio {catalog?.activeEdition?.code ?? '2026'}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
            Preparación integral para <br /><span className="text-indigo-400">tu licencia de conducir.</span>
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-lg mx-auto leading-relaxed font-medium">
            Domina los contenidos del Libro del Nuevo Conductor mediante práctica guiada y simulacros estructurados bajo las reglas oficiales.
          </p>
        </div>
      </section>

      {/* Main Menu Cards */}
      <section className="flex-1 max-w-5xl w-full mx-auto px-4 -mt-12 relative z-20 pb-12 flex flex-col md:flex-row gap-5 md:gap-8 items-stretch">
        
        {/* Practice Card */}
        <Link to="/practice" className="flex-1 text-left bg-white rounded-[28px] p-6 md:p-8 border-2 border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md hover:-translate-y-1 transition-all relative flex flex-col group">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 border border-indigo-100 shrink-0 group-hover:scale-105 transition-transform duration-300">
            <PlayIcon />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Práctica por Capítulos</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1 font-medium">
            Filtra por los temas específicos que deseas reforzar. Responde a tu propio ritmo y accede a retroalimentación inmediata para comprender la normativa.
          </p>
          <div className="flex items-center text-indigo-600 font-bold text-sm mt-auto shrink-0 group-hover:text-indigo-700 transition-colors">
            Comenzar Repaso <span className="ml-2 transition-transform group-hover:translate-x-1"><ArrowRightIcon /></span>
          </div>
        </Link>

        {/* Exam Card */}
        <Link to="/exam" className="flex-1 text-left bg-white rounded-[28px] p-6 md:p-8 border-2 border-slate-200 shadow-sm hover:border-emerald-400 hover:shadow-md hover:-translate-y-1 transition-all relative flex flex-col group">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 shrink-0 group-hover:scale-105 transition-transform duration-300">
            <AwardIcon />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Simulacro Estructurado</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1 font-medium">
            Evalúate en condiciones reales: 35 preguntas en 45 minutos. Incluye ponderación oficial de puntaje doble para consultas de alta criticidad.
          </p>
          <div className="flex items-center text-emerald-600 font-bold text-sm mt-auto shrink-0 group-hover:text-emerald-700 transition-colors">
            Iniciar Simulador <span className="ml-2 transition-transform group-hover:translate-x-1"><ArrowRightIcon /></span>
          </div>
        </Link>
      </section>
    </div>
  );
}
