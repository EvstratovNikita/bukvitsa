// Catalog of treats the player can buy to feed Букля. Each treat is a coin
// → hunger trade with a different price-per-point. Bigger treats are
// slightly cheaper per point, rewarding bulk feeding without trivialising
// the small ones (which still suit topping off a nearly-full bar).
//
// Add new treats by appending — id stable, price/hunger tunable freely.
export const PET_TREATS = [
  {
    id: 'worm',
    icon: '🐛',
    name: 'Червячок',
    desc: 'Маленький, но вкусный',
    price: 10,
    hungerGain: 10
  },
  {
    id: 'egg',
    icon: '🥚',
    name: 'Перепелиное яичко',
    desc: 'Сытный завтрак для совёнка',
    price: 22,
    hungerGain: 25
  },
  {
    id: 'mouse',
    icon: '🐭',
    name: 'Мышка',
    desc: 'Классическое лакомство ночной охотницы',
    price: 40,
    hungerGain: 50
  },
  {
    id: 'meat',
    icon: '🍖',
    name: 'Кусочек мяса',
    desc: 'Большая порция — наестся надолго',
    price: 60,
    hungerGain: 80
  },
  {
    id: 'nectar',
    icon: '🌟',
    name: 'Звёздный нектар',
    desc: 'Сразу до полного! Тает на язычке',
    price: 110,
    hungerGain: 100
  }
];

export const getTreat = (id) => PET_TREATS.find((t) => t.id === id);
