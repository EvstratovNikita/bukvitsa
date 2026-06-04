// Compact pet icon for the header — owl glyph after hatch, egg before.
// When `ready` (unlock threshold reached, not yet hatched) the button gets a
// pulsing glow + "!" badge so the player notices the egg is ready to hatch.
export function PetHeaderButton({ onClick, hatched, ready, giftReady }) {
  return (
    <button
      type="button"
      className={`iconbtn pet-headerbtn${hatched ? '' : ' pet-headerbtn--egg'}${ready ? ' pet-headerbtn--ready' : ''}${giftReady ? ' pet-headerbtn--gift' : ''}`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={hatched ? (giftReady ? 'Букля принесла подарок!' : 'Букля') : ready ? 'Яйцо готово вылупиться!' : 'Дупло'}
      title={hatched ? (giftReady ? 'Букля принесла подарок!' : 'Букля') : ready ? 'Яйцо готово вылупиться!' : 'Дупло'}
    >
      {hatched ? <HeaderOwl /> : <HeaderEgg />}
      {ready
        ? <span className="pet-headerbtn__badge" aria-hidden="true">!</span>
        : giftReady
          ? <span className="pet-headerbtn__gift" aria-hidden="true">🎁</span>
          : !hatched && <span className="pet-headerbtn__dot" aria-hidden="true" />}
    </button>
  );
}

function HeaderOwl() {
  return (
    <svg viewBox="0 0 48 52" width="22" height="24" aria-hidden="true">
      <defs>
        <radialGradient id="hdr-body" cx="50%" cy="40%" r="65%">
          <stop offset="0%"  stopColor="#b88656" />
          <stop offset="60%" stopColor="#7d4f23" />
          <stop offset="100%" stopColor="#3d2410" />
        </radialGradient>
        <radialGradient id="hdr-face" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#f8e3b6" />
          <stop offset="100%" stopColor="#a87436" />
        </radialGradient>
        <radialGradient id="hdr-iris" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#ffe072" />
          <stop offset="100%" stopColor="#d68a1a" />
        </radialGradient>
      </defs>
      <path d="M11 14 Q9 4 16 8 Q14 12 17 18 Z" fill="#3d2410" />
      <path d="M37 14 Q39 4 32 8 Q34 12 31 18 Z" fill="#3d2410" />
      <ellipse cx="24" cy="30" rx="18" ry="20" fill="url(#hdr-body)" />
      <ellipse cx="18" cy="24" rx="8" ry="9.5" fill="url(#hdr-face)" />
      <ellipse cx="30" cy="24" rx="8" ry="9.5" fill="url(#hdr-face)" />
      <circle cx="18" cy="24" r="5" fill="#fff" />
      <circle cx="30" cy="24" r="5" fill="#fff" />
      <circle cx="18" cy="25" r="3.4" fill="url(#hdr-iris)" />
      <circle cx="30" cy="25" r="3.4" fill="url(#hdr-iris)" />
      <circle cx="18" cy="25" r="1.6" fill="#1a0d04" />
      <circle cx="30" cy="25" r="1.6" fill="#1a0d04" />
      <circle cx="18.8" cy="24" r="0.7" fill="#fff" />
      <circle cx="30.8" cy="24" r="0.7" fill="#fff" />
      <path d="M22 28 Q21 32 24 35 Q27 32 26 28 Z" fill="#e8911a" stroke="#7a4400" strokeWidth="0.5" />
    </svg>
  );
}

function HeaderEgg() {
  return (
    <svg viewBox="0 0 40 50" width="20" height="24" aria-hidden="true">
      <defs>
        <radialGradient id="hdr-egg" cx="38%" cy="26%" r="78%">
          <stop offset="0%"   stopColor="#fffdf6" />
          <stop offset="55%"  stopColor="#f3e6cd" />
          <stop offset="100%" stopColor="#dcc097" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="28" rx="13" ry="19" fill="url(#hdr-egg)" stroke="#cdae82" strokeWidth="1.1" />
      <path d="M15 13 L18 9 L20 13 L22 8 L25 13" fill="none" stroke="#a8814a" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <ellipse cx="15" cy="22" rx="2" ry="1.3" fill="#c2a06f" opacity="0.4" />
      <ellipse cx="26" cy="32" rx="1.8" ry="1.2" fill="#c2a06f" opacity="0.4" />
    </svg>
  );
}
