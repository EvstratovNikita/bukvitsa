import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ENERGY_AD_REWARD,
  ENERGY_MAX,
  ENERGY_REFILL_COST,
  MAX_ATTEMPTS,
  STORAGE_KEYS,
  computeDailyReward,
  refillEnergyForToday,
  rewardFor,
  todayKey
} from '../constants/game.js';
import { findNewlyUnlocked, getAchievement } from '../data/achievements.js';
import { getItem } from '../data/shopItems.js';
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
  energy: ENERGY_MAX,      // remaining puzzles for today
  energyDate: null,        // 'YYYY-MM-DD' tagging the day energy was last refilled
  hintsUsed: 0,            // cumulative paid-hint reveals
  itemsBought: 0,          // cumulative shop purchases (both cosmetic + consumable)
  coinsEarned: 0,          // cumulative coins ever credited (never decreases)
  fastestWinMs: null,      // lowest elapsed time across won games
  unlockedAchievements: [], // ids of unlocked achievements
  referralsCount: 0         // verified (non-anon) invitees credited to this user
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
    unlockedAchievements: Array.isArray(raw.unlockedAchievements) ? raw.unlockedAchievements : []
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

  // Auto-refill energy on a new local day. Runs once on mount and any time
  // the stored energyDate changes (e.g. after remote sync pulls in new value).
  useEffect(() => {
    setStats((s) => {
      const r = refillEnergyForToday(s.energyDate, s.energy);
      if (r.energy === s.energy && r.energyDate === s.energyDate) return s;
      return { ...s, ...r };
    });
  }, [stats.energyDate]);

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
  // Effective current energy (after applying today's refill, even if stored
  // state hasn't been updated yet by the useEffect above).
  const effectiveEnergy = useMemo(
    () => refillEnergyForToday(stats.energyDate, stats.energy).energy,
    [stats.energy, stats.energyDate]
  );

  // Attempt to spend 1 energy. Returns true on success, false if depleted.
  // Applies daily refill atomically inside the updater so the check uses the
  // freshest value even across day boundaries.
  const consumeEnergy = useCallback(() => {
    const peek = refillEnergyForToday(stats.energyDate, stats.energy);
    if (peek.energy < 1) return false;
    setStats((s) => {
      const r = refillEnergyForToday(s.energyDate, s.energy);
      if (r.energy < 1) return { ...s, ...r };
      return { ...s, ...r, energy: r.energy - 1 };
    });
    return true;
  }, [stats.energy, stats.energyDate]);

  // Buy a single energy unit for coins. Returns 'ok' | 'full' | 'not_enough_coins'.
  const buyEnergy = useCallback(() => {
    const r = refillEnergyForToday(stats.energyDate, stats.energy);
    if (r.energy >= ENERGY_MAX) return 'full';
    if ((stats.coins || 0) < ENERGY_REFILL_COST) return 'not_enough_coins';
    setStats((s) => {
      const rr = refillEnergyForToday(s.energyDate, s.energy);
      return {
        ...s,
        ...rr,
        energy: Math.min(ENERGY_MAX, rr.energy + 1),
        coins: Math.max(0, (s.coins || 0) - ENERGY_REFILL_COST)
      };
    });
    return 'ok';
  }, [stats.coins, stats.energy, stats.energyDate]);

  // Stub for ad reward. Caller is responsible for actually showing the ad.
  const grantAdEnergy = useCallback(() => {
    setStats((s) => {
      const r = refillEnergyForToday(s.energyDate, s.energy);
      return { ...s, ...r, energy: Math.min(ENERGY_MAX, r.energy + ENERGY_AD_REWARD) };
    });
  }, []);

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
    consumeEnergy,
    buyEnergy,
    grantAdEnergy,
    recordHintUsed,
    achievementToasts,
    consumeAchievementToast,
    auth
  };
}
