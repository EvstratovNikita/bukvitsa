import { getDailyKey, getDailyNumber } from '../../data/dailyWord.js';
import { useGameContext } from '../../context/GameContext.jsx';

// Compact card in the topbar that opens / shows the daily word state:
//   - not played today → "Слово дня · Играть"
//   - played today    → "Слово дня · ✓ N/6" (clickable to view share modal)
export function DailyButton({ onOpenResult }) {
  const { stats, startDailyGame, showToast } = useGameContext();
  const today = getDailyKey();
  const dayN = getDailyNumber();
  const done = stats.daily?.lastPlayedKey === today;
  const last = stats.daily?.lastResult;

  const onClick = () => {
    if (done) {
      onOpenResult?.();
      return;
    }
    const ok = startDailyGame();
    if (!ok) showToast?.('Сегодняшнее слово уже сыграно');
  };

  return (
    <button
      type="button"
      className={`daily-btn${done ? ' daily-btn--done' : ''}`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Слово дня"
      title={`Слово дня · #${dayN}`}
    >
      <span className="daily-btn__icon" aria-hidden="true">📅</span>
      <span className="daily-btn__body">
        <span className="daily-btn__label">Слово дня</span>
        <span className="daily-btn__sub">
          {done
            ? (last?.won ? `Готово · ${last.attempts}/6` : 'Не угадал')
            : `Сегодня · #${dayN}`}
        </span>
      </span>
    </button>
  );
}
