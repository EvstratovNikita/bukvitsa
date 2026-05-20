// Inline SVG icons — single shared sizing, currentColor-driven, no dependency.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export function HelpIcon(props) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      aria-hidden="true"
    >
      <path d="M12 7.5v13" />
      <path d="M3 5.5h5a4 4 0 0 1 4 4V20.5H4a1 1 0 0 1-1-1z" />
      <path d="M21 5.5h-5a4 4 0 0 0-4 4V20.5h8a1 1 0 0 0 1-1z" />
      <path
        d="M18.5 2.2l.55 1.25 1.25.55-1.25.55-.55 1.25-.55-1.25-1.25-.55 1.25-.55z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function StatsIcon(props) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M5 21V11" />
      <path d="M12 21V3" />
      <path d="M19 21v-7" />
    </svg>
  );
}

export function RefreshIcon(props) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M21 12a9 9 0 1 1 -3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export function BackspaceIcon(props) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      aria-hidden="true"
    >
      <path d="M20.5 5H10.6a2 2 0 0 0-1.45.63L3.2 12l5.95 6.37A2 2 0 0 0 10.6 19h9.9a1.7 1.7 0 0 0 1.7-1.7V6.7A1.7 1.7 0 0 0 20.5 5z" />
      <path d="M15.7 9.7l-4 4.6" />
      <path d="M11.7 9.7l4 4.6" />
    </svg>
  );
}

export function EnterIcon(props) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M20 6v6a3 3 0 0 1-3 3H5" />
      <path d="M9 11l-4 4 4 4" />
    </svg>
  );
}

export function HintIcon(props) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.45 1 1.1 1 1.85V16h5.2v-.35c0-.75.4-1.4 1-1.85A6 6 0 0 0 12 3z" />
    </svg>
  );
}

let coinIdSeq = 0;

export function CoinIcon(props) {
  const id = `coin-${++coinIdSeq}`;
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      {...props}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe6a0" />
          <stop offset="0.5" stopColor="#f7c948" />
          <stop offset="1" stopColor="#8a5a10" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#ffe07a" />
          <stop offset="0.55" stopColor="#f1b730" />
          <stop offset="1" stopColor="#b27512" />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.32" cy="0.28" r="0.45">
          <stop offset="0" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      <circle cx="12" cy="12" r="10.2" fill={`url(#${id}-rim)`} />
      <circle cx="12" cy="12" r="10.2" fill="none" stroke="#6b440b" strokeWidth="0.5" opacity="0.6" />
      <circle cx="12" cy="12" r="7.8" fill={`url(#${id}-face)`} stroke="#7a4f0f" strokeWidth="0.5" />

      <path
        d="M12 7.6l1.46 2.97 3.28.48-2.37 2.31.56 3.27L12 15.08l-2.93 1.55.56-3.27-2.37-2.31 3.28-.48z"
        fill="#fff4c2"
        stroke="#7a4f0f"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />

      <ellipse cx="8.5" cy="8" rx="3.2" ry="1.3" fill={`url(#${id}-shine)`} transform="rotate(-32 8.5 8)" />
    </svg>
  );
}

export function CrownIcon(props) {
  return (
    <svg
      width="28" height="28" viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      {...props} aria-hidden="true"
    >
      <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" fill="currentColor" fillOpacity="0.18" />
      <path d="M5 19h14" />
      <circle cx="3" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="21" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SadIcon(props) {
  return (
    <svg
      width="28" height="28" viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      {...props} aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 15.5c1-1.5 2.2-2.2 3.5-2.2s2.5.7 3.5 2.2" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6l-6 6-6 6" />
    </svg>
  );
}
