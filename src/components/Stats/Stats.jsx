import { MAX_ATTEMPTS } from '../../constants/game.js';
import { tr } from '../../lib/lang.js';

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
        <Metric label={tr('Сыграно')} value={stats.played} />
        <Metric label={tr('Победы')} value={stats.won} />
        <Metric label={tr('Поражения')} value={stats.lost} />
        <Metric label={tr('% побед')} value={`${winRate}%`} />
        <Metric label={tr('Серия')} value={stats.currentStreak} />
        <Metric label={tr('Рекорд серии')} value={stats.maxStreak} />
        <Metric label={tr('Лучшая попытка')} value={best} />
        <Metric label={tr('Среднее попыток')} value={avg} />
        <Metric label={tr('Монеты')} value={stats.coins || 0} />
        <Metric label={tr('Всего заработано')} value={stats.coinsEarned || 0} />
      </div>

      <h3 className="stats__heading">{tr('Распределение попыток')}</h3>
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
                  {v > 0 && <span className="distribution__count">{v}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
