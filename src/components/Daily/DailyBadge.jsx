import { getDailyNumber } from '../../data/dailyWord.js';

// Read-only green pill that swaps in for the energy badge while the player
// is on the daily word. Tells them which puzzle # they're on; no click.
export function DailyBadge() {
  const dayN = getDailyNumber();
  return (
    <div
      className="daily-badge"
      role="status"
      aria-label={`Слово дня номер ${dayN}`}
      title={`Слово дня #${dayN}`}
    >
      <span className="daily-badge__icon" aria-hidden="true">📅</span>
      <span className="daily-badge__text">Слово дня <b>#{dayN}</b></span>
    </div>
  );
}
