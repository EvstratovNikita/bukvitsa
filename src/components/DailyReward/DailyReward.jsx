import { useEffect, useState } from 'react';
import { DAILY_CYCLE_DAYS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { CoinIcon } from '../icons/Icon.jsx';

export function DailyReward() {
  const { pendingDailyReward, claimDailyReward } = useGameContext();

  // Open if a reward is pending at mount. Stays open until user claims/closes.
  const [open, setOpen] = useState(() => pendingDailyReward != null);
  const [reward, setReward] = useState(() => pendingDailyReward);
  const [claimed, setClaimed] = useState(false);

  // Re-arm if a fresh day's reward appears (e.g., midnight cross while tab open).
  useEffect(() => {
    if (pendingDailyReward && !open && !claimed) {
      setReward(pendingDailyReward);
      setOpen(true);
    }
  }, [pendingDailyReward, open, claimed]);

  if (!open || !reward) return null;

  const { streak, amount } = reward;

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
                <div className="daily__day-num">{d}</div>
                <div className="daily__day-coin">
                  <CoinIcon />
                  <span>+{d}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`daily__big${claimed ? ' daily__big--claimed' : ''}`}>
          <div className="daily__big-glow" aria-hidden="true" />
          <CoinIcon className="daily__big-coin" />
          <span className="daily__big-amount">+{amount}</span>
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
