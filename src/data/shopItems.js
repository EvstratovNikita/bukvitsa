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

export const SHOP_ITEMS = [
  // ---------- Backgrounds ----------
  {
    id: 'bg-sunset',
    category: 'background',
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

  // ---------- Cell styles ----------
  {
    id: 'cells-neon',
    category: 'cells',
    name: 'Неоновые буквы',
    desc: 'Светящиеся буквы в клетках, как на вывеске',
    price: 80
  },
  {
    id: 'cells-shimmer',
    category: 'cells',
    name: 'Золотые победы',
    desc: 'Победные клетки мерцают золотом',
    price: 80
  },

  // ---------- Boosts ----------
  {
    id: 'boost-double',
    category: 'boost',
    name: 'Двойные монеты',
    desc: 'Удваивает награду за следующую победу',
    price: 200,
    consumable: true
  }
];

export const ITEM_BY_ID = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));

export const getItem = (id) => ITEM_BY_ID[id];

export const itemsByCategory = (catId) =>
  SHOP_ITEMS.filter((i) => i.category === catId);
