import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublishedCatalog } from '../lib/contentRepository';
import { getChapterQuestionCount } from '../lib/quizFactory';
import type { ContentCatalog } from '../types/content';

export function HomePage() {
  const [catalog, setCatalog] = useState<ContentCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublishedCatalog()
      .then((data) => setCatalog(data))
      .catch(() => setError('No se pudo cargar el catálogo público.'));
  }, []);

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
    <section className="page-stack page-stack--public">
      <section className="panel panel--soft home-hero">
        <div className="home-hero__layout">
          <div className="home-hero__copy">
            <span className="eyebrow">Quiz Clase B</span>
            <h2 className="hero-title">Práctica guiada y simulación de examen en una sola app</h2>
            <p className="hero-copy">
              Entra a práctica para estudiar por capítulos o usa el modo examen para simular la
              estructura oficial con las reglas vigentes.
            </p>
            {catalog?.activeEdition && (
              <p className="info-text">
                Contenido activo: <strong>{catalog.activeEdition.title}</strong>
              </p>
            )}

            <div className="menu-grid home-menu-grid">
              <Link className="menu-card menu-card--primary" to="/practice">
                <strong>Práctica</strong>
                <span>Elige capítulos, ajusta la cantidad de preguntas y repasa con referencias rápidas.</span>
              </Link>
              <Link className="menu-card" to="/exam">
                <strong>Examen</strong>
                <span>Simula una prueba completa con puntaje objetivo y reglas oficiales verificadas.</span>
              </Link>
              <article className="menu-card menu-card--muted">
                <strong>Estudio</strong>
                <span>Próximamente: lectura guiada y consulta de referencias por tema.</span>
              </article>
            </div>
          </div>

          <aside className="home-overview">
            <div className="stats-grid stats-grid--home">
              <article className="stat-card">
                <strong>{publishedQuestionCount}</strong>
                <span>preguntas publicadas</span>
              </article>
              <article className="stat-card">
                <strong>{activeChapterCount}</strong>
                <span>capítulos con cobertura</span>
              </article>
              <article className="stat-card">
                <strong>{catalog?.examRuleSet.questionCount ?? 35}</strong>
                <span>preguntas en el examen</span>
              </article>
              <article className="stat-card">
                <strong>{catalog?.examRuleSet.passingPoints ?? 33}</strong>
                <span>puntos para aprobar</span>
              </article>
            </div>
          </aside>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Cobertura actual</span>
            <h2 className="section-title">Capítulos con preguntas publicadas</h2>
          </div>
        </div>
        {error && <p className="error-banner">{error}</p>}
        <div className="chapter-grid chapter-grid--home">
          {availableChapters.map((chapter) => (
            <article
              key={chapter.id}
              className={chapter.questionCount > 0 ? 'chapter-card' : 'chapter-card chapter-card--disabled'}
            >
              <strong>{chapter.code}</strong>
              <h3>{chapter.title}</h3>
              <p>{chapter.description}</p>
              <span>
                {chapter.questionCount > 0
                  ? `${chapter.questionCount} preguntas publicadas`
                  : 'Próximamente'}
              </span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
