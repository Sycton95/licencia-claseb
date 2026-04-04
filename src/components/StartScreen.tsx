type StartScreenProps = {
  totalQuestions: number;
  onStart: () => void;
};

export function StartScreen({ totalQuestions, onStart }: StartScreenProps) {
  return (
    <section className="panel panel--soft">
      <span className="eyebrow">Semana 1 del plan 2026</span>
      <h1 className="hero-title">Practica tu licencia Clase B</h1>
      <p className="hero-copy">
        Entrena con {totalQuestions} preguntas aleatorias basadas en el manual oficial
        2026 y enfócate en siniestros de tránsito y convivencia vial.
      </p>

      <div className="feature-list" aria-label="Resumen del ejercicio">
        <div className="feature-card">
          <strong>10 preguntas</strong>
          <span>Selección aleatoria por intento</span>
        </div>
        <div className="feature-card">
          <strong>Corrección inmediata</strong>
          <span>Revisa la respuesta correcta al instante</span>
        </div>
        <div className="feature-card">
          <strong>Repaso final</strong>
          <span>Incluye página de referencia del manual</span>
        </div>
      </div>

      <button className="primary-button" type="button" onClick={onStart}>
        Comenzar práctica
      </button>
    </section>
  );
}
