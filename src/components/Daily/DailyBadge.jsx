import { getDailyNumber } from '../../data/dailyWord.js';
import { tr } from '../../lib/lang.js';
import { Emoji } from '../icons/GameIcon.jsx';

// Read-only green pill that swaps in for the energy badge while the player
// is on the daily word. Tells them which puzzle # they're on; no click.
export function DailyBadge() {
  const dayN = getDailyNumber();
  return (
    <div
      className="daily-badge"
      role="status"
      data-tour="daily"
      aria-label={tr('Слово дня номер {dayN}', { dayN })}
      title={tr('Слово дня #{dayN}', { dayN })}
    >
      <span className="daily-badge__icon" aria-hidden="true"><Emoji e="📅" /></span>
      <span className="daily-badge__text">{tr('Слово дня ')}<b>#{dayN}</b></span>
    </div>
  );
}
