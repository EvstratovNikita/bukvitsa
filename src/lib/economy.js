import { supabase, isSupabaseConfigured } from './supabase.js';

// Translate a server RPC jsonb result into a partial client-stats patch.
// Only keys present in the result are mapped, so each RPC reconciles exactly
// the authoritative columns it touched and leaves everything else alone.
export function serverPatch(result) {
  if (!result || result.ok === false) return null;
  const has = (k) => Object.prototype.hasOwnProperty.call(result, k);
  const p = {};
  if (has('coins')) p.coins = result.coins;
  if (has('coins_earned')) p.coinsEarned = result.coins_earned;
  if (has('energy')) p.energy = result.energy;
  if (has('last_energy_tick_at')) p.lastEnergyTickAt = result.last_energy_tick_at || undefined;
  if (has('pet') && result.pet && typeof result.pet === 'object') p.pet = result.pet;
  if (has('inventory') && Array.isArray(result.inventory)) p.inventory = result.inventory;
  if (has('active_background')) p.activeBackground = result.active_background || null;
  if (has('active_cell_style')) p.activeCellStyle = result.active_cell_style || null;
  if (has('boost_double_until')) p.boostDoubleUntil = result.boost_double_until || null;
  if (has('energy_cap_until')) p.energyCapUntil = result.energy_cap_until || null;
  if (has('ad_bonus_left')) p.adBonusLeft = result.ad_bonus_left;
  if (has('hints_used')) p.hintsUsed = result.hints_used;
  if (has('daily') && result.daily && typeof result.daily === 'object') p.daily = result.daily;
  if (has('alt_mode') && result.alt_mode && typeof result.alt_mode === 'object') p.altMode = result.alt_mode;
  if (has('ads_double') && result.ads_double && typeof result.ads_double === 'object') p.adsDouble = result.ads_double;
  if (has('ads_energy') && result.ads_energy && typeof result.ads_energy === 'object') p.adEnergy = result.ads_energy;
  if (has('distribution') && Array.isArray(result.distribution)) p.distribution = result.distribution;
  // claim_daily_login returns the new login streak under `streak`.
  if (has('streak')) p.dailyStreak = result.streak;
  return p;
}

// Fire a SECURITY DEFINER economy RPC. Returns the parsed jsonb result, or
// null when Supabase isn't configured / the call failed (offline → the local
// optimistic state stands until the next session reconcile).
export async function callRpc(name, args) {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc(name, args || {});
    if (error) {
      console.warn(`[rpc ${name}] ${error.message}`);
      return null;
    }
    return data;
  } catch (e) {
    console.warn(`[rpc ${name}] ${e?.message || e}`);
    return null;
  }
}
