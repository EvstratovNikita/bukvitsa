export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

export const LETTER_STATUS = {
  EMPTY: 'empty',
  TBD: 'tbd',
  ABSENT: 'absent',
  PRESENT: 'present',
  CORRECT: 'correct'
};

export const GAME_STATUS = {
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost'
};

export const STORAGE_KEYS = {
  STATS: 'wordle-ru:stats',
  GAME_STATE: 'wordle-ru:game'
};

export const KEYBOARD_ROWS = [
  ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
  ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
  ['BACK', 'Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю', 'ENTER']
];

export const ANIM = {
  FLIP_MS: 500,
  FLIP_STAGGER_MS: 280,
  REVEAL_TOTAL_MS: 500 + 280 * (WORD_LENGTH - 1)
};

// Coin reward per attempts-used to win. Index 0 = 1st try.
export const COIN_REWARD = [8, 5, 4, 3, 2, 1];

export const rewardFor = (attemptsUsed) =>
  COIN_REWARD[attemptsUsed - 1] ?? 0;

export const HINT_COST = {
  RANDOM: 10,
  PICK: 15
};

// Daily energy budget. One unit is consumed per started puzzle.
export const ENERGY_MAX = 5;
export const ENERGY_REFILL_COST = 20;   // coins per +1 energy
export const ENERGY_AD_REWARD = 1;       // energy granted per ad watched

// Refills energy back to full on a new local day. Returns the snapshot to
// merge into stats; identity-preserving when no refill is due.
export const refillEnergyForToday = (energyDate, energy) => {
  const today = todayKey();
  if (energyDate !== today) {
    return { energy: ENERGY_MAX, energyDate: today };
  }
  return { energy: Number.isFinite(energy) ? energy : ENERGY_MAX, energyDate };
};

export const DAILY_CYCLE_DAYS = 6;

// YYYY-MM-DD in local time. (toISOString is UTC; use local parts.)
export const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const computeDailyReward = (lastVisitDate, dailyStreak) => {
  const today = todayKey();
  if (lastVisitDate === today) return null;
  const yest = yesterdayKey();
  let streak;
  if (lastVisitDate === yest) {
    streak = dailyStreak >= DAILY_CYCLE_DAYS ? 1 : (dailyStreak || 0) + 1;
  } else {
    streak = 1;
  }
  return { streak, amount: streak };
};
