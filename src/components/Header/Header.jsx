import { AuthButton } from '../Auth/Auth.jsx';
import { HelpIcon, StatsIcon } from '../icons/Icon.jsx';

export function Header({ onOpenStats, onOpenHelp }) {
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
        <button
          type="button"
          className="iconbtn"
          onClick={onOpenStats}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Статистика"
          title="Статистика"
        >
          <StatsIcon />
        </button>
        <AuthButton />
      </div>
    </header>
  );
}
