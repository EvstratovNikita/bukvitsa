import { petPrice } from '../constants/game.js';
import { tr } from '../lib/lang.js';

// Catalog of treats the player can buy to feed Букля. Each treat is a coin
// → hunger trade with a different price-per-point. Bigger treats are
// slightly cheaper per point, rewarding bulk feeding without trivialising
// the small ones (which still suit topping off a nearly-full bar).
//
// Add new treats by appending — id stable, price/hunger tunable freely.
const RAW_TREATS = [
  {
    id: 'worm',
    icon: '🐛',
    name: tr('Червячок'),
    desc: tr('Маленький, но вкусный'),
    price: 8,
    hungerGain: 10
  },
  {
    id: 'egg',
    icon: '🥚',
    name: tr('Перепелиное яичко'),
    desc: tr('Сытный завтрак для совёнка'),
    price: 18,
    hungerGain: 25
  },
  {
    id: 'mouse',
    icon: '🐭',
    name: tr('Мышка'),
    desc: tr('Классическое лакомство ночной охотницы'),
    price: 32,
    hungerGain: 50
  },
  {
    id: 'meat',
    icon: '🍖',
    name: tr('Кусочек мяса'),
    desc: tr('Большая порция — наестся надолго'),
    price: 48,
    hungerGain: 80
  },
  {
    id: 'nectar',
    icon: '🌟',
    name: tr('Звёздный нектар'),
    desc: tr('Сразу до полного! Тает на язычке'),
    price: 85,
    hungerGain: 100
  }
];

export const PET_TREATS = RAW_TREATS.map((x) => ({ ...x, price: petPrice(x.price, 5) }));

export const getTreat = (id) => PET_TREATS.find((t) => t.id === id);
