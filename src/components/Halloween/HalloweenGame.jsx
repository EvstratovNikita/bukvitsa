import { GAME_STATUS, HINT_COST, todayKey } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { HW_DAILY_CAP, HW_TRACK, HW_TRACK_MAX } from '../../data/halloween.js';
import { earnedToday, nextStep } from '../../lib/halloweenProgress.js';
import { plural } from '../../utils/plural.js';
import { CoinIcon } from '../icons/Icon.jsx';
import { PumpkinIcon, stepInfo } from './HwIcons.jsx';

// Куски интерфейса партии в режиме «Загадки ночи».

const lettersLabel = (n) => `${n} ${plural(n, 'буква', 'буквы', 'букв')}`;

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
  const n = stats.halloween?.earned || 0;
  return (
    <button
      type="button"
      className="hw-pumpkins"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={`Тыквы: ${n}. Открыть ленту наград`}
      title="Лента наград"
    >
      <PumpkinIcon />
      <span className="hw-pumpkins__value">{n}</span>
    </button>
  );
}

// Итог загадки — для панели конца партии и окна победы: сколько тыкв,
// что открылось на ленте, сколько ещё можно собрать сегодня, что дальше.
export function HwRoundResult({ compact = false }) {
  const { stats, lastHw, status } = useGameContext();
  const hw = stats.halloween || {};
  const earned = hw.earned || 0;
  const won = status === GAME_STATUS.WON;
  const gained = lastHw?.gained || 0;
  const opened = won ? (lastHw?.newSteps || []) : [];
  const today = earnedToday(hw, todayKey());
  const capped = today >= HW_DAILY_CAP;
  const next = nextStep(hw);
  const prevNeed = next ? (HW_TRACK[HW_TRACK.indexOf(next) - 1]?.need || 0) : HW_TRACK_MAX;
  const pct = next ? Math.round(((earned - prevNeed) / (next.need - prevNeed)) * 100) : 100;

  return (
    <div className={`hw-result${compact ? ' hw-result--compact' : ''}`}>
      {won && gained > 0 && (
        <div className="hw-result__gain">
          <PumpkinIcon />
          <span>+{gained}</span>
          <small>{plural(gained, 'тыква', 'тыквы', 'тыкв')}</small>
        </div>
      )}
      {/* Открытые этой победой ступени. В узкой панели под полем больше одной
          плашки сжимали поле — там несколько наград идут одной строкой. */}
      {compact && opened.length > 1 ? (
        <div className="hw-result__icons">
          <small>Награды ленты</small>
          <span>{opened.map((st) => stepInfo(st).icon).join(' ')}</span>
        </div>
      ) : opened.length > 0 && (
        <div className="hw-result__new">
          {opened.map((st) => {
            const info = stepInfo(st);
            return (
              <div key={st.id} className={`hw-reward-chip${st.grand ? ' hw-reward-chip--grand' : ''}`}>
                <span className="hw-reward-chip__icon" aria-hidden="true">{info.icon}</span>
                <span className="hw-reward-chip__text">
                  <small>{st.grand ? 'Главная награда' : 'Награда ленты'}</small>
                  <b>{info.name}</b>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {won && gained === 0 && capped && (
        <div className="hw-result__capped">Тыквы на сегодня собраны — завтра ещё {HW_DAILY_CAP}</div>
      )}
      <div className="hw-result__track">
        <div className="hw-result__bar" aria-hidden="true">
          <span className="hw-result__fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </div>
        <div className="hw-result__text">
          {next ? (
            <>
              Ещё <b>{next.need - earned}</b> 🎃 до: {stepInfo(next).name}
              {!compact && <> · за сегодня {today}/{HW_DAILY_CAP}</>}
            </>
          ) : (
            <>Лента пройдена — все награды ивента твои!</>
          )}
        </div>
      </div>
    </div>
  );
}
