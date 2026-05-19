import { useCallback, useMemo, useRef, useState } from 'react';
import { ANIM, GAME_STATUS, HINT_COST, MAX_ATTEMPTS, WORD_LENGTH, rewardFor } from '../constants/game.js';
import { evaluateGuess, mergeKeyboardStatuses } from '../utils/evaluator.js';
import { normalizeWord, pickRandomWord } from '../data/words.js';
import { useStats } from './useStats.js';

const isCyrillicLetter = (ch) => /^[а-яё]$/i.test(ch);

export function useGame() {
  const [solution, setSolution] = useState(() => pickRandomWord());
  const [guesses, setGuesses] = useState([]);          // array of submitted words
  const [evaluations, setEvaluations] = useState([]);  // array of status arrays
  const [current, setCurrent] = useState('');
  const [status, setStatus] = useState(GAME_STATUS.PLAYING);
  const [shakeRow, setShakeRow] = useState(false);
  const [revealRow, setRevealRow] = useState(-1);
  const [toast, setToast] = useState(null);
  const [lastEarned, setLastEarned] = useState(0);
  const [hints, setHints] = useState(() => Array(WORD_LENGTH).fill(null));
  const [hintPickMode, setHintPickMode] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isLocked = useRef(false);
  const stats = useStats();

  const showToast = useCallback((text) => {
    setToast({ text, id: Date.now() });
    setTimeout(() => setToast(null), 1600);
  }, []);

  const addLetter = useCallback((letter) => {
    if (status !== GAME_STATUS.PLAYING || isLocked.current) return;
    if (!isCyrillicLetter(letter)) return;
    setCurrent((c) => (c.length >= WORD_LENGTH ? c : c + letter.toLowerCase()));
  }, [status]);

  const removeLetter = useCallback(() => {
    if (status !== GAME_STATUS.PLAYING || isLocked.current) return;
    setCurrent((c) => c.slice(0, -1));
  }, [status]);

  const submit = useCallback(() => {
    if (status !== GAME_STATUS.PLAYING || isLocked.current) return;
    if (current.length !== WORD_LENGTH) {
      setShakeRow(true);
      showToast('Слишком короткое слово');
      setTimeout(() => setShakeRow(false), 450);
      return;
    }
    const guess = normalizeWord(current);
    const evalRow = evaluateGuess(guess, solution);
    const nextGuesses = [...guesses, guess];
    const nextEvals = [...evaluations, evalRow];
    const rowIdx = guesses.length;

    isLocked.current = true;
    setRevealRow(rowIdx);
    setGuesses(nextGuesses);
    setEvaluations(nextEvals);
    setCurrent('');

    setTimeout(() => {
      const won = guess === normalizeWord(solution);
      const lost = !won && nextGuesses.length >= MAX_ATTEMPTS;
      if (won) {
        setStatus(GAME_STATUS.WON);
        const earned = rewardFor(nextGuesses.length);
        stats.recordWin(nextGuesses.length);
        setLastEarned(earned);
      } else if (lost) {
        setStatus(GAME_STATUS.LOST);
        stats.recordLoss();
        setLastEarned(0);
      }
      isLocked.current = false;
    }, ANIM.REVEAL_TOTAL_MS + 60);
  }, [current, guesses, evaluations, solution, status, stats, showToast]);

  const performReset = useCallback(() => {
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
    const empty = guesses.length === 0 && current.length === 0 && hints.every((h) => !h);
    if (empty) {
      setSolution(pickRandomWord());
      return;
    }
    setIsClearing(true);
    setTimeout(() => {
      performReset();
      setIsClearing(false);
    }, 340);
  }, [guesses.length, current.length, hints, performReset]);

  const revealRandomHint = useCallback(() => {
    if (status !== GAME_STATUS.PLAYING) return false;
    const sol = normalizeWord(solution);
    const candidates = [];
    for (let i = 0; i < WORD_LENGTH; i++) if (!hints[i]) candidates.push(i);
    if (candidates.length === 0) { showToast('Все буквы уже открыты'); return false; }
    if (!stats.spendCoins(HINT_COST.RANDOM)) { showToast('Недостаточно монет'); return false; }
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    setHints((h) => h.map((c, i) => (i === idx ? sol[i] : c)));
    return true;
  }, [status, solution, hints, stats, showToast]);

  const revealPositionHint = useCallback((idx) => {
    if (status !== GAME_STATUS.PLAYING) return false;
    if (idx < 0 || idx >= WORD_LENGTH) return false;
    if (hints[idx]) { showToast('Эта буква уже открыта'); return false; }
    if (!stats.spendCoins(HINT_COST.PICK)) { showToast('Недостаточно монет'); return false; }
    const sol = normalizeWord(solution);
    setHints((h) => h.map((c, i) => (i === idx ? sol[i] : c)));
    setHintPickMode(false);
    return true;
  }, [status, solution, hints, stats, showToast]);

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
    hints,
    hintPickMode,
    isClearing,
    keyboardStatuses,
    stats: stats.stats,
    resetStats: stats.reset,
    addLetter,
    removeLetter,
    submit,
    reset,
    revealRandomHint,
    revealPositionHint,
    startHintPick,
    cancelHintPick
  };
}
