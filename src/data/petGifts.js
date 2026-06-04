// Exclusive cosmetic gifts Букля brings as the player keeps her fed (bond
// mechanic). NOT buyable in the shop. Ordered: gifts are awarded top-to-bottom.
// Live-ops: append new items here and the loop keeps giving them out.
//
// type:'background' → payload.gradient applied to document.body (like shopItems)
// type:'cells'      → applied via body class `cell-style-<id>` (CSS in index.css)

export const PET_GIFTS = [
  {
    id: 'gift-night',
    type: 'background',
    icon: '🌙',
    name: 'Совиная ночь',
    desc: 'Подарок Букли — глубокая ночь под луной',
    payload: {
      gradient: [
        'radial-gradient(55% 38% at 76% 20%, rgba(220,226,255,0.30), transparent 60%)',
        'radial-gradient(90% 70% at 50% 120%, rgba(80,110,200,0.22), transparent 70%)',
        'linear-gradient(180deg, #070a18 0%, #0b1024 60%, #0a0e1f 100%)'
      ].join(', ')
    }
  },
  {
    id: 'gift-feather',
    type: 'background',
    icon: '🪶',
    name: 'Перо Букли',
    desc: 'Подарок Букли — мягкое сиреневое перо',
    payload: {
      gradient: [
        'radial-gradient(800px 500px at 50% -10%, rgba(200,170,255,0.20), transparent 70%)',
        'radial-gradient(700px 480px at 90% 110%, rgba(255,190,230,0.16), transparent 70%)',
        'linear-gradient(180deg, #15101f 0%, #1b1430 60%, #181126 100%)'
      ].join(', ')
    }
  },
  {
    id: 'gift-moonsilver',
    type: 'cells',
    icon: '✨',
    name: 'Лунное серебро',
    desc: 'Подарок Букли — серебристый блик на верных клетках'
  },
  {
    id: 'gift-owleye',
    type: 'cells',
    icon: '🦉',
    name: 'Совиный глаз',
    desc: 'Подарок Букли — тёплое янтарное свечение верных клеток'
  }
];

export const GIFT_IDS = PET_GIFTS.map((g) => g.id);

export const getGift = (id) => PET_GIFTS.find((g) => g.id === id) || null;

// Ids of cell-style gifts (for toggling body classes in useShopTheme).
export const GIFT_CELL_IDS = PET_GIFTS.filter((g) => g.type === 'cells').map((g) => g.id);

// First gift not yet in `claimed`, or null when the collection is complete.
export function nextUnclaimedGiftId(claimed) {
  const have = new Set(Array.isArray(claimed) ? claimed : []);
  return GIFT_IDS.find((id) => !have.has(id)) || null;
}
