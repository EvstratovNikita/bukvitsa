// Compact pet icon for the header — owl glyph after hatch, egg before.
// Pulsing dot before first visit hints the user there's a discovery there.
export function PetHeaderButton({ onClick, hatched }) {
  return (
    <button
      type="button"
      className={`iconbtn pet-headerbtn${hatched ? '' : ' pet-headerbtn--egg'}`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={hatched ? 'Букля' : 'Дупло'}
      title={hatched ? 'Букля' : 'Дупло'}
    >
      {hatched ? <HeaderOwl /> : <HeaderEgg />}
      {!hatched && <span className="pet-headerbtn__dot" aria-hidden="true" />}
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
        <radialGradient id="hdr-egg" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#fff7e2" />
          <stop offset="60%"  stopColor="#f5d8a3" />
          <stop offset="100%" stopColor="#c9974c" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="28" rx="14" ry="20" fill="url(#hdr-egg)" stroke="#8a5a1d" strokeWidth="1.2" />
      <ellipse cx="14" cy="20" rx="2.2" ry="1.4" fill="#8a5a1d" opacity="0.45" />
      <ellipse cx="26" cy="32" rx="2"   ry="1.4" fill="#8a5a1d" opacity="0.45" />
    </svg>
  );
}
