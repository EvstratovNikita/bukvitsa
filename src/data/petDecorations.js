// Catalog of pet decorations shown in the «Порадовать» tab. Each item is a
// one-time purchase that, once equipped, grants a flat % bonus to the coin
// reward from won puzzles. Only one decoration can be equipped at a time —
// player picks which bonus stays active.
//
// Bonuses stack with the «Двойные монеты» shop boost (deco bonus applies
// before doubling).
export const PET_DECORATIONS = [
  { id: 'ribbon',  icon: '🎀', name: 'Розовый бантик',    desc: 'Прибавляет шарма',                price: 60,  bonusPct: 3 },
  { id: 'scarf',   icon: '🧣', name: 'Тёплый шарф',       desc: 'Уют согревает кошелёк',           price: 110, bonusPct: 5 },
  { id: 'glasses', icon: '👓', name: 'Учёные очки',       desc: 'Умный вид — больше монет',        price: 180, bonusPct: 7 },
  { id: 'feather', icon: '🪶', name: 'Перьевой амулет',   desc: 'Лёгкость в перьях, тяжесть в монете', price: 250, bonusPct: 9 },
  { id: 'hat',     icon: '🎩', name: 'Цилиндр',           desc: 'Аристократический вид',           price: 380, bonusPct: 12 },
  { id: 'crown',   icon: '👑', name: 'Корона мудрости',   desc: 'На голове совы — повелитель монет', price: 600, bonusPct: 18 }
];

export const getDecoration = (id) => PET_DECORATIONS.find((d) => d.id === id);

export const decorationBonusFor = (id) => {
  const d = getDecoration(id);
  return d ? d.bonusPct : 0;
};
