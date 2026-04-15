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
}
