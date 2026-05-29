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
        <radialGradient id="petfab-egg" cx="38%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#fffdf6" />
          <stop offset="55%" stopColor="#f3e6cd" />
          <stop offset="100%" stopColor="#dcc097" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="28" rx="13" ry="19" fill="url(#petfab-egg)" stroke="#cdae82" strokeWidth="1.1" />
      <path d="M15 13 L18 9 L20 13 L22 8 L25 13" fill="none" stroke="#a8814a" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <ellipse cx="15" cy="22" rx="2" ry="1.3" fill="#c2a06f" opacity="0.4" />
      <ellipse cx="26" cy="32" rx="1.8" ry="1.2" fill="#c2a06f" opacity="0.4" />
    </svg>
  );
}

function MiniOwl() {
  return (
    <svg viewBox="0 0 48 52" width="32" height="34">
      <defs>
        <radialGradient id="petfab-body" cx="50%" cy="40%" r="65%">
          <stop offset="0%"  stopColor="#b88656" />
          <stop offset="60%" stopColor="#7d4f23" />
          <stop offset="100%" stopColor="#3d2410" />
        </radialGradient>
        <radialGradient id="petfab-face" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#f8e3b6" />
          <stop offset="100%" stopColor="#a87436" />
        </radialGradient>
        <radialGradient id="petfab-belly" cx="50%" cy="40%" r="65%">
          <stop offset="0%"   stopColor="#fbe9c2" />
          <stop offset="100%" stopColor="#c89c5e" />
        </radialGradient>
        <radialGradient id="petfab-iris" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#ffe072" />
          <stop offset="100%" stopColor="#d68a1a" />
        </radialGradient>
      </defs>
      {/* tufts */}
      <path d="M11 14 Q9 4 16 8 Q14 12 17 18 Z" fill="#3d2410" />
      <path d="M37 14 Q39 4 32 8 Q34 12 31 18 Z" fill="#3d2410" />
      {/* body */}
      <ellipse cx="24" cy="30" rx="18" ry="20" fill="url(#petfab-body)" />
      {/* wings */}
      <path d="M8 26 Q4 36 10 46 Q14 48 18 46 Q20 36 17 28 Z" fill="#3d2410" />
      <path d="M40 26 Q44 36 38 46 Q34 48 30 46 Q28 36 31 28 Z" fill="#3d2410" />
      {/* belly */}
      <ellipse cx="24" cy="34" rx="10" ry="13" fill="url(#petfab-belly)" />
      {/* facial discs */}
      <ellipse cx="18" cy="24" rx="8" ry="9.5" fill="url(#petfab-face)" />
      <ellipse cx="30" cy="24" rx="8" ry="9.5" fill="url(#petfab-face)" />
      {/* eyes — white + golden iris + pupil */}
      <circle cx="18" cy="24" r="5" fill="#fff" />
      <circle cx="30" cy="24" r="5" fill="#fff" />
      <circle cx="18" cy="25" r="3.4" fill="url(#petfab-iris)" />
      <circle cx="30" cy="25" r="3.4" fill="url(#petfab-iris)" />
      <circle cx="18" cy="25" r="1.6" fill="#1a0d04" />
      <circle cx="30" cy="25" r="1.6" fill="#1a0d04" />
      <circle cx="18.8" cy="24" r="0.7" fill="#fff" />
      <circle cx="30.8" cy="24" r="0.7" fill="#fff" />
      {/* beak */}
      <path d="M22 28 Q21 32 24 35 Q27 32 26 28 Z" fill="#e8911a" stroke="#7a4400" strokeWidth="0.5" />
    </svg>
  );
}
