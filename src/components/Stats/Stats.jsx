import { MAX_ATTEMPTS } from '../../constants/game.js';

function Metric({ label, value }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

export function Stats({ stats, onReset }) {
  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const avg = stats.won > 0 ? (stats.totalGuesses / stats.won).toFixed(2) : '—';
  const best = stats.bestAttempts ?? '—';
  const maxBar = Math.max(1, ...stats.distribution);

  return (
    <div className="stats">
      <div className="stats__grid">
        <Metric label="Сыграно" value={stats.played} />
        <Metric label="Победы" value={stats.won} />
        <Metric label="Поражения" value={stats.lost} />
        <Metric label="% побед" value={`${winRate}%`} />
        <Metric label="Серия" value={stats.currentStreak} />
        <Metric label="Рекорд серии" value={stats.maxStreak} />
        <Metric label="Лучшая попытка" value={best} />
        <Metric label="Среднее попыток" value={avg} />
        <Metric label="Монеты" value={stats.coins || 0} />
      </div>

      <h3 className="stats__heading">Распределение попыток</h3>
      <div className="distribution">
        {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => {
          const v = stats.distribution[i] || 0;
          const pct = Math.round((v / maxBar) * 100);
          return (
            <div className="distribution__row" key={i}>
              <span className="distribution__idx">{i + 1}</span>
              <div className="distribution__track">
                <div
                  className="distribution__bar"
                  style={{ width: `${Math.max(pct, v ? 8 : 4)}%` }}
                >
                  <span className="distribution__count">{v}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn btn--ghost stats__reset" onClick={onReset}>
        Сбросить статистику
      </button>
    </div>
  );
}
