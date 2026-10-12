import { useGameContext } from '../../context/GameContext.jsx';
import { halloweenDaysLeft } from '../../lib/events.js';
import { HW_TRACK_MAX } from '../../data/halloween.js';
import { plural } from '../../utils/plural.js';
import { PumpkinIcon } from './HwIcons.jsx';

// Баннер ивента в главном меню, между «Играть» и сеткой разделов. Тонкая
// шкала — пройденная часть ленты наград.
export function HalloweenBanner({ onOpen }) {
  const { stats } = useGameContext();
  const hw = stats.halloween || {};
  const earned = hw.earned || 0;
  const pct = Math.round((earned / HW_TRACK_MAX) * 100);
  const days = halloweenDaysLeft();

  return (
    <button type="button" className="hw-banner" onClick={onOpen} onMouseDown={(e) => e.preventDefault()}>
      <span className="hw-banner__art" aria-hidden="true">
        <PumpkinIcon />
      </span>
      <span className="hw-banner__text">
        <span className="hw-banner__title">Ночь тыкв</span>
        <span className="hw-banner__sub">
          Лента {earned}/{HW_TRACK_MAX} 🎃 · ещё {days} {plural(days, 'день', 'дня', 'дней')}
        </span>
        <span className="hw-banner__bar" aria-hidden="true"><i style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} /></span>
      </span>
      <span className="hw-banner__go" aria-hidden="true">›</span>
    </button>
  );
}

// Летучие мыши над меню планируют: слой летит (transform), крылья не машут.
// Взмах пробовали дважды — кадрами через steps()/opacity и сжатием span — и оба
// раза он считался на главном потоке: меню в простое 35% занятости против 10%
// (замер, CPU ×4). Анимировать сам <svg> тоже нельзя — Chrome ведёт его на
// главном потоке.
const BAT = 'M0 -2 L3 -7 L4 -2 C8 -6 15 -9 24 -6 C20 -3 20 1 21 4 C17 2 14 3 12 6 C10 3 7 3 5 6 C3 8 1 9 0 9 C-1 9 -3 8 -5 6 C-7 3 -10 3 -12 6 C-14 3 -17 2 -21 4 C-20 1 -20 -3 -24 -6 C-15 -9 -8 -6 -4 -2 L-3 -7 Z';

export function HalloweenBats() {
  return (
    <span className="hw-bats" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`hw-bat hw-bat--${n}`}>
          <svg className="hw-bat__f" viewBox="-26 -22 52 34"><path d={BAT} /></svg>
        </span>
      ))}
    </span>
  );
}
