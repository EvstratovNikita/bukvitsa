import autumnLightUrl from '../assets/bg/autumn-light.svg';
import autumn2LightUrl from '../assets/bg/autumn2-light.svg';

// Catalog of in-game shop items.
// Each item has:
//   id        — stable identifier (saved to inventory)
//   category  — 'background' | 'cells' | 'boost'
//   name, desc, price
//   payload   — type-specific data
//
// Visual items (background, cells) become "active" when selected and stay
// owned forever once purchased. Boost items are consumables — spent on use.

export const SHOP_CATEGORIES = [
  { id: 'background', label: 'Фоны' },
  { id: 'cells', label: 'Стиль клеток' },
  { id: 'boost', label: 'Бонусы' }
];

// SVG patterns encoded as data URIs. Subtle, non-distracting. We escape
// just enough for the URL — `#` becomes `%23`, other ASCII passes.
const enc = (svg) =>
  `url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23').replace(/\n\s*/g, '')}")`;

// Tiny twinkling-star field — 1px–2px dots scattered on a 240×240 tile.
const STARS = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
  <circle cx='20' cy='40' r='0.8' fill='#ffffff' opacity='0.85'/>
  <circle cx='80' cy='12' r='1.2' fill='#ffffff' opacity='0.7'/>
  <circle cx='150' cy='30' r='0.6' fill='#ffffff' opacity='0.6'/>
  <circle cx='200' cy='80' r='1' fill='#ffffff' opacity='0.85'/>
  <circle cx='60' cy='90' r='0.7' fill='#cfd6ff' opacity='0.7'/>
  <circle cx='115' cy='130' r='1.1' fill='#ffffff' opacity='0.7'/>
  <circle cx='40' cy='170' r='0.8' fill='#ffffff' opacity='0.8'/>
  <circle cx='185' cy='150' r='0.7' fill='#cfd6ff' opacity='0.65'/>
  <circle cx='220' cy='200' r='1' fill='#ffffff' opacity='0.85'/>
  <circle cx='95' cy='215' r='0.7' fill='#ffffff' opacity='0.7'/>
  <circle cx='160' cy='195' r='0.5' fill='#cfd6ff' opacity='0.6'/>
  <circle cx='10' cy='115' r='0.6' fill='#ffffff' opacity='0.55'/>
</svg>`);

// Soft horizontal wave lines — for the ocean.
const WAVES = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='280' height='140'>
  <path d='M0 40 Q70 20 140 40 T280 40' fill='none' stroke='#aee0ee' stroke-width='1' opacity='0.18'/>
  <path d='M0 80 Q70 60 140 80 T280 80' fill='none' stroke='#aee0ee' stroke-width='1' opacity='0.14'/>
  <path d='M0 120 Q70 100 140 120 T280 120' fill='none' stroke='#aee0ee' stroke-width='1' opacity='0.18'/>
</svg>`);

// Pine-tree silhouettes in a small repeating tile — works equally in
// a 78×N preview card and across a full viewport.
const PINES = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90'>
  <g fill='#0a1a12' opacity='0.55'>
    <polygon points='10,90 22,55 34,90'/>
    <polygon points='34,90 50,42 66,90'/>
    <polygon points='62,90 78,60 94,90'/>
    <polygon points='90,90 106,50 120,80 120,90'/>
  </g>
</svg>`);

// Falling petals — pink rose pattern.
const PETALS = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>
  <g fill='#ffb8d0' opacity='0.22'>
    <ellipse cx='40' cy='30' rx='5' ry='3' transform='rotate(20 40 30)'/>
    <ellipse cx='120' cy='80' rx='6' ry='3.5' transform='rotate(-15 120 80)'/>
    <ellipse cx='200' cy='40' rx='5' ry='3' transform='rotate(35 200 40)'/>
    <ellipse cx='60' cy='150' rx='5' ry='3' transform='rotate(50 60 150)'/>
    <ellipse cx='180' cy='180' rx='6' ry='3.5' transform='rotate(-25 180 180)'/>
    <ellipse cx='100' cy='220' rx='5' ry='3' transform='rotate(10 100 220)'/>
    <ellipse cx='230' cy='235' rx='5' ry='3' transform='rotate(40 230 235)'/>
  </g>
</svg>`);

// Subtle paper grain noise — works as a top layer over any base.
const GRAIN = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
    <feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0'/>
  </filter>
  <rect width='100%' height='100%' filter='url(#n)'/>
</svg>`);

// Faceted "diamond" pattern — premium feel.
const DIAMONDS = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
  <path d='M40 4 L76 40 L40 76 L4 40 Z' fill='none' stroke='#b388ff' stroke-width='0.8' opacity='0.18'/>
  <path d='M40 22 L58 40 L40 58 L22 40 Z' fill='none' stroke='#b388ff' stroke-width='0.6' opacity='0.12'/>
</svg>`);

// ---- Summer patterns (light themes) ----

// Fluffy summer clouds — soft white blobs on tile.
const CLOUDS = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='160'>
  <g fill='#ffffff' opacity='0.7'>
    <ellipse cx='40' cy='40' rx='28' ry='12'/>
    <ellipse cx='60' cy='34' rx='18' ry='10'/>
    <ellipse cx='150' cy='80' rx='34' ry='14'/>
    <ellipse cx='175' cy='72' rx='20' ry='11'/>
    <ellipse cx='90' cy='120' rx='26' ry='11'/>
    <ellipse cx='200' cy='128' rx='22' ry='10'/>
  </g>
</svg>`);

// Ягоды — настоящие: малина и ежевика костяшками, черника с чашечкой,
// вишня парой на черешке. Мельче прежних и разнесены по краям плитки:
// крупные кружки в центре закрывались доской и рябили.
const BERRIES = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'>
  <defs>
    <radialGradient id='braspberry' cx='34%' cy='28%' r='78%'>
      <stop offset='0%' stop-color='#ff9fae'/>
      <stop offset='55%' stop-color='#e2455e'/>
      <stop offset='100%' stop-color='#9d1030'/>
    </radialGradient>
    <radialGradient id='bblack' cx='34%' cy='28%' r='78%'>
      <stop offset='0%' stop-color='#8d6ba8'/>
      <stop offset='55%' stop-color='#432a63'/>
      <stop offset='100%' stop-color='#1b0f2c'/>
    </radialGradient>
    <radialGradient id='bblue' cx='34%' cy='26%' r='80%'>
      <stop offset='0%' stop-color='#8fa6e8'/>
      <stop offset='55%' stop-color='#3f56b4'/>
      <stop offset='100%' stop-color='#141c56'/>
    </radialGradient>
    <radialGradient id='bcherry' cx='32%' cy='26%' r='78%'>
      <stop offset='0%' stop-color='#ff8a86'/>
      <stop offset='55%' stop-color='#d61f38'/>
      <stop offset='100%' stop-color='#7c0716'/>
    </radialGradient>
    <linearGradient id='bleaf' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#8ed489'/>
      <stop offset='100%' stop-color='#2d7a3a'/>
    </linearGradient>
  </defs>
  <g opacity='0.85'>
    <g transform='translate(26 44) scale(0.9) rotate(-6)'><g><path d='M0 -12 C -3 -20 -10 -25 -19 -25 C -18 -16 -10 -11 0 -12 Z' fill='url(%23bleaf)'/><path d='M-2 -13 C -7 -17 -13 -21 -18 -23' stroke='#1f5c2b' stroke-opacity='0.45' stroke-width='0.8' fill='none'/><circle cx='-9' cy='-3' r='4.6' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='0' cy='-5' r='4.8' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='9' cy='-3' r='4.6' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-13' cy='4' r='4.4' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-4.5' cy='3' r='5' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='4.5' cy='3' r='5' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='13' cy='4' r='4.4' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-8' cy='10' r='4.3' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='0' cy='11' r='4.6' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='8' cy='10' r='4.3' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-3' cy='17' r='4' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='4' cy='17' r='4' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><ellipse cx='-5' cy='-1' rx='5' ry='3' transform='rotate(-25 -5 -1)' fill='#ffffff' opacity='0.35'/></g></g>
    <g transform='translate(232 28) scale(0.95) rotate(0)'><g>
    <circle cx='0' cy='0' r='13' fill='url(%23bblue)'/>
    <circle cx='0' cy='0' r='12.6' fill='none' stroke='#141a5e' stroke-opacity='0.4' stroke-width='0.9'/>
    <path d='M0 -13 l3 4 4.5 -1.5 -2 4.3 3 3.6 -4.7 0.6 -1.6 4.5 -2.2 -4.2 -4.8 0 2.6 -4 -2.6 -4 4.8 0.3 Z' transform='translate(0 -1) scale(0.62)' fill='#2b3a86' opacity='0.75'/>
    <ellipse cx='-4.5' cy='-5' rx='4.4' ry='2.8' transform='rotate(-28 -4.5 -5)' fill='#ffffff' opacity='0.34'/>
    <ellipse cx='3' cy='6' rx='6' ry='3.4' fill='#ffffff' opacity='0.07'/>
  </g></g>
    <g transform='translate(206 120) scale(0.85) rotate(4)'><g>
    <path d='M-7 -6 C -6 -16 2 -22 9 -24' stroke='#5c8a3a' stroke-width='1.6' fill='none' stroke-linecap='round'/>
    <path d='M7 -5 C 8 -14 10 -20 10 -24' stroke='#5c8a3a' stroke-width='1.6' fill='none' stroke-linecap='round'/>
    <path d='M9 -24 C 4 -30 -4 -31 -11 -28 C -6 -22 1 -21 9 -24 Z' fill='url(%23bleaf)'/>
    <circle cx='-7' cy='2' r='9' fill='url(%23bcherry)'/>
    <circle cx='8' cy='4' r='8' fill='url(%23bcherry)'/>
    <ellipse cx='-10' cy='-1.5' rx='3.4' ry='2.2' transform='rotate(-30 -10 -1.5)' fill='#ffffff' opacity='0.4'/>
    <ellipse cx='5.5' cy='1' rx='2.8' ry='1.8' transform='rotate(-30 5.5 1)' fill='#ffffff' opacity='0.34'/>
  </g></g>
    <g transform='translate(44 152) scale(0.85) rotate(8)'><g><path d='M0 -12 C -3 -20 -10 -25 -19 -25 C -18 -16 -10 -11 0 -12 Z' fill='url(%23bleaf)'/><path d='M-2 -13 C -7 -17 -13 -21 -18 -23' stroke='#1f5c2b' stroke-opacity='0.45' stroke-width='0.8' fill='none'/><circle cx='-9' cy='-3' r='4.6' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='0' cy='-5' r='4.8' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='9' cy='-3' r='4.6' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-13' cy='4' r='4.4' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-4.5' cy='3' r='5' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='4.5' cy='3' r='5' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='13' cy='4' r='4.4' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-8' cy='10' r='4.3' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='0' cy='11' r='4.6' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='8' cy='10' r='4.3' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-3' cy='17' r='4' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='4' cy='17' r='4' fill='url(%23bblack)' stroke='#1d0f28' stroke-opacity='0.35' stroke-width='0.5'/><ellipse cx='-5' cy='-1' rx='5' ry='3' transform='rotate(-25 -5 -1)' fill='#ffffff' opacity='0.26'/></g></g>
    <g transform='translate(120 214) scale(0.8) rotate(0)'><g>
    <circle cx='0' cy='0' r='13' fill='url(%23bblue)'/>
    <circle cx='0' cy='0' r='12.6' fill='none' stroke='#141a5e' stroke-opacity='0.4' stroke-width='0.9'/>
    <path d='M0 -13 l3 4 4.5 -1.5 -2 4.3 3 3.6 -4.7 0.6 -1.6 4.5 -2.2 -4.2 -4.8 0 2.6 -4 -2.6 -4 4.8 0.3 Z' transform='translate(0 -1) scale(0.62)' fill='#2b3a86' opacity='0.75'/>
    <ellipse cx='-4.5' cy='-5' rx='4.4' ry='2.8' transform='rotate(-28 -4.5 -5)' fill='#ffffff' opacity='0.34'/>
    <ellipse cx='3' cy='6' rx='6' ry='3.4' fill='#ffffff' opacity='0.07'/>
  </g></g>
    <g transform='translate(244 214) scale(0.75) rotate(10)'><g><path d='M0 -12 C -3 -20 -10 -25 -19 -25 C -18 -16 -10 -11 0 -12 Z' fill='url(%23bleaf)'/><path d='M-2 -13 C -7 -17 -13 -21 -18 -23' stroke='#1f5c2b' stroke-opacity='0.45' stroke-width='0.8' fill='none'/><circle cx='-9' cy='-3' r='4.6' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='0' cy='-5' r='4.8' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='9' cy='-3' r='4.6' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-13' cy='4' r='4.4' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-4.5' cy='3' r='5' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='4.5' cy='3' r='5' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='13' cy='4' r='4.4' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-8' cy='10' r='4.3' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='0' cy='11' r='4.6' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='8' cy='10' r='4.3' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='-3' cy='17' r='4' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><circle cx='4' cy='17' r='4' fill='url(%23braspberry)' stroke='#7d0f22' stroke-opacity='0.35' stroke-width='0.5'/><ellipse cx='-5' cy='-1' rx='5' ry='3' transform='rotate(-25 -5 -1)' fill='#ffffff' opacity='0.35'/></g></g>
    <g transform='translate(74 246) scale(0.7) rotate(-8)'><g>
    <path d='M-7 -6 C -6 -16 2 -22 9 -24' stroke='#5c8a3a' stroke-width='1.6' fill='none' stroke-linecap='round'/>
    <path d='M7 -5 C 8 -14 10 -20 10 -24' stroke='#5c8a3a' stroke-width='1.6' fill='none' stroke-linecap='round'/>
    <path d='M9 -24 C 4 -30 -4 -31 -11 -28 C -6 -22 1 -21 9 -24 Z' fill='url(%23bleaf)'/>
    <circle cx='-7' cy='2' r='9' fill='url(%23bcherry)'/>
    <circle cx='8' cy='4' r='8' fill='url(%23bcherry)'/>
    <ellipse cx='-10' cy='-1.5' rx='3.4' ry='2.2' transform='rotate(-30 -10 -1.5)' fill='#ffffff' opacity='0.4'/>
    <ellipse cx='5.5' cy='1' rx='2.8' ry='1.8' transform='rotate(-30 5.5 1)' fill='#ffffff' opacity='0.34'/>
  </g></g>
  </g>
</svg>`);

// Daisies on a meadow — small white-yellow flowers.
const MEADOW = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
  <g>
    <g transform='translate(40,50)'>
      <circle r='3' fill='#f7c948'/>
      <g fill='#ffffff' opacity='0.85'>
        <ellipse rx='2' ry='5' transform='rotate(0)'    cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(60)'   cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(120)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(180)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(240)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(300)'  cy='-5'/>
      </g>
    </g>
    <g transform='translate(140,90)'>
      <circle r='3' fill='#f7c948'/>
      <g fill='#ffffff' opacity='0.85'>
        <ellipse rx='2' ry='5' cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(60)'   cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(120)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(180)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(240)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(300)'  cy='-5'/>
      </g>
    </g>
    <g transform='translate(80,160)'>
      <circle r='3' fill='#f7c948'/>
      <g fill='#ffffff' opacity='0.85'>
        <ellipse rx='2' ry='5' cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(60)'   cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(120)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(180)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(240)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(300)'  cy='-5'/>
      </g>
    </g>
    <g transform='translate(180,180)'>
      <circle r='3' fill='#f7c948'/>
      <g fill='#ffffff' opacity='0.85'>
        <ellipse rx='2' ry='5' cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(60)'   cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(120)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(180)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(240)'  cy='-5'/>
        <ellipse rx='2' ry='5' transform='rotate(300)'  cy='-5'/>
      </g>
    </g>
  </g>
</svg>`);

export const SHOP_ITEMS = [
  // ---------- Backgrounds ----------
  {
    id: 'bg-sunset',
    category: 'background',
    theme: 'dark',
    name: 'Закат',
    desc: 'Тёплый закат сквозь пелену облаков',
    price: 50,
    payload: {
      gradient: [
        GRAIN,
        'radial-gradient(80% 60% at 50% 110%, rgba(255, 120, 70, 0.28), transparent 70%)',
        'radial-gradient(60% 50% at 50% 95%, rgba(255, 200, 110, 0.22), transparent 70%)',
        'linear-gradient(180deg, #1a0d1c 0%, #2b0e22 45%, #4a1820 80%, #6b2a1d 100%)'
      ].join(', ')
    }
  },
  {
    id: 'bg-ocean',
    category: 'background',
    theme: 'dark',
    name: 'Океан',
    desc: 'Спокойные волны в глубокой воде',
    price: 50,
    payload: {
      gradient: [
        WAVES,
        'radial-gradient(900px 600px at 50% -10%, rgba(120, 220, 240, 0.18), transparent 70%)',
        'linear-gradient(180deg, #051826, #061f30 50%, #062538)'
      ].join(', ')
    }
  },
  {
    id: 'bg-forest',
    category: 'background',
    theme: 'dark',
    name: 'Лес',
    desc: 'Хвойный лес на закатном горизонте',
    price: 50,
    payload: {
      gradient: [
        PINES,
        'radial-gradient(900px 500px at 50% -10%, rgba(220, 180, 120, 0.18), transparent 70%)',
        'linear-gradient(180deg, #082017 0%, #0a2a1b 60%, #0c2e1d 100%)'
      ].join(', ')
    }
  },
  {
    id: 'bg-rose',
    category: 'background',
    theme: 'dark',
    name: 'Лепестки',
    desc: 'Падающие розовые лепестки на тёплом фоне',
    price: 50,
    payload: {
      gradient: [
        PETALS,
        'radial-gradient(900px 500px at 30% -10%, rgba(255, 175, 200, 0.2), transparent 70%)',
        'radial-gradient(900px 500px at 100% 110%, rgba(255, 215, 170, 0.18), transparent 70%)',
        'linear-gradient(180deg, #1e0d16 0%, #260f1a 60%, #2c0f17 100%)'
      ].join(', ')
    }
  },
  {
    id: 'bg-stars',
    category: 'background',
    theme: 'dark',
    name: 'Звёздное небо',
    desc: 'Россыпь звёзд над глубоким космосом',
    price: 80,
    payload: {
      gradient: [
        STARS,
        'radial-gradient(800px 500px at 50% 30%, rgba(140, 110, 220, 0.22), transparent 70%)',
        'radial-gradient(900px 600px at 50% 110%, rgba(80, 140, 220, 0.18), transparent 70%)',
        'linear-gradient(180deg, #060818 0%, #0a0b22 60%, #060812 100%)'
      ].join(', ')
    }
  },
  {
    id: 'bg-aurora',
    category: 'background',
    theme: 'dark',
    name: 'Северное сияние',
    desc: 'Зелёно-фиолетовые волны полярного света',
    price: 80,
    payload: {
      gradient: [
        'radial-gradient(50% 40% at 25% 30%, rgba(120, 230, 180, 0.28), transparent 70%)',
        'radial-gradient(60% 50% at 75% 50%, rgba(140, 110, 240, 0.28), transparent 70%)',
        'radial-gradient(60% 40% at 50% 80%, rgba(100, 200, 240, 0.22), transparent 70%)',
        'linear-gradient(180deg, #050810 0%, #07091a 60%, #050810 100%)'
      ].join(', ')
    }
  },
  {
    id: 'bg-diamonds',
    category: 'background',
    theme: 'dark',
    name: 'Аметист',
    desc: 'Гранёный узор на фиолетовом фоне',
    price: 80,
    payload: {
      gradient: [
        DIAMONDS,
        'radial-gradient(900px 500px at 50% -10%, rgba(179, 136, 255, 0.18), transparent 70%)',
        'linear-gradient(180deg, #0c0820 0%, #140e2c 60%, #100924 100%)'
      ].join(', ')
    }
  },

  // ---------- Summer (light) backgrounds ----------
  {
    id: 'bg-summer-sky',
    category: 'background',
    theme: 'light',
    name: 'Летнее небо',
    desc: 'Голубое небо с пушистыми облаками',
    price: 80,
    payload: {
      gradient: [
        CLOUDS,
        'radial-gradient(900px 500px at 50% 100%, rgba(255, 230, 150, 0.35), transparent 70%)',
        'linear-gradient(180deg, #c2e8ff 0%, #9fd6ff 60%, #d8efff 100%)'
      ].join(', ')
    }
  },
  {
    id: 'bg-berries',
    category: 'background',
    theme: 'light',
    name: 'Ягоды',
    desc: 'Сладкие ягоды на кремовом фоне',
    price: 80,
    payload: {
      gradient: [
        BERRIES,
        'radial-gradient(800px 500px at 50% -10%, rgba(255, 220, 200, 0.45), transparent 70%)',
        'linear-gradient(180deg, #fff4ec 0%, #ffe6d4 60%, #ffd2b8 100%)'
      ].join(', ')
    }
  },
  {
    id: 'bg-meadow',
    category: 'background',
    theme: 'light',
    name: 'Ромашковый луг',
    desc: 'Полевые ромашки в траве на свежем ветру',
    price: 80,
    payload: {
      gradient: [
        MEADOW,
        'radial-gradient(800px 500px at 50% -10%, rgba(255, 245, 200, 0.45), transparent 70%)',
        'linear-gradient(180deg, #c8eaa2 0%, #9fd97d 55%, #84c860 100%)'
      ].join(', ')
    }
  },

  {
    id: 'bg-autumn-park',
    category: 'background',
    theme: 'light',
    name: 'Осенний парк',
    desc: 'Тёплый листопад в золотых аллеях',
    price: 120,
    payload: {
      // Рамочная иллюстрация: декор по краям, центр пустой — тянем на весь
      // экран, чтобы рамка обнимала кадр при любом соотношении сторон.
      frame: true,
      gradient: [`url(${autumnLightUrl})`, 'linear-gradient(180deg, #fef7ed, #fbe5c6)'].join(', ')
    }
  },
  {
    id: 'bg-autumn-grove',
    category: 'background',
    theme: 'light',
    name: 'Золотая роща',
    desc: 'Медные кроны и мягкий свет октября',
    price: 120,
    payload: {
      frame: true,
      gradient: [`url(${autumn2LightUrl})`, 'linear-gradient(180deg, #fcf6e9, #f3c682)'].join(', ')
    }
  },

  // ---------- Cell styles ----------
  {
    id: 'cells-neon',
    category: 'cells',
    name: 'Неоновые буквы',
    desc: 'Светящиеся буквы в клетках, как на вывеске',
    price: 80
  },
  {
    id: 'cells-emerald',
    category: 'cells',
    name: 'Изумрудные победы',
    desc: 'Верные клетки сияют живым изумрудом',
    price: 80
  },
  {
    id: 'cells-shimmer',
    category: 'cells',
    name: 'Золотое мерцание',
    desc: 'Клетки «не на месте» переливаются золотом',
    price: 80
  },

  // ---------- Boosts ----------
  {
    id: 'boost-double',
    category: 'boost',
    name: 'Двойные монеты',
    desc: 'Удваивает монеты за победы (база + бонус Букли) в течение 1 дня',
    price: 120,
    consumable: true
  },
  {
    id: 'boost-ad-coins',
    category: 'boost',
    name: 'Щедрая реклама',
    desc: '+4 монеты к каждому просмотру рекламы — на следующие 10 просмотров',
    price: 30,
    consumable: true
  },
  {
    id: 'boost-energy-cap',
    category: 'boost',
    name: 'Запас энергии',
    desc: 'Лимит энергии повышается до 7 на 2 дня',
    price: 100,
    consumable: true
  }
];

export const ITEM_BY_ID = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));

export const getItem = (id) => ITEM_BY_ID[id];

export const itemsByCategory = (catId) =>
  SHOP_ITEMS.filter((i) => i.category === catId);
