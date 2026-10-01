import { useGameContext } from '../../context/GameContext.jsx';
import { halloweenDaysLeft } from '../../lib/events.js';
import { HW_DAILY_CAP } from '../../data/halloween.js';
import { earnedToday } from '../../lib/halloweenProgress.js';
import { todayKey } from '../../constants/game.js';
import { plural } from '../../utils/plural.js';
import { PumpkinIcon } from './HwIcons.jsx';

// Баннер ивента в главном меню, между «Играть» и сеткой разделов. Тонкая
// шкала — сколько тыкв собрано сегодня из дневного лимита.
export function HalloweenBanner({ onOpen }) {
  const { stats } = useGameContext();
  const hw = stats.halloween || {};
  const pumpkins = hw.pumpkins || 0;
  const pct = Math.round((earnedToday(hw, todayKey()) / HW_DAILY_CAP) * 100);
  const days = halloweenDaysLeft();

  return (
    <button type="button" className="hw-banner" onClick={onOpen} onMouseDown={(e) => e.preventDefault()}>
      <span className="hw-banner__art" aria-hidden="true">
        <PumpkinIcon />
      </span>
      <span className="hw-banner__text">
        <span className="hw-banner__title">Ночь тыкв</span>
        <span className="hw-banner__sub">
          Загадки ночи · {pumpkins} 🎃 · ещё {days} {plural(days, 'день', 'дня', 'дней')}
        </span>
        <span className="hw-banner__bar" aria-hidden="true"><i style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} /></span>
      </span>
      <span className="hw-banner__go" aria-hidden="true">›</span>
    </button>
  );
}

// Летучие мыши над меню. Каждая — отдельный слой: двигается сам слой
// (transform), а взмахи — два кадра крыльев, сменяемые прозрачностью.
// Видеокарта двигает готовые картинки, главный поток не перерисовывает.
const BAT = 'M0 -2 L3 -7 L4 -2 C8 -6 15 -9 24 -6 C20 -3 20 1 21 4 C17 2 14 3 12 6 C10 3 7 3 5 6 C3 8 1 9 0 9 C-1 9 -3 8 -5 6 C-7 3 -10 3 -12 6 C-14 3 -17 2 -21 4 C-20 1 -20 -3 -24 -6 C-15 -9 -8 -6 -4 -2 L-3 -7 Z';
const BAT_UP = 'M0 -2 L3 -7 L4 -2 C8 -10 14 -18 22 -20 C20 -14 19 -8 17 -3 C14 -3 11 -1 9 2 C7 1 5 2 4 5 C3 7 1 8 0 8 C-1 8 -3 7 -4 5 C-5 2 -7 1 -9 2 C-11 -1 -14 -3 -17 -3 C-19 -8 -20 -14 -22 -20 C-14 -18 -8 -10 -4 -2 L-3 -7 Z';

export function HalloweenBats() {
  return (
    <span className="hw-bats" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`hw-bat hw-bat--${n}`}>
          <svg viewBox="-26 -22 52 34" className="hw-bat__f hw-bat__f--a"><path d={BAT} /></svg>
          <svg viewBox="-26 -22 52 34" className="hw-bat__f hw-bat__f--b"><path d={BAT_UP} /></svg>
        </span>
      ))}
    </span>
  );
}
