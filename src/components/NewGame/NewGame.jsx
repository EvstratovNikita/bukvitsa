import { GAME_STATUS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { RefreshIcon } from '../icons/Icon.jsx';

// Shown only when a round is finished (win or loss). Lets the user start
// a fresh game after dismissing the celebration card.
export function NewGameButton() {
  const { status, reset } = useGameContext();
  if (status !== GAME_STATUS.WON && status !== GAME_STATUS.LOST) return null;

  return (
    <button
      type="button"
      className="newgame-btn"
      onClick={reset}
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Новая игра"
      title="Новая игра"
    >
      <RefreshIcon />
      <span>Новая игра</span>
    </button>
  );
}
