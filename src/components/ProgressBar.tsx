type ProgressBarProps = {
  current: number;
  total: number;
  scoreLabel: string;
  scoreValue: string;
};

export function ProgressBar({ current, total, scoreLabel, scoreValue }: ProgressBarProps) {
  const progress = total === 0 ? 0 : (current / total) * 100;
  const percentageLabel = Math.round(progress);

  return (
    <div className="progress-shell">
      <div className="progress-meta">
        <span id="progress-status">
          Pregunta <strong>{current}</strong> de <strong>{total}</strong>
        </span>
        <span aria-label={`${scoreLabel}: ${scoreValue}`}>
          {scoreLabel}: <strong>{scoreValue}</strong>
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Progreso del quiz: ${percentageLabel}%`}
        aria-describedby="progress-status"
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
