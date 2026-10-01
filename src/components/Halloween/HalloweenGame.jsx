import { GAME_STATUS, HINT_COST, todayKey } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { HW_DAILY_CAP, HW_SHOP } from '../../data/halloween.js';
import { earnedToday } from '../../lib/halloweenProgress.js';
import { plural } from '../../utils/plural.js';
import { CoinIcon } from '../icons/Icon.jsx';
import { PumpkinIcon, itemInfo, ownsHwItem } from './HwIcons.jsx';

// Куски интерфейса партии в режиме «Загадки ночи».

const lettersLabel = (n) => `${n} ${plural(n, 'буква', 'буквы', 'букв')}`;
const pumpkinsLabel = (n) => `${n} ${plural(n, 'тыква', 'тыквы', 'тыкв')}`;

// Загадка над полем. С ней слово угадывается почти сразу, поэтому она —
// платная подсказка: сначала только «загадка спрятана» и кнопка с ценой.
// После партии загадку показывают панели конца партии.
export function RiddleCard() {
  const { riddle, riddleShown, revealRiddle, wordLength, status, stats } = useGameContext();
  if (!riddle) return null;
  const open = riddleShown || status !== GAME_STATUS.PLAYING;
  const cantAfford = (stats.coins || 0) < HINT_COST.RIDDLE;
  return (
    <div className={`hw-riddle${open ? '' : ' hw-riddle--closed'}`} role="note" aria-label="Загадка">
      <div className="hw-riddle__head">
        <PumpkinIcon />
        <span className="hw-riddle__title">Загадка ночи</span>
        <span className="hw-riddle__len">{lettersLabel(wordLength)}</span>
      </div>
      {open ? (
        <p className="hw-riddle__text">{riddle.riddle}</p>
      ) : (
        <div className="hw-riddle__closed">
          <span className="hw-riddle__hint">Жуткое слово спрятано. Нужна подсказка?</span>
          <button
            type="button"
            className="hw-riddle__btn"
            onClick={revealRiddle}
            onMouseDown={(e) => e.preventDefault()}
            disabled={cantAfford}
            title={cantAfford ? 'Не хватает монет' : 'Открыть загадку'}
          >
            <span>Загадка</span>
            <CoinIcon />
            <b>{HINT_COST.RIDDLE}</b>
          </button>
        </div>
      )}
    </div>
  );
}

// Счётчик тыкв в верхней панели вместо энергии: режим её не тратит.
export function PumpkinBadge({ onClick }) {
  const { stats } = useGameContext();
  const n = stats.halloween?.pumpkins || 0;
  return (
    <button
      type="button"
      className="hw-pumpkins"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={`Тыквы: ${n}. Открыть Тыквенную лавку`}
      title="Тыквенная лавка"
    >
      <PumpkinIcon />
      <span className="hw-pumpkins__value">{n}</span>
    </button>
  );
}

// Ближайшая цель в лавке: самый дешёвый предмет, которого у игрока нет.
export function nextHwGoal(stats) {
  return HW_SHOP.find((e) => !ownsHwItem(stats, e.id)) || null;
}

// Итог загадки — для панели конца партии и окна победы: сколько тыкв,
// сколько ещё можно собрать сегодня, на что копим.
export function HwRoundResult({ compact = false }) {
  const { stats, lastHw, status } = useGameContext();
  const hw = stats.halloween || {};
  const pumpkins = hw.pumpkins || 0;
  const won = status === GAME_STATUS.WON;
  const gained = lastHw?.gained || 0;
  const today = earnedToday(hw, todayKey());
  const capped = today >= HW_DAILY_CAP;
  const goal = nextHwGoal(stats);
  const pct = Math.min(100, Math.round((today / HW_DAILY_CAP) * 100));

  return (
    <div className={`hw-result${compact ? ' hw-result--compact' : ''}`}>
      {won && gained > 0 && (
        <div className="hw-result__gain">
          <PumpkinIcon />
          <span>+{gained}</span>
          <small>{plural(gained, 'тыква', 'тыквы', 'тыкв')}</small>
        </div>
      )}
      {won && gained === 0 && capped && (
        <div className="hw-result__capped">Тыквы на сегодня собраны — завтра ещё {HW_DAILY_CAP}</div>
      )}
      <div className="hw-result__track">
        <div className="hw-result__bar" aria-hidden="true">
          <span className="hw-result__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="hw-result__text">
          Сегодня <b>{today}</b> из {HW_DAILY_CAP} 🎃 · на руках <b>{pumpkins}</b>
          {!compact && goal && (
            pumpkins >= goal.price
              ? <> · хватает на: {itemInfo(goal.id).name}</>
              : <> · ещё {pumpkinsLabel(goal.price - pumpkins)} до: {itemInfo(goal.id).name}</>
          )}
        </div>
      </div>
    </div>
  );
}
