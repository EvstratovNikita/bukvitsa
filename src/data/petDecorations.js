import { petPrice } from '../constants/game.js';
import { tr } from '../lib/lang.js';

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
  { id: 'head',   label: tr('На голову') },
  { id: 'eyes',   label: tr('На глаза')  },
  { id: 'brooch', label: tr('Брошь')     },
  { id: 'wing',   label: tr('Амулеты на крылья') }
];

export const SLOT_LABEL = SLOTS.reduce((m, s) => { m[s.id] = s.label; return m; }, {});

// Per-item visual hints used when rendering on the owl SVG. `bandColor`
// applies to neck items (collar wrap colour); `wingTint` is a future hook
// for wing-amulet recolouring.
// `minLevel` gates purchases behind Букля's level. First few items in each
// slot stay open from level 1 so a new player has something to spend on
// immediately; higher tiers unlock as the pet grows. Designed so a typical
// player hits level 5–10 mid-game and the top trio unlocks around 15–18.
const RAW_DECORATIONS = [
  // ---------- HEAD ----------
  { id: 'bow',      slot: 'head', icon: '🎀', name: tr('Розовый бантик'),    desc: tr('Прибавляет шарма'),                  price: 60,  bonusCoins: 1, minLevel: 1 },
  { id: 'academic', slot: 'head', icon: '🎓', name: tr('Шапка академика'),   desc: tr('Знание — золото'),                   price: 200, bonusCoins: 1, minLevel: 4 },
  { id: 'cap',      slot: 'head', icon: '🧢', name: tr('Кепка'),             desc: tr('Простая и удобная'),                price: 250, bonusCoins: 2, minLevel: 6 },
  { id: 'tophat',   slot: 'head', icon: '🎩', name: tr('Цилиндр'),           desc: tr('Аристократический вид'),             price: 380, bonusCoins: 2, minLevel: 10 },
  { id: 'crown',    slot: 'head', icon: '👑', name: tr('Корона мудрости'),   desc: tr('На голове совы — повелитель монет'), price: 600, bonusCoins: 3, minLevel: 15 },

  // ---------- EYES ----------
  { id: 'glasses',  slot: 'eyes', icon: '👓', name: tr('Учёные очки'),       desc: tr('Умный вид — больше монет'),          price: 180, bonusCoins: 1, minLevel: 1 },
  { id: 'shades',   slot: 'eyes', icon: '🕶️', name: tr('Солнечные очки'),    desc: tr('Слепят соперников'),                 price: 230, bonusCoins: 2, minLevel: 5 },
  { id: 'monocle',  slot: 'eyes', icon: '🧐', name: tr('Монокль'),           desc: tr('Только серьёзные дела'),             price: 300, bonusCoins: 2, minLevel: 9 },

  // ---------- BROOCH (small pin on the right of the chest) ----------
  { id: 'rose',     slot: 'brooch', icon: '🌹', name: tr('Брошь-роза'),    desc: tr('Классическая нежность'),     price: 110, bonusCoins: 1, minLevel: 1 },
  { id: 'medal',    slot: 'brooch', icon: '🥇', name: tr('Медаль'),         desc: tr('За заслуги перед словарём'), price: 150, bonusCoins: 1, minLevel: 3 },
  { id: 'lightning', slot: 'brooch', icon: '⚡', name: tr('Молния'),         desc: tr('Заряд бодрости'),           price: 200, bonusCoins: 1, minLevel: 7 },
  { id: 'heart',    slot: 'brooch', icon: '❤️', name: tr('Сердечко'),       desc: tr('С любовью к буквам'),       price: 240, bonusCoins: 2, minLevel: 11 },

  // ---------- WING AMULETS (up to 2, one per wing) ----------
  { id: 'feather', slot: 'wing', icon: '🪶', name: tr('Перьевой амулет'),    desc: tr('Лёгкость в перьях — тяжесть в монете'), price: 250, bonusCoins: 2, minLevel: 2 },
  { id: 'sparkle', slot: 'wing', icon: '🔮', name: tr('Магический амулет'),  desc: tr('Искрит при каждой победе'),           price: 350, bonusCoins: 2, minLevel: 8 },
  { id: 'crystal', slot: 'wing', icon: '💎', name: tr('Хрустальная капля'), desc: tr('Притягивает удачу и золото'),          price: 500, bonusCoins: 3, minLevel: 13 },
  { id: 'star',    slot: 'wing', icon: '🌠', name: tr('Звёздный оберег'),   desc: tr('Падающая звезда исполняет мечты'),     price: 750, bonusCoins: 4, minLevel: 18 },

  // ---------- ХЭЛЛОУИН 2026 (ивент «Ночь тыкв») ----------
  // Не продаются: их выдаёт лента наград ивента (отметки — data/halloween.js). event — к какому ивенту относятся: особое
  // оформление на время ивента, после него — обычные предметы своего слота.
  { id: 'hw-witchhat',   slot: 'head',   icon: '🧙', name: tr('Шляпа ведьмы'),        desc: tr('Главная награда «Ночи тыкв»'), bonusCoins: 3, event: 'halloween' },
  { id: 'hw-batglasses', slot: 'eyes',   icon: '🦇', name: tr('Очки «Летучие мыши»'), desc: tr('Видят в самой тёмной ночи'),    bonusCoins: 2, event: 'halloween' },
  { id: 'hw-pumpkin',    slot: 'brooch', icon: '🎃', name: tr('Брошь «Тыквочка»'),    desc: tr('Светится изнутри, как фонарь'), bonusCoins: 1, event: 'halloween' },
  { id: 'hw-lantern',    slot: 'wing',   icon: '🏮', name: tr('Ведьмин фонарик'),     desc: tr('Огонёк в ночь Хэллоуина'),      bonusCoins: 2, event: 'halloween' }
];

export const PET_DECORATIONS = RAW_DECORATIONS.map((x) => (x.price ? { ...x, price: petPrice(x.price) } : x));

// Обычный каталог — без ивентовых предметов: по нему считают «купи все
// украшения», и ивентовые туда не входят (их нельзя купить, а после ивента —
// и получить).
export const REGULAR_DECORATIONS = PET_DECORATIONS.filter((d) => !d.event);

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
