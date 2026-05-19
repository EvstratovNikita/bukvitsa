import { HelpIcon, StatsIcon, RefreshIcon } from '../icons/Icon.jsx';

export function Header({ onOpenStats, onOpenHelp, onNewGame }) {
  return (
    <header className="header">
      <button
        type="button"
        className="iconbtn"
        onClick={onOpenHelp}
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
          aria-label="Статистика"
          title="Статистика"
        >
          <StatsIcon />
        </button>
        <button
          type="button"
          className="iconbtn iconbtn--accent"
          onClick={onNewGame}
          aria-label="Новая игра"
          title="Новая игра"
        >
          <RefreshIcon />
        </button>
      </div>
    </header>
  );
}
