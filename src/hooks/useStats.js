import { useCallback, useEffect, useMemo, useState } from 'react';
import { MAX_ATTEMPTS, STORAGE_KEYS, computeDailyReward, rewardFor, todayKey } from '../constants/game.js';
import { storage } from '../utils/storage.js';

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
  dailyStreak: 0          // current consecutive-days counter (1..6)
};

function load() {
  const raw = storage.get(STORAGE_KEYS.STATS, null);
  if (!raw) return DEFAULT_STATS;
  return {
    ...DEFAULT_STATS,
    ...raw,
    distribution: Array.isArray(raw.distribution) && raw.distribution.length === MAX_ATTEMPTS
      ? raw.distribution
      : DEFAULT_STATS.distribution
  };
}

export function useStats() {
  const [stats, setStats] = useState(load);

  useEffect(() => {
    storage.set(STORAGE_KEYS.STATS, stats);
  }, [stats]);

  const recordWin = useCallback((attemptsUsed) => {
    const earned = rewardFor(attemptsUsed);
    setStats((s) => {
      const dist = s.distribution.slice();
      dist[attemptsUsed - 1] = (dist[attemptsUsed - 1] || 0) + 1;
      const currentStreak = s.currentStreak + 1;
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
        distribution: dist
      };
    });
    return earned;
  }, []);

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

  return {
    stats,
    recordWin,
    recordLoss,
    reset,
    spendCoins,
    pendingDailyReward,
    claimDailyReward
  };
}
