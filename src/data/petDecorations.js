// Decoration catalog for «Порадовать» tab.
//
// Slots:
//   head   — головной убор (1)
//   eyes   — на глаза (1)
//   neck   — на шею, опоясывает тушку (1)
//   wing   — амулет; до 2 штук, по одному на крыло (wingL + wingR)
//
// All equipped bonuses sum into one % applied to win rewards (before the
// double-coins consumable). Wing amulets stack — both contribute.

export const SLOTS = [
  { id: 'head', label: 'На голову' },
  { id: 'eyes', label: 'На глаза'  },
  { id: 'neck', label: 'На шею'    },
  { id: 'wing', label: 'Амулеты на крылья' }
];

export const SLOT_LABEL = SLOTS.reduce((m, s) => { m[s.id] = s.label; return m; }, {});

// Per-item visual hints used when rendering on the owl SVG. `bandColor`
// applies to neck items (collar wrap colour); `wingTint` is a future hook
// for wing-amulet recolouring.
export const PET_DECORATIONS = [
  // ---------- HEAD ----------
  { id: 'bow',      slot: 'head', icon: '🎀', name: 'Розовый бантик',    desc: 'Прибавляет шарма',                  price: 60,  bonusPct: 3 },
  { id: 'academic', slot: 'head', icon: '🎓', name: 'Шапка академика',   desc: 'Знание — золото',                   price: 200, bonusPct: 7 },
  { id: 'cowboy',   slot: 'head', icon: '🤠', name: 'Ковбойская шляпа',  desc: 'Дикий запад, дикие монеты',         price: 250, bonusPct: 8 },
  { id: 'tophat',   slot: 'head', icon: '🎩', name: 'Цилиндр',           desc: 'Аристократический вид',             price: 380, bonusPct: 12 },
  { id: 'crown',    slot: 'head', icon: '👑', name: 'Корона мудрости',   desc: 'На голове совы — повелитель монет', price: 600, bonusPct: 18 },

  // ---------- EYES ----------
  { id: 'glasses',  slot: 'eyes', icon: '👓', name: 'Учёные очки',       desc: 'Умный вид — больше монет',          price: 180, bonusPct: 7 },
  { id: 'shades',   slot: 'eyes', icon: '🕶️', name: 'Солнечные очки',    desc: 'Слепят соперников',                 price: 230, bonusPct: 8 },
  { id: 'monocle',  slot: 'eyes', icon: '🧐', name: 'Монокль',           desc: 'Только серьёзные дела',             price: 300, bonusPct: 10 },

  // ---------- NECK (collar — wraps fully around the body) ----------
  { id: 'scarf',  slot: 'neck', icon: '🧣', name: 'Тёплый шарф',      desc: 'Уют согревает кошелёк',           price: 110, bonusPct: 5, bandColor: '#c44848' },
  { id: 'ribbon', slot: 'neck', icon: '🎗️', name: 'Орденская лента', desc: 'За заслуги перед словами',         price: 150, bonusPct: 6, bandColor: '#d49930' },
  { id: 'beads',  slot: 'neck', icon: '📿', name: 'Деревянные бусы',  desc: 'Спокойствие и сосредоточенность', price: 180, bonusPct: 7, bandColor: '#7a4a1f' },
  { id: 'bowtie', slot: 'neck', icon: '🦋', name: 'Бабочка',          desc: 'Стильный гость на любом празднике', price: 240, bonusPct: 9, bandColor: '#1a1a1a' },

  // ---------- WING AMULETS (up to 2, one per wing) ----------
  { id: 'feather', slot: 'wing', icon: '🪶', name: 'Перьевой амулет',    desc: 'Лёгкость в перьях — тяжесть в монете', price: 250, bonusPct: 9 },
  { id: 'sparkle', slot: 'wing', icon: '✨', name: 'Магический амулет',  desc: 'Искрит при каждой победе',           price: 350, bonusPct: 12 },
  { id: 'crystal', slot: 'wing', icon: '💎', name: 'Хрустальная капля', desc: 'Притягивает удачу и золото',          price: 500, bonusPct: 16 },
  { id: 'star',    slot: 'wing', icon: '🌠', name: 'Звёздный оберег',   desc: 'Падающая звезда исполняет мечты',     price: 750, bonusPct: 22 }
];

export const getDecoration = (id) => PET_DECORATIONS.find((d) => d.id === id);

// Wing keys in the equipped map. Other slots store id directly under slot id.
export const WING_KEYS = ['wingL', 'wingR'];

export function collectEquippedIds(pet) {
  if (!pet || !pet.equipped) return pet?.activeDecoration ? [pet.activeDecoration] : [];
  return Object.values(pet.equipped).filter(Boolean);
}

export function equippedDecorationsBonus(pet) {
  return collectEquippedIds(pet).reduce(
    (sum, id) => sum + (getDecoration(id)?.bonusPct || 0), 0
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
