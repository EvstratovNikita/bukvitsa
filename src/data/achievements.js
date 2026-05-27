// Achievements catalog. Each entry is a pure descriptor — no state, no
// mutation — so the same array drives both the listing UI and the
// unlock-check loop in useStats. To add an achievement, append an entry:
//
//   {
//     id:       stable string (used as storage key — never rename in place)
//     category: 'words' | 'shop' | 'pet' | 'friends'  (used for tabs)
//     tier:     'easy' | 'hard'                       (visual difficulty hint)
//     title:    short human label
//     desc:     one-line explanation, mentions the target metric
//     icon:     single emoji rendered as the badge glyph
//     reward:   coins granted when first unlocked (0 = none)
//     check(stats):    returns true once unlocked. Pure function of stats.
//     progress(stats): optional. Returns { current, target } so the UI can
//                      show "3 / 10" + bar. For boolean-only items the UI
//                      synthesises 0/1 vs 1/1 from check() — but provide
//                      progress explicitly whenever there's a number to count.
//   }
//
// Stats fields used here that don't come for free from existing tracking:
//   hintsUsed       — bumped in useGame.revealRandomHint / revealPositionHint
//   itemsBought     — bumped in useStats.buyItem
//   coinsEarned     — cumulative coins ever credited (never decremented)
//   fastestWinMs    — minimum elapsed time across all wins
//   distribution[i] — already tracked; index 0 = wins on first try
//   pet.level       — Букля's level (derived from xp)
//   referralsCount  — verified invitees credited to this user

import { PET_DECORATIONS } from './petDecorations.js';

const allDistributionFilled = (s) =>
  (s.distribution || []).every((n) => (n || 0) > 0);

const distributionFilledCount = (s) =>
  (s.distribution || []).filter((n) => (n || 0) > 0).length;

// Equipped pet decoration helpers. "Full outfit" = head + eyes + brooch
// + at least one wing amulet. "Total dressed" = both wings + 3 main slots.
const ownedDecoCount = (s) => (s.pet?.ownedDecorations?.length || 0);
const equippedSlotCount = (s) => {
  const e = s.pet?.equipped || {};
  let n = 0;
  if (e.head)   n++;
  if (e.eyes)   n++;
  if (e.brooch) n++;
  if (e.wingL)  n++;
  if (e.wingR)  n++;
  return n;
};
const TOTAL_DECO = PET_DECORATIONS.length;

export const ACHIEVEMENT_CATEGORIES = [
  { id: 'words',   label: 'Слова'    },
  { id: 'shop',    label: 'Покупки'  },
  { id: 'pet',     label: 'Питомец'  },
  { id: 'friends', label: 'Друзья'   }
];

export const ACHIEVEMENTS = [
  // ============ СЛОВА ============
  {
    id: 'first_win', category: 'words', tier: 'easy', icon: '🌱', reward: 5,
    title: 'Первый успех',
    desc: 'Угадай первое слово',
    check: (s) => (s.won || 0) >= 1
  },
  {
    id: 'first_try', category: 'words', tier: 'easy', icon: '🎯', reward: 10,
    title: 'С первого раза',
    desc: 'Угадай слово с первой попытки',
    check: (s) => (s.distribution?.[0] || 0) >= 1,
    progress: (s) => ({ current: Math.min(1, s.distribution?.[0] || 0), target: 1 })
  },
  {
    id: 'streak_3', category: 'words', tier: 'easy', icon: '🔥', reward: 10,
    title: 'Тройка',
    desc: 'Собери серию из 3 побед подряд',
    check: (s) => (s.maxStreak || 0) >= 3,
    progress: (s) => ({ current: Math.min(3, s.maxStreak || 0), target: 3 })
  },
  {
    id: 'play_5', category: 'words', tier: 'easy', icon: '🎲', reward: 5,
    title: 'Разминка',
    desc: 'Сыграй 5 партий',
    check: (s) => (s.played || 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s.played || 0), target: 5 })
  },
  {
    id: 'won_10', category: 'words', tier: 'easy', icon: '🥉', reward: 15,
    title: 'Десятка',
    desc: 'Угадай 10 слов',
    check: (s) => (s.won || 0) >= 10,
    progress: (s) => ({ current: Math.min(10, s.won || 0), target: 10 })
  },
  {
    id: 'daily_2', category: 'words', tier: 'easy', icon: '📅', reward: 10,
    title: 'Завтрак с буквами',
    desc: 'Зайди в игру 2 дня подряд',
    check: (s) => (s.dailyStreak || 0) >= 2,
    progress: (s) => ({ current: Math.min(2, s.dailyStreak || 0), target: 2 })
  },
  {
    id: 'first_hint', category: 'words', tier: 'easy', icon: '💡', reward: 5,
    title: 'Подсмотрел',
    desc: 'Используй любую подсказку',
    check: (s) => (s.hintsUsed || 0) >= 1,
    progress: (s) => ({ current: Math.min(1, s.hintsUsed || 0), target: 1 })
  },
  {
    id: 'streak_10', category: 'words', tier: 'hard', icon: '🚀', reward: 40,
    title: 'Огонь',
    desc: 'Серия из 10 побед подряд',
    check: (s) => (s.maxStreak || 0) >= 10,
    progress: (s) => ({ current: Math.min(10, s.maxStreak || 0), target: 10 })
  },
  {
    id: 'won_50', category: 'words', tier: 'hard', icon: '🥈', reward: 50,
    title: 'Знаток',
    desc: 'Угадай 50 слов',
    check: (s) => (s.won || 0) >= 50,
    progress: (s) => ({ current: Math.min(50, s.won || 0), target: 50 })
  },
  {
    id: 'won_200', category: 'words', tier: 'hard', icon: '🥇', reward: 150,
    title: 'Мастер',
    desc: 'Угадай 200 слов',
    check: (s) => (s.won || 0) >= 200,
    progress: (s) => ({ current: Math.min(200, s.won || 0), target: 200 })
  },
  {
    id: 'played_100', category: 'words', tier: 'hard', icon: '🏟️', reward: 40,
    title: 'Завсегдатай',
    desc: 'Сыграй 100 партий',
    check: (s) => (s.played || 0) >= 100,
    progress: (s) => ({ current: Math.min(100, s.played || 0), target: 100 })
  },
  {
    id: 'first_try_5', category: 'words', tier: 'hard', icon: '🏹', reward: 40,
    title: 'Снайпер',
    desc: '5 раз угадай слово с первой попытки',
    check: (s) => (s.distribution?.[0] || 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s.distribution?.[0] || 0), target: 5 })
  },
  {
    id: 'hints_used_20', category: 'words', tier: 'hard', icon: '🧠', reward: 20,
    title: 'Помощник зала',
    desc: 'Используй 20 подсказок',
    check: (s) => (s.hintsUsed || 0) >= 20,
    progress: (s) => ({ current: Math.min(20, s.hintsUsed || 0), target: 20 })
  },
  {
    id: 'daily_6', category: 'words', tier: 'hard', icon: '🗓️', reward: 30,
    title: 'Неделя верности',
    desc: 'Пройди полный 6-дневный цикл входов',
    check: (s) => (s.dailyStreak || 0) >= 6,
    progress: (s) => ({ current: Math.min(6, s.dailyStreak || 0), target: 6 })
  },
  {
    id: 'fast_30', category: 'words', tier: 'hard', icon: '⏱️', reward: 20,
    title: 'Спринтер',
    desc: 'Угадай слово быстрее, чем за 30 секунд',
    check: (s) => Boolean(s.fastestWinMs) && s.fastestWinMs <= 30000
  },
  {
    id: 'fast_15', category: 'words', tier: 'hard', icon: '⚡', reward: 50,
    title: 'Молниеносный',
    desc: 'Угадай слово быстрее, чем за 15 секунд',
    check: (s) => Boolean(s.fastestWinMs) && s.fastestWinMs <= 15000
  },
  {
    id: 'all_attempts', category: 'words', tier: 'hard', icon: '🎓', reward: 60,
    title: 'Универсал',
    desc: 'Победи, использовав каждое число попыток (1–6) хотя бы раз',
    check: allDistributionFilled,
    progress: (s) => ({ current: distributionFilledCount(s), target: 6 })
  },

  // ============ ПОКУПКИ ============
  {
    id: 'first_purchase', category: 'shop', tier: 'easy', icon: '🛍️', reward: 5,
    title: 'Первая покупка',
    desc: 'Купи любой товар в магазине',
    check: (s) => (s.itemsBought || 0) >= 1,
    progress: (s) => ({ current: Math.min(1, s.itemsBought || 0), target: 1 })
  },
  {
    id: 'change_bg', category: 'shop', tier: 'easy', icon: '🎨', reward: 5,
    title: 'Смена обстановки',
    desc: 'Поставь новый фон',
    check: (s) => Boolean(s.activeBackground)
  },
  {
    id: 'coins_50', category: 'shop', tier: 'easy', icon: '🪙', reward: 10,
    title: 'Кошелёк',
    desc: 'Заработай 50 монет за всё время',
    check: (s) => (s.coinsEarned || 0) >= 50,
    progress: (s) => ({ current: Math.min(50, s.coinsEarned || 0), target: 50 })
  },
  {
    id: 'inventory_5', category: 'shop', tier: 'hard', icon: '🎁', reward: 30,
    title: 'Коллекционер',
    desc: 'Имей 5 предметов в инвентаре',
    check: (s) => (s.inventory?.length || 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s.inventory?.length || 0), target: 5 })
  },
  {
    id: 'purchases_10', category: 'shop', tier: 'hard', icon: '🛒', reward: 40,
    title: 'Транжира',
    desc: 'Соверши 10 покупок в магазине',
    check: (s) => (s.itemsBought || 0) >= 10,
    progress: (s) => ({ current: Math.min(10, s.itemsBought || 0), target: 10 })
  },
  {
    id: 'coins_500', category: 'shop', tier: 'hard', icon: '💰', reward: 60,
    title: 'Капитал',
    desc: 'Заработай 500 монет за всё время',
    check: (s) => (s.coinsEarned || 0) >= 500,
    progress: (s) => ({ current: Math.min(500, s.coinsEarned || 0), target: 500 })
  },

  // ============ ПИТОМЕЦ ============
  {
    id: 'pet_lvl_5', category: 'pet', tier: 'easy', icon: '🦉', reward: 30,
    title: 'Птенец подрос',
    desc: 'Прокачай Буклю до 5 уровня',
    check: (s) => (s.pet?.level || 1) >= 5,
    progress: (s) => ({ current: Math.min(5, s.pet?.level || 1), target: 5 })
  },
  {
    id: 'pet_lvl_10', category: 'pet', tier: 'hard', icon: '🌟', reward: 120,
    title: 'Учёная сова',
    desc: 'Прокачай Буклю до 10 уровня',
    check: (s) => (s.pet?.level || 1) >= 10,
    progress: (s) => ({ current: Math.min(10, s.pet?.level || 1), target: 10 })
  },
  // ---- pet decorations (purchases + equipping) ----
  {
    id: 'deco_first', category: 'pet', tier: 'easy', icon: '🎀', reward: 10,
    title: 'Первое украшение',
    desc: 'Купи любое украшение для Букли',
    check: (s) => ownedDecoCount(s) >= 1,
    progress: (s) => ({ current: Math.min(1, ownedDecoCount(s)), target: 1 })
  },
  {
    id: 'deco_5', category: 'pet', tier: 'easy', icon: '👗', reward: 30,
    title: 'Гардероб',
    desc: 'Купи 5 украшений для Букли',
    check: (s) => ownedDecoCount(s) >= 5,
    progress: (s) => ({ current: Math.min(5, ownedDecoCount(s)), target: 5 })
  },
  {
    id: 'deco_full_outfit', category: 'pet', tier: 'hard', icon: '🎩', reward: 60,
    title: 'Полный наряд',
    desc: 'Надень украшения во все слоты (голова, глаза, брошь, оба крыла)',
    check: (s) => equippedSlotCount(s) >= 5,
    progress: (s) => ({ current: equippedSlotCount(s), target: 5 })
  },
  {
    id: 'deco_collection', category: 'pet', tier: 'hard', icon: '🏆', reward: 200,
    title: 'Коллекционер модных вещей',
    desc: 'Купи все украшения для Букли',
    check: (s) => ownedDecoCount(s) >= TOTAL_DECO,
    progress: (s) => ({ current: Math.min(TOTAL_DECO, ownedDecoCount(s)), target: TOTAL_DECO })
  },

  // ============ ДРУЗЬЯ ============
  {
    id: 'invite_1', category: 'friends', tier: 'easy', icon: '🤝', reward: 30,
    title: 'Сват',
    desc: 'Пригласи друга — он должен войти через Google или email',
    check: (s) => (s.referralsCount || 0) >= 1,
    progress: (s) => ({ current: Math.min(1, s.referralsCount || 0), target: 1 })
  },
  {
    id: 'invite_5', category: 'friends', tier: 'hard', icon: '🎤', reward: 200,
    title: 'Гуру',
    desc: 'Приведи 5 друзей, привязавших аккаунт',
    check: (s) => (s.referralsCount || 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s.referralsCount || 0), target: 5 })
  }
];

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id);

export const ACHIEVEMENTS_BY_CATEGORY = ACHIEVEMENT_CATEGORIES.reduce((acc, c) => {
  acc[c.id] = ACHIEVEMENTS.filter((a) => a.category === c.id);
  return acc;
}, {});

export const getAchievement = (id) => ACHIEVEMENTS.find((a) => a.id === id);

// Returns { current, target } for any achievement, synthesising 0/1 vs 1/1
// for boolean-only items so the UI never needs a special-case branch.
export function getProgress(ach, stats) {
  if (ach.progress) return ach.progress(stats);
  return { current: ach.check(stats) ? 1 : 0, target: 1 };
}

// Count of unlocked achievements in a given category — useful for tab badges.
export function unlockedCountIn(category, unlockedSet) {
  return (ACHIEVEMENTS_BY_CATEGORY[category] || [])
    .filter((a) => unlockedSet.has(a.id)).length;
}

// Returns ids of achievements whose conditions are met but which aren't yet
// marked as unlocked in stats. Used by useStats to fire toasts + award reward
// coins exactly once per achievement.
export function findNewlyUnlocked(stats) {
  const already = new Set(stats.unlockedAchievements || []);
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (already.has(a.id)) continue;
    if (a.check(stats)) out.push(a.id);
  }
  return out;
}
