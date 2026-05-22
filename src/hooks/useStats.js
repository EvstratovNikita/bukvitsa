import { useCallback, useEffect, useMemo, useState } from 'react';
import { MAX_ATTEMPTS, STORAGE_KEYS, computeDailyReward, rewardFor, todayKey } from '../constants/game.js';
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
  boostDoubleCoins: false // one-shot x2 boost for the next won game
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
    inventory: Array.isArray(raw.inventory) ? raw.inventory : []
  };
}

export function useStats() {
  const [stats, setStats] = useState(load);
  const auth = useAuth();

  useEffect(() => {
    storage.set(STORAGE_KEYS.STATS, stats);
  }, [stats]);

  useRemoteSync({ stats, setStats, userId: auth.userId });

  // Apply the double-coins boost (if armed) when computing the win reward.
  // The current snapshot of stats is captured in the closure so we read the
  // flag synchronously; the boost is consumed inside the setStats updater.
  const recordWin = useCallback((attemptsUsed) => {
    const base = rewardFor(attemptsUsed);
    const boosted = stats.boostDoubleCoins ? base * 2 : base;
    setStats((s) => {
      const dist = s.distribution.slice();
      dist[attemptsUsed - 1] = (dist[attemptsUsed - 1] || 0) + 1;
      const currentStreak = s.currentStreak + 1;
      const earned = s.boostDoubleCoins ? base * 2 : base;
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
        distribution: dist,
        boostDoubleCoins: false
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
        lastVisitDate: todayKey(),
        dailyStreak: reward.streak
      };
    });
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
        coins: Math.max(0, (s.coins || 0) - item.price)
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
    auth
  };
}
