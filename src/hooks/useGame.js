import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ANIM, GAME_STATUS, HINT_COST, LETTER_STATUS, MAX_ATTEMPTS, STORAGE_KEYS, petXpForWin, rewardFor } from '../constants/game.js';
import { equippedDecorationsBonus } from '../data/petDecorations.js';
import { getDailyKey, getDailyNumber, getDailyWord } from '../data/dailyWord.js';
import { showRewardedAd } from '../lib/ads.js';
import { evaluateGuess, mergeKeyboardStatuses } from '../utils/evaluator.js';
import { isValidWord, normalizeWord, pickRandomWord } from '../data/words.js';
import { storage } from '../utils/storage.js';
import { useStats } from './useStats.js';

const isCyrillicLetter = (ch) => /^[а-яё]$/i.test(ch);

export function useGame() {
  // Lazy-init from any persisted game so a page refresh resumes the same
  // puzzle without spending energy a second time.
  //
  // Special case: if the saved game is a normal round but the user hasn't
  // played today's daily yet, we stash it as `:normal-backup` and pretend
  // there's no saved game. The mount-time effect below then auto-starts
  // the daily, and exitDailyMode pops the backup off the shelf afterwards.
  // This makes the daily greet every user — even ones with an in-progress
  // normal puzzle from before the feature shipped.
  const savedGame = useMemo(() => {
    const raw = storage.get(STORAGE_KEYS.GAME_STATE, null);
    if (!raw || !raw.solution) return raw;
    const persisted = storage.get(STORAGE_KEYS.STATS, null);
    const dailyDone = persisted?.daily?.lastPlayedKey === getDailyKey();
    if (raw.gameMode !== 'daily' && !dailyDone) {
      storage.set(STORAGE_KEYS.GAME_STATE + ':normal-backup', raw);
      storage.remove(STORAGE_KEYS.GAME_STATE);
      return null;
    }
    return raw;
  }, []);
  // Word length for the current round (4 | 5 | 6). 5 is the canonical mode;
  // 4 and 6 are unlocked from the GameModes modal and give half the reward.
  const [wordLength, setWordLength] = useState(() =>
    (savedGame?.wordLength === 4 || savedGame?.wordLength === 6) ? savedGame.wordLength : 5
  );
  const [solution, setSolution] = useState(() => savedGame?.solution ?? null);
  const [guesses, setGuesses] = useState(() => savedGame?.guesses ?? []);
  const [evaluations, setEvaluations] = useState(() => savedGame?.evaluations ?? []);
  const [current, setCurrent] = useState('');
  const [status, setStatus] = useState(() => savedGame?.status ?? GAME_STATUS.PLAYING);
  const [shakeRow, setShakeRow] = useState(false);
  const [revealRow, setRevealRow] = useState(-1);
  const [toast, setToast] = useState(null);
  // Reward state is persisted alongside the board so a page refresh after
  // a win still shows "+N монет", the breakdown, and the ad-double button.
  const [lastEarned, setLastEarned] = useState(() => savedGame?.lastEarned ?? 0);
  const [lastEarnedBase, setLastEarnedBase] = useState(() => savedGame?.lastEarnedBase ?? 0);
  const [doubledLastWin, setDoubledLastWin] = useState(() => savedGame?.doubledLastWin ?? false);
  const [doublingAd, setDoublingAd] = useState(false);
  const [hints, setHints] = useState(() => savedGame?.hints ?? Array((savedGame?.wordLength ?? 5)).fill(null));
  const [hintPickMode, setHintPickMode] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [energyModalOpen, setEnergyModalOpen] = useState(false);
  // 'normal' = freeform play (energy-gated); 'daily' = one-shot daily word.
  const [gameMode, setGameMode] = useState(() => savedGame?.gameMode || 'normal');
  const isLocked = useRef(false);
  // Wall-clock at which the active puzzle started — used for the "win in N
  // seconds" achievements. Resets every time a fresh solution is set.
  const gameStartRef = useRef(Date.now());
  const stats = useStats();

  // On first mount, pick the first puzzle:
  //   1. today's daily, if the user hasn't played it yet (no energy cost),
  //   2. otherwise a normal round (1 energy),
  //   3. otherwise pop the energy modal.
  useEffect(() => {
    if (solution !== null) return;
    const todayKey = getDailyKey();
    const dailyDone = stats.stats.daily?.lastPlayedKey === todayKey;
    if (!dailyDone) {
      gameStartRef.current = Date.now();
      // Daily is always the canonical 5-letter format. Reset hints to 5
      // slots in case the persisted wordLength was 4 or 6.
      setWordLength(5);
      setHints(Array(5).fill(null));
      setSolution(getDailyWord());
      setGameMode('daily');
      return;
    }
    if (stats.consumeEnergy()) {
      gameStartRef.current = Date.now();
      setSolution(pickRandomWord(Math.random, wordLength));
    } else {
      setEnergyModalOpen(true);
    }
    // We intentionally only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the in-flight puzzle so reload resumes it (no double energy charge).
  // Skip writing when solution/length disagree — that's a transient render
  // between mode switches and the watchdog below is about to repick.
  useEffect(() => {
    if (!solution) {
      storage.remove(STORAGE_KEYS.GAME_STATE);
      return;
    }
    if (normalizeWord(solution).length !== wordLength) return;
    storage.set(STORAGE_KEYS.GAME_STATE, {
      solution, guesses, evaluations, status, hints, gameMode, wordLength,
      lastEarned, lastEarnedBase, doubledLastWin
    });
  }, [solution, guesses, evaluations, status, hints, gameMode, wordLength, lastEarned, lastEarnedBase, doubledLastWin]);

  // Watchdog: if the solution length ever drifts from the active wordLength
  // (caused by a stale persisted blob, a race between setWordLength and
  // setSolution, or a buggy older save), repick a matching word and clear
  // the board so the player isn't stuck typing into a too-short row.
  useEffect(() => {
    if (!solution) return;
    if (normalizeWord(solution).length === wordLength) return;
    gameStartRef.current = Date.now();
    setSolution(pickRandomWord(Math.random, wordLength));
    setGuesses([]);
    setEvaluations([]);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setHints(Array(wordLength).fill(null));
    setRevealRow(-1);
    isLocked.current = false;
  }, [wordLength, solution]);

  const showToast = useCallback((text) => {
    setToast({ text, id: Date.now() });
    setTimeout(() => setToast(null), 1600);
  }, []);

  const addLetter = useCallback((letter) => {
    if (!solution || status !== GAME_STATUS.PLAYING || isLocked.current) return;
    if (!isCyrillicLetter(letter)) return;
    setCurrent((c) => (c.length >= wordLength ? c : c + letter.toLowerCase()));
  }, [status, solution]);

  const removeLetter = useCallback(() => {
    if (!solution || status !== GAME_STATUS.PLAYING || isLocked.current) return;
    setCurrent((c) => c.slice(0, -1));
  }, [status, solution]);

  const submit = useCallback(() => {
    if (!solution || status !== GAME_STATUS.PLAYING || isLocked.current) return;
    if (current.length !== wordLength) {
      setShakeRow(true);
      showToast('Слишком короткое слово');
      setTimeout(() => setShakeRow(false), 450);
      return;
    }
    const guess = normalizeWord(current);
    const solNorm = normalizeWord(solution);
    // Safety: the loaded answer is ALWAYS accepted, even if for some reason
    // it slipped out of VALID_GUESSES_SET (older save format, dictionary
    // drift, etc.) — otherwise a player could see hints that spell a word
    // they can't actually submit.
    if (guess !== solNorm && !isValidWord(guess, wordLength)) {
      setShakeRow(true);
      showToast('Нет такого слова в словаре');
      setTimeout(() => setShakeRow(false), 450);
      return;
    }
    const evalRow = evaluateGuess(guess, solution);
    const nextGuesses = [...guesses, guess];
    const nextEvals = [...evaluations, evalRow];
    const rowIdx = guesses.length;

    isLocked.current = true;
    setRevealRow(rowIdx);
    setGuesses(nextGuesses);
    setEvaluations(nextEvals);
    setCurrent('');
    // Hints are tied to the row on which they were bought — clear once it submits.
    setHints(Array(wordLength).fill(null));

    setTimeout(() => {
      const won = guess === normalizeWord(solution);
      const lost = !won && nextGuesses.length >= MAX_ATTEMPTS;
      if (won) {
        setStatus(GAME_STATUS.WON);
        if (gameMode === 'daily') {
          // Daily mode: doubled reward to honour the social hook — base
          // (rewardFor(attempts)) + a matching "за Слово дня" bonus. No
          // pet XP, no deco bonus, no boost — equal playing field.
          const base = rewardFor(nextGuesses.length);
          const total = base * 2;
          stats.addCoins(total);
          stats.recordDailyResult({
            key: getDailyKey(),
            dayN: getDailyNumber(),
            won: true,
            attempts: nextGuesses.length,
            evaluations: nextEvals,
            word: solution
          });
          setLastEarnedBase(base);
          setLastEarned(total);
          setDoubledLastWin(false);
        } else {
          // 4 + 6-letter modes earn no coins (only XP, half) and feed into
          // an alt-mode tally that grants +1 energy every 5 plays (≤ 3/day).
          const isAlt = wordLength !== 5;
          const lengthMul = isAlt ? 0.5 : 1;
          const elapsedMs = Date.now() - gameStartRef.current;
          stats.recordWin(nextGuesses.length, elapsedMs, lengthMul, /* creditCoins */ !isAlt);
          if (isAlt) {
            setLastEarned(0);
            setLastEarnedBase(0);
            const r = stats.recordAltModePlay?.();
            if (r?.grantedEnergy) showToast('+1 энергия за 5 партий в режимах 4/6!');
          } else {
            const base = rewardFor(nextGuesses.length);
            const decoPct = equippedDecorationsBonus(stats.stats.pet);
            const decoMul = 1 + decoPct / 100;
            const boostMul = stats.stats.boostDoubleCoins ? 2 : 1;
            const total = Math.round(base * decoMul * boostMul);
            setLastEarnedBase(base);
            setLastEarned(total);
          }
          setDoubledLastWin(false);
          const petXp = Math.round(petXpForWin(nextGuesses.length) * lengthMul);
          const petResult = stats.recordPetXp(petXp);
          if (petResult.levelAfter > petResult.levelBefore) {
            const petName = stats.stats.pet?.name || 'Букля';
            showToast(`${petName} выросла! Уровень ${petResult.levelAfter}`);
          }
        }
      } else if (lost) {
        setStatus(GAME_STATUS.LOST);
        if (gameMode === 'daily') {
          stats.recordDailyResult({
            key: getDailyKey(),
            dayN: getDailyNumber(),
            won: false,
            attempts: nextGuesses.length,
            evaluations: nextEvals,
            word: solution
          });
        } else {
          stats.recordLoss();
          if (wordLength !== 5) {
            const r = stats.recordAltModePlay?.();
            if (r?.grantedEnergy) showToast('+1 энергия за 5 партий в режимах 4/6!');
          }
        }
        setLastEarned(0);
        setLastEarnedBase(0);
      }
      isLocked.current = false;
    }, ANIM.REVEAL_TOTAL_MS + 60);
  }, [current, guesses, evaluations, solution, status, stats, showToast, gameMode]);

  const performReset = useCallback(() => {
    gameStartRef.current = Date.now();
    setSolution(pickRandomWord(Math.random, wordLength));
    setGuesses([]);
    setEvaluations([]);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setShakeRow(false);
    setRevealRow(-1);
    setToast(null);
    setLastEarned(0);
    setLastEarnedBase(0);
    setDoubledLastWin(false);
    setHints(Array(wordLength).fill(null));
    setHintPickMode(false);
    isLocked.current = false;
  }, [wordLength]);

  const reset = useCallback(() => {
    // Energy gate — only the canonical 5-letter mode costs energy.
    if (wordLength === 5) {
      if (!stats.consumeEnergy()) {
        setEnergyModalOpen(true);
        return;
      }
    }
    const empty = guesses.length === 0 && current.length === 0 && hints.every((h) => !h);
    if (empty) {
      gameStartRef.current = Date.now();
      setSolution(pickRandomWord(Math.random, wordLength));
      return;
    }
    setIsClearing(true);
    setTimeout(() => {
      performReset();
      setIsClearing(false);
    }, 340);
  }, [guesses.length, current.length, hints, performReset, stats, wordLength]);

  // Called after the user successfully tops up energy from the modal. Spends
  // the freshly-acquired unit and starts a puzzle without a clearing animation
  // (there's nothing on the board yet).
  const startAfterRefuel = useCallback(() => {
    if (!stats.consumeEnergy()) return false;
    setEnergyModalOpen(false);
    if (solution) {
      setIsClearing(true);
      setTimeout(() => {
        performReset();
        setIsClearing(false);
      }, 340);
    } else {
      performReset();
    }
    return true;
  }, [stats, solution, performReset]);

  const closeEnergyModal = useCallback(() => setEnergyModalOpen(false), []);

  // Switch the active word-length mode (4 | 5 | 6) and start a fresh
  // puzzle in that mode. Energy gated like a normal reset. If the
  // requested length matches the current one and a game is already in
  // progress, this is a no-op (call reset() instead for a re-roll).
  const setGameLength = useCallback((length) => {
    if (length !== 4 && length !== 5 && length !== 6) return;
    if (length === wordLength && solution && status === GAME_STATUS.PLAYING && guesses.length === 0) return;
    // Switching modes is FREE — the first round in any mode starts without
    // touching energy. "Новая игра" (reset) afterwards still costs 1 in
    // 5-letter mode and is free in 4/6, as configured below.
    setWordLength(length);
    gameStartRef.current = Date.now();
    setSolution(pickRandomWord(Math.random, length));
    setGuesses([]);
    setEvaluations([]);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setShakeRow(false);
    setRevealRow(-1);
    setHints(Array(length).fill(null));
    setHintPickMode(false);
    setLastEarned(0);
    setLastEarnedBase(0);
    setDoubledLastWin(false);
    isLocked.current = false;
  }, [wordLength, solution, status, guesses.length, stats]);

  // Leave daily mode → restore a stashed normal puzzle if present, else
  // spend 1 energy and start a fresh normal round. If energy is empty,
  // pop the modal and leave the board cleared so reset can take over.
  const exitDailyMode = useCallback(() => {
    if (gameMode !== 'daily') return;
    setGameMode('normal');
    const backup = storage.get(STORAGE_KEYS.GAME_STATE + ':normal-backup', null);
    if (backup?.solution) {
      const restoreLen = (backup.wordLength === 4 || backup.wordLength === 6) ? backup.wordLength : 5;
      setWordLength(restoreLen);
      setSolution(backup.solution);
      setGuesses(backup.guesses || []);
      setEvaluations(backup.evaluations || []);
      setStatus(backup.status || GAME_STATUS.PLAYING);
      setHints(backup.hints || Array(restoreLen).fill(null));
      setCurrent('');
      setRevealRow(-1);
      isLocked.current = false;
      storage.remove(STORAGE_KEYS.GAME_STATE + ':normal-backup');
      gameStartRef.current = Date.now();
      return;
    }
    if (stats.consumeEnergy()) {
      gameStartRef.current = Date.now();
      setSolution(pickRandomWord(Math.random, wordLength));
      setGuesses([]);
      setEvaluations([]);
      setCurrent('');
      setStatus(GAME_STATUS.PLAYING);
      setHints(Array(wordLength).fill(null));
      setRevealRow(-1);
      isLocked.current = false;
    } else {
      setSolution(null);
      setGuesses([]);
      setEvaluations([]);
      setStatus(GAME_STATUS.PLAYING);
      setEnergyModalOpen(true);
    }
  }, [gameMode, stats]);

  // Watch an ad → credit the just-won reward a second time. One-shot per
  // round; further presses are ignored until the next puzzle starts.
  const doubleLastReward = useCallback(async () => {
    if (status !== GAME_STATUS.WON) return 'wrong_state';
    if (doubledLastWin || doublingAd) return 'busy';
    if (!lastEarned || lastEarned <= 0) return 'nothing';
    setDoublingAd(true);
    const r = await showRewardedAd();
    setDoublingAd(false);
    if (r !== 'rewarded') {
      showToast(r === 'closed' ? 'Реклама закрыта раньше' : 'Реклама недоступна');
      return r;
    }
    stats.addCoins(lastEarned);
    setDoubledLastWin(true);
    showToast(`+${lastEarned} монет за просмотр!`);
    return 'ok';
  }, [status, doubledLastWin, doublingAd, lastEarned, stats, showToast]);

  // Positions that have been correctly guessed in past attempts — no point
  // paying for a hint on a slot the player already knows.
  const correctSlots = useCallback(() => {
    const set = new Set();
    for (const evalRow of evaluations) {
      if (!evalRow) continue;
      for (let i = 0; i < evalRow.length; i++) {
        if (evalRow[i] === LETTER_STATUS.CORRECT) set.add(i);
      }
    }
    return set;
  }, [evaluations]);

  const revealRandomHint = useCallback(() => {
    if (status !== GAME_STATUS.PLAYING) return false;
    const sol = normalizeWord(solution);
    const known = correctSlots();
    // Pre-check on stale state just to validate intent + collect coin cost.
    const stalePool = [];
    for (let i = 0; i < wordLength; i++) {
      if (!hints[i] && !known.has(i)) stalePool.push(i);
    }
    if (stalePool.length === 0) { showToast('Все буквы уже открыты'); return false; }
    if (!stats.spendCoins(HINT_COST.RANDOM)) { showToast('Недостаточно монет'); return false; }
    // Recompute candidates inside the functional updater so back-to-back
    // clicks don't race on a stale `hints` snapshot and pick the same slot
    // twice (which would leave the row inconsistent with the solution).
    setHints((h) => {
      const fresh = [];
      for (let i = 0; i < wordLength; i++) {
        if (!h[i] && !known.has(i)) fresh.push(i);
      }
      if (fresh.length === 0) return h;
      const idx = fresh[Math.floor(Math.random() * fresh.length)];
      return h.map((c, i) => (i === idx ? sol[i] : c));
    });
    stats.recordHintUsed();
    return true;
  }, [status, solution, hints, stats, wordLength, showToast, correctSlots]);

  const revealPositionHint = useCallback((idx) => {
    if (status !== GAME_STATUS.PLAYING) return false;
    if (idx < 0 || idx >= wordLength) return false;
    if (hints[idx]) { showToast('Эта буква уже открыта'); return false; }
    if (correctSlots().has(idx)) { showToast('Эта буква уже угадана'); return false; }
    if (!stats.spendCoins(HINT_COST.PICK)) { showToast('Недостаточно монет'); return false; }
    const sol = normalizeWord(solution);
    setHints((h) => h.map((c, i) => (i === idx ? sol[i] : c)));
    setHintPickMode(false);
    stats.recordHintUsed();
    return true;
  }, [status, solution, hints, stats, showToast, correctSlots]);

  const startHintPick = useCallback(() => {
    if (status !== GAME_STATUS.PLAYING) return;
    if ((stats.stats.coins || 0) < HINT_COST.PICK) {
      showToast('Недостаточно монет');
      return;
    }
    if (hints.every(Boolean)) {
      showToast('Все буквы уже открыты');
      return;
    }
    setHintPickMode(true);
  }, [status, stats.stats.coins, hints, showToast]);

  const cancelHintPick = useCallback(() => setHintPickMode(false), []);

  const keyboardStatuses = useMemo(
    () => mergeKeyboardStatuses(guesses, evaluations),
    [guesses, evaluations]
  );

  return {
    solution,
    guesses,
    evaluations,
    current,
    status,
    shakeRow,
    revealRow,
    toast,
    lastEarned,
    lastEarnedBase,
    doubledLastWin,
    doublingAd,
    doubleLastReward,
    gameMode,
    exitDailyMode,
    wordLength,
    setGameLength,
    hints,
    hintPickMode,
    isClearing,
    keyboardStatuses,
    stats: stats.stats,
    resetStats: stats.reset,
    pendingDailyReward: stats.pendingDailyReward,
    claimDailyReward: stats.claimDailyReward,
    buyItem: stats.buyItem,
    setActiveBackground: stats.setActiveBackground,
    setActiveCellStyle: stats.setActiveCellStyle,
    auth: stats.auth,
    addLetter,
    removeLetter,
    showToast,
    submit,
    reset,
    revealRandomHint,
    revealPositionHint,
    startHintPick,
    cancelHintPick,
    // Achievements (read-only state + UI helpers)
    achievementToasts: stats.achievementToasts,
    consumeAchievementToast: stats.consumeAchievementToast,
    // Pet
    hatchPet: stats.hatchPet,
    renamePet: stats.renamePet,
    recordPetXp: stats.recordPetXp,
    addCoins: stats.addCoins,
    setPref: stats.setPref,
    feedPet: stats.feedPet,
    buyDecoration: stats.buyDecoration,
    equipDecoration: stats.equipDecoration,
    unequipDecorationSlot: stats.unequipDecorationSlot,
    recordMiniGamePlay: stats.recordMiniGamePlay,
    petHunger: stats.petHunger,
    lastEnergyTickAt: stats.lastEnergyTickAt,
    // Energy
    energy: stats.energy,
    energyModalOpen,
    openEnergyModal: () => setEnergyModalOpen(true),
    closeEnergyModal,
    buyEnergy: stats.buyEnergy,
    grantAdEnergy: stats.grantAdEnergy,
    startAfterRefuel
  };
}
