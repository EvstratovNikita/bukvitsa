import { useGameContext } from '../../context/GameContext.jsx';
import { PET_UNLOCK_GAMES } from '../../constants/game.js';
import { PetHeaderButton } from '../Pet/PetHeaderButton.jsx';
import { SunIcon, MoonIcon, PlusIcon } from '../icons/Icon.jsx';
import { MenuButton } from '../Menu/Menu.jsx';

export function Header({ onOpenMenu, onOpenPet, onOpenModes }) {
  // Stats moved into the side menu — the right slot now hosts Букля so the
  // pet is always one tap away without floating chrome over the board.
  const { stats, petGiftReady, setPref } = useGameContext();
  const hatched = Boolean(stats.pet?.hatched);
  // The egg is ready to hatch once the player has hit the unlock threshold but
  // hasn't opened the pet section yet — shout about it so they notice.
  const ready = !hatched && (stats.played || 0) >= PET_UNLOCK_GAMES;

  // Header now offers a one-tap theme switch (rules moved to the side menu).
  // Show the icon of the theme you'll switch TO: sun while dark, moon while light.
  const isLight = (stats.prefs?.theme || 'dark') === 'light';
  const toggleTheme = () => setPref('theme', isLight ? 'dark' : 'light');

  return (
    <header className="header">
      <div className="header__lead">
        <button
          type="button"
          className="iconbtn"
          onClick={toggleTheme}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={isLight ? 'Тёмная тема' : 'Светлая тема'}
          title={isLight ? 'Тёмная тема' : 'Светлая тема'}
        >
          {isLight ? <MoonIcon /> : <SunIcon />}
        </button>
        <button
          type="button"
          className="iconbtn iconbtn--modes"
          data-tour="modes"
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
        <PetHeaderButton onClick={onOpenPet} hatched={hatched} ready={ready} giftReady={Boolean(petGiftReady)} />
        <MenuButton onClick={onOpenMenu} />
      </div>
    </header>
  );
}
