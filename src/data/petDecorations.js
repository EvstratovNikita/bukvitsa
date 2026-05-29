// Decoration catalog for «Порадовать» tab.
//
// Slots:
//   head   — головной убор (1)
//   eyes   — на глаза (1)
//   neck   — на шею, опоясывает тушку (1)
//   wing   — амулет; до 2 штук, по одному на крыло (wingL + wingR)
//
// All equipped bonuses sum into flat coins added to win rewards (before the
// double-coins consumable multiplies the total). Wing amulets stack.

export const SLOTS = [
  { id: 'head',   label: 'На голову' },
  { id: 'eyes',   label: 'На глаза'  },
  { id: 'brooch', label: 'Брошь'     },
  { id: 'wing',   label: 'Амулеты на крылья' }
];

export const SLOT_LABEL = SLOTS.reduce((m, s) => { m[s.id] = s.label; return m; }, {});

// Per-item visual hints used when rendering on the owl SVG. `bandColor`
// applies to neck items (collar wrap colour); `wingTint` is a future hook
// for wing-amulet recolouring.
// `minLevel` gates purchases behind Букля's level. First few items in each
// slot stay open from level 1 so a new player has something to spend on
// immediately; higher tiers unlock as the pet grows. Designed so a typical
// player hits level 5–10 mid-game and the top trio unlocks around 15–18.
export const PET_DECORATIONS = [
  // ---------- HEAD ----------
  { id: 'bow',      slot: 'head', icon: '🎀', name: 'Розовый бантик',    desc: 'Прибавляет шарма',                  price: 60,  bonusCoins: 1, minLevel: 1 },
  { id: 'academic', slot: 'head', icon: '🎓', name: 'Шапка академика',   desc: 'Знание — золото',                   price: 200, bonusCoins: 1, minLevel: 4 },
  { id: 'cap',      slot: 'head', icon: '🧢', name: 'Кепка',             desc: 'Простая и удобная',                price: 250, bonusCoins: 2, minLevel: 6 },
  { id: 'tophat',   slot: 'head', icon: '🎩', name: 'Цилиндр',           desc: 'Аристократический вид',             price: 380, bonusCoins: 2, minLevel: 10 },
  { id: 'crown',    slot: 'head', icon: '👑', name: 'Корона мудрости',   desc: 'На голове совы — повелитель монет', price: 600, bonusCoins: 3, minLevel: 15 },

  // ---------- EYES ----------
  { id: 'glasses',  slot: 'eyes', icon: '👓', name: 'Учёные очки',       desc: 'Умный вид — больше монет',          price: 180, bonusCoins: 1, minLevel: 1 },
  { id: 'shades',   slot: 'eyes', icon: '🕶️', name: 'Солнечные очки',    desc: 'Слепят соперников',                 price: 230, bonusCoins: 2, minLevel: 5 },
  { id: 'monocle',  slot: 'eyes', icon: '🧐', name: 'Монокль',           desc: 'Только серьёзные дела',             price: 300, bonusCoins: 2, minLevel: 9 },

  // ---------- BROOCH (small pin on the right of the chest) ----------
  { id: 'rose',     slot: 'brooch', icon: '🌹', name: 'Брошь-роза',    desc: 'Классическая нежность',     price: 110, bonusCoins: 1, minLevel: 1 },
  { id: 'medal',    slot: 'brooch', icon: '🥇', name: 'Медаль',         desc: 'За заслуги перед словарём', price: 150, bonusCoins: 1, minLevel: 3 },
  { id: 'lightning', slot: 'brooch', icon: '⚡', name: 'Молния',         desc: 'Заряд бодрости',           price: 200, bonusCoins: 1, minLevel: 7 },
  { id: 'heart',    slot: 'brooch', icon: '❤️', name: 'Сердечко',       desc: 'С любовью к буквам',       price: 240, bonusCoins: 2, minLevel: 11 },

  // ---------- WING AMULETS (up to 2, one per wing) ----------
  { id: 'feather', slot: 'wing', icon: '🪶', name: 'Перьевой амулет',    desc: 'Лёгкость в перьях — тяжесть в монете', price: 250, bonusCoins: 2, minLevel: 2 },
  { id: 'sparkle', slot: 'wing', icon: '🔮', name: 'Магический амулет',  desc: 'Искрит при каждой победе',           price: 350, bonusCoins: 2, minLevel: 8 },
  { id: 'crystal', slot: 'wing', icon: '💎', name: 'Хрустальная капля', desc: 'Притягивает удачу и золото',          price: 500, bonusCoins: 3, minLevel: 13 },
  { id: 'star',    slot: 'wing', icon: '🌠', name: 'Звёздный оберег',   desc: 'Падающая звезда исполняет мечты',     price: 750, bonusCoins: 4, minLevel: 18 }
];

export const getDecoration = (id) => PET_DECORATIONS.find((d) => d.id === id);

// Wing keys in the equipped map. Other slots store id directly under slot id.
export const WING_KEYS = ['wingL', 'wingR'];

export function collectEquippedIds(pet) {
  if (!pet || !pet.equipped) return pet?.activeDecoration ? [pet.activeDecoration] : [];
  return Object.values(pet.equipped).filter(Boolean);
}

// Sum of flat coin bonuses across all equipped decorations. Added to the
// base win reward (was a % multiplier — switched to flat coins so the bonus
// is readable and immediately felt). Wing amulets stack (both wings count).
export function equippedDecorationsBonus(pet) {
  return collectEquippedIds(pet).reduce(
    (sum, id) => sum + (getDecoration(id)?.bonusCoins || 0), 0
  );
}

// Convenience: which slot key (head/eyes/neck/wingL/wingR) currently holds id.
export function findEquippedSlot(pet, id) {
  if (!pet?.equipped) return null;
  for (const [k, v] of Object.entries(pet.equipped)) {
    if (v === id) return k;
  }
  return null;
}
