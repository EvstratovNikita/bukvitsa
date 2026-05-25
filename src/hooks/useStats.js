import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ENERGY_AD_REWARD,
  ENERGY_MAX,
  ENERGY_REFILL_COST,
  HUNGER_MAX,
  MAX_ATTEMPTS,
  STORAGE_KEYS,
  computeDailyReward,
  petComputeLevel,
  reconcilePetTimers,
  rewardFor,
  todayKey
} from '../constants/game.js';
import { findNewlyUnlocked, getAchievement } from '../data/achievements.js';
import { getItem } from '../data/shopItems.js';
import { getTreat } from '../data/petTreats.js';
import { storage } from '../utils/storage.js';
import { useAuth } from './useAuth.js';
import { useRemoteSync } from './useRemoteSync.js';

const DEFAULT_STATS = {
  played: 0,
  won: 0,
  lost: 0,
  currentStreak: 0,
  maxStreak: 0,
  totalGuesses: 0,        // sum of guesses across won games (for avg)
  bestAttempts: null,     // fewest guesses in a won game
  coins: 0,               // total accumulated coins
  distribution: Array(MAX_ATTEMPTS).fill(0),
  lastVisitDate: null,    // 'YYYY-MM-DD' of last daily-claim
  dailyStreak: 0,         // current consecutive-days counter (1..6)
  inventory: [],          // array of owned non-consumable item ids
  activeBackground: null, // id of currently equipped background skin
  activeCellStyle: null,  // id of currently equipped cell style
  boostDoubleCoins: false, // one-shot x2 boost for the next won game
  energy: ENERGY_MAX,           // current units; regens over time
  lastEnergyTickAt: null,       // ISO of last reconciliation
  hintsUsed: 0,            // cumulative paid-hint reveals
  itemsBought: 0,          // cumulative shop purchases (both cosmetic + consumable)
  coinsEarned: 0,          // cumulative coins ever credited (never decreases)
  fastestWinMs: null,      // lowest elapsed time across won games
  unlockedAchievements: [], // ids of unlocked achievements
  referralsCount: 0,        // verified (non-anon) invitees credited to this user
  // Companion pet (Букля the owlet). Lightweight JSON blob; new fields
  // (xp, hunger, mood, equipped) get appended as the pet feature grows.
  pet: {
    hatched: false,
    name: 'Букля',
    species: 'owl',
    bornAt: null,           // ISO date when the egg cracked
    xp: 0,                  // cumulative; level derived via petComputeLevel
    level: 1,
    hunger: HUNGER_MAX / 2, // starts half-full after hatching
    lastHungerTickAt: null  // ISO of last hunger decay reconciliation
  }
};

function load() {
  const raw = storage.get(STORAGE_KEYS.STATS, null);
  if (!raw) return DEFAULT_STATS;
  return {
    ...DEFAULT_STATS,
    ...raw,
    distribution: Array.isArray(raw.distribution) && raw.distribution.length === MAX_ATTEMPTS
      ? raw.distribution
      : DEFAULT_STATS.distribution,
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    unlockedAchievements: Array.isArray(raw.unlockedAchievements) ? raw.unlockedAchievements : [],
    pet: { ...DEFAULT_STATS.pet, ...(raw.pet || {}) }
  };
}

export function useStats() {
  const [stats, setStats] = useState(load);
  const [achievementToasts, setAchievementToasts] = useState([]);
  const auth = useAuth();

  useEffect(() => {
    storage.set(STORAGE_KEYS.STATS, stats);
  }, [stats]);

  useRemoteSync({ stats, setStats, userId: auth.userId });

  // Wall-clock tick used to drive countdowns. Bumped every ~30s so the
  // EnergyBadge "+1 через M:SS" reads as continuous without flooding state.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Reconciled (post-decay/regen) view derived on every render. Cheap because
  // reconcilePetTimers is pure math. Used everywhere the UI needs current
  // values; the stored stats lag behind until a real mutation flushes them.
  const reconciled = useMemo(() => reconcilePetTimers({
    energy: stats.energy,
    lastEnergyTickAt: stats.lastEnergyTickAt,
    hunger: stats.pet?.hunger,
    lastHungerTickAt: stats.pet?.lastHungerTickAt,
    hatched: Boolean(stats.pet?.hatched),
    nowMs
  }), [stats.energy, stats.lastEnergyTickAt, stats.pet?.hunger, stats.pet?.lastHungerTickAt, stats.pet?.hatched, nowMs]);

  // Note: we deliberately do NOT flush `reconciled` back into stats on every
  // tick — hunger decays continuously and that would write to storage / push
  // to Supabase every 30s. The reconciled snapshot drives display + is folded
  // into every real mutation (consume/buy/feed), and on next mount the same
  // reconcile recomputes from the persisted lastEnergyTickAt + elapsed time.

  // After any stats mutation, detect achievements whose condition just got
  // satisfied. Mark them unlocked, credit reward coins, queue a toast. The
  // setStats updater is idempotent (re-entry from chained unlocks ends when
  // findNewlyUnlocked returns []).
  useEffect(() => {
    const newly = findNewlyUnlocked(stats);
    if (!newly.length) return;
    setAchievementToasts((q) => [...q, ...newly.map((id) => ({ id, ts: Date.now() }))]);
    setStats((s) => {
      const ids = new Set(s.unlockedAchievements || []);
      let coins = s.coins || 0;
      let earned = s.coinsEarned || 0;
      for (const id of newly) {
        if (ids.has(id)) continue;
        ids.add(id);
        const r = getAchievement(id)?.reward || 0;
        coins += r;
        earned += r;
      }
      return { ...s, unlockedAchievements: [...ids], coins, coinsEarned: earned };
    });
  }, [stats]);

  // UI calls this once it has shown a toast, to drop it from the queue.
  const consumeAchievementToast = useCallback((id) => {
    setAchievementToasts((q) => q.filter((t) => t.id !== id));
  }, []);


  // Apply the double-coins boost (if armed) when computing the win reward.
  // The current snapshot of stats is captured in the closure so we read the
  // flag synchronously; the boost is consumed inside the setStats updater.
  const recordWin = useCallback((attemptsUsed, elapsedMs) => {
    const base = rewardFor(attemptsUsed);
    const boosted = stats.boostDoubleCoins ? base * 2 : base;
    setStats((s) => {
      const dist = s.distribution.slice();
      dist[attemptsUsed - 1] = (dist[attemptsUsed - 1] || 0) + 1;
      const currentStreak = s.currentStreak + 1;
      const earned = s.boostDoubleCoins ? base * 2 : base;
      const prevFast = s.fastestWinMs;
      const nextFast = (elapsedMs != null && elapsedMs > 0)
        ? (prevFast == null ? elapsedMs : Math.min(prevFast, elapsedMs))
        : prevFast;
      return {
        ...s,
        played: s.played + 1,
        won: s.won + 1,
        currentStreak,
        maxStreak: Math.max(s.maxStreak, currentStreak),
        totalGuesses: s.totalGuesses + attemptsUsed,
        bestAttempts: s.bestAttempts == null
          ? attemptsUsed
          : Math.min(s.bestAttempts, attemptsUsed),
        coins: (s.coins || 0) + earned,
        coinsEarned: (s.coinsEarned || 0) + earned,
        distribution: dist,
        boostDoubleCoins: false,
        fastestWinMs: nextFast
      };
    });
    return boosted;
  }, [stats.boostDoubleCoins]);

  const recordLoss = useCallback(() => {
    setStats((s) => ({
      ...s,
      played: s.played + 1,
      lost: s.lost + 1,
      currentStreak: 0
    }));
  }, []);

  const reset = useCallback(() => setStats(DEFAULT_STATS), []);

  const spendCoins = useCallback((amount) => {
    if ((stats.coins || 0) < amount) return false;
    setStats((s) => ({ ...s, coins: Math.max(0, (s.coins || 0) - amount) }));
    return true;
  }, [stats.coins]);

  const pendingDailyReward = useMemo(
    () => computeDailyReward(stats.lastVisitDate, stats.dailyStreak || 0),
    [stats.lastVisitDate, stats.dailyStreak]
  );

  const claimDailyReward = useCallback(() => {
    setStats((s) => {
      const reward = computeDailyReward(s.lastVisitDate, s.dailyStreak || 0);
      if (!reward) return s;
      return {
        ...s,
        coins: (s.coins || 0) + reward.amount,
        coinsEarned: (s.coinsEarned || 0) + reward.amount,
        lastVisitDate: todayKey(),
        dailyStreak: reward.streak
      };
    });
  }, []);

  // Counter bumped by useGame whenever a paid hint successfully reveals.
  const recordHintUsed = useCallback(() => {
    setStats((s) => ({ ...s, hintsUsed: (s.hintsUsed || 0) + 1 }));
  }, []);

  // ---------- Pet (Букля) ----------
  // Idempotent: hatching twice is a no-op. The first-ever call stamps bornAt
  // so we can later display "вылупилась N дней назад".
  const hatchPet = useCallback(() => {
    setStats((s) => {
      if (s.pet?.hatched) return s;
      return {
        ...s,
        pet: {
          ...DEFAULT_STATS.pet,
          ...(s.pet || {}),
          hatched: true,
          bornAt: new Date().toISOString()
        }
      };
    });
  }, []);

  const renamePet = useCallback((name) => {
    const clean = (name || '').trim().slice(0, 20);
    if (!clean) return;
    setStats((s) => ({ ...s, pet: { ...(s.pet || DEFAULT_STATS.pet), name: clean } }));
  }, []);

  // Buy a treat → spend coins, add to hunger (capped at 100). Returns:
  //   'ok' | 'not_enough_coins' | 'not_hatched' | 'unknown_treat' | 'full'
  const feedPet = useCallback((treatId) => {
    const treat = getTreat(treatId);
    if (!treat) return 'unknown_treat';
    if (!stats.pet?.hatched) return 'not_hatched';
    if ((reconciled.hunger ?? 0) >= HUNGER_MAX - 0.5) return 'full';
    if ((stats.coins || 0) < treat.price) return 'not_enough_coins';
    setStats((s) => {
      // Apply pending hunger decay first so the gain is honest.
      const r = reconcilePetTimers({
        energy: s.energy,
        lastEnergyTickAt: s.lastEnergyTickAt,
        hunger: s.pet?.hunger,
        lastHungerTickAt: s.pet?.lastHungerTickAt,
        hatched: Boolean(s.pet?.hatched)
      });
      const nextHunger = Math.min(HUNGER_MAX, (r.hunger || 0) + treat.hungerGain);
      return {
        ...s,
        coins: Math.max(0, (s.coins || 0) - treat.price),
        energy: r.energy,
        lastEnergyTickAt: r.lastEnergyTickAt,
        pet: { ...(s.pet || DEFAULT_STATS.pet), hunger: nextHunger, lastHungerTickAt: r.lastHungerTickAt }
      };
    });
    return 'ok';
  }, [stats.coins, stats.pet?.hatched, reconciled.hunger]);

  // Adds XP to the pet, recomputes level. Returns { levelBefore, levelAfter,
  // gained } so the caller can fire a "Букля выросла!" toast on level-up.
  // No-op if the pet hasn't hatched yet — there's nothing to grow.
  const recordPetXp = useCallback((amount) => {
    const cur = stats.pet || DEFAULT_STATS.pet;
    if (!cur.hatched || !amount) return { levelBefore: cur.level || 1, levelAfter: cur.level || 1, gained: 0 };
    const xpBefore = cur.xp || 0;
    const xpAfter = xpBefore + amount;
    const levelBefore = petComputeLevel(xpBefore).level;
    const levelAfter = petComputeLevel(xpAfter).level;
    setStats((s) => {
      const p = s.pet || DEFAULT_STATS.pet;
      const newXp = (p.xp || 0) + amount;
      return { ...s, pet: { ...p, xp: newXp, level: petComputeLevel(newXp).level } };
    });
    return { levelBefore, levelAfter, gained: amount };
  }, [stats.pet]);

  // ---------- Shop ----------
  // buyItem returns one of:
  //   'ok'              — purchase succeeded
  //   'already_owned'   — non-consumable item is already in inventory
  //   'not_enough_coins' — insufficient balance
  //   'unknown_item'    — id doesn't exist in catalog
  const buyItem = useCallback((itemId) => {
    const item = getItem(itemId);
    if (!item) return 'unknown_item';
    const owns = (stats.inventory || []).includes(itemId);
    if (!item.consumable && owns) return 'already_owned';
    if ((stats.coins || 0) < item.price) return 'not_enough_coins';

    setStats((s) => {
      const next = {
        ...s,
        coins: Math.max(0, (s.coins || 0) - item.price),
        itemsBought: (s.itemsBought || 0) + 1
      };
      if (item.consumable) {
        // Consumables don't enter inventory — they flip a flag instead.
        if (item.id === 'boost-double') next.boostDoubleCoins = true;
      } else {
        next.inventory = [...(s.inventory || []), itemId];
        // Auto-equip cosmetic items on first purchase.
        if (item.category === 'background') next.activeBackground = itemId;
        if (item.category === 'cells') next.activeCellStyle = itemId;
      }
      return next;
    });
    return 'ok';
  }, [stats.coins, stats.inventory]);

  const setActiveBackground = useCallback((itemId) => {
    setStats((s) => ({ ...s, activeBackground: itemId || null }));
  }, []);

  const setActiveCellStyle = useCallback((itemId) => {
    setStats((s) => ({ ...s, activeCellStyle: itemId || null }));
  }, []);

  // ---------- Energy ----------
  // Reconciled snapshot — what the UI shows + what consume/buy operate on.
  const effectiveEnergy = reconciled.energy;

  // Apply the reconcile snapshot inside an updater so we never lose pending
  // regen ticks when mutating energy. All energy ops route through this.
  const mutateEnergy = useCallback((delta) => {
    setStats((s) => {
      const r = reconcilePetTimers({
        energy: s.energy,
        lastEnergyTickAt: s.lastEnergyTickAt,
        hunger: s.pet?.hunger,
        lastHungerTickAt: s.pet?.lastHungerTickAt,
        hatched: Boolean(s.pet?.hatched)
      });
      const nextEnergy = Math.max(0, Math.min(ENERGY_MAX, r.energy + delta));
      // If we were full and spent one, lastEnergyTickAt becomes "now" so the
      // regen timer starts cleanly instead of crediting time from earlier.
      const nextTick = (r.energy >= ENERGY_MAX && delta < 0)
        ? new Date().toISOString()
        : r.lastEnergyTickAt;
      return {
        ...s,
        energy: nextEnergy,
        lastEnergyTickAt: nextTick,
        pet: { ...(s.pet || DEFAULT_STATS.pet), hunger: r.hunger, lastHungerTickAt: r.lastHungerTickAt }
      };
    });
  }, []);

  const consumeEnergy = useCallback(() => {
    if (reconciled.energy < 1) return false;
    mutateEnergy(-1);
    return true;
  }, [reconciled.energy, mutateEnergy]);

  const buyEnergy = useCallback(() => {
    if (reconciled.energy >= ENERGY_MAX) return 'full';
    if ((stats.coins || 0) < ENERGY_REFILL_COST) return 'not_enough_coins';
    setStats((s) => ({ ...s, coins: Math.max(0, (s.coins || 0) - ENERGY_REFILL_COST) }));
    mutateEnergy(+1);
    return 'ok';
  }, [reconciled.energy, stats.coins, mutateEnergy]);

  const grantAdEnergy = useCallback(() => {
    mutateEnergy(+ENERGY_AD_REWARD);
  }, [mutateEnergy]);

  return {
    stats,
    recordWin,
    recordLoss,
    reset,
    spendCoins,
    pendingDailyReward,
    claimDailyReward,
    buyItem,
    setActiveBackground,
    setActiveCellStyle,
    energy: effectiveEnergy,
    petHunger: reconciled.hunger,
    lastEnergyTickAt: reconciled.lastEnergyTickAt,
    consumeEnergy,
    buyEnergy,
    grantAdEnergy,
    recordHintUsed,
    hatchPet,
    renamePet,
    recordPetXp,
    feedPet,
    achievementToasts,
    consumeAchievementToast,
    auth
  };
}
