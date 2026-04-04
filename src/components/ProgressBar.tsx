type ProgressBarProps = {
  current: number;
  total: number;
  score: number;
};

export function ProgressBar({ current, total, score }: ProgressBarProps) {
  const progress = total === 0 ? 0 : (current / total) * 100;

  return (
    <div className="progress-shell">
      <div className="progress-meta">
        <span>
          Pregunta {current} de {total}
        </span>
        <span>{score} correctas</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
