import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ANIM, GAME_STATUS, HINT_COST, LETTER_STATUS, MAX_ATTEMPTS, STORAGE_KEYS, WORD_LENGTH, petXpForWin, rewardFor } from '../constants/game.js';
import { equippedDecorationsBonus } from '../data/petDecorations.js';
import { showRewardedAd } from '../lib/ads.js';
import { evaluateGuess, mergeKeyboardStatuses } from '../utils/evaluator.js';
import { isValidWord, normalizeWord, pickRandomWord } from '../data/words.js';
import { storage } from '../utils/storage.js';
import { useStats } from './useStats.js';

const isCyrillicLetter = (ch) => /^[а-яё]$/i.test(ch);

export function useGame() {
  // Lazy-init from any persisted game so a page refresh resumes the same
  // puzzle without spending energy a second time.
  const savedGame = useMemo(() => storage.get(STORAGE_KEYS.GAME_STATE, null), []);
  const [solution, setSolution] = useState(() => savedGame?.solution ?? null);
  const [guesses, setGuesses] = useState(() => savedGame?.guesses ?? []);
  const [evaluations, setEvaluations] = useState(() => savedGame?.evaluations ?? []);
  const [current, setCurrent] = useState('');
  const [status, setStatus] = useState(() => savedGame?.status ?? GAME_STATUS.PLAYING);
  const [shakeRow, setShakeRow] = useState(false);
  const [revealRow, setRevealRow] = useState(-1);
  const [toast, setToast] = useState(null);
  const [lastEarned, setLastEarned] = useState(0);
  const [lastEarnedBase, setLastEarnedBase] = useState(0);
  const [doubledLastWin, setDoubledLastWin] = useState(false);
  const [doublingAd, setDoublingAd] = useState(false);
  const [hints, setHints] = useState(() => savedGame?.hints ?? Array(WORD_LENGTH).fill(null));
  const [hintPickMode, setHintPickMode] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [energyModalOpen, setEnergyModalOpen] = useState(false);
  const isLocked = useRef(false);
  // Wall-clock at which the active puzzle started — used for the "win in N
  // seconds" achievements. Resets every time a fresh solution is set.
  const gameStartRef = useRef(Date.now());
  const stats = useStats();

  // On first mount, if there's no saved puzzle, spend 1 energy and start one.
  // If energy is depleted, leave solution=null and pop the energy modal.
  useEffect(() => {
    if (solution !== null) return;
    if (stats.consumeEnergy()) {
      gameStartRef.current = Date.now();
      setSolution(pickRandomWord());
    } else {
      setEnergyModalOpen(true);
    }
    // We intentionally only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the in-flight puzzle so reload resumes it (no double energy charge).
  useEffect(() => {
    if (!solution) {
      storage.remove(STORAGE_KEYS.GAME_STATE);
      return;
    }
    storage.set(STORAGE_KEYS.GAME_STATE, { solution, guesses, evaluations, status, hints });
  }, [solution, guesses, evaluations, status, hints]);

  const showToast = useCallback((text) => {
    setToast({ text, id: Date.now() });
    setTimeout(() => setToast(null), 1600);
  }, []);

  const addLetter = useCallback((letter) => {
    if (!solution || status !== GAME_STATUS.PLAYING || isLocked.current) return;
    if (!isCyrillicLetter(letter)) return;
    setCurrent((c) => (c.length >= WORD_LENGTH ? c : c + letter.toLowerCase()));
  }, [status, solution]);

  const removeLetter = useCallback(() => {
    if (!solution || status !== GAME_STATUS.PLAYING || isLocked.current) return;
    setCurrent((c) => c.slice(0, -1));
  }, [status, solution]);

  const submit = useCallback(() => {
    if (!solution || status !== GAME_STATUS.PLAYING || isLocked.current) return;
    if (current.length !== WORD_LENGTH) {
      setShakeRow(true);
      showToast('Слишком короткое слово');
      setTimeout(() => setShakeRow(false), 450);
      return;
    }
    const guess = normalizeWord(current);
    if (!isValidWord(guess)) {
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
    setHints(Array(WORD_LENGTH).fill(null));

    setTimeout(() => {
      const won = guess === normalizeWord(solution);
      const lost = !won && nextGuesses.length >= MAX_ATTEMPTS;
      if (won) {
        setStatus(GAME_STATUS.WON);
        const base = rewardFor(nextGuesses.length);
        const elapsedMs = Date.now() - gameStartRef.current;
        // Mirror the math useStats.recordWin uses so the displayed total
        // matches what's actually credited to the coin balance.
        const decoPct = equippedDecorationsBonus(stats.stats.pet);
        const decoMul = 1 + decoPct / 100;
        const boostMul = stats.stats.boostDoubleCoins ? 2 : 1;
        const total = Math.round(base * decoMul * boostMul);
        stats.recordWin(nextGuesses.length, elapsedMs);
        setLastEarnedBase(base);
        setLastEarned(total);
        setDoubledLastWin(false);
        // Pet XP grant — gated by hatched state inside recordPetXp.
        const petResult = stats.recordPetXp(petXpForWin(nextGuesses.length));
        if (petResult.levelAfter > petResult.levelBefore) {
          const petName = stats.stats.pet?.name || 'Букля';
          showToast(`${petName} выросла! Уровень ${petResult.levelAfter}`);
        }
      } else if (lost) {
        setStatus(GAME_STATUS.LOST);
        stats.recordLoss();
        setLastEarned(0);
        setLastEarnedBase(0);
      }
      isLocked.current = false;
    }, ANIM.REVEAL_TOTAL_MS + 60);
  }, [current, guesses, evaluations, solution, status, stats, showToast]);

  const performReset = useCallback(() => {
    gameStartRef.current = Date.now();
    setSolution(pickRandomWord());
    setGuesses([]);
    setEvaluations([]);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setShakeRow(false);
    setRevealRow(-1);
    setToast(null);
    setLastEarned(0);
    setHints(Array(WORD_LENGTH).fill(null));
    setHintPickMode(false);
    isLocked.current = false;
  }, []);

  const reset = useCallback(() => {
    // Energy gate — every fresh puzzle costs 1.
    if (!stats.consumeEnergy()) {
      setEnergyModalOpen(true);
      return;
    }
    const empty = guesses.length === 0 && current.length === 0 && hints.every((h) => !h);
    if (empty) {
      gameStartRef.current = Date.now();
      setSolution(pickRandomWord());
      return;
    }
    setIsClearing(true);
    setTimeout(() => {
      performReset();
      setIsClearing(false);
    }, 340);
  }, [guesses.length, current.length, hints, performReset, stats]);

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
    const candidates = [];
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (!hints[i] && !known.has(i)) candidates.push(i);
    }
    if (candidates.length === 0) { showToast('Все буквы уже открыты'); return false; }
    if (!stats.spendCoins(HINT_COST.RANDOM)) { showToast('Недостаточно монет'); return false; }
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    setHints((h) => h.map((c, i) => (i === idx ? sol[i] : c)));
    stats.recordHintUsed();
    return true;
  }, [status, solution, hints, stats, showToast, correctSlots]);

  const revealPositionHint = useCallback((idx) => {
    if (status !== GAME_STATUS.PLAYING) return false;
    if (idx < 0 || idx >= WORD_LENGTH) return false;
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
    feedPet: stats.feedPet,
    buyDecoration: stats.buyDecoration,
    equipDecoration: stats.equipDecoration,
    unequipDecorationSlot: stats.unequipDecorationSlot,
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
