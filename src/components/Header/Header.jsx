import { useGameContext } from '../../context/GameContext.jsx';
import { PetHeaderButton } from '../Pet/PetHeaderButton.jsx';
import { HelpIcon } from '../icons/Icon.jsx';
import { MenuButton } from '../Menu/Menu.jsx';

export function Header({ onOpenHelp, onOpenMenu, onOpenPet }) {
  // Stats moved into the side menu — the right slot now hosts Букля so the
  // pet is always one tap away without floating chrome over the board.
  const { stats } = useGameContext();
  const hatched = Boolean(stats.pet?.hatched);

  return (
    <header className="header">
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

      <div className="brand">
        <span className="brand__mark" aria-hidden="true">Б</span>
        <h1 className="brand__title">Буквица</h1>
      </div>

      <div className="header__actions">
        <PetHeaderButton onClick={onOpenPet} hatched={hatched} />
        <MenuButton onClick={onOpenMenu} />
      </div>
    </header>
  );
}
