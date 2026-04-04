type ProgressBarProps = {
  current: number;
  total: number;
  scoreLabel: string;
  scoreValue: string;
};

export function ProgressBar({ current, total, scoreLabel, scoreValue }: ProgressBarProps) {
  const progress = total === 0 ? 0 : (current / total) * 100;

  return (
    <div className="progress-shell">
      <div className="progress-meta">
        <span>
          Pregunta {current} de {total}
        </span>
        <span>
          {scoreLabel}: {scoreValue}
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
