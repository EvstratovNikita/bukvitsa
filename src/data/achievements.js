// Achievements catalog. Each entry is a pure descriptor — no state, no
// mutation — so the same array drives both the listing UI and the
// unlock-check loop in useStats. To add an achievement, append an entry:
//
//   {
//     id:     stable string (used as storage key — never rename in place)
//     tier:   'easy' | 'hard'
//     title:  short human label
//     desc:   one-line explanation, mentions the target metric
//     icon:   emoji rendered as the badge glyph (cheap, no asset pipeline)
//     reward: coins granted when first unlocked (0 = none)
//     check(stats):    returns true once unlocked. Receives the full stats
//                      snapshot. MUST be a pure function of stats.
//     progress(stats): optional. Returns { current, target } so the UI can
//                      show "3 / 10" + bar. Omit for boolean-only items.
//   }
//
// Stats fields used here that don't come for free from existing tracking:
//   hintsUsed       — bumped in useGame.revealRandomHint / revealPositionHint
//   itemsBought     — bumped in useStats.buyItem
//   coinsEarned     — cumulative coins ever credited (never decremented)
//   fastestWinMs    — minimum elapsed time across all wins
//   distribution[i] — already tracked; index 0 = wins on first try

const allDistributionFilled = (s) =>
  (s.distribution || []).every((n) => (n || 0) > 0);

const distributionFilledCount = (s) =>
  (s.distribution || []).filter((n) => (n || 0) > 0).length;

export const ACHIEVEMENTS = [
  // ---------- Easy (10) ----------
  {
    id: 'first_win', tier: 'easy', icon: '🌱', reward: 5,
    title: 'Первый успех',
    desc: 'Угадай первое слово',
    check: (s) => (s.won || 0) >= 1
  },
  {
    id: 'first_try', tier: 'easy', icon: '🎯', reward: 10,
    title: 'С первого раза',
    desc: 'Угадай слово с первой попытки',
    check: (s) => (s.distribution?.[0] || 0) >= 1
  },
  {
    id: 'streak_3', tier: 'easy', icon: '🔥', reward: 10,
    title: 'Тройка',
    desc: 'Собери серию из 3 побед',
    check: (s) => (s.maxStreak || 0) >= 3,
    progress: (s) => ({ current: Math.min(3, s.maxStreak || 0), target: 3 })
  },
  {
    id: 'first_hint', tier: 'easy', icon: '💡', reward: 5,
    title: 'Подсмотрел',
    desc: 'Используй любую подсказку',
    check: (s) => (s.hintsUsed || 0) >= 1
  },
  {
    id: 'first_purchase', tier: 'easy', icon: '🛍️', reward: 5,
    title: 'Первая покупка',
    desc: 'Купи любой товар в магазине',
    check: (s) => (s.itemsBought || 0) >= 1
  },
  {
    id: 'play_5', tier: 'easy', icon: '🎲', reward: 5,
    title: 'Разминка',
    desc: 'Сыграй 5 партий',
    check: (s) => (s.played || 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s.played || 0), target: 5 })
  },
  {
    id: 'won_10', tier: 'easy', icon: '🥉', reward: 15,
    title: 'Десятка',
    desc: 'Угадай 10 слов',
    check: (s) => (s.won || 0) >= 10,
    progress: (s) => ({ current: Math.min(10, s.won || 0), target: 10 })
  },
  {
    id: 'daily_2', tier: 'easy', icon: '📅', reward: 10,
    title: 'Завтрак с буквами',
    desc: 'Зайди в игру 2 дня подряд',
    check: (s) => (s.dailyStreak || 0) >= 2,
    progress: (s) => ({ current: Math.min(2, s.dailyStreak || 0), target: 2 })
  },
  {
    id: 'coins_50', tier: 'easy', icon: '🪙', reward: 10,
    title: 'Кошелёк',
    desc: 'Заработай 50 монет за всё время',
    check: (s) => (s.coinsEarned || 0) >= 50,
    progress: (s) => ({ current: Math.min(50, s.coinsEarned || 0), target: 50 })
  },
  {
    id: 'change_bg', tier: 'easy', icon: '🎨', reward: 5,
    title: 'Смена обстановки',
    desc: 'Поставь новый фон',
    check: (s) => Boolean(s.activeBackground)
  },

  // ---------- Hard (12) ----------
  {
    id: 'streak_10', tier: 'hard', icon: '🔥🔥', reward: 40,
    title: 'Огонь',
    desc: 'Серия из 10 побед подряд',
    check: (s) => (s.maxStreak || 0) >= 10,
    progress: (s) => ({ current: Math.min(10, s.maxStreak || 0), target: 10 })
  },
  {
    id: 'won_50', tier: 'hard', icon: '🥈', reward: 50,
    title: 'Знаток',
    desc: 'Угадай 50 слов',
    check: (s) => (s.won || 0) >= 50,
    progress: (s) => ({ current: Math.min(50, s.won || 0), target: 50 })
  },
  {
    id: 'won_200', tier: 'hard', icon: '🥇', reward: 150,
    title: 'Мастер',
    desc: 'Угадай 200 слов',
    check: (s) => (s.won || 0) >= 200,
    progress: (s) => ({ current: Math.min(200, s.won || 0), target: 200 })
  },
  {
    id: 'played_100', tier: 'hard', icon: '🏟️', reward: 40,
    title: 'Завсегдатай',
    desc: 'Сыграй 100 партий',
    check: (s) => (s.played || 0) >= 100,
    progress: (s) => ({ current: Math.min(100, s.played || 0), target: 100 })
  },
  {
    id: 'coins_500', tier: 'hard', icon: '💰', reward: 60,
    title: 'Капитал',
    desc: 'Заработай 500 монет за всё время',
    check: (s) => (s.coinsEarned || 0) >= 500,
    progress: (s) => ({ current: Math.min(500, s.coinsEarned || 0), target: 500 })
  },
  {
    id: 'first_try_5', tier: 'hard', icon: '🏹', reward: 40,
    title: 'Снайпер',
    desc: '5 раз угадай слово с первой попытки',
    check: (s) => (s.distribution?.[0] || 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s.distribution?.[0] || 0), target: 5 })
  },
  {
    id: 'hints_used_20', tier: 'hard', icon: '🧠', reward: 20,
    title: 'Помощник зала',
    desc: 'Используй 20 подсказок',
    check: (s) => (s.hintsUsed || 0) >= 20,
    progress: (s) => ({ current: Math.min(20, s.hintsUsed || 0), target: 20 })
  },
  {
    id: 'daily_6', tier: 'hard', icon: '🗓️', reward: 30,
    title: 'Неделя верности',
    desc: 'Пройди полный 6-дневный цикл входов',
    check: (s) => (s.dailyStreak || 0) >= 6,
    progress: (s) => ({ current: Math.min(6, s.dailyStreak || 0), target: 6 })
  },
  {
    id: 'inventory_5', tier: 'hard', icon: '🎁', reward: 30,
    title: 'Коллекционер',
    desc: 'Имей 5 предметов в инвентаре',
    check: (s) => (s.inventory?.length || 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s.inventory?.length || 0), target: 5 })
  },
  {
    id: 'purchases_10', tier: 'hard', icon: '🛒', reward: 40,
    title: 'Транжира',
    desc: 'Соверши 10 покупок в магазине',
    check: (s) => (s.itemsBought || 0) >= 10,
    progress: (s) => ({ current: Math.min(10, s.itemsBought || 0), target: 10 })
  },
  {
    id: 'fast_30', tier: 'hard', icon: '⏱️', reward: 20,
    title: 'Спринтер',
    desc: 'Угадай слово быстрее, чем за 30 секунд',
    check: (s) => Boolean(s.fastestWinMs) && s.fastestWinMs <= 30000
  },
  {
    id: 'fast_15', tier: 'hard', icon: '⚡', reward: 50,
    title: 'Молниеносный',
    desc: 'Угадай слово быстрее, чем за 15 секунд',
    check: (s) => Boolean(s.fastestWinMs) && s.fastestWinMs <= 15000
  },
  {
    id: 'pet_lvl_5', tier: 'easy', icon: '🦉', reward: 30,
    title: 'Птенец подрос',
    desc: 'Прокачай Буклю до 5 уровня',
    check: (s) => (s.pet?.level || 1) >= 5,
    progress: (s) => ({ current: Math.min(5, s.pet?.level || 1), target: 5 })
  },
  {
    id: 'pet_lvl_10', tier: 'hard', icon: '🌟', reward: 120,
    title: 'Учёная сова',
    desc: 'Прокачай Буклю до 10 уровня',
    check: (s) => (s.pet?.level || 1) >= 10,
    progress: (s) => ({ current: Math.min(10, s.pet?.level || 1), target: 10 })
  },
  {
    id: 'invite_1', tier: 'easy', icon: '🤝', reward: 30,
    title: 'Сват',
    desc: 'Пригласи друга — он должен войти через Google или email',
    check: (s) => (s.referralsCount || 0) >= 1
  },
  {
    id: 'invite_5', tier: 'hard', icon: '🎤', reward: 200,
    title: 'Гуру',
    desc: 'Приведи 5 друзей, привязавших аккаунт',
    check: (s) => (s.referralsCount || 0) >= 5,
    progress: (s) => ({ current: Math.min(5, s.referralsCount || 0), target: 5 })
  },
  {
    id: 'all_attempts', tier: 'hard', icon: '🎓', reward: 60,
    title: 'Универсал',
    desc: 'Победи, использовав каждое количество попыток (1–6) хотя бы раз',
    check: allDistributionFilled,
    progress: (s) => ({ current: distributionFilledCount(s), target: 6 })
  }
];

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id);

export const ACHIEVEMENTS_BY_TIER = {
  easy: ACHIEVEMENTS.filter((a) => a.tier === 'easy'),
  hard: ACHIEVEMENTS.filter((a) => a.tier === 'hard')
};

export const getAchievement = (id) => ACHIEVEMENTS.find((a) => a.id === id);

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
