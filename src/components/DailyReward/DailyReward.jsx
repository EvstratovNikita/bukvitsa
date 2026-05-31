import { useEffect, useState } from 'react';
import { DAILY_CYCLE_DAYS, DAILY_ENERGY_BONUS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { BoltIcon, CoinIcon } from '../icons/Icon.jsx';

export function DailyReward() {
  const { pendingDailyReward, claimDailyReward, ready } = useGameContext();

  // Don't open from the optimistic local state: wait for the server reconcile
  // (`ready`) so we never flash a reward that was already claimed today on
  // another device / before a cache clear.
  const [open, setOpen] = useState(false);
  const [reward, setReward] = useState(null);
  const [claimed, setClaimed] = useState(false);

  // Arm once the synced state actually has a pending reward (also re-arms on a
  // midnight cross while the tab stays open).
  useEffect(() => {
    if (ready && pendingDailyReward && !open && !claimed) {
      setReward(pendingDailyReward);
      setOpen(true);
    }
  }, [ready, pendingDailyReward, open, claimed]);

  if (!open || !reward) return null;

  const { streak, amount, energy: energyBonus = 0 } = reward;

  const onClaim = () => {
    claimDailyReward();
    setClaimed(true);
    // brief delay so the user sees the press feedback before close
    setTimeout(() => setOpen(false), 280);
  };

  const onClose = () => {
    // Still grant the reward when closing — it'd be punitive otherwise.
    if (!claimed) claimDailyReward();
    setOpen(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Ежедневная награда">
      <div className="daily">
        <div className="daily__lead">
          День <b>{streak}</b> из {DAILY_CYCLE_DAYS}
        </div>

        <div className="daily__week">
          {Array.from({ length: DAILY_CYCLE_DAYS }, (_, i) => {
            const d = i + 1;
            const isCurrent = d === streak;
            const isDone = d < streak;
            const dayEnergy = DAILY_ENERGY_BONUS[d] || 0;
            return (
              <div
                key={d}
                className={[
                  'daily__day',
                  isCurrent && 'daily__day--current',
                  isDone && 'daily__day--done'
                ].filter(Boolean).join(' ')}
                style={{ animationDelay: `${80 + i * 60}ms` }}
              >
                <div className="daily__day-num">День {d}</div>
                <div className="daily__day-coin">
                  <CoinIcon />
                  <span>+{d}</span>
                </div>
                {dayEnergy > 0 && (
                  <div className="daily__day-energy">
                    <BoltIcon />
                    <span>+{dayEnergy}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={`daily__big${claimed ? ' daily__big--claimed' : ''}`}>
          <div className="daily__big-glow" aria-hidden="true" />
          <CoinIcon className="daily__big-coin" />
          <span className="daily__big-amount">+{amount}</span>
          {energyBonus > 0 && (
            <span className="daily__big-energy">
              <BoltIcon />
              <span>+{energyBonus}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn btn--primary daily__claim"
          onClick={onClaim}
          onMouseDown={(e) => e.preventDefault()}
          disabled={claimed}
        >
          {claimed ? 'Забрано!' : 'Забрать'}
        </button>

        <p className="daily__hint">
          Заходи каждый день — награда растёт. Пропустишь день — счёт начнётся заново.
        </p>
      </div>
    </Modal>
  );
}
