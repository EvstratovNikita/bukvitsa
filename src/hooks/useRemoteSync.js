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
  boost_double_coins: Boolean(stats.boostDoubleCoins)
});

const fromRow = (row) => ({
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
  boostDoubleCoins: Boolean(row.boost_double_coins)
});

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
