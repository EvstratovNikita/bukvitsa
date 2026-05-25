import { useGameContext } from '../../context/GameContext.jsx';

// Floating button anchored to the right edge of the game area. Always visible.
// Shows an egg icon until the user opens the section the first time (when the
// hatching animation runs); shows the owl from then on.
export function PetFab({ onOpen }) {
  const { stats } = useGameContext();
  const hatched = Boolean(stats.pet?.hatched);
  const name = stats.pet?.name || 'Букля';

  return (
    <button
      type="button"
      className={`pet-fab${hatched ? ' pet-fab--hatched' : ' pet-fab--egg'}`}
      onClick={onOpen}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={hatched ? name : 'Загадочное яйцо'}
      title={hatched ? name : 'Загадочное яйцо'}
    >
      <span className="pet-fab__glyph" aria-hidden="true">
        {hatched ? <MiniOwl /> : <MiniEgg />}
      </span>
      {!hatched && <span className="pet-fab__dot" aria-hidden="true" />}
    </button>
  );
}

function MiniEgg() {
  return (
    <svg viewBox="0 0 40 50" width="28" height="34">
      <defs>
        <radialGradient id="petfab-egg" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff7e2" />
          <stop offset="60%" stopColor="#f5d8a3" />
          <stop offset="100%" stopColor="#c9974c" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="28" rx="14" ry="20" fill="url(#petfab-egg)" stroke="#8a5a1d" strokeWidth="1.2" />
      <ellipse cx="14" cy="20" rx="2.4" ry="1.4" fill="#8a5a1d" opacity="0.45" />
      <ellipse cx="26" cy="32" rx="2.2" ry="1.4" fill="#8a5a1d" opacity="0.45" />
      <ellipse cx="18" cy="38" rx="1.6" ry="1" fill="#8a5a1d" opacity="0.45" />
    </svg>
  );
}

function MiniOwl() {
  return (
    <svg viewBox="0 0 48 52" width="30" height="32">
      <defs>
        <linearGradient id="petfab-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a47148" />
          <stop offset="100%" stopColor="#704420" />
        </linearGradient>
      </defs>
      {/* tufts */}
      <path d="M10 12 L14 4 L17 14 Z" fill="#704420" />
      <path d="M38 12 L34 4 L31 14 Z" fill="#704420" />
      {/* body */}
      <ellipse cx="24" cy="30" rx="18" ry="20" fill="url(#petfab-body)" />
      {/* belly */}
      <ellipse cx="24" cy="36" rx="10" ry="11" fill="#e8c896" />
      {/* eyes */}
      <circle cx="17" cy="24" r="6.5" fill="#fff" />
      <circle cx="31" cy="24" r="6.5" fill="#fff" />
      <circle cx="17" cy="25" r="3.2" fill="#1a1300" />
      <circle cx="31" cy="25" r="3.2" fill="#1a1300" />
      <circle cx="18.2" cy="23.6" r="1" fill="#fff" />
      <circle cx="32.2" cy="23.6" r="1" fill="#fff" />
      {/* beak */}
      <path d="M22 30 L26 30 L24 34 Z" fill="#f7c948" stroke="#8a5a1d" strokeWidth="0.6" />
    </svg>
  );
}
