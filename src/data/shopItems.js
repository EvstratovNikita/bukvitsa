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

export const SHOP_ITEMS = [
  // ---------- Backgrounds ----------
  {
    id: 'bg-sunset',
    category: 'background',
    name: 'Закат',
    desc: 'Тёплый градиент в фиолетово-оранжевых тонах',
    price: 50,
    payload: {
      gradient:
        'radial-gradient(1100px 600px at 20% -10%, rgba(255, 140, 90, 0.25), transparent 60%), ' +
        'radial-gradient(900px 500px at 100% 110%, rgba(189, 86, 255, 0.22), transparent 60%), ' +
        'linear-gradient(180deg, #1a0d1c, #15081c)'
    }
  },
  {
    id: 'bg-ocean',
    category: 'background',
    name: 'Океан',
    desc: 'Бирюзово-синие волны',
    price: 50,
    payload: {
      gradient:
        'radial-gradient(1100px 600px at 20% -10%, rgba(100, 220, 250, 0.22), transparent 60%), ' +
        'radial-gradient(900px 500px at 100% 110%, rgba(60, 140, 220, 0.22), transparent 60%), ' +
        'linear-gradient(180deg, #061626, #04111d)'
    }
  },
  {
    id: 'bg-forest',
    category: 'background',
    name: 'Лес',
    desc: 'Глубокий зелёный с золотистыми бликами',
    price: 50,
    payload: {
      gradient:
        'radial-gradient(1100px 600px at 20% -10%, rgba(110, 220, 140, 0.22), transparent 60%), ' +
        'radial-gradient(900px 500px at 100% 110%, rgba(247, 201, 72, 0.16), transparent 60%), ' +
        'linear-gradient(180deg, #0a1810, #06120a)'
    }
  },
  {
    id: 'bg-rose',
    category: 'background',
    name: 'Рассвет',
    desc: 'Нежно-розовое утро',
    price: 50,
    payload: {
      gradient:
        'radial-gradient(1100px 600px at 20% -10%, rgba(255, 175, 200, 0.25), transparent 60%), ' +
        'radial-gradient(900px 500px at 100% 110%, rgba(255, 215, 170, 0.2), transparent 60%), ' +
        'linear-gradient(180deg, #1e0e16, #19090f)'
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
