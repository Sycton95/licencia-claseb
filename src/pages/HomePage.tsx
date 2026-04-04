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

  return (
    <section className="page-stack">
      <section className="panel panel--soft">
        <span className="eyebrow">Quiz Clase B</span>
        <h1 className="hero-title">Practica y prepárate para el examen teórico</h1>
        <p className="hero-copy">
          Elige una práctica rápida por capítulos o entra al modo examen para simular una prueba con
          reglas oficiales verificadas.
        </p>
        {catalog?.activeEdition && (
          <p className="info-text">
            Contenido activo: <strong>{catalog.activeEdition.title}</strong>
          </p>
        )}

        <div className="menu-grid">
          <Link className="menu-card" to="/practice">
            <strong>Práctica personalizada</strong>
            <span>Selecciona capítulos, cantidad de preguntas y repasa con referencias rápidas.</span>
          </Link>
          <Link className="menu-card" to="/exam">
            <strong>Examen clase B</strong>
            <span>Simula una prueba completa con 35 preguntas y puntaje oficial objetivo.</span>
          </Link>
          <article className="menu-card menu-card--muted">
            <strong>Estudio</strong>
            <span>Próximamente: lectura guiada y consulta de material por referencias.</span>
          </article>
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Cobertura actual</span>
        <h2 className="section-title">Capítulos con preguntas publicadas</h2>
        {error && <p className="error-banner">{error}</p>}
        <div className="chapter-grid">
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
