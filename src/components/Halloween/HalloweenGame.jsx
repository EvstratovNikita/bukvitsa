import { useGameContext } from '../../context/GameContext.jsx';
import { GAME_STATUS } from '../../constants/game.js';
import { HW_TRACK, HW_TRACK_MAX } from '../../data/halloween.js';
import { nextStep } from '../../lib/halloweenProgress.js';
import { plural } from '../../utils/plural.js';
import { PumpkinIcon, stepInfo } from './HwIcons.jsx';

// Куски интерфейса партии в режиме «Загадки ночи».

const lettersLabel = (n) => `${n} ${plural(n, 'буква', 'буквы', 'букв')}`;

// Загадка над полем. Компактная: на маленьком экране поле не должно заметно
// ужаться — текст в одну-две строки.
export function RiddleCard() {
  const { riddle, wordLength } = useGameContext();
  if (!riddle) return null;
  return (
    <div className="hw-riddle" role="note" aria-label="Загадка">
      <div className="hw-riddle__head">
        <PumpkinIcon />
        <span className="hw-riddle__title">Загадка ночи</span>
        <span className="hw-riddle__len">{lettersLabel(wordLength)}</span>
      </div>
      <p className="hw-riddle__text">{riddle.riddle}</p>
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
      aria-label={`Тыквы: ${n}. Открыть Тыквенную тропу`}
      title="Тыквенная тропа"
    >
      <PumpkinIcon />
      <span className="hw-pumpkins__value">{n}</span>
    </button>
  );
}

// Итог загадки — для панели конца партии и окна победы: сколько тыкв, сколько
// до следующей ступени, какие награды только что выданы.
export function HwRoundResult({ compact = false }) {
  const { stats, lastHw, status } = useGameContext();
  const hw = stats.halloween || {};
  const pumpkins = hw.pumpkins || 0;
  const won = status === GAME_STATUS.WON;
  const step = nextStep(hw);
  const gained = lastHw?.gained || 0;
  const fresh = lastHw?.newSteps || [];
  // Шкала — от порога предыдущей ступени до порога следующей.
  const idx = step ? HW_TRACK.findIndex((x) => x.id === step.id) : -1;
  const from = idx > 0 ? HW_TRACK[idx - 1].need : 0;
  const pct = step ? Math.min(100, Math.round(((pumpkins - from) / (step.need - from)) * 100)) : 100;

  return (
    <div className={`hw-result${compact ? ' hw-result--compact' : ''}`}>
      {won && gained > 0 && (
        <div className="hw-result__gain">
          <PumpkinIcon />
          <span>+{gained}</span>
          <small>{plural(gained, 'тыква', 'тыквы', 'тыкв')}</small>
        </div>
      )}
      {compact && fresh.length > 1 ? (
        // В нижней панели места мало: несколько наград сразу — одной строкой
        // значков, подробности — в окне победы и на тропе.
        <div className="hw-result__icons" title={fresh.map((s) => stepInfo(s).name).join(', ')}>
          <small>Новые награды</small>
          <span aria-hidden="true">{fresh.map((s) => stepInfo(s).icon).join(' ')}</span>
        </div>
      ) : fresh.length > 0 && (
        <div className="hw-result__new">
          {fresh.map((s) => {
            const info = stepInfo(s);
            return (
              <div key={s.id} className={`hw-reward-chip${s.grand ? ' hw-reward-chip--grand' : ''}`}>
                <span className="hw-reward-chip__icon" aria-hidden="true">{info.icon}</span>
                <span className="hw-reward-chip__text">
                  <small>Новая награда</small>
                  <b>{info.name}</b>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="hw-result__track">
        <div className="hw-result__bar" aria-hidden="true">
          <span className="hw-result__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="hw-result__text">
          {step
            ? <>Ещё <b>{step.need - pumpkins}</b> 🎃{compact ? ': ' : ' до награды: '}{stepInfo(step).name}</>
            : <>Тыквенная тропа пройдена: <b>{pumpkins}</b> 🎃 из {HW_TRACK_MAX}</>}
        </div>
      </div>
    </div>
  );
}

