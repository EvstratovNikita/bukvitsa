import { useId } from 'react';

// Рисованные значки вместо эмодзи: та же плашка, что у плиток главного меню —
// глянцевый цветной квадрат с белым рисунком. Значок не зависит от шрифта
// устройства и одинаков на всех площадках.
//
// tint — цвет плашки из палитры плиток; w — заливка рисунка, d — тёмные детали,
// a — детали цветом плашки.
const TINT = {
  violet: [146, 100, 255],
  orange: [255, 140, 50],
  rose: [255, 84, 128],
  amber: [245, 170, 20],
  teal: [20, 190, 160],
  blue: [50, 140, 255],
  indigo: [110, 128, 255]
};

const GLYPHS = {
  '🎯': {
    tint: 'rose',
    draw: ({ w, d, a }) => (
      <>
        <circle cx="23" cy="25" r="12" fill={w} />
        <circle cx="23" cy="25" r="8.2" fill={a} />
        <circle cx="23" cy="25" r="5" fill={w} />
        <circle cx="23" cy="25" r="2" fill={d} />
        <path d="M23.5 24.5 34 14" stroke={d} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M32 12.5 33 15l2.5 1 2.5-2.5-2.3-.7-.7-2.3z" fill={w} />
      </>
    )
  },
  '🔥': {
    tint: 'orange',
    draw: ({ w, a }) => (
      <>
        <path d="M25 9.5c.6 6 8.5 9.5 8.5 18.5a9.5 9.5 0 0 1-19 0c0-4.5 3-7 3.7-11 2 1.3 3 3 3.3 4.7C23.5 18 25.5 14 25 9.5z" fill={w} />
        <path d="M24 23.5c.8 3 4.3 4.5 4.3 8a4.3 4.3 0 0 1-8.6 0c0-3 3.5-4.7 4.3-8z" fill={a} />
      </>
    )
  },
  '📅': {
    tint: 'blue',
    draw: ({ w, d, a }) => (
      <>
        <rect x="12.5" y="13" width="23" height="23" rx="4.5" fill={w} />
        <path d="M12.5 21.5v-4a4.5 4.5 0 0 1 4.5-4.5h14a4.5 4.5 0 0 1 4.5 4.5v4z" fill={a} />
        <rect x="17.5" y="10" width="3" height="7" rx="1.5" fill={w} />
        <rect x="27.5" y="10" width="3" height="7" rx="1.5" fill={w} />
        <g fill={d} opacity=".55">
          <rect x="17" y="24.5" width="3.4" height="3.4" rx="1" />
          <rect x="22.3" y="24.5" width="3.4" height="3.4" rx="1" />
          <rect x="17" y="30" width="3.4" height="3.4" rx="1" />
          <rect x="22.3" y="30" width="3.4" height="3.4" rx="1" />
          <rect x="27.6" y="30" width="3.4" height="3.4" rx="1" />
        </g>
        <rect x="27.6" y="24.5" width="3.4" height="3.4" rx="1" fill={a} />
      </>
    )
  },
  '🧠': {
    tint: 'violet',
    draw: ({ w, d }) => (
      <>
        <path d="M24 13c-2.5-2.5-7-1.5-7.5 2-3 .5-4.5 4-3 6.5-2 2.5-1 6.5 2 7.5 0 3.5 4 6 6.5 4.5 1 1 1.5 1 2 .5.5.5 1 .5 2-.5 2.5 1.5 6.5-1 6.5-4.5 3-1 4-5 2-7.5 1.5-2.5 0-6-3-6.5-.5-3.5-5-4.5-7.5-2z" fill={w} />
        <g fill="none" stroke={d} strokeWidth="1.7" strokeLinecap="round" opacity=".6">
          <path d="M24 14.5v18" />
          <path d="M18.5 18c2 0 3.2 1.2 3.2 3.2" />
          <path d="M29.5 18c-2 0-3.2 1.2-3.2 3.2" />
          <path d="M16.8 25.5c2-1 4-.3 5 1.3" />
          <path d="M31.2 25.5c-2-1-4-.3-5 1.3" />
        </g>
      </>
    )
  },
  '⏱': {
    tint: 'teal',
    draw: ({ w, d, a }) => (
      <>
        <rect x="21" y="9.5" width="6" height="3.6" rx="1.5" fill={w} />
        <rect x="22.7" y="12" width="2.6" height="4" fill={w} />
        <rect x="33" y="14.5" width="3.6" height="5" rx="1.5" transform="rotate(45 34.8 17)" fill={w} />
        <circle cx="24" cy="26" r="11" fill={w} />
        <circle cx="24" cy="26" r="8" fill={a} opacity=".22" />
        <path d="M24 26V19.5" stroke={d} strokeWidth="2.3" strokeLinecap="round" />
        <path d="M24 26l4 2.5" stroke={a} strokeWidth="2.3" strokeLinecap="round" />
        <circle cx="24" cy="26" r="1.7" fill={d} />
      </>
    )
  },
  '⚡': {
    tint: 'amber',
    draw: ({ w }) => (
      <>
        <path d="M28 9 14.5 26.5H22L19.5 39 33.5 20.5H25.5z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1" />
      </>
    )
  },
  '🪙': {
    tint: 'amber',
    draw: ({ w, d, a }) => (
      <>
        <circle cx="24" cy="25.5" r="12" fill={d} opacity=".28" />
        <circle cx="24" cy="24" r="12" fill={w} />
        <circle cx="24" cy="24" r="8.8" fill="none" stroke={a} strokeWidth="1.5" />
        <path d="m24 17.5 2 4.2 4.6.6-3.4 3.1.9 4.6-4.1-2.3-4.1 2.3.9-4.6-3.4-3.1 4.6-.6z" fill={a} />
      </>
    )
  },
  '🎁': {
    tint: 'rose',
    draw: ({ w, d, a }) => (
      <>
        <rect x="14" y="22.5" width="20" height="13.5" rx="2.5" fill={w} />
        <rect x="12" y="17" width="24" height="7" rx="2.2" fill={w} />
        <rect x="12" y="23" width="24" height="1.4" fill={d} opacity=".16" />
        <rect x="21.5" y="17" width="5" height="19" fill={a} />
        <path d="M24 17c-1.5-4.5-5-7-7.5-5.7-2.3 1.2-1.3 5.7 7.5 5.7z" fill={w} />
        <path d="M24 17c1.5-4.5 5-7 7.5-5.7 2.3 1.2 1.3 5.7-7.5 5.7z" fill={w} />
      </>
    )
  },
  '🦉': {
    tint: 'orange',
    draw: ({ w, d, a }) => (
      <>
        <path d="M13 11.5c3 .5 5 2 6 3.5 3-1 7-1 10 0 1-1.5 3-3 6-3.5.7 4 .5 7.5-.5 10 .3 1.5.5 3 .5 4.5 0 7-5 10.5-11 10.5s-11-3.5-11-10.5c0-1.5.2-3 .5-4.5-1-2.5-1.2-6-.5-10z" fill={w} />
        <circle cx="19" cy="23" r="4.7" fill={a} />
        <circle cx="29" cy="23" r="4.7" fill={a} />
        <circle cx="19" cy="23" r="2.3" fill={d} />
        <circle cx="29" cy="23" r="2.3" fill={d} />
        <circle cx="19.9" cy="22.1" r=".8" fill={w} />
        <circle cx="29.9" cy="22.1" r=".8" fill={w} />
        <path d="m24 25.5 2 2.3-2 2.7-2-2.7z" fill={a} />
      </>
    )
  },
  '🏆': {
    tint: 'amber',
    draw: ({ w, a }) => (
      <>
        <path d="M16.5 13.5H12.8c0 5.5 1.5 8.7 5 9.5M31.5 13.5h3.7c0 5.5-1.5 8.7-5 9.5" fill="none" stroke={w} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M15.5 11h17v9.5c0 5.2-3.6 8.5-8.5 8.5s-8.5-3.3-8.5-8.5z" fill={w} />
        <rect x="22.3" y="28" width="3.4" height="5" fill={w} />
        <rect x="17" y="32.5" width="14" height="4" rx="1.7" fill={w} />
        <path d="m24 14 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill={a} />
      </>
    )
  }
};

const mix = (c, to, k) => c.map((v, i) => Math.round(v * (1 - k) + to[i] * k));
const css = (c) => `rgb(${c.join(' ')})`;
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

export const hasGameIcon = (key) => Boolean(GLYPHS[key.replace('️', '')]);

export function GameIcon({ icon, size = 40, className }) {
  const id = useId();
  const glyph = GLYPHS[icon.replace('️', '')];
  if (!glyph) return null;
  const c = TINT[glyph.tint];
  const dark = mix(c, BLACK, 0.34);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}f`} x1=".2" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor={css(mix(c, WHITE, 0.3))} />
          <stop offset=".5" stopColor={css(c)} />
          <stop offset="1" stopColor={css(mix(c, BLACK, 0.18))} />
        </linearGradient>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor={css(mix(c, WHITE, 0.8))} />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="44" height="43" rx="13" fill={css(dark)} />
      <rect x="2" y="2" width="44" height="43" rx="13" fill={`url(#${id}f)`} />
      <path d="M15 2.6h18c6.5 0 12.4 5 12.4 12.4v1C36 11 12 11 2.6 16v-1C2.6 7.6 8.5 2.6 15 2.6z" fill="#fff" opacity=".2" />
      <g transform="translate(0 -.5)" style={{ filter: `drop-shadow(0 1.2px 0 ${css(mix(c, BLACK, 0.45))})` }}>
        {glyph.draw({ w: `url(#${id}w)`, d: css(mix(c, BLACK, 0.55)), a: css(c) })}
      </g>
    </svg>
  );
}
