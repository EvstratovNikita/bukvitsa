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

// Energy budget. One unit is consumed per started puzzle.
export const ENERGY_MAX = 5;
export const ENERGY_REFILL_COST = 20;             // coins per +1 energy
export const ENERGY_AD_REWARD = 1;                 // energy per ad watched
export const ENERGY_REGEN_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours per unit

// Hunger drives the pet's bonus to energy regen speed:
//   speedMultiplier = 1 + floor(hunger / 10) * 0.1
//   hunger 0   → 1.0x (2h per unit)
//   hunger 50  → 1.5x (≈1h 20m per unit)
//   hunger 100 → 2.0x (1h per unit)
// Hunger drains linearly over time so feeding is a meaningful loop.
export const HUNGER_MAX = 100;
export const HUNGER_DECAY_PER_HOUR = HUNGER_MAX / 24;  // empty over 24 real hours

export const energySpeedFromHunger = (hunger) =>
  1 + Math.floor(Math.max(0, Math.min(HUNGER_MAX, hunger || 0)) / 10) * 0.1;

// Pet leveling — Букля earns XP every time the player wins. Quicker wins
// award more XP so the pet "grows" alongside the player's skill.
//
// XP per win = PET_XP_PER_WIN + (MAX_ATTEMPTS - attemptsUsed) * PET_XP_PER_SAVED_ATTEMPT
//   1-attempt win → 5 + 5*2 = 15 XP
//   6-attempt win → 5 + 0   = 5 XP
//
// Level curve is linear: level N → N+1 needs (50 * N) XP. Levels feel
// progressively further out without ever feeling impossible.
export const PET_XP_PER_WIN = 5;
export const PET_XP_PER_SAVED_ATTEMPT = 2;
export const PET_LEVEL_BASE = 50;

export function petXpForWin(attemptsUsed) {
  const saved = Math.max(0, MAX_ATTEMPTS - attemptsUsed);
  return PET_XP_PER_WIN + saved * PET_XP_PER_SAVED_ATTEMPT;
}

// Given cumulative xp, returns { level, xpInLevel, xpForNext, totalToNext }.
// level starts at 1.
export function petComputeLevel(xp) {
  let lvl = 1;
  let consumed = 0;
  let needed = PET_LEVEL_BASE;          // xp to reach lvl 2 from lvl 1
  while ((xp || 0) >= consumed + needed) {
    consumed += needed;
    lvl += 1;
    needed = PET_LEVEL_BASE * lvl;       // lvl→lvl+1 cost grows linearly
  }
  return {
    level: lvl,
    xpInLevel: (xp || 0) - consumed,
    xpForNext: needed,
    totalToNext: consumed + needed
  };
}

// Pure reconciliation: given the persisted snapshot + the current wall-clock,
// returns the freshly-tickled energy + hunger. Called on every read (cheap)
// so the UI never shows stale values. Idempotent.
//
// Hunger decays first, then energy regen uses the post-decay hunger for its
// speed multiplier. Close enough to a continuous integral that the player
// won't notice the discretisation.
export function reconcilePetTimers({ energy, lastEnergyTickAt, hunger, lastHungerTickAt, hatched, nowMs }) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const nowIso = new Date(now).toISOString();

  // Hunger decay (only after hatching — pre-hatch the pet doesn't eat).
  let nextHunger = Number.isFinite(hunger) ? hunger : HUNGER_MAX / 2;
  let nextHungerTick = lastHungerTickAt;
  if (hatched) {
    const lastH = lastHungerTickAt ? new Date(lastHungerTickAt).getTime() : now;
    const elapsedH = Math.max(0, now - lastH);
    const decay = (elapsedH / 3600000) * HUNGER_DECAY_PER_HOUR;
    nextHunger = Math.max(0, nextHunger - decay);
    nextHungerTick = nowIso;
  } else if (!nextHungerTick) {
    nextHungerTick = nowIso;
  }

  // Energy regen.
  const startEnergy = Number.isFinite(energy) ? energy : ENERGY_MAX;
  let nextEnergy = startEnergy;
  let nextEnergyTick = lastEnergyTickAt || nowIso;

  if (startEnergy < ENERGY_MAX) {
    const lastE = lastEnergyTickAt ? new Date(lastEnergyTickAt).getTime() : now;
    const elapsedE = Math.max(0, now - lastE);
    const speedMul = energySpeedFromHunger(nextHunger);
    const interval = ENERGY_REGEN_INTERVAL_MS / speedMul;
    const units = Math.floor(elapsedE / interval);
    if (units > 0) {
      nextEnergy = Math.min(ENERGY_MAX, startEnergy + units);
      const remainder = elapsedE - units * interval;
      // If we capped at MAX, stop accumulating debt — reset tick to now.
      nextEnergyTick = nextEnergy >= ENERGY_MAX
        ? nowIso
        : new Date(now - remainder).toISOString();
    }
  } else {
    nextEnergyTick = nowIso;
  }

  return {
    energy: nextEnergy,
    lastEnergyTickAt: nextEnergyTick,
    hunger: nextHunger,
    lastHungerTickAt: nextHungerTick
  };
}

// Displayed time until the next energy unit. Always counts down from the
// base 2h regardless of speed multiplier — the player sees the countdown
// "tick faster" when Букля is fed instead of starting from a smaller number.
//
// Implementation: real_remaining * speedMul. With hunger 0 (×1) this is just
// the real time. With hunger 100 (×2) the display starts at 2h and reaches
// 0 in 1h of wall-clock — each real second drops the visible counter by 2s.
export function msUntilNextEnergyUnit({ energy, lastEnergyTickAt, hunger, nowMs }) {
  const e = Number.isFinite(energy) ? energy : ENERGY_MAX;
  if (e >= ENERGY_MAX) return 0;
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const last = lastEnergyTickAt ? new Date(lastEnergyTickAt).getTime() : now;
  const speedMul = energySpeedFromHunger(hunger);
  const interval = ENERGY_REGEN_INTERVAL_MS / speedMul;
  const elapsed = Math.max(0, now - last);
  const realRemaining = Math.max(0, interval - elapsed);
  return realRemaining * speedMul;
}

// Pretty-format a duration in milliseconds → "1ч 23м", "12м 05с", "47с".
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}ч ${String(m).padStart(2, '0')}м`;
  if (m > 0) return `${m}м ${String(s).padStart(2, '0')}с`;
  return `${s}с`;
}

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
