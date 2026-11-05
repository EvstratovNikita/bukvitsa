import { useId } from 'react';
import { isEn } from '../../lib/lang.js';

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
  indigo: [110, 128, 255],
  green: [70, 185, 90],
  silver: [140, 155, 185],
  bronze: [205, 125, 70],
  slate: [95, 110, 145]
};

const STAR = 'M24 11.5l3.7 7.7 8.4 1.1-6.2 5.8 1.6 8.4L24 30.4l-7.5 4.1 1.6-8.4-6.2-5.8 8.4-1.1z';

const medal = (tint, digit) => ({
  tint,
  draw: ({ w, d, a }) => (
    <>
      <path d="M15.5 9h6l3.5 9h-6z" fill={d} opacity=".5" />
      <path d="M32.5 9h-6L23 18h6z" fill={w} />
      <circle cx="24" cy="27" r="10.5" fill={w} />
      <circle cx="24" cy="27" r="7.7" fill={a} />
      <path d={digit} fill="none" stroke={w} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
});

const GLYPHS = {
  // Разделы главного меню: у них нет своего эмодзи, ключ — имя раздела.
  settings: {
    tint: 'indigo',
    draw: ({ w, a }) => (
      <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
          <rect key={r} x="20.8" y="9.5" width="6.4" height="8" rx="1.8" fill={w} transform={`rotate(${r} 24 24)`} />
        ))}
        <circle cx="24" cy="24" r="11" fill={w} />
        <circle cx="24" cy="24" r="4.6" fill={a} />
      </>
    )
  },
  stats: {
    tint: 'teal',
    draw: ({ w }) => (
      <>
        <rect x="11.5" y="25" width="7" height="12" rx="2.2" fill={w} />
        <rect x="20.5" y="17" width="7" height="20" rx="2.2" fill={w} />
        <rect x="29.5" y="10" width="7" height="27" rx="2.2" fill={w} />
      </>
    )
  },
  help: {
    tint: 'blue',
    draw: ({ w, a }) => (
      <>
        <path d="M23.2 15.5c-3.7-3-9-3.7-14.2-2.5-.8.2-1.3.8-1.3 1.6v18.3c0 1 1 1.7 2 1.5 4.7-1 9.5-.5 13.5 2.3z" fill={w} />
        <path d="M24.8 15.5c3.7-3 9-3.7 14.2-2.5.8.2 1.3.8 1.3 1.6v18.3c0 1-1 1.7-2 1.5-4.7-1-9.5-.5-13.5 2.3z" fill={w} />
        <path d="M12 19c2.8-.5 5.5-.2 8 .9M12 24c2.8-.5 5.5-.2 8 .9M36 19c-2.8-.5-5.5-.2-8 .9M36 24c-2.8-.5-5.5-.2-8 .9" fill="none" stroke={a} strokeWidth="1.8" strokeLinecap="round" />
      </>
    )
  },
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
  '🥇': medal('amber', 'M21.5 25l3-2.2v8'),
  '🥈': medal('silver', 'M20.8 25c.4-3.3 6.4-3.2 6.4 0 0 2.7-6.4 3.5-6.4 6h6.4'),
  '🥉': medal('bronze', 'M20.8 24.5c1-2.3 6.2-2 6.2.8 0 1.8-1.5 2-3 2 1.7 0 3.2.4 3.2 2.2 0 2.9-5.5 3-6.5.8'),
  '⭐': {
    tint: 'amber',
    draw: ({ w }) => (
        <path d={STAR} fill={w} stroke={w} strokeWidth="2.2" strokeLinejoin="round" />
    )
  },
  '🌟': {
    tint: 'amber',
    draw: ({ w }) => (
      <>
        <path d={STAR} fill={w} stroke={w} strokeWidth="1.5" strokeLinejoin="round" transform="translate(-1 1)" />
        <path d="M36 9.5c.5 2.5 1.2 3.2 3.5 3.7-2.3.5-3 1.2-3.5 3.7-.5-2.5-1.2-3.2-3.5-3.7 2.3-.5 3-1.2 3.5-3.7z" fill={w} />
        <path d="M11.5 31c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5z" fill={w} />
      </>
    )
  },
  '🌠': {
    tint: 'indigo',
    draw: ({ w }) => (
      <>
        <path d="M10 13l13 9M8 22l10 6M18 9l9 11" stroke={w} strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
        <path d="M30 16l2.3 5 5.4.7-4 3.7 1 5.4-4.7-2.7-4.8 2.7 1-5.4-4-3.7 5.5-.7z" fill={w} stroke={w} strokeWidth="1.5" strokeLinejoin="round" />
      </>
    )
  },
  '✨': {
    tint: 'violet',
    draw: ({ w }) => (
      <>
        <path d="M21 11c1 7 3.5 9.5 11 11-7.5 1.5-10 4-11 11-1-7-3.5-9.5-11-11 7.5-1.5 10-4 11-11z" fill={w} />
        <path d="M33 10c.5 3 1.5 4 4.5 4.5-3 .5-4 1.5-4.5 4.5-.5-3-1.5-4-4.5-4.5 3-.5 4-1.5 4.5-4.5z" fill={w} />
        <path d="M33 28c.4 2.3 1.2 3.1 3.5 3.5-2.3.4-3.1 1.2-3.5 3.5-.4-2.3-1.2-3.1-3.5-3.5 2.3-.4 3.1-1.2 3.5-3.5z" fill={w} />
      </>
    )
  },
  '🌙': {
    tint: 'indigo',
    draw: ({ w }) => (
      <>
        <path d="M29 10.5a13.5 13.5 0 1 0 8 21 11 11 0 0 1-8-21z" fill={w} />
        <path d="M33 13.5c.4 2 1 2.6 3 3-2 .4-2.6 1-3 3-.4-2-1-2.6-3-3 2-.4 2.6-1 3-3z" fill={w} />
      </>
    )
  },
  '🌱': {
    tint: 'green',
    draw: ({ w, d }) => (
      <>
        <path d="M24 34V21" stroke={w} strokeWidth="3" strokeLinecap="round" />
        <path d="M24 23c0-7-5-11-12-11 0 7 5 11 12 11z" fill={w} />
        <path d="M24 26c0-6 4-9.5 11-9.5 0 6-4.5 9.5-11 9.5z" fill={w} />
        <path d="M14 34.5h20c1.5 0 1.5 2.5 0 2.5H14c-1.5 0-1.5-2.5 0-2.5z" fill={w} />
        <path d="M15.5 14.5c2.5 2 5 4.5 6.5 7" stroke={d} strokeWidth="1.3" strokeLinecap="round" opacity=".35" fill="none" />
      </>
    )
  },
  '🌸': {
    tint: 'rose',
    draw: ({ w, a }) => (
      <>
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="24" cy="15.5" rx="5.8" ry="7" fill={w} transform={`rotate(${r} 24 24)`} />
        ))}
        <circle cx="24" cy="24" r="4" fill={a} />
      </>
    )
  },
  '🌹': {
    tint: 'rose',
    draw: ({ w, a }) => (
      <>
        <path d="M24 27v10.5" stroke={w} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M24 33.5c-4 .3-7-1.3-8.5-4.5 4-.7 7.2.8 8.5 4.5zM24 35c3.5.3 6.5-1 8-4-3.5-.8-6.8.5-8 4z" fill={w} />
        <path d="M24 9c2 0 3.5 1 4.5 2.5 3-.5 6 2.5 5.5 6 1.5 3-.5 7-3.5 8-2 2.5-11 2.5-13 0-3-1-5-5-3.5-8-.5-3.5 2.5-6.5 5.5-6C20.5 10 22 9 24 9z" fill={w} />
        <g fill="none" stroke={a} strokeWidth="1.9" strokeLinecap="round">
          <path d="M18 17c1-3.5 4-5 7.5-4" />
          <path d="M30.5 16.5c1 3.5-.5 6.5-3.5 8" />
          <path d="M22 23.5c-2.5-1.5-3.5-3.5-3-5.5" />
          <path d="M22.5 17.5c2-1.5 4.5-.5 5 1.5.4 2-1.5 3.5-3.5 3" />
        </g>
      </>
    )
  },
  '❤': {
    tint: 'rose',
    draw: ({ w, a }) => (
      <>
        <path d="M24 37C15 30.5 10.5 26 10.5 19.5c0-4.5 3.5-8 7.5-8 2.5 0 4.7 1.3 6 3.5 1.3-2.2 3.5-3.5 6-3.5 4 0 7.5 3.5 7.5 8C37.5 26 33 30.5 24 37z" fill={w} />
        <path d="M16 18.5c0-1.8 1.2-3 3-3" fill="none" stroke={a} strokeWidth="2.2" strokeLinecap="round" />
      </>
    )
  },
  '🍎': {
    tint: 'rose',
    draw: ({ w, a }) => (
      <>
        <path d="M24 17c-3.5-3-11-2.5-12 5-1 8 4.5 15 8.5 15 1.5 0 2.2-.8 3.5-.8s2 .8 3.5.8c4 0 9.5-7 8.5-15-1-7.5-8.5-8-12-5z" fill={w} />
        <path d="M24 17c0-3 .5-5 2.5-7" stroke={w} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M27 14c.5-3 3-4.5 6.5-4 0 3-3 5-6.5 4z" fill={w} />
        <path d="M16 23c.2-2 1.3-3.2 3-3.5" fill="none" stroke={a} strokeWidth="2.2" strokeLinecap="round" />
      </>
    )
  },
  '🥚': {
    tint: 'orange',
    draw: ({ w, a }) => (
      <>
        <path d="M24 9c6.5 0 11 10 11 16.5S30 37 24 37s-11-5-11-11.5S17.5 9 24 9z" fill={w} />
        <g fill={a}>
          <circle cx="20" cy="20" r="2" />
          <circle cx="28" cy="24" r="2.5" />
          <circle cx="21" cy="30" r="1.8" />
          <circle cx="27" cy="15.5" r="1.3" />
        </g>
      </>
    )
  },
  '🐛': {
    tint: 'green',
    draw: ({ w, d }) => (
      <>
        <circle cx="35" cy="20" r="5.5" fill={w} />
        <circle cx="28.5" cy="26" r="5.5" fill={w} />
        <circle cx="21" cy="28" r="5.5" fill={w} opacity=".92" />
        <circle cx="13.5" cy="27" r="5" fill={w} opacity=".85" />
        <circle cx="36.5" cy="19" r="1.3" fill={d} />
        <path d="M34 15c-.5-2-1.5-3-3-3.5M37.5 15c.3-2 1.2-3 2.5-3.5" stroke={w} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </>
    )
  },
  '🐭': {
    tint: 'indigo',
    draw: ({ w, d, a }) => (
      <>
        <circle cx="14.5" cy="16" r="6" fill={w} />
        <circle cx="33.5" cy="16" r="6" fill={w} />
        <circle cx="14.5" cy="16" r="3" fill={a} />
        <circle cx="33.5" cy="16" r="3" fill={a} />
        <path d="M24 13.5c6.5 0 10.5 5 10.5 11C34.5 31 28.5 36.5 24 36.5S13.5 31 13.5 24.5c0-6 4-11 10.5-11z" fill={w} />
        <circle cx="19.5" cy="23.5" r="1.7" fill={d} />
        <circle cx="28.5" cy="23.5" r="1.7" fill={d} />
        <circle cx="24" cy="29" r="2" fill={a} />
      </>
    )
  },
  '🍖': {
    tint: 'orange',
    draw: ({ w, a }) => (
      <>
        <path d="M20 28l-7.5 7.5" stroke={w} strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="9.5" cy="33.5" r="3" fill={w} />
        <circle cx="14.5" cy="38.5" r="3" fill={w} />
        <path d="M28 8.5c6.5 0 11.5 5 11.5 11 0 8-7 13-13.5 13-5.5 0-10-4-10-10 0-8 5.5-14 12-14z" fill={w} />
        <g fill="none" stroke={a} strokeWidth="2.2" strokeLinecap="round">
          <path d="M33.5 15c1.5 2 1.8 4.8.8 7.3" />
          <path d="M28.5 13.5c1.2.3 2 .8 2.8 1.5" />
        </g>
      </>
    )
  },
  '🪶': {
    tint: 'teal',
    draw: ({ w, d }) => (
      <>
        <path d="M36.5 10c-11 0-20.5 6-21 17l-1 4 4-1c11-.5 18-9 18-20z" fill={w} />
        <path d="M11 37l20-21" stroke={d} strokeWidth="1.7" strokeLinecap="round" opacity=".55" />
        <path d="M11 37l5-5" stroke={w} strokeWidth="2.4" strokeLinecap="round" />
      </>
    )
  },
  '🎲': {
    tint: 'indigo',
    draw: ({ w, d }) => (
      <g transform="rotate(-10 24 24)">
        <rect x="11.5" y="11.5" width="25" height="25" rx="6" fill={w} />
        <g fill={d}>
          <circle cx="18" cy="18" r="2.3" />
          <circle cx="30" cy="18" r="2.3" />
          <circle cx="24" cy="24" r="2.3" />
          <circle cx="18" cy="30" r="2.3" />
          <circle cx="30" cy="30" r="2.3" />
        </g>
      </g>
    )
  },
  '💡': {
    tint: 'amber',
    draw: ({ w, a, d }) => (
      <>
        <path d="M24 9c6.5 0 11 5 11 10.5 0 4-2 6.5-4 8.5-1 1-1.5 2-1.5 3h-11c0-1-.5-2-1.5-3-2-2-4-4.5-4-8.5C13 14 17.5 9 24 9z" fill={w} />
        <path d="M21 25l-2-5 3 1.5 2-2 2 2 3-1.5-2 5" fill="none" stroke={a} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="19" y="32" width="10" height="2.8" rx="1.4" fill={w} />
        <rect x="20.5" y="35.5" width="7" height="2.5" rx="1.25" fill={d} opacity=".6" />
      </>
    )
  },
  '🚀': {
    tint: 'blue',
    draw: ({ w, a, d }) => (
      <g transform="rotate(40 24 24)">
        <path d="M17.5 26 11.5 33h7zM30.5 26l6 7h-7z" fill={w} opacity=".85" />
        <path d="M24 6c5 4.5 7 10.5 7 16.5V32H17v-9.5C17 16.5 19 10.5 24 6z" fill={w} />
        <circle cx="24" cy="19.5" r="3.5" fill={a} />
        <path d="M20.5 34h7c0 3-1.5 6-3.5 8-2-2-3.5-5-3.5-8z" fill={d} opacity=".55" />
      </g>
    )
  },
  '🏟': {
    tint: 'blue',
    draw: ({ w, a }) => (
      <>
        <path d="M9.5 21.5v8.5c0 3.5 6.5 6.5 14.5 6.5s14.5-3 14.5-6.5v-8.5z" fill={w} opacity=".85" />
        <ellipse cx="24" cy="21.5" rx="14.5" ry="7" fill={w} />
        <ellipse cx="24" cy="21.5" rx="9.5" ry="4" fill={a} />
        <path d="M15 15V9l4 1.7-4 1.8M33 15V9l4 1.7-4 1.8" fill={w} stroke={w} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </>
    )
  },
  '🏹': {
    tint: 'orange',
    draw: ({ w, d }) => (
      <>
        <path d="M31 10c-14 1-20 7-21 21" fill="none" stroke={w} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M31 10 10 31" stroke={d} strokeWidth="1.3" opacity=".5" />
        <path d="M13 13.5 35 35" stroke={w} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M37.5 37.5 37 30l-7 7z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1" />
        <path d="M11 17l3-3-3.5-3.5-3 1zM17 11.5l-3 3" fill={w} />
      </>
    )
  },
  '🗓': {
    tint: 'violet',
    draw: ({ w, a }) => (
      <>
        <rect x="12" y="13" width="24" height="23.5" rx="4.5" fill={w} />
        <rect x="12" y="13" width="24" height="7" rx="3.5" fill={a} />
        <g fill={w}>
          <rect x="16.5" y="10" width="2.8" height="6.5" rx="1.4" />
          <rect x="22.6" y="10" width="2.8" height="6.5" rx="1.4" />
          <rect x="28.7" y="10" width="2.8" height="6.5" rx="1.4" />
        </g>
        <path d="M18.5 28l4 3.8 7-7.5" fill="none" stroke={a} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )
  },
  '🎓': {
    tint: 'indigo',
    draw: ({ w, d, a }) => (
      <>
        <path d="M14.5 22v8c0 2.5 4.5 4.5 9.5 4.5s9.5-2 9.5-4.5v-8z" fill={w} opacity=".85" />
        <path d="M24 11 42 19.5 24 28 6 19.5z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1.4" />
        <path d="M24 19.5 36.5 23v8" fill="none" stroke={d} strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
        <circle cx="36.5" cy="32.5" r="2.3" fill={a} stroke={w} strokeWidth="1.2" />
      </>
    )
  },
  '🛍': {
    tint: 'violet',
    draw: ({ w, a }) => (
      <>
        <path d="M14 17h20l2 17c.2 1.7-1 3-2.7 3H14.7c-1.7 0-2.9-1.3-2.7-3z" fill={w} />
        <path d="M18.5 21.5V15c0-3.5 2.3-5.5 5.5-5.5s5.5 2 5.5 5.5v6.5" fill="none" stroke={w} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18.5 21.5v-4M29.5 21.5v-4" stroke={a} strokeWidth="2.5" strokeLinecap="round" />
      </>
    )
  },
  '🎨': {
    tint: 'rose',
    draw: ({ w }) => (
      <>
        <path d="M24 10C14.5 10 8.5 16.5 8.5 24S15 37.5 22 37.5c3 0 3.5-2.3 2.5-4-1.2-2 0-4.5 3-4.5h4.5c4 0 7.5-2.5 7.5-7C39.5 15 32.5 10 24 10z" fill={w} />
        <circle cx="17" cy="19" r="2.7" fill="rgb(255 84 128)" />
        <circle cx="25.5" cy="16" r="2.7" fill="rgb(245 170 20)" />
        <circle cx="33" cy="20.5" r="2.7" fill="rgb(70 185 90)" />
        <circle cx="15" cy="27.5" r="2.7" fill="rgb(50 140 255)" />
      </>
    )
  },
  '🛒': {
    tint: 'teal',
    draw: ({ w, a }) => (
      <>
        <path d="M8.5 12h4.5l4 18h17" fill="none" stroke={w} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.5 15.5h23.5l-3 11.5H17z" fill={w} />
        <path d="M22 18.5v6M28 18.5v6" stroke={a} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="19" cy="35" r="2.8" fill={w} />
        <circle cx="31" cy="35" r="2.8" fill={w} />
      </>
    )
  },
  '💰': {
    tint: 'amber',
    draw: ({ w, a }) => (
      <>
        <path d="M18.5 16c-6 3.5-9 8.5-9 13 0 5.5 6 8 14.5 8s14.5-2.5 14.5-8c0-4.5-3-9.5-9-13z" fill={w} />
        <path d="M18 9.5c2 1.2 3.5 1 6 0s4-1.2 6 0L28 15.5h-8z" fill={w} />
        <rect x="18.5" y="15" width="11" height="2.5" rx="1.2" fill={a} />
        <path d="M28 23.5c-.8-1.5-2.3-2.2-4-2.2-2.3 0-4 1.2-4 3 0 4 8.2 2 8.2 6 0 1.8-1.9 3-4.2 3-1.8 0-3.4-.8-4.2-2.3M24 19.5v15.5" fill="none" stroke={a} strokeWidth="2" strokeLinecap="round" />
      </>
    )
  },
  '🎀': {
    tint: 'rose',
    draw: ({ w, a }) => (
      <>
        <path d="M21 25 15 36l5-1.5 2 3.5 3-10zM27 25l6 11-5-1.5-2 3.5-3-10z" fill={w} opacity=".85" />
        <path d="M24 21C20 15 10.5 11.5 8.5 14c-2 3-1 12 1.5 14.5 2.5 2 10.5-2 14-7.5z" fill={w} />
        <path d="M24 21c4-6 13.5-9.5 15.5-7 2 3 1 12-1.5 14.5-2.5 2-10.5-2-14-7.5z" fill={w} />
        <path d="M13 17.5c2.5.5 5 2 6.5 3.5M35 17.5c-2.5.5-5 2-6.5 3.5" stroke={a} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <rect x="20.5" y="17.5" width="7" height="7.5" rx="2.8" fill={a} stroke={w} strokeWidth="1.5" />
      </>
    )
  },
  '👗': {
    tint: 'violet',
    draw: ({ w, a }) => (
      <>
        <path d="M19 9l1.5 5c1 1 6 1 7 0L29 9l2 1-.5 8-2.5 4 9 15c-7 2.5-19 2.5-26 0l9-15-2.5-4-.5-8z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1" />
        <path d="M19.5 22h9" stroke={a} strokeWidth="2.2" strokeLinecap="round" />
      </>
    )
  },
  '🎩': {
    tint: 'indigo',
    draw: ({ w, a }) => (
      <>
        <path d="M15 11h18c.8 0 1.3.5 1.3 1.3V32H13.7V12.3c0-.8.5-1.3 1.3-1.3z" fill={w} />
        <rect x="13.7" y="24.5" width="20.6" height="4.5" fill={a} />
        <rect x="8" y="31" width="32" height="5" rx="2.5" fill={w} />
      </>
    )
  },
  '🧢': {
    tint: 'blue',
    draw: ({ w, a }) => (
      <>
        <path d="M9.5 28c0-10 6-16 13.5-16s12 5.5 12.5 14z" fill={w} />
        <path d="M23 12c-3 3.5-4.5 8.5-4.5 15M23 12c3 3 4.5 7.5 5 13.5" fill="none" stroke={a} strokeWidth="1.5" opacity=".7" />
        <circle cx="23" cy="11.8" r="1.7" fill={a} />
        <path d="M9.5 28c9-3 20-3.5 26-2 3 .7 5 2.5 5 5-.1 1.3-1 1.8-2.5 1.3-7-2.3-18-2.5-27 .5-1.5.5-1.8-3.5-1.5-4.8z" fill={w} />
      </>
    )
  },
  '👑': {
    tint: 'amber',
    draw: ({ w, a }) => (
      <>
        <path d="M10 16l7.5 7.5L24 12l6.5 11.5L38 16l-2.5 16h-23z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1.6" />
        <rect x="12.5" y="33.5" width="23" height="3.5" rx="1.7" fill={w} />
        <circle cx="24" cy="26.5" r="2.5" fill={a} />
        <circle cx="17.5" cy="28" r="1.7" fill={a} />
        <circle cx="30.5" cy="28" r="1.7" fill={a} />
      </>
    )
  },
  '👓': {
    tint: 'blue',
    draw: ({ w, a }) => (
      <>
        <path d="M6.5 21c1-3 2-5 4-6.5M41.5 21c-1-3-2-5-4-6.5" fill="none" stroke={w} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="15.5" cy="25.5" r="7.5" fill={a} stroke={w} strokeWidth="3" />
        <circle cx="32.5" cy="25.5" r="7.5" fill={a} stroke={w} strokeWidth="3" />
        <path d="M22.5 24c1-1 2-1.5 1.5-1.5s.5 0 1.5 1.5" fill="none" stroke={w} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M11.5 24.5c.3-1.7 1.3-2.7 3-3M28.5 24.5c.3-1.7 1.3-2.7 3-3" fill="none" stroke={w} strokeWidth="1.7" strokeLinecap="round" />
      </>
    )
  },
  '🕶': {
    tint: 'slate',
    draw: ({ w, d }) => (
      <>
        <path d="M6.5 17.5h35" stroke={w} strokeWidth="3" strokeLinecap="round" />
        <path d="M7.5 18h14.5v6.5c0 5-3 8-7 8s-7.5-3-7.5-8zM26 18h14.5v6.5c0 5-3.5 8-7.5 8s-7-3-7-8z" fill={w} />
        <path d="M9.8 19.5h10v5c0 3.7-2.2 6-4.8 6s-5.2-2.3-5.2-6zM28.2 19.5h10v5c0 3.7-2.6 6-5.2 6s-4.8-2.3-4.8-6z" fill={d} />
        <path d="M12.5 21.5l3.5 4.5M31 21.5l3.5 4.5" stroke={w} strokeWidth="1.7" strokeLinecap="round" opacity=".65" />
      </>
    )
  },
  '🧐': {
    tint: 'amber',
    draw: ({ w, a }) => (
      <>
        <circle cx="21.5" cy="20.5" r="10.5" fill={a} stroke={w} strokeWidth="3.4" />
        <path d="M15.5 19.5c.4-3 2.3-4.8 5-5.2" fill="none" stroke={w} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M29 28.5c1.5 2 2.8 3 4.5 3s2 1.3 1 2.5-.5 2.5 1.5 3.5" fill="none" stroke={w} strokeWidth="2" strokeLinecap="round" />
      </>
    )
  },
  '🔮': {
    tint: 'violet',
    draw: ({ w, a }) => (
      <>
        <circle cx="24" cy="21" r="12.5" fill={w} />
        <path d="M18 19c.5-3.5 2.8-6 6-6.5" fill="none" stroke={a} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M28 20c.4 2 1 2.6 3 3-2 .4-2.6 1-3 3-.4-2-1-2.6-3-3 2-.4 2.6-1 3-3z" fill={a} />
        <path d="M15 37c0-2.5 2-4.5 4.5-4.5h9c2.5 0 4.5 2 4.5 4.5z" fill={w} />
      </>
    )
  },
  '💎': {
    tint: 'blue',
    draw: ({ w, a }) => (
      <>
        <path d="M15 11.5h18l6.5 9L24 38 8.5 20.5z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1.4" />
        <path d="M8.5 20.5h31M18.5 20.5 24 37.5l5.5-17M15 11.5l3.5 9 5.5-9 5.5 9 3.5-9" fill="none" stroke={a} strokeWidth="1.5" strokeLinejoin="round" opacity=".75" />
      </>
    )
  },
  '🔤': {
    tint: 'blue',
    draw: ({ w, a }) => (
      <>
        <rect x="9" y="11" width="17" height="19" rx="4.5" fill={w} opacity=".8" transform="rotate(-8 17 20)" />
        <rect x="19.5" y="17.5" width="19" height="20" rx="5" fill={w} />
        <path d="M24.5 33l4.5-11.5L33.5 33M26 29h6" fill="none" stroke={a} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )
  },
  '🖼': {
    tint: 'teal',
    draw: ({ w, a, d }) => (
      <>
        <rect x="9.5" y="12" width="29" height="24" rx="4.5" fill={w} />
        <circle cx="19" cy="20" r="2.8" fill={a} />
        <path d="M13 32.5l7.5-7.5 4.5 4 5-6 5.5 9.5z" fill={d} opacity=".55" strokeLinejoin="round" />
      </>
    )
  },
  '🟩': {
    tint: 'green',
    draw: ({ w, a }) => (
      <>
        <rect x="11" y="11" width="26" height="26" rx="7" fill={w} />
        <rect x="16" y="16" width="16" height="16" rx="4.5" fill={a} />
      </>
    )
  },
  '👛': {
    tint: 'rose',
    draw: ({ w, a }) => (
      <>
        <path d="M17 19v-3c0-3 2.5-4 3.5-4M31 19v-3c0-3-2.5-4-3.5-4" fill="none" stroke={w} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="21" cy="12.5" r="2.3" fill={w} />
        <circle cx="27" cy="12.5" r="2.3" fill={w} />
        <path d="M13.5 18h21c2 0 3.5 1.5 3.5 3.5V32c0 3-2 5-5 5H15c-3 0-5-2-5-5V21.5c0-2 1.5-3.5 3.5-3.5z" fill={w} />
        <path d="M10.5 24h27" stroke={a} strokeWidth="1.8" opacity=".6" />
        <circle cx="24" cy="24" r="2.5" fill={a} />
      </>
    )
  },
  '📺': {
    tint: 'indigo',
    draw: ({ w, a }) => (
      <>
        <path d="M18 10.5l6 6 6-6" fill="none" stroke={w} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="9" y="16" width="30" height="20" rx="4.5" fill={w} />
        <rect x="12.5" y="19.5" width="18" height="13" rx="2.5" fill={a} />
        <path d="M20 22.5l5 3.5-5 3.5z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1" />
        <circle cx="34.8" cy="22.5" r="1.5" fill={a} />
        <circle cx="34.8" cy="27.5" r="1.5" fill={a} />
      </>
    )
  },
  '🎉': {
    tint: 'violet',
    draw: ({ w, a }) => (
      <>
        <path d="M18 18.5 29 29.5 9.5 38z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1.4" />
        <path d="M15.5 24.5l7.5 7.5M13 30.5l4 4" stroke={a} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M24 16c2-2 1-5 3-7M31 24c2-2 5-1 7-3" fill="none" stroke={w} strokeWidth="2.3" strokeLinecap="round" />
        <circle cx="31" cy="13" r="2" fill={w} />
        <circle cx="36" cy="30" r="1.7" fill={w} />
        <circle cx="19" cy="11" r="1.5" fill={w} />
        <rect x="34.5" y="12.5" width="3.4" height="3.4" rx="1" transform="rotate(25 36 14)" fill={w} />
      </>
    )
  },
  '😕': {
    tint: 'slate',
    draw: ({ w, d }) => (
      <>
        <circle cx="24" cy="24" r="13.5" fill={w} />
        <circle cx="19" cy="21" r="2.1" fill={d} />
        <circle cx="29" cy="21" r="2.1" fill={d} />
        <path d="M18.5 30.5c3-2.3 7.5-3 11-1.8" fill="none" stroke={d} strokeWidth="2.4" strokeLinecap="round" />
      </>
    )
  },
  '🔒': {
    tint: 'slate',
    draw: ({ w, d }) => (
      <>
        <path d="M17 22v-5c0-4.5 3-7.5 7-7.5s7 3 7 7.5v5" fill="none" stroke={w} strokeWidth="3.2" strokeLinecap="round" />
        <rect x="12.5" y="21" width="23" height="16.5" rx="4.5" fill={w} />
        <circle cx="24" cy="28" r="2.5" fill={d} />
        <rect x="22.9" y="28.5" width="2.2" height="5" rx="1.1" fill={d} />
      </>
    )
  },
  '🔀': {
    tint: 'blue',
    draw: ({ w }) => (
      <>
        <path d="M9.5 16h4.5c8 0 11.5 16 19 16h2M9.5 32h4.5c2.8 0 5-2 6.8-4.7M27 20.7C28.8 18 31 16 34 16h1" fill="none" stroke={w} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 11l6 5-6 5zM34 27l6 5-6 5z" fill={w} strokeLinejoin="round" stroke={w} strokeWidth="1" />
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


export function GameIcon({ icon, size = 40, className, tint }) {
  const id = useId();
  const glyph = GLYPHS[icon.replace('️', '')];
  if (!glyph) return null;
  const c = TINT[tint || glyph.tint];
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

const glyphOf = (e) => GLYPHS[e.replace('\uFE0F', '')];
const EMOJI = /(\p{Extended_Pictographic}\uFE0F?)/u;

// Значок вместо эмодзи: размер в em, поэтому его задаёт font-size того места,
// где раньше стоял символ. Русская версия пока остаётся на эмодзи.
export function Emoji({ e, size = '1.25em' }) {
  if (!e || !isEn() || !glyphOf(e)) return e ?? null;
  return <GameIcon icon={e} size={size} className="game-icon" />;
}

// Для готовых строк вида «🎉 Победа!»: эмодзи внутри текста становятся значками.
export function EmojiText({ text }) {
  if (!isEn()) return text;
  return String(text).split(EMOJI).map((part, i) => (i % 2 ? <Emoji key={i} e={part} /> : part));
}
