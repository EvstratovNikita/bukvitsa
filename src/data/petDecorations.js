// Decoration catalog for the «Порадовать» tab. Each item belongs to one
// of four slots; only one item per slot can be equipped at a time, but
// different slots stack freely (hat + scarf + glasses + amulet at once).
//
// All equipped bonuses sum into one % bonus that's applied to the win
// reward (before the consumable double-coins multiplier).
//
// Slot list — extend carefully, the UI labels live in `SLOTS` below.

export const SLOTS = [
  { id: 'head',      label: 'На голову' },
  { id: 'eyes',      label: 'На глаза'  },
  { id: 'neck',      label: 'На шею'    },
  { id: 'accessory', label: 'Амулет'    }
];

export const SLOT_LABEL = SLOTS.reduce((m, s) => { m[s.id] = s.label; return m; }, {});

export const PET_DECORATIONS = [
  // ---------- HEAD ----------
  { id: 'bow',        slot: 'head', icon: '🎀', name: 'Розовый бантик',     desc: 'Прибавляет шарма',                       price: 60,  bonusPct: 3 },
  { id: 'academic',   slot: 'head', icon: '🎓', name: 'Шапка академика',    desc: 'Знание — золото',                        price: 200, bonusPct: 7 },
  { id: 'cowboy',     slot: 'head', icon: '🤠', name: 'Ковбойская шляпа',   desc: 'Дикий запад, дикие монеты',              price: 250, bonusPct: 8 },
  { id: 'tophat',     slot: 'head', icon: '🎩', name: 'Цилиндр',            desc: 'Аристократический вид',                  price: 380, bonusPct: 12 },
  { id: 'crown',      slot: 'head', icon: '👑', name: 'Корона мудрости',    desc: 'На голове совы — повелитель монет',      price: 600, bonusPct: 18 },

  // ---------- EYES ----------
  { id: 'glasses',    slot: 'eyes', icon: '👓', name: 'Учёные очки',        desc: 'Умный вид — больше монет',               price: 180, bonusPct: 7 },
  { id: 'shades',     slot: 'eyes', icon: '🕶️', name: 'Солнечные очки',     desc: 'Слепят соперников',                      price: 230, bonusPct: 8 },
  { id: 'goggles',    slot: 'eyes', icon: '🥽', name: 'Лётные очки',        desc: 'Высокий полёт — высокая награда',        price: 300, bonusPct: 10 },

  // ---------- NECK ----------
  { id: 'scarf',      slot: 'neck', icon: '🧣', name: 'Тёплый шарф',        desc: 'Уют согревает кошелёк',                  price: 110, bonusPct: 5 },
  { id: 'ribbon',     slot: 'neck', icon: '🎗️', name: 'Орденская лента',    desc: 'За заслуги перед словами',               price: 150, bonusPct: 6 },
  { id: 'beads',      slot: 'neck', icon: '📿', name: 'Деревянные бусы',    desc: 'Спокойствие и сосредоточенность',        price: 180, bonusPct: 7 },
  { id: 'bowtie',     slot: 'neck', icon: '🦋', name: 'Бабочка',            desc: 'Стильный гость на любом празднике',      price: 240, bonusPct: 9 },

  // ---------- ACCESSORY (амулеты/перья/обереги) ----------
  { id: 'feather',    slot: 'accessory', icon: '🪶', name: 'Перьевой амулет',    desc: 'Лёгкость в перьях — тяжесть в монете', price: 250, bonusPct: 9 },
  { id: 'sparkle',    slot: 'accessory', icon: '✨', name: 'Магический амулет',  desc: 'Искрит при каждой победе',           price: 350, bonusPct: 12 },
  { id: 'crystal',    slot: 'accessory', icon: '💎', name: 'Хрустальная капля', desc: 'Притягивает удачу и золото',          price: 500, bonusPct: 16 },
  { id: 'star',       slot: 'accessory', icon: '🌠', name: 'Звёздный оберег',   desc: 'Падающая звезда исполняет монетные мечты', price: 750, bonusPct: 22 }
];

export const getDecoration = (id) => PET_DECORATIONS.find((d) => d.id === id);

// Sum of % bonuses across all equipped slots. Accepts the pet sub-object;
// tolerates either the legacy `activeDecoration` field or the new
// `equipped` map so migration is seamless.
export function equippedDecorationsBonus(pet) {
  if (!pet) return 0;
  const ids = collectEquippedIds(pet);
  return ids.reduce((sum, id) => sum + (getDecoration(id)?.bonusPct || 0), 0);
}

export function collectEquippedIds(pet) {
  if (!pet) return [];
  if (pet.equipped && typeof pet.equipped === 'object') {
    return Object.values(pet.equipped).filter(Boolean);
  }
  // Legacy single-slot field
  return pet.activeDecoration ? [pet.activeDecoration] : [];
}
