import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const DEBOUNCE_MS = 700;

const toRow = (stats, userId) => ({
  user_id: userId,
  played: stats.played || 0,
  won: stats.won || 0,
  lost: stats.lost || 0,
  current_streak: stats.currentStreak || 0,
  max_streak: stats.maxStreak || 0,
  total_guesses: stats.totalGuesses || 0,
  best_attempts: stats.bestAttempts ?? null,
  distribution: stats.distribution || [0, 0, 0, 0, 0, 0],
  coins: stats.coins || 0,
  last_visit_date: stats.lastVisitDate || null,
  daily_streak: stats.dailyStreak || 0,
  inventory: stats.inventory || [],
  active_background: stats.activeBackground || null,
  active_cell_style: stats.activeCellStyle || null,
  boost_double_coins: Boolean(stats.boostDoubleCoins),
  boost_double_until: stats.boostDoubleUntil || null,
  energy_cap_until: stats.energyCapUntil || null,
  ad_bonus_left: Number.isFinite(stats.adBonusLeft) ? stats.adBonusLeft : 0,
  energy: Number.isFinite(stats.energy) ? stats.energy : null,
  last_energy_tick_at: stats.lastEnergyTickAt || null,
  hints_used: stats.hintsUsed || 0,
  items_bought: stats.itemsBought || 0,
  coins_earned: stats.coinsEarned || 0,
  fastest_win_ms: stats.fastestWinMs ?? null,
  unlocked_achievements: Array.isArray(stats.unlockedAchievements) ? stats.unlockedAchievements : [],
  referrals_count: stats.referralsCount || 0,
  pet: stats.pet || null,
  prefs: stats.prefs || null,
  daily: stats.daily || null,
  alt_mode: stats.altMode || null
});

const fromRow = (row) => clean({
  played: row.played || 0,
  won: row.won || 0,
  lost: row.lost || 0,
  currentStreak: row.current_streak || 0,
  maxStreak: row.max_streak || 0,
  totalGuesses: row.total_guesses || 0,
  bestAttempts: row.best_attempts,
  distribution: Array.isArray(row.distribution) ? row.distribution : [0, 0, 0, 0, 0, 0],
  coins: row.coins || 0,
  lastVisitDate: row.last_visit_date || null,
  dailyStreak: row.daily_streak || 0,
  inventory: Array.isArray(row.inventory) ? row.inventory : [],
  activeBackground: row.active_background || null,
  activeCellStyle: row.active_cell_style || null,
  boostDoubleCoins: Boolean(row.boost_double_coins),
  boostDoubleUntil: row.boost_double_until || undefined,
  energyCapUntil: row.energy_cap_until || undefined,
  adBonusLeft: Number.isFinite(row.ad_bonus_left) ? row.ad_bonus_left : undefined,
  energy: Number.isFinite(row.energy) ? row.energy : undefined,
  lastEnergyTickAt: row.last_energy_tick_at || undefined,
  hintsUsed: Number.isFinite(row.hints_used) ? row.hints_used : undefined,
  itemsBought: Number.isFinite(row.items_bought) ? row.items_bought : undefined,
  coinsEarned: Number.isFinite(row.coins_earned) ? row.coins_earned : undefined,
  fastestWinMs: Number.isFinite(row.fastest_win_ms) ? row.fastest_win_ms : undefined,
  unlockedAchievements: Array.isArray(row.unlocked_achievements) ? row.unlocked_achievements : undefined,
  referralsCount: Number.isFinite(row.referrals_count) ? row.referrals_count : undefined,
  pet: row.pet && typeof row.pet === 'object' ? row.pet : undefined,
  prefs: row.prefs && typeof row.prefs === 'object' ? row.prefs : undefined,
  daily: row.daily && typeof row.daily === 'object' ? row.daily : undefined,
  altMode: row.alt_mode && typeof row.alt_mode === 'object' ? row.alt_mode : undefined
});

// Strip keys whose value is `undefined` so a spread merge into local state
// doesn't accidentally clobber an existing local field with `undefined`.
function clean(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// Heuristic: does the local snapshot contain progress worth pushing if the
// server row is brand-new?
const hasLocalProgress = (s) =>
  (s.played || 0) > 0 ||
  (s.coins || 0) > 0 ||
  (s.dailyStreak || 0) > 0 ||
  Boolean(s.lastVisitDate) ||
  (Array.isArray(s.inventory) && s.inventory.length > 0);

const hasServerProgress = (row) =>
  (row.played || 0) > 0 ||
  (row.coins || 0) > 0 ||
  (row.daily_streak || 0) > 0 ||
  Boolean(row.last_visit_date) ||
  (Array.isArray(row.inventory) && row.inventory.length > 0);

/**
 * Bridges a useState stats object to a Supabase row.
 *
 * - On userId ready: fetches server row. If server is fresh and local has
 *   progress, pushes local up. Otherwise overwrites local with server.
 * - On subsequent local changes: debounced upsert to server.
 *
 * Returns { synced, error }. The hook is a no-op when Supabase isn't
 * configured (offline-only mode) — local state remains source of truth.
 */
export function useRemoteSync({ stats, setStats, userId }) {
  const syncedRef = useRef(false);
  const errorRef = useRef(null);
  const debounceRef = useRef(null);

  // Initial reconcile when user becomes available.
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        errorRef.current = error;
        console.warn('[remote-sync] fetch failed', error.message);
        return;
      }

      if (!data) {
        // Row absent — trigger usually creates one. Insert manually.
        const row = toRow(stats, userId);
        const { error: insErr } = await supabase
          .from('user_stats')
          .upsert(row, { onConflict: 'user_id' });
        if (insErr) {
          console.warn('[remote-sync] insert failed', insErr.message);
        }
        syncedRef.current = true;
        return;
      }

      if (hasServerProgress(data)) {
        // Server is source of truth; overwrite local.
        setStats((s) => ({ ...s, ...fromRow(data) }));
      } else if (hasLocalProgress(stats)) {
        // Migrate local → server (first time the user authenticates).
        const row = toRow(stats, userId);
        const { error: upErr } = await supabase
          .from('user_stats')
          .upsert(row, { onConflict: 'user_id' });
        if (upErr) {
          console.warn('[remote-sync] migrate failed', upErr.message);
        }
      }

      syncedRef.current = true;
    })();

    return () => { active = false; };
    // We intentionally only depend on userId — we want the reconcile to run
    // once per session, not on every stats change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Debounced upsert on local mutations after initial sync.
  useEffect(() => {
    if (!isSupabaseConfigured || !userId || !syncedRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('user_stats')
        .upsert(toRow(stats, userId), { onConflict: 'user_id' });
      if (error) {
        console.warn('[remote-sync] upsert failed', error.message);
        errorRef.current = error;
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [stats, userId]);

  return { synced: syncedRef.current, error: errorRef.current };
}
