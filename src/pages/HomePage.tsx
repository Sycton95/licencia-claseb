import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePublishedCatalog } from '../hooks/usePublishedCatalog';
import { getChapterQuestionCount } from '../lib/quizFactory';

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const AwardIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

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
  const { catalog, error, isLoading } = usePublishedCatalog(
    'No se pudo cargar el catalogo publico.',
  );

  const availableChapters = useMemo(() => {
    if (!catalog) {
      return [];
    }

    return catalog.chapters.map((chapter) => ({
      ...chapter,
      questionCount: getChapterQuestionCount(catalog.questions, chapter.id),
    }));
  }, [catalog]);

  const publishedQuestionCount = useMemo(
    () => availableChapters.reduce((total, chapter) => total + chapter.questionCount, 0),
    [availableChapters],
  );

  const activeChapterCount = useMemo(
    () => availableChapters.filter((chapter) => chapter.questionCount > 0).length,
    [availableChapters],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50">
      <section className="relative shrink-0 overflow-hidden border-b border-slate-800 bg-slate-950 px-4 pb-20 pt-10 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/20 to-transparent" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex rounded-full border border-slate-700 bg-slate-900/90 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300 shadow-sm">
            Plataforma de estudio {catalog?.activeEdition?.code ?? '2026'}
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
            Preparacion seria,
            <br />
            <span className="text-indigo-400">experiencia de juego.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            Practica por capitulos o entra a un simulador estructurado con reglas oficiales. Todo
            el contenido visible sale del catalogo publicado.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 flex w-full max-w-6xl flex-col gap-6 px-4 pb-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            to="/practice"
            className="flex min-h-[15rem] flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md md:p-8"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <PlayIcon />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Practica por capitulos
            </h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-slate-500">
              Filtra las materias que quieres reforzar, ajusta cuantas preguntas responder y repasa
              con una interfaz tactil pensada para movil.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">
              Comenzar repaso
              <ArrowRightIcon />
            </div>
          </Link>

          <Link
            to="/exam"
            className="flex min-h-[15rem] flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md md:p-8"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <AwardIcon />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              Simulador estructurado
            </h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-slate-500">
              Reproduce la estructura oficial del examen Clase B, incluyendo preguntas de doble
              puntuacion y un objetivo claro de aprobacion.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-600">
              Iniciar simulador
              <ArrowRightIcon />
            </div>
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Cobertura actual
                </span>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  Capitulos publicados
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                <div className="text-lg font-black text-slate-900">{publishedQuestionCount}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  preguntas activas
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                Cargando capitulos publicados...
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}

            {!isLoading && !error && availableChapters.length === 0 && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                Todavia no hay capitulos publicados.
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {availableChapters.map((chapter) => (
                <article
                  key={chapter.id}
                  className={`rounded-2xl border px-4 py-4 ${
                    chapter.questionCount > 0
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-slate-200 bg-slate-50/60 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm font-black text-slate-900">{chapter.code}</strong>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                      {chapter.questionCount > 0
                        ? `${chapter.questionCount} disp.`
                        : 'Proximamente'}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-800">{chapter.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{chapter.description}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-2xl font-black text-slate-900">{publishedQuestionCount}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  preguntas publicadas
                </div>
              </article>
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-2xl font-black text-slate-900">{activeChapterCount}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  capitulos activos
                </div>
              </article>
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-2xl font-black text-slate-900">
                  {catalog?.examRuleSet.questionCount ?? 35}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  preguntas examen
                </div>
              </article>
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-2xl font-black text-slate-900">
                  {catalog?.examRuleSet.passingPoints ?? 33}
                </div>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  puntos para aprobar
                </div>
              </article>
            </div>

            <article className="rounded-[28px] border border-indigo-200 bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-white shadow-sm shadow-indigo-950/20">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-100">
                Sesion activa
              </span>
              <h3 className="mt-3 text-xl font-black tracking-tight">
                {catalog?.activeEdition?.title ?? 'Catalogo publicado'}
              </h3>
              <p className="mt-3 text-sm leading-7 text-indigo-50/90">
                Las rutas publicas solo usan contenido editorial ya publicado para evitar mezclas
                con material pendiente.
              </p>
            </article>
          </aside>
        </div>
      </section>
    </div>
  );
}
