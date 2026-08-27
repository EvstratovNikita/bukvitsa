import { useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { callRpc } from '../lib/economy.js';
import { mergeGiftProgress } from '../utils/petBond.js';

const DEBOUNCE_MS = 700;

// Anti-cheat cutover: every reward/economy column (coins, won, energy,
// inventory, pet rewards, achievements, boosts, daily, …) is owned by the
// SECURITY DEFINER RPCs and reconciled into local state from their results.
// `fromRow` below still reads the full row, so reloads pull the server's
// truth back in.
//
// Косметика — фон, стиль клеток и prefs (тема, обои по темам, коллекция
// подарков) — остаётся клиент-авторитетной, но и её писать напрямую нельзя:
// REVOKE лёг на всю таблицу, и upsert возвращал 42501 permission denied. Из-за
// этого выбранный фон и тема вообще не доезжали до сервера и терялись на новом
// устройстве. Идём тем же путём, что и экономика, — через функцию, которая
// трогает ровно эти три колонки. SQL: supabase/save_cosmetics.sql.
const cosmeticsArgs = (stats) => ({
  p_active_background: stats.activeBackground || null,
  p_active_cell_style: stats.activeCellStyle || null,
  p_prefs: stats.prefs || null
});

// Ключ для сравнения: сохраняем, только когда изменилась сама косметика, а не
// любой чих в статистике (раньше запрос уходил на каждую мутацию).
const cosmeticsKey = (stats) => JSON.stringify(cosmeticsArgs(stats));

// Та же косметика, но как она сейчас лежит на сервере. Дебаунс сравнивается
// именно с ней, поэтому местный выбор, отличный от серверного, уезжает наверх
// сам — а совпадающий не порождает лишнего запроса.
const rowCosmeticsKey = (row) => cosmeticsKey({
  activeBackground: row.active_background || null,
  activeCellStyle: row.active_cell_style || null,
  prefs: (row.prefs && typeof row.prefs === 'object') ? row.prefs : null
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
  altMode: row.alt_mode && typeof row.alt_mode === 'object' ? row.alt_mode : undefined,
  adsDouble: row.ads_double && typeof row.ads_double === 'object' ? row.ads_double : undefined
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
 * - `hasLocalSnapshot` tells the hook whether this device already had saved
 *   stats when the session started; it decides who owns the cosmetics.
 * - On subsequent local changes: debounced save_cosmetics push.
 *
 * Returns { synced, error }. The hook is a no-op when Supabase isn't
 * configured (offline-only mode) — local state remains source of truth.
 */
export function useRemoteSync({ stats, setStats, userId, enabled = true, hasLocalSnapshot = true }) {
  const syncedRef = useRef(false);
  const errorRef = useRef(null);
  const debounceRef = useRef(null);
  // Последняя косметика, доехавшая до сервера.
  const lastSavedRef = useRef(null);
  // Stateful mirror of syncedRef so consumers re-render once the initial
  // server reconcile lands. The game uses this to avoid acting on stale local
  // state (e.g. re-offering the daily / login reward) before the server's
  // truth is in. Settles to `true` in every completion path, including errors.
  const [synced, setSyncedState] = useState(false);
  const markSynced = () => { syncedRef.current = true; setSyncedState(true); };

  // Initial reconcile when user becomes available.
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !userId) return;
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
        // Don't strand the game waiting on a failed sync — fall back to local.
        markSynced();
        return;
      }

      if (!data) {
        // Row absent — trigger usually creates one. Заводим через функцию:
        // она делает upsert по своему user_id.
        await callRpc('save_cosmetics', cosmeticsArgs(stats));
        lastSavedRef.current = cosmeticsKey(stats);
        markSynced();
        return;
      }

      if (hasServerProgress(data)) {
        // Server is source of truth for progress/economy; overwrite local with
        // its values. BUT the cosmetic preferences (theme, active background,
        // active cell style) are CLIENT-authoritative — anonymous auth can hand
        // us `userId` only after the user has already toggled the theme, and a
        // blind pull would clobber that local choice with a stale server value
        // (then the debounced save would persist the stale one). Keep local
        // for these three; the save below pushes them back up to the server.
        //
        // Исключение — чистая установка (нового устройства или после очистки
        // localStorage): местной косметики просто нет, есть только дефолты, и
        // «клиент главнее» означало бы потерю купленного фона и темы, а следом
        // и затирание их на сервере пустыми значениями. Здесь забираем
        // серверные — ровно ради этого косметика и синкается.
        const adoptServer = !hasLocalSnapshot;
        setStats((s) => {
          const serverPrefs = (data.prefs && typeof data.prefs === 'object') ? data.prefs : {};
          const merged = mergeGiftProgress(
            s.prefs?.petGifts, s.prefs?.petBond,
            serverPrefs.petGifts, serverPrefs.petBond
          );
          return {
            ...s,
            ...fromRow(data),
            // prefs остаются клиент-авторитетными (фикс слёта темы), но
            // коллекция подарков и bond мёржатся, чтобы не теряться на новом
            // устройстве / после очистки localStorage.
            prefs: {
              // На чистой установке серверные настройки ложатся поверх
              // дефолтов, а не вместо них: в старых строках prefs может не
              // быть темы или bgByTheme, и тогда дефолт остаётся на месте.
              ...(s.prefs || {}),
              ...(adoptServer ? serverPrefs : {}),
              petGifts: merged.petGifts,
              petBond: merged.petBond
            },
            activeBackground: adoptServer ? (data.active_background || null) : s.activeBackground,
            activeCellStyle: adoptServer ? (data.active_cell_style || null) : s.activeCellStyle
          };
        });
        // Считаем сохранённым то, что реально лежит на сервере: если местная
        // косметика от неё отличается (вернувшееся устройство), дебаунс ниже
        // сам её отправит.
        lastSavedRef.current = rowCosmeticsKey(data);
        markSynced();
        return;
      }

      if (hasLocalProgress(stats)) {
        // Первый вход в аккаунт при пустой серверной строке: переносим наверх
        // косметику. Экономику клиент перенести не может и не должен — она
        // набирается заново через серверные RPC.
        await callRpc('save_cosmetics', cosmeticsArgs(stats));
      }

      // Пометка «уже сохранено»: иначе дебаунс ниже сразу отправил бы то же
      // самое ещё раз, только что подтянутое с сервера.
      lastSavedRef.current = cosmeticsKey(stats);
      markSynced();
    })();

    return () => { active = false; };
    // We intentionally only depend on userId — we want the reconcile to run
    // once per session, not on every stats change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, enabled]);

  // Debounced cosmetics save on local mutations after initial sync.
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !userId || !syncedRef.current) return;
    const key = cosmeticsKey(stats);
    if (key === lastSavedRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const r = await callRpc('save_cosmetics', cosmeticsArgs(stats));
      // callRpc гасит ошибку в null и уже пишет её в консоль. Помечаем
      // сохранённым только при успехе, иначе следующая правка попробует снова.
      if (r && r.ok !== false) lastSavedRef.current = key;
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [stats, userId, enabled]);

  // Offline-only mode (no Supabase): there's nothing to wait for — treat as
  // synced so the game can start immediately on local state.
  return { synced: isSupabaseConfigured ? synced : true, error: errorRef.current };
}
