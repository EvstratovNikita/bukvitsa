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

// Ягоды — крупные, редкие. Мелкий частый узор рябил в глазах, поэтому
// на плитку 340x340 приходится всего три ягоды: объёмная заливка
// градиентом, ободок, блик, лист с прожилкой и мягкая тень под ягодой.
const BERRIES = enc(`<svg xmlns='http://www.w3.org/2000/svg' width='340' height='340'>
  <defs>
    <radialGradient id='braspberry' cx='34%' cy='28%' r='78%'>
      <stop offset='0%' stop-color='#ff97a1'/>
      <stop offset='45%' stop-color='#e03a4c'/>
      <stop offset='100%' stop-color='#9c1026'/>
    </radialGradient>
    <radialGradient id='bblue' cx='34%' cy='28%' r='78%'>
      <stop offset='0%' stop-color='#9db0ff'/>
      <stop offset='45%' stop-color='#4657d6'/>
      <stop offset='100%' stop-color='#1f2782'/>
    </radialGradient>
    <radialGradient id='bplum' cx='34%' cy='28%' r='78%'>
      <stop offset='0%' stop-color='#d59ae2'/>
      <stop offset='45%' stop-color='#8b34a8'/>
      <stop offset='100%' stop-color='#421358'/>
    </radialGradient>
    <linearGradient id='bleaf' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#86cc82'/>
      <stop offset='100%' stop-color='#2c7739'/>
    </linearGradient>
    <radialGradient id='bshade'>
      <stop offset='0%' stop-color='#9a5b3a' stop-opacity='0.26'/>
      <stop offset='100%' stop-color='#9a5b3a' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <g opacity='0.82'>
  <g transform='translate(84 92) scale(0.82) rotate(-8)'>
    <ellipse cx='0' cy='36' rx='30' ry='8' fill='url(%23bshade)'/>
    <circle cx='0' cy='0' r='28' fill='url(%23braspberry)'/>
    <circle cx='0' cy='0' r='27.4' fill='none' stroke='#7d0f22' stroke-opacity='0.38' stroke-width='1.4'/>
    <path d='M0 -25 C -3 -38 -13 -47 -26 -47 C -24 -33 -13 -25 0 -25 Z' fill='url(%23bleaf)'/>
    <path d='M-3 -28 C -9 -34 -17 -41 -24 -45' stroke='#1f5c2b' stroke-opacity='0.5' stroke-width='1.1' fill='none' stroke-linecap='round'/>
    <path d='M0 -26 C 2 -34 5 -41 9 -45' stroke='#2f7a3c' stroke-width='2.6' stroke-linecap='round' fill='none'/>
    <ellipse cx='-9' cy='-10' rx='8.5' ry='5.4' transform='rotate(-28 -9 -10)' fill='#ffffff' opacity='0.42'/>
    <circle cx='8' cy='-14' r='2.4' fill='#ffffff' opacity='0.28'/>
  </g>
  <g transform='translate(246 176) scale(0.62) rotate(12)'>
    <ellipse cx='0' cy='36' rx='30' ry='8' fill='url(%23bshade)'/>
    <circle cx='0' cy='0' r='28' fill='url(%23bblue)'/>
    <circle cx='0' cy='0' r='27.4' fill='none' stroke='#171d63' stroke-opacity='0.38' stroke-width='1.4'/>
    <path d='M0 -25 C -3 -38 -13 -47 -26 -47 C -24 -33 -13 -25 0 -25 Z' fill='url(%23bleaf)'/>
    <path d='M-3 -28 C -9 -34 -17 -41 -24 -45' stroke='#1f5c2b' stroke-opacity='0.5' stroke-width='1.1' fill='none' stroke-linecap='round'/>
    <path d='M0 -26 C 2 -34 5 -41 9 -45' stroke='#2f7a3c' stroke-width='2.6' stroke-linecap='round' fill='none'/>
    <ellipse cx='-9' cy='-10' rx='8.5' ry='5.4' transform='rotate(-28 -9 -10)' fill='#ffffff' opacity='0.42'/>
    <circle cx='8' cy='-14' r='2.4' fill='#ffffff' opacity='0.28'/>
  </g>
  <g transform='translate(160 286) scale(0.72) rotate(-4)'>
    <ellipse cx='0' cy='36' rx='30' ry='8' fill='url(%23bshade)'/>
    <circle cx='0' cy='0' r='28' fill='url(%23bplum)'/>
    <circle cx='0' cy='0' r='27.4' fill='none' stroke='#3a1050' stroke-opacity='0.38' stroke-width='1.4'/>
    <path d='M0 -25 C -3 -38 -13 -47 -26 -47 C -24 -33 -13 -25 0 -25 Z' fill='url(%23bleaf)'/>
    <path d='M-3 -28 C -9 -34 -17 -41 -24 -45' stroke='#1f5c2b' stroke-opacity='0.5' stroke-width='1.1' fill='none' stroke-linecap='round'/>
    <path d='M0 -26 C 2 -34 5 -41 9 -45' stroke='#2f7a3c' stroke-width='2.6' stroke-linecap='round' fill='none'/>
    <ellipse cx='-9' cy='-10' rx='8.5' ry='5.4' transform='rotate(-28 -9 -10)' fill='#ffffff' opacity='0.42'/>
    <circle cx='8' cy='-14' r='2.4' fill='#ffffff' opacity='0.28'/>
  </g>
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
