import { useEffect, useState } from 'react';
import { QuizRunner } from '../components/quiz/QuizRunner';
import { getPublishedCatalog } from '../lib/contentRepository';
import { buildExamQuestionSet } from '../lib/quizFactory';
import type { ContentCatalog } from '../types/content';

type ActiveExam = {
  key: string;
  questions: ContentCatalog['questions'];
  maxScore: number;
  passingScore: number;
};

export function ExamPage() {
  const [catalog, setCatalog] = useState<ContentCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<ActiveExam | null>(null);

  useEffect(() => {
    getPublishedCatalog()
      .then((data) => setCatalog(data))
      .catch(() => setError('No se pudo cargar el modo examen.'));
  }, []);

  const startExam = () => {
    if (!catalog) {
      return;
    }

    try {
      const questions = buildExamQuestionSet(catalog.questions, catalog.examRuleSet);

      setActiveExam({
        key: `${Date.now()}`,
        questions,
        maxScore: catalog.examRuleSet.maxPoints,
        passingScore: catalog.examRuleSet.passingPoints,
      });
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : 'No se pudo construir el examen.');
    }
  };

  if (activeExam && catalog) {
    return (
      <QuizRunner
        key={activeExam.key}
        mode="exam"
        title="Simulación del examen teórico clase B"
        subtitle="35 preguntas, 38 puntos posibles y aprobación con 33."
        questions={activeExam.questions}
        maxScore={activeExam.maxScore}
        passingScore={activeExam.passingScore}
        onRestart={() => setActiveExam(null)}
      />
    );
  }

  return (
    <section className="page-stack page-stack--public">
      <section className="panel panel--soft exam-hero">
        <div className="public-builder-grid public-builder-grid--exam">
          <div>
            <span className="eyebrow">Examen clase B</span>
            <h1 className="hero-title">Simulación basada en reglas oficiales verificadas</h1>
            <p className="hero-copy">
              Este modo reproduce la estructura de puntaje del examen teórico clase B con base en
              fuentes oficiales verificadas.
            </p>
          </div>

          <article className="menu-card exam-note-card">
            <strong>Nota de alcance</strong>
            <span>
              No fijamos una duración oficial mientras no exista una fuente primaria equivalente para
              ese dato.
            </span>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2 className="section-title">Reglas de esta simulación</h2>
            <p className="info-text">Estas reglas se explican aquí y no se repiten en el menú principal.</p>
          </div>
        </div>
        <div className="stats-grid stats-grid--exam">
          <article className="stat-card">
            <strong>{catalog?.examRuleSet.questionCount ?? 35}</strong>
            <span>preguntas</span>
          </article>
          <article className="stat-card">
            <strong>{catalog?.examRuleSet.maxPoints ?? 38}</strong>
            <span>puntos máximos</span>
          </article>
          <article className="stat-card">
            <strong>{catalog?.examRuleSet.passingPoints ?? 33}</strong>
            <span>puntos para aprobar</span>
          </article>
          <article className="stat-card">
            <strong>{catalog?.examRuleSet.doubleWeightCount ?? 3}</strong>
            <span>preguntas de doble puntuación</span>
          </article>
        </div>
        {error && <p className="error-banner">{error}</p>}
        <button className="primary-button" type="button" onClick={startExam} disabled={!catalog}>
          Comenzar simulación
        </button>
      </section>
    </section>
  );
}
