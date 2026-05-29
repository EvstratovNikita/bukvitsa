import { useGameContext } from '../../context/GameContext.jsx';
import { PET_UNLOCK_GAMES } from '../../constants/game.js';
import { PetHeaderButton } from '../Pet/PetHeaderButton.jsx';
import { HelpIcon, PlusIcon } from '../icons/Icon.jsx';
import { MenuButton } from '../Menu/Menu.jsx';

export function Header({ onOpenHelp, onOpenMenu, onOpenPet, onOpenModes }) {
  // Stats moved into the side menu — the right slot now hosts Букля so the
  // pet is always one tap away without floating chrome over the board.
  const { stats } = useGameContext();
  const hatched = Boolean(stats.pet?.hatched);
  // The egg is ready to hatch once the player has hit the unlock threshold but
  // hasn't opened the pet section yet — shout about it so they notice.
  const ready = !hatched && (stats.played || 0) >= PET_UNLOCK_GAMES;

  return (
    <header className="header">
      <div className="header__lead">
        <button
          type="button"
          className="iconbtn"
          onClick={onOpenHelp}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Как играть"
          title="Как играть"
        >
          <HelpIcon />
        </button>
        <button
          type="button"
          className="iconbtn iconbtn--modes"
          onClick={onOpenModes}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Доп. режимы"
          title="Доп. режимы"
        >
          <PlusIcon />
        </button>
      </div>

      <div className="brand">
        <span className="brand__mark" aria-hidden="true">Б</span>
        <h1 className="brand__title">Буквица</h1>
      </div>

      <div className="header__actions">
        <PetHeaderButton onClick={onOpenPet} hatched={hatched} ready={ready} />
        <MenuButton onClick={onOpenMenu} />
      </div>
    </header>
  );
}
