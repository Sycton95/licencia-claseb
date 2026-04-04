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
        <span className="eyebrow">Base sólida del producto</span>
        <h1 className="hero-title">Estudio libre y simulación formal en una misma app</h1>
        <p className="hero-copy">
          La experiencia pública ya separa práctica personalizada, simulación del examen y panel
          editorial. La regla rectora es simple: ninguna pregunta debería publicarse sin fuente,
          revisión y trazabilidad.
        </p>
        {catalog?.activeEdition && (
          <p className="info-text">
            Edición activa del contenido: <strong>{catalog.activeEdition.title}</strong>
          </p>
        )}

        <div className="menu-grid">
          <Link className="menu-card" to="/practice">
            <strong>Práctica personalizada</strong>
            <span>Elige capítulos activos y cantidad de preguntas.</span>
          </Link>
          <Link className="menu-card" to="/exam">
            <strong>Examen clase B</strong>
            <span>Simula 35 preguntas, 38 puntos máximos y aprobación con 33.</span>
          </Link>
          <Link className="menu-card" to="/admin">
            <strong>Panel admin</strong>
            <span>Edita, revisa y publica preguntas con flujo editorial controlado.</span>
          </Link>
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Reglas verificadas</span>
        <h2 className="section-title">Modo examen actual</h2>
        <div className="stats-grid">
          <article className="stat-card">
            <strong>35</strong>
            <span>preguntas por intento</span>
          </article>
          <article className="stat-card">
            <strong>38</strong>
            <span>puntos máximos</span>
          </article>
          <article className="stat-card">
            <strong>33</strong>
            <span>puntos necesarios para aprobar</span>
          </article>
          <article className="stat-card">
            <strong>3</strong>
            <span>preguntas de doble puntuación</span>
          </article>
        </div>
        <p className="info-text">
          Fuente normativa de referencia: Decreto 170 de Conaset y ficha de ChileAtiende. No se fija
          una duración oficial hasta contar con una fuente primaria equivalente para ese dato.
        </p>
      </section>

      <section className="panel">
        <span className="eyebrow">Cobertura actual</span>
        <h2 className="section-title">Capítulos disponibles</h2>
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
