import { GAME_STATUS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { CoinIcon, PlayIcon, RefreshIcon } from '../icons/Icon.jsx';

// Bottom panel that swaps in for the keyboard once a round ends. Compact
// rich layout so the space matches the keyboard footprint without dead air.
//
// Layout (single row on tablet+, stacks on narrow phones):
//   ┌─────────────────────────────┬────────────────────────────┐
//   │ Победа! / Не угадал          │ [Новая игра]               │
//   │ Слово: МЯТА                  │ [×2 за рекламу] (only win) │
//   │ +N монет (base + bonus)      │                            │
//   └─────────────────────────────┴────────────────────────────┘
export function EndPanel() {
  const {
    status, reset, solution,
    lastEarned, lastEarnedBase,
    doubledLastWin, doublingAd, doubleLastReward
  } = useGameContext();
  if (status === GAME_STATUS.PLAYING) return null;
  const isWin = status === GAME_STATUS.WON;
  const bonus = Math.max(0, (lastEarned || 0) - (lastEarnedBase || 0));
  const canDouble = isWin && lastEarned > 0 && !doubledLastWin;

  return (
    <div className="end-panel" role="region" aria-label="Конец раунда">
      <div className="end-panel__inner">
        <div className="end-panel__meta">
          <div className="end-panel__title">
            {isWin ? '🎉 Победа!' : '😕 Не угадал'}
          </div>
          <div className="end-panel__word">
            Слово: <b>{(solution || '').toUpperCase()}</b>
          </div>
          {isWin && lastEarned > 0 && (
            <div className="end-panel__reward">
              <CoinIcon />
              <span>+{lastEarned}</span>
              {bonus > 0 && (
                <span className="end-panel__bonus">
                  ({lastEarnedBase} + {bonus} от Букли)
                </span>
              )}
              {doubledLastWin && (
                <span className="end-panel__doubled">×2 ✓</span>
              )}
            </div>
          )}
        </div>

        <div className="end-panel__actions">
          {canDouble && (
            <button
              type="button"
              className="btn btn--ghost end-panel__double"
              onClick={doubleLastReward}
              onMouseDown={(e) => e.preventDefault()}
              disabled={doublingAd}
            >
              <PlayIcon />
              <span>{doublingAd ? 'Реклама…' : `×2 (+${lastEarned})`}</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary end-panel__cta"
            onClick={reset}
            onMouseDown={(e) => e.preventDefault()}
          >
            <RefreshIcon />
            <span>Новая игра</span>
          </button>
        </div>
      </div>
    </div>
  );
}
