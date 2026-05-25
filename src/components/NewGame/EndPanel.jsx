import { GAME_STATUS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { CoinIcon, RefreshIcon } from '../icons/Icon.jsx';

// Bottom panel that slides up where the keyboard used to be after a round
// ends. Replaces the keyboard entirely (not overlay) so layout doesn't shift.
// Shows the just-earned coins on a win, then a primary CTA to start a fresh
// puzzle. Reset goes through the same energy gate as the topbar button.
export function EndPanel() {
  const { status, reset, lastEarned, solution } = useGameContext();
  if (status === GAME_STATUS.PLAYING) return null;
  const isWin = status === GAME_STATUS.WON;

  return (
    <div className="end-panel" role="region" aria-label="Конец раунда">
      <div className="end-panel__inner">
        <div className="end-panel__meta">
          <div className="end-panel__title">
            {isWin ? 'Победа!' : 'Не угадал'}
          </div>
          <div className="end-panel__sub">
            Слово: <b>{(solution || '').toUpperCase()}</b>
          </div>
          {isWin && lastEarned > 0 && (
            <div className="end-panel__reward">
              <CoinIcon />
              <span>+{lastEarned}</span>
            </div>
          )}
        </div>
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
  );
}
