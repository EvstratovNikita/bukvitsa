import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AD_COIN_BONUS,
  AD_COIN_BONUS_USES,
  ADS_DOUBLE_PER_DAY,
  ADS_ENERGY_PER_DAY,
  BOOST_DOUBLE_MS,
  BOOST_ENERGY_CAP_MS,
  ENERGY_AD_REWARD,
  ENERGY_MAX,
  ENERGY_REFILL_COST,
  HUNGER_MAX,
  MAX_ATTEMPTS,
  STORAGE_KEYS,
  computeDailyReward,
  doubleCoinsActive,
  energyCapFor,
  energySpeedFromHunger,
  petComputeLevel,
  reconcilePetTimers,
  rewardFor,
  todayKey
} from '../constants/game.js';
import { findNewlyUnlocked, getAchievement } from '../data/achievements.js';
import { getItem } from '../data/shopItems.js';
import { getDecoration, equippedDecorationsBonus, WING_KEYS } from '../data/petDecorations.js';
import { getTreat } from '../data/petTreats.js';
import { reconcileBond, BOND_PER_GIFT } from '../utils/petBond.js';
import { GIFT_IDS, nextUnclaimedGiftId } from '../data/petGifts.js';
import { storage } from '../utils/storage.js';
import { callRpc, serverPatch } from '../lib/economy.js';
import { isYandex } from '../lib/yandex.js';
import { useAuth } from './useAuth.js';
import { useRemoteSync } from './useRemoteSync.js';
import { useYandexSync } from './useYandexSync.js';

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
  boostDoubleCoins: false, // legacy one-shot flag (kept for back-compat)
  boostDoubleUntil: null,  // ISO — double coins active while now < this
  energyCapUntil: null,    // ISO — energy ceiling is 7 while now < this
  adBonusLeft: 0,          // remaining ad views that grant +3 bonus coins
  energy: ENERGY_MAX,           // current units; regens over time
  lastEnergyTickAt: null,       // ISO of last reconciliation
  hintsUsed: 0,            // cumulative paid-hint reveals
  itemsBought: 0,          // cumulative shop purchases (both cosmetic + consumable)
  coinsEarned: 0,          // cumulative coins ever credited (never decreases)
  fastestWinMs: null,      // lowest elapsed time across won games
  unlockedAchievements: [], // ids of unlocked achievements
  referralsCount: 0,        // verified (non-anon) invitees credited to this user
  prefs: {
    theme: 'dark',          // 'dark' | 'light'
    enterOnLeft: false,     // false = [BACK,...,ENTER]; true = [ENTER,...,BACK]
    petBond: 0,             // привязанность к питомцу (0..BOND_PER_GIFT)
    petBondTickAt: null,    // ISO якоря последнего пересчёта bond
    petGifts: []            // id уже полученных подарков (по порядку)
  },
  daily: {
    lastPlayedKey: null,    // 'YYYY-MM-DD' of the most recent daily attempt
    lastResult: null,       // { won, attempts, evaluations, word, dayN }
    streak: 0,              // consecutive winning days
    maxStreak: 0,
    gamesPlayed: 0,
    gamesWon: 0
  },
  altMode: {
    // 4 + 6-letter mode tally. Every 5 finished plays grants +1 energy
    // (capped at 3 grants per local day). All counters reset at midnight.
    dayKey: null,           // 'YYYY-MM-DD' of last counted play
    plays: 0,               // plays since the last energy grant
    energyGranted: 0        // grants made today (≤ 3)
  },
  adsDouble: {
    // "Double reward via ad" daily counter — soft cap, resets at midnight.
    dayKey: null,           // 'YYYY-MM-DD' of last counted double
    count: 0                // doubles used today
  },
  adEnergy: {
    // "Watch ad → +1 energy" daily counter — caps free ad-energy per day.
    dayKey: null,
    count: 0
  },
  // Companion pet (Букля the owlet). Lightweight JSON blob; new fields
  // (xp, hunger, mood, equipped) get appended as the pet feature grows.
  pet: {
    hatched: false,
    name: 'Букля',
    species: 'owl',
    bornAt: null,           // ISO date when the egg cracked
    xp: 0,                  // cumulative; level derived via petComputeLevel
    level: 1,
    hunger: 0,              // starts empty — player must feed to earn the bonus
    lastHungerTickAt: null, // ISO of last hunger decay reconciliation
    ownedDecorations: [],   // ids of bought decorations (Порадовать tab)
    equipped: {},           // { [slot]: decorationId } — one item per slot
    lastTrainAt: {}         // { [miniGameId]: ISO } — local-day cooldown per game
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
    pet: migratePet(raw.pet),
    prefs: { ...DEFAULT_STATS.prefs, ...(raw.prefs || {}) },
    altMode: { ...DEFAULT_STATS.altMode, ...(raw.altMode || {}) },
    adsDouble: { ...DEFAULT_STATS.adsDouble, ...(raw.adsDouble || {}) },
    adEnergy: { ...DEFAULT_STATS.adEnergy, ...(raw.adEnergy || {}) },
    // Bootstrap regen anchor — otherwise reconcile reads lastE=now on every
    // render and elapsed stays 0 forever (the bug: energy stuck at 0/5).
    lastEnergyTickAt: raw.lastEnergyTickAt || ((raw.energy ?? ENERGY_MAX) < ENERGY_MAX ? new Date().toISOString() : null)
  };
}

function migratePet(rawPet) {
  const merged = { ...DEFAULT_STATS.pet, ...(rawPet || {}) };
  // Legacy single-slot field → slotted equipped map.
  if (merged.activeDecoration && (!merged.equipped || Object.keys(merged.equipped).length === 0)) {
    const d = getDecoration(merged.activeDecoration);
    if (d) merged.equipped = { [d.slot === 'wing' ? 'wingL' : d.slot]: merged.activeDecoration };
  }
  delete merged.activeDecoration;
  if (!merged.equipped || typeof merged.equipped !== 'object') merged.equipped = {};
  // Migrate retired 'accessory' slot → wingL.
  if (merged.equipped.accessory) {
    if (!merged.equipped.wingL) merged.equipped.wingL = merged.equipped.accessory;
    delete merged.equipped.accessory;
  }
  // Retired 'neck' slot → just drop; its items are renamed (brooch slot now)
  // and were rendered as collar-wraps that the user didn't like.
  if (merged.equipped.neck) delete merged.equipped.neck;
  // Drop stale ids that no longer exist in the catalog (e.g. removed goggles).
  for (const k of Object.keys(merged.equipped)) {
    if (!getDecoration(merged.equipped[k])) delete merged.equipped[k];
  }
  if (!Array.isArray(merged.ownedDecorations)) merged.ownedDecorations = [];
  merged.ownedDecorations = merged.ownedDecorations.filter((id) => getDecoration(id));
  if (!merged.lastTrainAt || typeof merged.lastTrainAt !== 'object') merged.lastTrainAt = {};
  return merged;
}

export function useStats() {
  const [stats, setStats] = useState(load);
  const [achievementToasts, setAchievementToasts] = useState([]);
  const auth = useAuth();

  useEffect(() => {
    storage.set(STORAGE_KEYS.STATS, stats);
  }, [stats]);

  // Persistence backend depends on platform: Supabase on the web, the Yandex
  // player cloud (multidevice) inside Yandex Games. Only one is active.
  const remote = useRemoteSync({ stats, setStats, userId: auth.userId, enabled: !isYandex });
  const yandex = useYandexSync({ stats, setStats, enabled: isYandex });
  // Fallback so the game ALWAYS becomes playable: if the server reconcile
  // doesn't settle quickly (e.g. anonymous sign-in is blocked/slow inside the
  // Yandex iframe, so userId never arrives and `synced` never flips), start on
  // local state anyway. Without this the first-puzzle pick stays gated forever
  // and the board is blank / unтypeable until a mode switch.
  const [readyFallback, setReadyFallback] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReadyFallback(true), 2500);
    return () => clearTimeout(t);
  }, []);
  // True once the active backend's initial load has settled (or the fallback
  // fired). The game waits for this before deciding whether to offer the daily
  // word / login reward, so it never acts on stale local state.
  const ready = (isYandex ? yandex.synced : remote.synced) || readyFallback;

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
  // Active energy ceiling — 7 while the cap boost is live, else 5.
  const energyMax = useMemo(() => energyCapFor(stats, nowMs), [stats.energyCapUntil, nowMs]);

  const reconciled = useMemo(() => reconcilePetTimers({
    energy: stats.energy,
    lastEnergyTickAt: stats.lastEnergyTickAt,
    hunger: stats.pet?.hunger,
    lastHungerTickAt: stats.pet?.lastHungerTickAt,
    hatched: Boolean(stats.pet?.hatched),
    maxEnergy: energyMax,
    nowMs
  }), [stats.energy, stats.lastEnergyTickAt, stats.pet?.hunger, stats.pet?.lastHungerTickAt, stats.pet?.hatched, energyMax, nowMs]);

  // Persist when integer energy crosses a unit boundary. This keeps the
  // displayed value durable across reloads and avoids divergence between
  // the reconciled snapshot (used for display) and the stored snapshot
  // (used to seed the next reconcile cycle). We watch only the integer to
  // skip writes for the continuous hunger float.
  useEffect(() => {
    if (reconciled.energy === stats.energy) return;
    setStats((s) => ({
      ...s,
      energy: reconciled.energy,
      lastEnergyTickAt: reconciled.lastEnergyTickAt,
      pet: {
        ...(s.pet || DEFAULT_STATS.pet),
        hunger: reconciled.hunger,
        lastHungerTickAt: reconciled.lastHungerTickAt
      }
    }));
  }, [reconciled.energy, stats.energy]);

  // ---------- Pet bond (привязанность) ----------
  // Есть ли ещё несобранные подарки — иначе bond заморожен.
  const giftsLeft = (stats.prefs?.petGifts?.length || 0) < GIFT_IDS.length;

  // Живой пересчёт bond (как energy/hunger). Источник истины для отображения и
  // готовности подарка; в prefs флашится лениво (см. эффект ниже).
  const reconciledBond = useMemo(() => reconcileBond({
    bond: stats.prefs?.petBond,
    bondTickAt: stats.prefs?.petBondTickAt,
    hunger: stats.pet?.hunger,
    hungerTickAt: stats.pet?.lastHungerTickAt,
    now: nowMs,
    hasGiftsLeft: giftsLeft
  }), [stats.prefs?.petBond, stats.prefs?.petBondTickAt, stats.pet?.hunger, stats.pet?.lastHungerTickAt, nowMs, giftsLeft]);

  // Флашим bond в prefs, когда целое число очков изменилось ИЛИ якорь ещё не
  // инициализирован. Дробный bond не флашим каждый тик. Только после вылупления.
  useEffect(() => {
    if (!stats.pet?.hatched) return;
    const storedBond = stats.prefs?.petBond || 0;
    const integerChanged = Math.floor(reconciledBond.bond) !== Math.floor(storedBond);
    const needsAnchor = !stats.prefs?.petBondTickAt;
    if (!integerChanged && !needsAnchor) return;
    setStats((s) => ({
      ...s,
      prefs: {
        ...(s.prefs || DEFAULT_STATS.prefs),
        petBond: reconciledBond.bond,
        petBondTickAt: reconciledBond.bondTickAt
      }
    }));
  }, [reconciledBond.bond, reconciledBond.bondTickAt, stats.prefs?.petBond, stats.prefs?.petBondTickAt, stats.pet?.hatched]);

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

  // ---------- Server reconcile (anti-cheat economy) ----------
  // The server is authoritative for every reward column. Each mutating action
  // updates local state optimistically (instant UI + offline) AND fires its
  // SECURITY DEFINER RPC; when the RPC answers, we overwrite the affected
  // fields with the server's values. On reload useRemoteSync pulls the full
  // server row, so any drift self-heals.
  const reconcile = useCallback((result) => {
    const p = serverPatch(result);
    if (!p) return;
    setStats((s) => {
      const next = { ...s, ...p };
      // The server omits the answer word from daily.lastResult (it's only used
      // client-side for the share card) — keep the local copy if present.
      if (p.daily && p.daily.lastResult && !p.daily.lastResult.word && s.daily?.lastResult?.word) {
        next.daily = { ...p.daily, lastResult: { ...p.daily.lastResult, word: s.daily.lastResult.word } };
      }
      return next;
    });
  }, []);

  // Fire an economy RPC, reconcile authoritative fields, then ask the server
  // to (re)compute achievements and reconcile the coin total it credits. The
  // achievement toasts themselves are still produced by the local detector
  // effect above — here we only trust the server for the coin balance.
  const runEconomy = useCallback(async (name, args, { recompute = true } = {}) => {
    const r = await callRpc(name, args);
    reconcile(r);
    if (recompute && r && r.ok !== false) {
      const a = await callRpc('recompute_achievements');
      if (a && a.ok !== false && typeof a.coins === 'number') {
        setStats((s) => ({ ...s, coins: a.coins }));
      }
    }
    return r;
  }, [reconcile]);


  // Apply the double-coins boost (if armed) when computing the win reward.
  // The current snapshot of stats is captured in the closure so we read the
  // flag synchronously; the boost is consumed inside the setStats updater.
  const recordWin = useCallback((attemptsUsed, elapsedMs, lengthMul = 1, creditCoins = true) => {
    // Compose the win reward: base × lengthMul × (1 + deco%) × (boost ? 2 : 1).
    // lengthMul lets non-5-letter modes pay out a fraction of the canonical
    // reward (currently 0.5 for the 4/6 modes). creditCoins=false skips the
    // coin credit entirely — 4/6 modes don't pay coins, only XP via callers.
    const base = Math.round(rewardFor(attemptsUsed) * lengthMul);
    const decoCoins = equippedDecorationsBonus(stats.pet);
    // Double-coins is now a time-based boost (1 day) — never consumed on win.
    const boostMul = doubleCoinsActive(stats) ? 2 : 1;
    // Flat deco coins are added to base, then the whole total is doubled by
    // the boost (so the boost is worth it for a decorated player).
    const boosted = Math.round((base + decoCoins) * boostMul);
    setStats((s) => {
      const dist = s.distribution.slice();
      dist[attemptsUsed - 1] = (dist[attemptsUsed - 1] || 0) + 1;
      const currentStreak = s.currentStreak + 1;
      const dCoins = equippedDecorationsBonus(s.pet);
      const bMul = doubleCoinsActive(s) ? 2 : 1;
      const earned = creditCoins ? Math.round((base + dCoins) * bMul) : 0;
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
        fastestWinMs: nextFast
      };
    });
    return creditCoins ? boosted : 0;
  }, [stats.boostDoubleUntil, stats.pet?.equipped]);

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
      // Energy bonus is reconciled inline (caps at ENERGY_MAX, refreshes
      // lastEnergyTickAt so regen starts from now if we topped off).
      const cap = energyCapFor(s);
      const r = reconcilePetTimers({
        energy: s.energy,
        lastEnergyTickAt: s.lastEnergyTickAt,
        hunger: s.pet?.hunger,
        lastHungerTickAt: s.pet?.lastHungerTickAt,
        hatched: Boolean(s.pet?.hatched),
        maxEnergy: cap
      });
      // Daily streak energy is an earned bonus — allowed to overfill above cap.
      const nextEnergy = reward.energy > 0 ? (r.energy + reward.energy) : r.energy;
      const nextTick = (reward.energy > 0 && nextEnergy >= cap)
        ? new Date().toISOString()
        : r.lastEnergyTickAt;
      return {
        ...s,
        coins: (s.coins || 0) + reward.amount,
        coinsEarned: (s.coinsEarned || 0) + reward.amount,
        lastVisitDate: todayKey(),
        dailyStreak: reward.streak,
        energy: nextEnergy,
        lastEnergyTickAt: nextTick
      };
    });
    // Server is authoritative: it computes streak/reward/energy from its own
    // clock (Europe/Moscow) and reconciles back over the optimistic values.
    runEconomy('claim_daily_login', {});
  }, [runEconomy]);

  // Record the outcome of a daily-mode round. Only the first attempt per
  // local calendar day counts. Streak increments on win, resets on loss.
  const recordDailyResult = useCallback(({ key, dayN, won, attempts, evaluations, word }) => {
    setStats((s) => {
      const prev = s.daily || DEFAULT_STATS.daily;
      if (prev.lastPlayedKey === key) return s; // idempotent
      const prevKey = prev.lastPlayedKey;
      // Streak continues only if yesterday's daily was also a win.
      const yest = (() => {
        const d = new Date(key + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })();
      const continuing = won && prevKey === yest && (prev.lastResult?.won === true);
      const nextStreak = won ? (continuing ? prev.streak + 1 : 1) : 0;
      return {
        ...s,
        daily: {
          lastPlayedKey: key,
          lastResult: { won, attempts, evaluations, word, dayN },
          streak: nextStreak,
          maxStreak: Math.max(prev.maxStreak || 0, nextStreak),
          gamesPlayed: (prev.gamesPlayed || 0) + 1,
          gamesWon: (prev.gamesWon || 0) + (won ? 1 : 0)
        }
      };
    });
  }, []);

  // Patch the user preferences object — { theme, enterOnLeft }.
  const setPref = useCallback((key, value) => {
    setStats((s) => ({
      ...s,
      prefs: { ...(s.prefs || DEFAULT_STATS.prefs), [key]: value }
    }));
  }, []);

  // Apply the current theme to the document root so CSS can branch on
  // [data-theme="light"]. Idempotent.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const t = stats.prefs?.theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
  }, [stats.prefs?.theme]);

  // Generic coin credit — used by the "double via ad" win bonus etc.
  // Mirrors the bookkeeping recordWin does (coinsEarned tracks cumulative).
  const addCoins = useCallback((amount) => {
    if (!amount || amount <= 0) return;
    setStats((s) => ({
      ...s,
      coins: (s.coins || 0) + amount,
      coinsEarned: (s.coinsEarned || 0) + amount
    }));
  }, []);

  // Counter bumped by useGame whenever a paid hint successfully reveals.
  const recordHintUsed = useCallback(() => {
    setStats((s) => ({ ...s, hintsUsed: (s.hintsUsed || 0) + 1 }));
  }, []);

  // ---------- Pet (Букля) ----------
  // Idempotent: hatching twice is a no-op. The first-ever call stamps bornAt
  // so we can later display "вылупилась N дней назад".
  const hatchPet = useCallback(() => {
    if (stats.pet?.hatched) return;
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
    runEconomy('set_pet_cosmetic', { p_hatched: true });
  }, [stats.pet?.hatched, runEconomy]);

  const renamePet = useCallback((name) => {
    const clean = (name || '').trim().slice(0, 20);
    if (!clean) return;
    setStats((s) => ({ ...s, pet: { ...(s.pet || DEFAULT_STATS.pet), name: clean } }));
    runEconomy('set_pet_cosmetic', { p_name: clean }, { recompute: false });
  }, [runEconomy]);

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
      // Feeding raises hunger → a faster energy-regen speed. Re-anchor the
      // energy tick so the progress already accrued toward the next unit keeps
      // the SAME fraction under the new (faster) speed. Without this, the next
      // reconcile would re-divide the elapsed time by the now-shorter interval
      // and retroactively grant energy / shrink the timer the instant you feed.
      let nextTick = r.lastEnergyTickAt;
      const cap = energyCapFor(s);
      if (r.energy < cap && r.lastEnergyTickAt) {
        const oldSpeed = energySpeedFromHunger(r.hunger);
        const newSpeed = energySpeedFromHunger(nextHunger);
        if (newSpeed > oldSpeed) {
          const now = Date.now();
          const elapsed = Math.max(0, now - new Date(r.lastEnergyTickAt).getTime());
          const preserved = elapsed * (oldSpeed / newSpeed);
          nextTick = new Date(now - preserved).toISOString();
        }
      }
      const nowIso = new Date().toISOString();
      const bn = reconcileBond({
        bond: s.prefs?.petBond,
        bondTickAt: s.prefs?.petBondTickAt,
        hunger: r.hunger,
        hungerTickAt: r.lastHungerTickAt,
        now: Date.now(),
        hasGiftsLeft: (s.prefs?.petGifts?.length || 0) < GIFT_IDS.length
      });
      return {
        ...s,
        coins: Math.max(0, (s.coins || 0) - treat.price),
        energy: r.energy,
        lastEnergyTickAt: nextTick,
        pet: { ...(s.pet || DEFAULT_STATS.pet), hunger: nextHunger, lastHungerTickAt: r.lastHungerTickAt },
        prefs: { ...(s.prefs || DEFAULT_STATS.prefs), petBond: bn.bond, petBondTickAt: nowIso }
      };
    });
    runEconomy('buy_treat', { p_id: treatId });
    return 'ok';
  }, [stats.coins, stats.pet?.hatched, reconciled.hunger, runEconomy]);

  // Buy a decoration → pay coins, add to owned, auto-equip. For single-slot
  // items the slot is replaced; for wing items the first empty wing is used
  // (wingL preferred), falling back to overwriting wingL.
  const buyDecoration = useCallback((decoId) => {
    const d = getDecoration(decoId);
    if (!d) return 'unknown';
    const owned = stats.pet?.ownedDecorations || [];
    if (owned.includes(decoId)) return 'already_owned';
    const petLevel = stats.pet?.level || 1;
    if (d.minLevel && petLevel < d.minLevel) return 'locked';
    if ((stats.coins || 0) < d.price) return 'not_enough_coins';
    setStats((s) => {
      const eq = { ...(s.pet?.equipped || {}) };
      if (d.slot === 'wing') {
        const target = !eq.wingL ? 'wingL' : !eq.wingR ? 'wingR' : 'wingL';
        eq[target] = decoId;
      } else {
        eq[d.slot] = decoId;
      }
      return {
        ...s,
        coins: Math.max(0, (s.coins || 0) - d.price),
        pet: {
          ...(s.pet || DEFAULT_STATS.pet),
          ownedDecorations: [...(s.pet?.ownedDecorations || []), decoId],
          equipped: eq
        }
      };
    });
    runEconomy('buy_decoration', { p_id: decoId });
    return 'ok';
  }, [stats.coins, stats.pet?.ownedDecorations, stats.pet?.level, runEconomy]);

  // Equip an already-owned decoration. For wing items the caller passes the
  // explicit slot ('wingL' | 'wingR'); other items go to their declared slot.
  // If the item is already worn elsewhere it's moved (not duplicated).
  const equipDecoration = useCallback((decoId, slotOverride) => {
    const d = getDecoration(decoId);
    if (!d) return;
    let nextEq = null;
    setStats((s) => {
      const owned = s.pet?.ownedDecorations || [];
      if (!owned.includes(decoId)) return s;
      const target = slotOverride || (d.slot === 'wing' ? 'wingL' : d.slot);
      const eq = { ...(s.pet?.equipped || {}) };
      // Remove from any other slot (avoid the same id sitting in both wings)
      for (const k of Object.keys(eq)) {
        if (eq[k] === decoId) delete eq[k];
      }
      eq[target] = decoId;
      nextEq = eq;
      return {
        ...s,
        pet: { ...(s.pet || DEFAULT_STATS.pet), equipped: eq }
      };
    });
    if (nextEq) runEconomy('set_pet_cosmetic', { p_equipped: nextEq });
  }, [runEconomy]);

  // Stamp the local-day timestamp when a mini-game finishes. UI reads
  // this to gate "once per day" play.
  const recordMiniGamePlay = useCallback((gameId, xp = 0, coins = 0) => {
    setStats((s) => ({
      ...s,
      pet: {
        ...(s.pet || DEFAULT_STATS.pet),
        lastTrainAt: { ...((s.pet?.lastTrainAt) || {}), [gameId]: new Date().toISOString() }
      }
    }));
    // Server clamps xp/coins and enforces the once-per-day cooldown, then
    // reconciles the authoritative pet xp/level + coin total.
    runEconomy('record_minigame', { p_game: gameId, p_xp: Math.round(xp), p_coins: Math.round(coins) });
  }, [runEconomy]);

  // Clear a specific slot (no-op if it's already empty).
  const unequipDecorationSlot = useCallback((slot) => {
    let nextEq = null;
    setStats((s) => {
      const eq = { ...(s.pet?.equipped || {}) };
      if (!eq[slot]) return s;
      delete eq[slot];
      nextEq = eq;
      return { ...s, pet: { ...(s.pet || DEFAULT_STATS.pet), equipped: eq } };
    });
    if (nextEq) runEconomy('set_pet_cosmetic', { p_equipped: nextEq });
  }, [runEconomy]);

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
        // Consumables don't enter inventory — they arm a timed/counted boost.
        const now = Date.now();
        if (item.id === 'boost-double') {
          // Stack onto remaining time if re-bought while still active.
          const base = (s.boostDoubleUntil && now < new Date(s.boostDoubleUntil).getTime())
            ? new Date(s.boostDoubleUntil).getTime() : now;
          next.boostDoubleUntil = new Date(base + BOOST_DOUBLE_MS).toISOString();
        } else if (item.id === 'boost-energy-cap') {
          const base = (s.energyCapUntil && now < new Date(s.energyCapUntil).getTime())
            ? new Date(s.energyCapUntil).getTime() : now;
          next.energyCapUntil = new Date(base + BOOST_ENERGY_CAP_MS).toISOString();
        } else if (item.id === 'boost-ad-coins') {
          next.adBonusLeft = (s.adBonusLeft || 0) + AD_COIN_BONUS_USES;
        }
      } else {
        next.inventory = [...(s.inventory || []), itemId];
        // Auto-equip cosmetic items on first purchase.
        if (item.category === 'background') next.activeBackground = itemId;
        if (item.category === 'cells') next.activeCellStyle = itemId;
      }
      return next;
    });
    runEconomy('purchase_item', { p_id: itemId });
    return 'ok';
  }, [stats.coins, stats.inventory, runEconomy]);

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
  const mutateEnergy = useCallback((delta, { overfill = false } = {}) => {
    setStats((s) => {
      const cap = energyCapFor(s);
      const r = reconcilePetTimers({
        energy: s.energy,
        lastEnergyTickAt: s.lastEnergyTickAt,
        hunger: s.pet?.hunger,
        lastHungerTickAt: s.pet?.lastHungerTickAt,
        hatched: Boolean(s.pet?.hatched),
        maxEnergy: cap
      });
      // Earned bonuses (overfill=true) may push energy ABOVE the cap; the
      // reconcile only regenerates while below cap, so the surplus persists
      // until spent down. Everything else clamps to the cap as usual.
      const raw = r.energy + delta;
      let nextEnergy;
      if (delta < 0) {
        // Spending never clamps to the cap — it must preserve any overfill
        // surplus (e.g. 7 → 6, not 7 → 5). Just floor at 0.
        nextEnergy = Math.max(0, raw);
      } else {
        // Adding clamps to the cap, unless this is an earned overfill bonus.
        nextEnergy = overfill ? Math.max(0, raw) : Math.max(0, Math.min(cap, raw));
      }
      // At/above cap, anchor the regen tick to now (regen is paused there);
      // below cap, keep the reconciled tick so pending regen keeps counting.
      const nextTick = nextEnergy >= cap
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

  // Tally an alt-mode (4/6 letter) play. After every 5 plays grant +1
  // energy, capped at 3 grants per local day. Returns { grantedEnergy }.
  const recordAltModePlay = useCallback(() => {
    const today = todayKey();
    const cur = stats.altMode || DEFAULT_STATS.altMode;
    const sameDay = cur.dayKey === today;
    const nextPlays = (sameDay ? cur.plays : 0) + 1;
    const granted = sameDay ? cur.energyGranted : 0;
    const shouldGrant = nextPlays >= 5 && granted < 3;
    if (shouldGrant) {
      // Earned bonus — allowed to overfill above the energy cap.
      mutateEnergy(+1, { overfill: true });
      setStats((s) => ({
        ...s,
        altMode: { dayKey: today, plays: 0, energyGranted: granted + 1 }
      }));
    } else {
      setStats((s) => ({
        ...s,
        altMode: { dayKey: today, plays: nextPlays, energyGranted: granted }
      }));
    }
    runEconomy('record_alt_mode', {}, { recompute: false });
    return { grantedEnergy: shouldGrant };
  }, [stats.altMode, mutateEnergy, runEconomy]);

  const consumeEnergy = useCallback(() => {
    if (reconciled.energy < 1) return false;
    mutateEnergy(-1);
    // Energy is spent server-side at the start of a normal round (award_win no
    // longer decrements it). No achievements depend on energy → skip recompute.
    runEconomy('spend_energy', {}, { recompute: false });
    return true;
  }, [reconciled.energy, mutateEnergy, runEconomy]);

  const buyEnergy = useCallback(() => {
    if (reconciled.energy >= energyMax) return 'full';
    if ((stats.coins || 0) < ENERGY_REFILL_COST) return 'not_enough_coins';
    setStats((s) => ({ ...s, coins: Math.max(0, (s.coins || 0) - ENERGY_REFILL_COST) }));
    mutateEnergy(+1);
    runEconomy('buy_energy', {}, { recompute: false });
    return 'ok';
  }, [reconciled.energy, energyMax, stats.coins, mutateEnergy, runEconomy]);

  // Remaining "watch ad → +1 energy" grants today (resets at local midnight).
  const adsEnergyLeft = useMemo(() => {
    const cur = stats.adEnergy || DEFAULT_STATS.adEnergy;
    const used = cur.dayKey === todayKey() ? (cur.count || 0) : 0;
    return Math.max(0, ADS_ENERGY_PER_DAY - used);
  }, [stats.adEnergy]);

  // Credit +1 energy from a watched ad, capped per day. Returns false (and does
  // nothing) when the daily cap is already reached.
  const grantAdEnergy = useCallback(() => {
    const today = todayKey();
    const cur = stats.adEnergy || DEFAULT_STATS.adEnergy;
    const used = cur.dayKey === today ? (cur.count || 0) : 0;
    if (used >= ADS_ENERGY_PER_DAY) return false;
    mutateEnergy(+ENERGY_AD_REWARD);
    setStats((s) => {
      const c = s.adEnergy || DEFAULT_STATS.adEnergy;
      const u = c.dayKey === today ? (c.count || 0) : 0;
      return { ...s, adEnergy: { dayKey: today, count: u + 1 } };
    });
    runEconomy('grant_ad_energy', {}, { recompute: false });
    return true;
  }, [stats.adEnergy, mutateEnergy, runEconomy]);

  // Called whenever a rewarded ad finishes. If the "Щедрая реклама" boost has
  // uses left, credit +3 coins and decrement. Returns the bonus granted (0/3).
  const recordAdWatched = useCallback(() => {
    let granted = 0;
    setStats((s) => {
      if ((s.adBonusLeft || 0) <= 0) return s;
      granted = AD_COIN_BONUS;
      return {
        ...s,
        coins: (s.coins || 0) + AD_COIN_BONUS,
        coinsEarned: (s.coinsEarned || 0) + AD_COIN_BONUS,
        adBonusLeft: (s.adBonusLeft || 0) - 1
      };
    });
    runEconomy('redeem_ad_bonus', {});
    return granted;
  }, [runEconomy]);

  // Remaining "double via ad" presses today (resets at local midnight).
  const adsDoubleLeft = useMemo(() => {
    const cur = stats.adsDouble || DEFAULT_STATS.adsDouble;
    const used = cur.dayKey === todayKey() ? (cur.count || 0) : 0;
    return Math.max(0, ADS_DOUBLE_PER_DAY - used);
  }, [stats.adsDouble]);

  // Tally one "double via ad" use against the daily soft cap. Returns false
  // (and does nothing) when the cap is already reached.
  const recordAdDouble = useCallback(() => {
    const today = todayKey();
    const cur = stats.adsDouble || DEFAULT_STATS.adsDouble;
    const used = cur.dayKey === today ? (cur.count || 0) : 0;
    if (used >= ADS_DOUBLE_PER_DAY) return false;
    setStats((s) => {
      const c = s.adsDouble || DEFAULT_STATS.adsDouble;
      const u = c.dayKey === today ? (c.count || 0) : 0;
      return { ...s, adsDouble: { dayKey: today, count: u + 1 } };
    });
    return true;
  }, [stats.adsDouble]);

  // ---------- Server-authoritative game-result calls (fired from useGame) ----------
  // The single source of truth for a finished round. The client still updates
  // local stats optimistically (recordWin/recordLoss/recordDailyResult) for
  // instant UI; this reconciles the authoritative coins/energy/pet/daily back.
  const awardWinServer = useCallback(({ mode, length, won, attempts, elapsedMs, evaluations }) => {
    runEconomy('award_win', {
      p_mode: mode,
      p_length: length,
      p_won: Boolean(won),
      p_attempts: attempts,
      p_elapsed_ms: Math.max(0, Math.round(elapsedMs || 0)),
      p_evaluations: Array.isArray(evaluations) ? evaluations : []
    });
  }, [runEconomy]);

  // Paid hint — server holds the price and debits coins + bumps hints_used.
  const spendHintServer = useCallback((kind) => {
    runEconomy('spend_hint', { p_kind: kind });
  }, [runEconomy]);

  // "Double reward via ad" — server re-credits the stored last-win reward and
  // tallies the daily cap. (The +N ad-view bonus is handled by recordAdWatched
  // → redeem_ad_bonus separately.)
  const redeemAdDoubleServer = useCallback(() => {
    runEconomy('redeem_ad_double', {});
  }, [runEconomy]);

  // Забрать готовый подарок: добавить следующий несобранный id в коллекцию,
  // обнулить bond. Косметика НЕ применяется автоматически. Возвращает id
  // подарка или null. Идемпотентно относительно порога/наличия.
  const claimPetGift = useCallback(() => {
    let claimedId = null;
    setStats((s) => {
      const claimed = s.prefs?.petGifts || [];
      const id = nextUnclaimedGiftId(claimed);
      if (!id) return s;
      const bn = reconcileBond({
        bond: s.prefs?.petBond,
        bondTickAt: s.prefs?.petBondTickAt,
        hunger: s.pet?.hunger,
        hungerTickAt: s.pet?.lastHungerTickAt,
        now: Date.now(),
        hasGiftsLeft: claimed.length < GIFT_IDS.length
      });
      if (bn.bond < BOND_PER_GIFT) return s;
      claimedId = id;
      return {
        ...s,
        prefs: {
          ...(s.prefs || DEFAULT_STATS.prefs),
          petGifts: [...claimed, id],
          petBond: 0,
          petBondTickAt: new Date().toISOString()
        }
      };
    });
    return claimedId;
  }, []);

  return {
    stats,
    ready,
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
    energyMax,
    petHunger: reconciled.hunger,
    lastEnergyTickAt: reconciled.lastEnergyTickAt,
    consumeEnergy,
    buyEnergy,
    grantAdEnergy,
    adsEnergyLeft,
    recordAdWatched,
    adsDoubleLeft,
    recordAdDouble,
    addCoins,
    setPref,
    recordDailyResult,
    recordHintUsed,
    hatchPet,
    renamePet,
    recordPetXp,
    feedPet,
    petBond: reconciledBond.bond,
    petBondMax: BOND_PER_GIFT,
    petGiftReady: reconciledBond.bond >= BOND_PER_GIFT && giftsLeft,
    petGifts: stats.prefs?.petGifts || [],
    claimPetGift,
    buyDecoration,
    equipDecoration,
    unequipDecorationSlot,
    recordMiniGamePlay,
    recordAltModePlay,
    awardWinServer,
    spendHintServer,
    redeemAdDoubleServer,
    achievementToasts,
    consumeAchievementToast,
    auth
  };
}
