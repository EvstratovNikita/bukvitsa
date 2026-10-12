import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ANIM, GAME_STATUS, HINT_COST, LETTER_STATUS, MAX_ATTEMPTS, STORAGE_KEYS, petXpForWin, rewardFor } from '../constants/game.js';
import { getDailyKey, getDailyNumber, getDailyWord } from '../data/dailyWord.js';
import { showRewardedAd, showInterstitial, rewardedFailText } from '../lib/ads.js';
import { isVk } from '../lib/platform.js';
import { gameplayStart, gameplayStop, requestReview } from '../lib/yandex.js';
import { submitScore } from '../lib/leaderboard.js';
import { evaluateGuess, mergeKeyboardStatuses } from '../utils/evaluator.js';
import { isValidWord, normalizeWord } from '../data/words.js';
import { pickNextWord, rememberWord } from '../lib/wordPicker.js';
import { halloweenActive } from '../lib/events.js';
import { HW_CAP_XP_PER_PUMPKIN, getRiddle } from '../data/halloween.js';
import { nextRiddle, pumpkinsFor } from '../lib/halloweenProgress.js';
import { pluralCoins } from '../utils/plural.js';
import { storage } from '../utils/storage.js';
import { useStats } from './useStats.js';

const isCyrillicLetter = (ch) => /^[а-яё]$/i.test(ch);

// Сколько ждать межстраничный ролик перед новой партией. Ролик идёт до
// полуминуты; дольше мост не отвечает только если завис.
const AD_WAIT_MAX_MS = 45000;

// Игрок сам ушёл из Слова дня — в этот день его больше не предлагаем.
// Иначе предупреждение «вернуться не получится» врало бы: после
// перезагрузки Слово дня встречало бы игрока снова.
function dailySkipped() {
  return storage.get(STORAGE_KEYS.DAILY_SKIPPED, null) === getDailyKey();
}

// Сохранённая партия «Слова дня» действительна только в свой день. Игрок
// заходит назавтра — и без этой проверки его встречает вчерашняя доска
// (иногда ещё и не на 5 букв, если формат сбился в старой версии). Днём
// партии считаем само загаданное слово: оно детерминировано по дате, так
// что старые сейвы без отдельного ключа проверяются тем же способом.
function isTodaysDaily(raw) {
  if (raw.wordLength && raw.wordLength !== 5) return false;
  return normalizeWord(raw.solution || '') === normalizeWord(getDailyWord());
}

// Полка партий по форматам: { "4": {...}, "5": {...}, "6": {...} }.
// Уходя из режима, партию откладываем, возвращаясь — достаём. Благодаря
// этому переключение туда-обратно не стоит ничего: энергия платится за НОВОЕ
// слово, а не за сам переход, и вернуться к своей недоигранной партии можно
// сколько угодно раз. Лежит в localStorage, чтобы переживать перезагрузку.
const ROUNDS_KEY = STORAGE_KEYS.GAME_STATE + ':rounds';

const readRounds = () => {
  const raw = storage.get(ROUNDS_KEY, null);
  return (raw && typeof raw === 'object') ? raw : {};
};

// Кладём на полку только живую партию: доигранная вернулась бы чужой
// заполненной доской, как это уже было с Словом дня.
function stashRound(length, round) {
  const rounds = readRounds();
  if (round?.solution && round.status === GAME_STATUS.PLAYING) rounds[length] = round;
  else delete rounds[length];
  storage.set(ROUNDS_KEY, rounds);
}

function takeRound(length) {
  const rounds = readRounds();
  const round = rounds[length];
  if (!round) return null;
  delete rounds[length];
  storage.set(ROUNDS_KEY, rounds);
  if (round.solution && round.status === GAME_STATUS.PLAYING
      && normalizeWord(round.solution).length === length) return round;
  return null;
}

// Партия «Загадок ночи» жива, только пока идёт ивент и слово есть в колоде:
// после 3.11 отложенная загадка не должна вернуть игрока в пропавший режим.
const isLiveHalloween = (round) =>
  round?.gameMode === 'halloween' && halloweenActive() && Boolean(getRiddle(normalizeWord(round.solution || '')));

// Отложенная загадка лежит на той же полке под ключом hw.
function takeHalloweenRound() {
  const rounds = readRounds();
  const round = rounds.hw;
  if (!round) return null;
  delete rounds.hw;
  storage.set(ROUNDS_KEY, rounds);
  if (round.status === GAME_STATUS.PLAYING && isLiveHalloween(round)) return round;
  return null;
}

// Снимаем с полки отложенную обычную партию, если она ещё не доиграна.
// Доигранная — мусор: вернётся как чужая заполненная доска. Туда же утром
// попадает и недоигранная загадка, если её вытеснило Слово дня.
function takeNormalBackup() {
  const backup = storage.get(STORAGE_KEYS.GAME_STATE + ':normal-backup', null);
  storage.remove(STORAGE_KEYS.GAME_STATE + ':normal-backup');
  if (!backup?.solution || backup.status !== GAME_STATUS.PLAYING) return null;
  if (backup.gameMode === 'halloween' && !isLiveHalloween(backup)) return null;
  return backup;
}

// Утром Слово дня вытесняет недоигранную загадку в normal-backup. Если игрок
// идёт в загадки прямо из Слова дня, забираем её оттуда, а не начинаем новую.
function takeHalloweenBackup() {
  const key = STORAGE_KEYS.GAME_STATE + ':normal-backup';
  const backup = storage.get(key, null);
  if (!isLiveHalloween(backup) || backup.status !== GAME_STATUS.PLAYING) return null;
  storage.remove(key);
  return backup;
}

const restoredMode = (round) => (round?.gameMode === 'halloween' ? 'halloween' : 'normal');

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
    // Загадка ночи после конца ивента (или с чужим словом) не восстанавливается.
    if (raw.gameMode === 'halloween' && !isLiveHalloween(raw)) {
      storage.remove(STORAGE_KEYS.GAME_STATE);
      return null;
    }
    const persisted = storage.get(STORAGE_KEYS.STATS, null);
    const dailyDone = persisted?.daily?.lastPlayedKey === getDailyKey() || dailySkipped();
    // Протухшее «Слово дня» (вчерашнее или с битым форматом) выбрасываем
    // целиком: эффект на маунте поставит чистое поле — сегодняшнее Слово
    // дня, а если оно уже сыграно, обычную партию. Отложенная обычная
    // партия при этом остаётся на полке и вернётся после Слова дня.
    if (raw.gameMode === 'daily' && !isTodaysDaily(raw)) {
      storage.remove(STORAGE_KEYS.GAME_STATE);
      return null;
    }
    if (raw.gameMode !== 'daily' && !dailyDone) {
      // Only stash an IN-PROGRESS normal game to resume after the daily. A
      // finished one (WON/LOST) must NOT be restored later — it would reappear
      // as a stale, pre-filled board ("a random word already entered").
      if (raw.status === GAME_STATUS.PLAYING) {
        storage.set(STORAGE_KEYS.GAME_STATE + ':normal-backup', raw);
      } else {
        storage.remove(STORAGE_KEYS.GAME_STATE + ':normal-backup');
      }
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
  // Плоские монеты за наряды Букли и признак «сработал бонус ×2» — храним
  // отдельно, чтобы в модалке показать честную раскладку, а не выводить
  // бонус вычитанием (раньше он целиком приписывался Букле).
  const [lastEarnedDeco, setLastEarnedDeco] = useState(() => savedGame?.lastEarnedDeco ?? 0);
  const [boostedLastWin, setBoostedLastWin] = useState(() => savedGame?.boostedLastWin ?? false);
  const [doubledLastWin, setDoubledLastWin] = useState(() => savedGame?.doubledLastWin ?? false);
  // Итог последней загадки ночи: сколько тыкв и какие ступени тропы выданы.
  // Хранится с доской — после перезагрузки панель конца партии та же.
  const [lastHw, setLastHw] = useState(() => savedGame?.lastHw ?? null);
  // Загадка ночи открыта за монеты (платная подсказка) — хранится с доской.
  const [riddleShown, setRiddleShown] = useState(() => Boolean(savedGame?.riddleShown));
  const [doublingAd, setDoublingAd] = useState(false);
  const [hints, setHints] = useState(() => savedGame?.hints ?? Array((savedGame?.wordLength ?? 5)).fill(null));
  const [hintPickMode, setHintPickMode] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [energyModalOpen, setEnergyModalOpen] = useState(false);
  // Формат, в который игрок шёл, когда упёрся в пустую энергию. Состояние, а
  // не ref: модалка энергии должна его видеть, чтобы после пополнения увести
  // именно туда, а не перезапустить текущий формат.
  const [pendingLength, setPendingLength] = useState(null);
  // 'normal' = freeform play (energy-gated); 'daily' = one-shot daily word;
  // 'halloween' = «Загадки ночи» (ивент, без энергии, награда — тыквы).
  const [gameMode, setGameMode] = useState(() => savedGame?.gameMode || 'normal');
  const isLocked = useRef(false);
  // Партия уже запускается — второй вызов в том же такте игнорируем, иначе
  // двойной тап списывает энергию дважды за один раунд.
  const startingRef = useRef(false);
  // То же для рекламного удвоения: один просмотр — одно начисление.
  const adBusyRef = useRef(false);
  // Wall-clock at which the active puzzle started — used for the "win in N
  // seconds" achievements. Resets every time a fresh solution is set.
  const gameStartRef = useRef(Date.now());
  // Counts inter-game transitions to throttle interstitials to "every other"
  // transition (on top of Yandex's own ~60s frequency cap). No-op off Yandex.
  const adTransitionRef = useRef(0);
  // Native review prompt — asked once per session, on a win, after the player
  // has finished a few games (so they've actually felt the game first).
  const sessionGamesRef = useRef(0);
  const reviewAskedRef = useRef(false);
  const stats = useStats();
  // Для выбора сложности следующего слова (lib/wordPicker.js). Через ref —
  // часть колбэков с выбором слова мемоизирована без зависимостей.
  const playerRef = useRef(stats.stats);
  playerRef.current = stats.stats;

  // On first mount, pick the first puzzle:
  //   1. today's daily, if the user hasn't played it yet (no energy cost),
  //   2. otherwise a normal round (1 energy),
  //   3. otherwise pop the energy modal.
  useEffect(() => {
    if (solution !== null) return;
    // Wait for the initial server reconcile so we decide daily-vs-normal from
    // the server's truth, not stale/empty local state (which would otherwise
    // re-offer an already-played daily after a cache clear / on a new device).
    if (!stats.ready) return;
    const todayKey = getDailyKey();
    const dailyDone = stats.stats.daily?.lastPlayedKey === todayKey || dailySkipped();
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
    // Партия могла приехать из облака уже после монтирования (внутри
    // площадки localStorage переживает не каждый запуск). Читаем ключ заново
    // — иначе игра начнёт новую партию и спишет энергию поверх недоигранной.
    const fromCloud = storage.get(STORAGE_KEYS.GAME_STATE, null);
    if (fromCloud?.solution && fromCloud.status === GAME_STATUS.PLAYING
        && (fromCloud.gameMode !== 'daily' || isTodaysDaily(fromCloud))
        && (fromCloud.gameMode !== 'halloween' || isLiveHalloween(fromCloud))) {
      const len = (fromCloud.wordLength === 4 || fromCloud.wordLength === 6) ? fromCloud.wordLength : 5;
      gameStartRef.current = Date.now();
      setWordLength(len);
      setSolution(fromCloud.solution);
      setGuesses(fromCloud.guesses || []);
      setEvaluations(fromCloud.evaluations || []);
      setStatus(fromCloud.status);
      setHints(fromCloud.hints || Array(len).fill(null));
      setRiddleShown(Boolean(fromCloud.riddleShown));
      setGameMode(fromCloud.gameMode === 'daily' ? 'daily' : restoredMode(fromCloud));
      return;
    }

    // Слово дня на сегодня уже сыграно (или пропущено). Если с прошлого раза
    // на полке лежит недоигранная обычная партия — возвращаем её, а не берём
    // новое слово за энергию.
    const backup = takeNormalBackup();
    if (backup) {
      const restoreLen = (backup.wordLength === 4 || backup.wordLength === 6) ? backup.wordLength : 5;
      gameStartRef.current = Date.now();
      setWordLength(restoreLen);
      setSolution(backup.solution);
      setGuesses(backup.guesses || []);
      setEvaluations(backup.evaluations || []);
      setStatus(backup.status || GAME_STATUS.PLAYING);
      setHints(backup.hints || Array(restoreLen).fill(null));
      setGameMode(restoredMode(backup));
      setRiddleShown(Boolean(backup.riddleShown));
      return;
    }
    // Обычная партия могла остаться на полке, пока игрок разгадывал загадки
    // ночи, а ивент тем временем закончился. Возвращаем её, а не берём новое
    // слово за энергию.
    const shelved = takeRound(wordLength);
    if (shelved) {
      gameStartRef.current = Date.now();
      setSolution(shelved.solution);
      setGuesses(shelved.guesses || []);
      setEvaluations(shelved.evaluations || []);
      setStatus(GAME_STATUS.PLAYING);
      setHints(shelved.hints || Array(wordLength).fill(null));
      return;
    }
    if (stats.consumeEnergy()) {
      gameStartRef.current = Date.now();
      setSolution(pickNextWord(wordLength, playerRef.current));
    } else {
      setEnergyModalOpen(true);
    }
    // Re-runs once `stats.ready` flips true (server reconcile settled).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.ready]);

  // Доигранное обычное слово — в историю, чтобы оно не выпало снова
  // (lib/wordPicker.js). Слово дня общее для всех и в историю не идёт.
  useEffect(() => {
    if (gameMode !== 'normal' || !solution) return;
    if (status !== GAME_STATUS.WON && status !== GAME_STATUS.LOST) return;
    rememberWord(solution, status === GAME_STATUS.WON, playerRef.current);
  }, [status, gameMode, solution]);

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
      lastEarned, lastEarnedBase, lastEarnedDeco, boostedLastWin, doubledLastWin, lastHw, riddleShown
    });
  }, [solution, guesses, evaluations, status, hints, gameMode, wordLength, lastEarned, lastEarnedBase, lastEarnedDeco, boostedLastWin, doubledLastWin, lastHw, riddleShown]);

  // Watchdog: if the solution length ever drifts from the active wordLength
  // (caused by a stale persisted blob, a race between setWordLength and
  // setSolution, or a buggy older save), repick a matching word and clear
  // the board so the player isn't stuck typing into a too-short row.
  useEffect(() => {
    if (!solution) return;
    if (normalizeWord(solution).length === wordLength) return;
    // Загадку ночи не подменяем случайным словом — подгоняем длину под неё.
    if (gameMode === 'halloween' && getRiddle(normalizeWord(solution))) {
      setWordLength(normalizeWord(solution).length);
      return;
    }
    gameStartRef.current = Date.now();
    setSolution(pickNextWord(wordLength, playerRef.current));
    setGuesses([]);
    setEvaluations([]);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setHints(Array(wordLength).fill(null));
    setRevealRow(-1);
    isLocked.current = false;
  }, [wordLength, solution, gameMode]);

  // ms — для подсказок, которые надо успеть прочесть (сетка в буфере).
  // Таймер снимает только свой тост: короткий следующий не гасит длинный раньше.
  const showToast = useCallback((text, ms = 1600) => {
    const id = Date.now() + Math.random();
    setToast({ text, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), ms);
  }, []);

  // Show an interstitial on every 2nd inter-game transition. Yandex throttles
  // further by its own frequency cap; off-platform this is a no-op.
  // В VK — на каждом 3-м: ролики там бывают по минуте, и реклама через раунд
  // раздражала. Своего ограничителя частоты, как у Яндекса, у VK нет.
  const INTERSTITIAL_EVERY = isVk ? 3 : 2;
  //
  // Возвращает промис: новая партия начинается только ПОСЛЕ ролика. Раньше
  // показ запускался параллельно, VK грузил ролик несколько секунд, и реклама
  // вылезала посреди уже начатого слова. Ждём не дольше AD_WAIT_MAX_MS —
  // если мост так и не ответит, игра не должна зависнуть.
  const maybeInterstitial = useCallback(() => {
    // Never show an interstitial before the player has finished at least one
    // game — no ads ahead of the first round of actual gameplay.
    if (sessionGamesRef.current < 1) return Promise.resolve(false);
    adTransitionRef.current += 1;
    if (adTransitionRef.current % INTERSTITIAL_EVERY !== 0) return Promise.resolve(false);
    return Promise.race([
      showInterstitial().catch(() => false),
      new Promise((r) => setTimeout(() => r(false), AD_WAIT_MAX_MS))
    ]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tell Yandex when active play starts/stops (pause sound/ads correctly).
  useEffect(() => {
    if (status === GAME_STATUS.PLAYING && solution) gameplayStart();
    else gameplayStop();
  }, [status, solution]);

  // Счёт таблицы лидеров — число отгаданных слов; шлём при каждом изменении.
  // Куда именно (SDK Яндекса или наш сервер для VK) решает lib/leaderboard.js,
  // вне площадок вызов ничего не делает.
  useEffect(() => {
    submitScore(stats.stats.won || 0);
  }, [stats.stats.won]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) gameplayStop();
      else if (status === GAME_STATUS.PLAYING && solution) gameplayStart();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [status, solution]);

  // Поле без слова — это не «сломалось», а «партия не начата»: обычно потому,
  // что не хватило энергии на старте. Молчаливый отказ выглядел как зависшая
  // игра (лечилось переключением режима), поэтому объясняем, что произошло.
  const explainEmptyBoard = useCallback(() => {
    if (solution || !stats.ready) return false;
    setEnergyModalOpen(true);
    return true;
  }, [solution, stats.ready]);

  const addLetter = useCallback((letter) => {
    if (explainEmptyBoard()) return;
    if (!solution || status !== GAME_STATUS.PLAYING || isLocked.current) return;
    if (!isCyrillicLetter(letter)) return;
    setCurrent((c) => (c.length >= wordLength ? c : c + letter.toLowerCase()));
  }, [status, solution, explainEmptyBoard]);

  const removeLetter = useCallback(() => {
    if (explainEmptyBoard()) return;
    if (!solution || status !== GAME_STATUS.PLAYING || isLocked.current) return;
    setCurrent((c) => c.slice(0, -1));
  }, [status, solution, explainEmptyBoard]);

  const submit = useCallback(() => {
    if (explainEmptyBoard()) return;
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
      const elapsedMs = Date.now() - gameStartRef.current;
      if (won) {
        setStatus(GAME_STATUS.WON);
        // Ask for a native rating once per session, on a win, once the player
        // has finished at least 4 games (let them feel the game first). Yandex
        // only shows it if eligible; delayed so it doesn't cut into the win
        // panel. No-op off Yandex.
        sessionGamesRef.current += 1;
        if (sessionGamesRef.current >= 4 && !reviewAskedRef.current) {
          reviewAskedRef.current = true;
          setTimeout(() => requestReview(), 1500);
        }
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
          // Server is authoritative: records the daily result + streak and
          // reconciles the coin total (base × 2 by its own rules).
          stats.awardWinServer?.({
            mode: 'daily', length: 5, won: true,
            attempts: nextGuesses.length, elapsedMs, evaluations: nextEvals
          });
          setLastEarnedBase(base);
          setLastEarnedDeco(0);
          setLastEarned(total);
          setDoubledLastWin(false);
          setBoostedLastWin(false);
        } else if (gameMode === 'halloween') {
          // Загадки ночи: монет за партию нет (режим бесплатный и
          // безлимитный), награда — тыквы на ленту. Победа идёт в общую
          // статистику, как в режимах 4/6; опыт Букле — как за 5 букв, а то,
          // что не влезло в дневной лимит тыкв, — дополнительным опытом.
          stats.recordWin(nextGuesses.length, elapsedMs, 1, /* creditCoins */ false);
          const hwRes = stats.recordHalloweenResult({ won: true, attempts: nextGuesses.length, word: normalizeWord(solution) });
          const hatched = Boolean(stats.stats.pet?.hatched);
          const bonusXp = hatched ? (pumpkinsFor(nextGuesses.length) - hwRes.gained) * HW_CAP_XP_PER_PUMPKIN : 0;
          setLastHw({ ...hwRes, bonusXp });
          setLastEarned(0);
          setLastEarnedBase(0);
          setLastEarnedDeco(0);
          setBoostedLastWin(false);
          setDoubledLastWin(false);
          const petResult = stats.recordPetXp(petXpForWin(nextGuesses.length) + bonusXp);
          if (petResult.levelAfter > petResult.levelBefore) {
            const petName = stats.stats.pet?.name || 'Букля';
            showToast(`${petName} выросла! Уровень ${petResult.levelAfter}`);
          }
        } else {
          // 4 + 6-letter modes earn no coins (only XP, half) and feed into
          // an alt-mode tally that grants +1 energy every 5 plays (≤ 3/day).
          const isAlt = wordLength !== 5;
          const lengthMul = isAlt ? 0.5 : 1;
          const award = stats.recordWin(nextGuesses.length, elapsedMs, lengthMul, /* creditCoins */ !isAlt);
          // Server records the win authoritatively (coins for 5-letter, half XP
          // for alt, distribution, streak, fastest) and reconciles back.
          stats.awardWinServer?.({
            mode: 'normal', length: wordLength, won: true,
            attempts: nextGuesses.length, elapsedMs, evaluations: nextEvals
          });
          if (isAlt) {
            setLastEarned(0);
            setLastEarnedBase(0);
            setLastEarnedDeco(0);
            setBoostedLastWin(false);
            const r = stats.recordAltModePlay?.();
            if (r?.grantedEnergy) showToast('+1 энергия за 5 побед в режимах 4/6!');
          } else {
            // Ничего не пересчитываем: показываем ровно ту раскладку, по
            // которой монеты и начислены.
            setLastEarnedBase(award.base);
            setLastEarnedDeco(award.deco);
            setLastEarned(award.total);
          }
          setDoubledLastWin(false);
          setBoostedLastWin(Boolean(award.boosted) && award.total > 0);
          const petXp = Math.round(petXpForWin(nextGuesses.length) * lengthMul);
          const petResult = stats.recordPetXp(petXp);
          if (petResult.levelAfter > petResult.levelBefore) {
            const petName = stats.stats.pet?.name || 'Букля';
            showToast(`${petName} выросла! Уровень ${petResult.levelAfter}`);
          }
        }
      } else if (lost) {
        setStatus(GAME_STATUS.LOST);
        sessionGamesRef.current += 1;
        if (gameMode === 'daily') {
          stats.recordDailyResult({
            key: getDailyKey(),
            dayN: getDailyNumber(),
            won: false,
            attempts: nextGuesses.length,
            evaluations: nextEvals,
            word: solution
          });
          stats.awardWinServer?.({
            mode: 'daily', length: 5, won: false,
            attempts: nextGuesses.length, elapsedMs, evaluations: nextEvals
          });
        } else if (gameMode === 'halloween') {
          stats.recordLoss();
          setLastHw(stats.recordHalloweenResult({ won: false, attempts: nextGuesses.length, word: normalizeWord(solution) }));
        } else {
          stats.recordLoss();
          stats.awardWinServer?.({
            mode: 'normal', length: wordLength, won: false,
            attempts: nextGuesses.length, elapsedMs, evaluations: nextEvals
          });
          // Серия режимов 4/6 считает только победы (так и написано игроку:
          // «каждые 5 побед — +1 энергия»), поэтому проигрыш её не двигает.
        }
        setLastEarned(0);
        setLastEarnedBase(0);
        setLastEarnedDeco(0);
        setBoostedLastWin(false);
      }
      isLocked.current = false;
    }, ANIM.REVEAL_TOTAL_MS + 60);
  }, [current, guesses, evaluations, solution, status, stats, showToast, gameMode, explainEmptyBoard]);

  const performReset = useCallback(() => {
    gameStartRef.current = Date.now();
    setSolution(pickNextWord(wordLength, playerRef.current));
    setGuesses([]);
    setEvaluations([]);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setShakeRow(false);
    setRevealRow(-1);
    setToast(null);
    setLastEarned(0);
    setLastEarnedBase(0);
    setLastEarnedDeco(0);
    setBoostedLastWin(false);
    setDoubledLastWin(false);
    setLastHw(null);
    setHints(Array(wordLength).fill(null));
    setHintPickMode(false);
    isLocked.current = false;
  }, [wordLength]);

  // Откладывает текущую партию на полку своего формата, чтобы вернуться к ней
  // потом бесплатно. Слово дня не откладываем: у него своя логика, и уход из
  // него означает, что сегодня к нему уже не вернуться.
  // Недоигранная загадка ночи ложится на ту же полку под ключом hw.
  const stashCurrentRound = useCallback(() => {
    if (!solution || status !== GAME_STATUS.PLAYING) return;
    if (gameMode === 'halloween') {
      stashRound('hw', { solution, guesses, evaluations, hints, status, wordLength, gameMode, riddleShown });
      return;
    }
    if (gameMode !== 'normal') return;
    stashRound(wordLength, { solution, guesses, evaluations, hints, status, wordLength });
  }, [gameMode, solution, status, wordLength, guesses, evaluations, hints, riddleShown]);

  // Ставит партию в выбранном формате: возвращает отложенную, если она есть,
  // иначе берёт новое слово. Энергию НЕ трогает — гейт живёт в setGameLength,
  // а сюда возвращаются ещё и после дозаправки.
  const applyGameLength = useCallback((length, saved = null) => {
    const round = saved || takeRound(length);
    setWordLength(length);
    gameStartRef.current = Date.now();
    setSolution(round ? round.solution : pickNextWord(length, playerRef.current));
    setGuesses(round?.guesses || []);
    setEvaluations(round?.evaluations || []);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setShakeRow(false);
    setRevealRow(-1);
    setHints(round?.hints || Array(length).fill(null));
    setHintPickMode(false);
    setLastEarned(0);
    setLastEarnedBase(0);
    setLastEarnedDeco(0);
    setBoostedLastWin(false);
    setDoubledLastWin(false);
    setLastHw(null);
    isLocked.current = false;
  }, []);

  // ---------- Загадки ночи (ивент «Ночь тыкв») ----------
  // Ставит на поле загадку: отложенную (saved) или новое слово колоды.
  const applyRiddle = useCallback((word, saved = null) => {
    const len = word.length;
    setGameMode('halloween');
    setWordLength(len);
    gameStartRef.current = Date.now();
    setSolution(word);
    setGuesses(saved?.guesses || []);
    setEvaluations(saved?.evaluations || []);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setShakeRow(false);
    setRevealRow(-1);
    setHints(saved?.hints || Array(len).fill(null));
    setHintPickMode(false);
    setLastEarned(0);
    setLastEarnedBase(0);
    setLastEarnedDeco(0);
    setBoostedLastWin(false);
    setDoubledLastWin(false);
    setLastHw(null);
    setRiddleShown(Boolean(saved?.riddleShown));
    isLocked.current = false;
  }, []);

  // Вход в режим. Энергию не тратит. Идущую обычную партию откладывает на
  // полку (вернётся при выходе бесплатно), отложенную загадку — достаёт.
  // Слово дня в процессе: подтверждение спрашивает App, здесь день только
  // помечается пропущенным — exitDailyMode не зовём, он списал бы энергию
  // за обычную партию, которую игрок даже не увидит.
  const startHalloween = useCallback(() => {
    if (!halloweenActive() || startingRef.current) return false;
    if (gameMode === 'halloween') return true;
    if (gameMode === 'daily' && status === GAME_STATUS.PLAYING) {
      storage.set(STORAGE_KEYS.DAILY_SKIPPED, getDailyKey());
    }
    stashCurrentRound();
    startingRef.current = true;
    const saved = takeHalloweenRound() || takeHalloweenBackup();
    const word = saved ? normalizeWord(saved.solution) : nextRiddle(stats.stats.halloween?.seen).entry.word;
    applyRiddle(word, saved);
    setTimeout(() => { startingRef.current = false; }, 0);
    return true;
  }, [gameMode, status, stashCurrentRound, applyRiddle, stats.stats.halloween?.seen]);

  // Возврат из загадок в обычную игру, без анимации. Обычная партия берётся
  // по порядку: утренняя отложенная → с полки 5 букв → новое слово за
  // энергию. Энергии нет — пустое поле и окно энергии, как при выходе из
  // Слова дня.
  const leaveToNormal = useCallback(() => {
    setGameMode('normal');
    setLastHw(null);
    const backup = takeNormalBackup();
    if (backup && backup.gameMode !== 'halloween') {
      const len = (backup.wordLength === 4 || backup.wordLength === 6) ? backup.wordLength : 5;
      applyGameLength(len, backup);
      return;
    }
    const shelved = takeRound(5);
    if (shelved) { applyGameLength(5, shelved); return; }
    if (stats.consumeEnergy()) { applyGameLength(5); return; }
    setWordLength(5);
    setSolution(null);
    setGuesses([]);
    setEvaluations([]);
    setCurrent('');
    setStatus(GAME_STATUS.PLAYING);
    setHints(Array(5).fill(null));
    setRevealRow(-1);
    isLocked.current = false;
    setPendingLength(null);
    setEnergyModalOpen(true);
  }, [applyGameLength, stats]);

  // Выход из режима по кнопке. Недоигранная загадка ложится на полку и
  // вернётся при следующем входе.
  const exitHalloween = useCallback(() => {
    if (gameMode !== 'halloween' || startingRef.current) return;
    startingRef.current = true;
    stashCurrentRound();
    const go = () => {
      leaveToNormal();
      setIsClearing(false);
      startingRef.current = false;
    };
    if (guesses.length === 0 && status === GAME_STATUS.PLAYING) { go(); return; }
    setIsClearing(true);
    setTimeout(go, ANIM.CLEAR_TOTAL_MS);
  }, [gameMode, guesses.length, status, stashCurrentRound, leaveToNormal]);

  // «Следующая загадка» после конца партии. Как «Новая игра»: анимация
  // очистки и счётчик межстраничной рекламы. Ивент кончился, пока игрок
  // сидел в режиме, — уходим в обычную игру.
  const nextHalloweenRiddle = useCallback(() => {
    if (gameMode !== 'halloween' || startingRef.current) return;
    startingRef.current = true;
    const prev = normalizeWord(solution || '');
    maybeInterstitial().then(() => {
    setIsClearing(true);
    setTimeout(() => {
      if (halloweenActive()) {
        const seen = playerRef.current?.halloween?.seen || [];
        applyRiddle(nextRiddle(seen, prev).entry.word);
      } else {
        leaveToNormal();
      }
      setIsClearing(false);
      startingRef.current = false;
    }, ANIM.CLEAR_TOTAL_MS);
    });
  }, [gameMode, solution, maybeInterstitial, applyRiddle, leaveToNormal]);

  const reset = useCallback(() => {
    // Одна партия — одно списание. Двойной тап по «Новой игре» успевал пройти
    // проверку дважды до перерисовки: энергия уходила за две партии, а игрок
    // получал одну. Флаг снимаем, когда новая доска уже на месте.
    if (startingRef.current) return;
    // В режиме загадок «Новая игра» — это следующая загадка, без энергии.
    if (gameMode === 'halloween') { nextHalloweenRiddle(); return; }
    // Energy gate — only the canonical 5-letter mode costs energy.
    if (wordLength === 5) {
      if (!stats.consumeEnergy()) {
        setPendingLength(null); // здесь формат не меняется
        setEnergyModalOpen(true);
        return;
      }
    }
    startingRef.current = true;
    // A real new game is starting → count it toward the interstitial throttle.
    // Новое слово — только после ролика (см. maybeInterstitial).
    const empty = guesses.length === 0 && current.length === 0 && hints.every((h) => !h);
    maybeInterstitial().then(() => {
      if (empty) {
        gameStartRef.current = Date.now();
        setSolution(pickNextWord(wordLength, playerRef.current));
        setTimeout(() => { startingRef.current = false; }, 0);
        return;
      }
      setIsClearing(true);
      setTimeout(() => {
        performReset();
        setIsClearing(false);
        startingRef.current = false;
      }, ANIM.CLEAR_TOTAL_MS);
    });
  }, [guesses.length, current.length, hints, performReset, stats, wordLength, maybeInterstitial, gameMode, nextHalloweenRiddle]);

  // Called after the user successfully tops up energy from the modal. Spends
  // the freshly-acquired unit and starts a puzzle without a clearing animation
  // (there's nothing on the board yet).
  const startAfterRefuel = useCallback(() => {
    if (!stats.consumeEnergy()) return false;
    setEnergyModalOpen(false);
    // Дозаправка после отказа на переходе в режим 5 букв — ведём туда, куда
    // игрок и шёл, а не перезапускаем формат, в котором он застрял.
    if (pendingLength) {
      setPendingLength(null);
      // Партию, из которой игрок уходил, тоже кладём на полку — иначе она
      // потерялась бы при дозаправке.
      stashCurrentRound();
      if (gameMode === 'halloween') setGameMode('normal');
      applyGameLength(pendingLength);
      return true;
    }
    if (solution) {
      setIsClearing(true);
      setTimeout(() => {
        performReset();
        setIsClearing(false);
      }, ANIM.CLEAR_TOTAL_MS);
    } else {
      performReset();
    }
    return true;
  }, [stats, solution, performReset, applyGameLength, pendingLength, stashCurrentRound, gameMode]);

  // Закрыл модалку, не пополнив, — намерение сгорает: иначе следующая
  // дозаправка (из «Новой игры») утащила бы в режим 5 букв.
  const closeEnergyModal = useCallback(() => {
    setPendingLength(null);
    setEnergyModalOpen(false);
  }, []);

  // Switch the active word-length mode (4 | 5 | 6). If the requested length
  // matches the current one and a game is already in progress, this is a no-op
  // (call reset() for a re-roll).
  //
  // Энергия платится за НОВОЕ слово, а не за переход. Уходя, откладываем
  // текущую партию на полку; возвращаясь, достаём её обратно — бесплатно и
  // с теми же ходами, сколько бы раз игрок ни переключался. Списываем только
  // тогда, когда для режима на 5 букв приходится брать новое слово.
  //
  // Режимы 4/6 бесплатны намеренно: монет они не приносят, только опыт, и
  // служат выходом для игрока с пустой шкалой.
  const setGameLength = useCallback((length) => {
    if (length !== 4 && length !== 5 && length !== 6) return;
    if (gameMode !== 'halloween' && length === wordLength && solution && status === GAME_STATUS.PLAYING && guesses.length === 0) return;
    // Как и в reset: двойной тап по кнопке режима успевал списать дважды —
    // wordLength в том же такте ещё старый, и проверка выше не срабатывала.
    if (startingRef.current) return;

    const saved = takeRound(length);
    // Новое слово в основном режиме — платное. Возврат к отложенной партии
    // уже оплачен при её создании.
    if (length === 5 && !saved && !stats.consumeEnergy()) {
      // Запоминаем, куда игрок собирался: после дозаправки вернём именно
      // в режим на 5 букв, а не перезапустим текущий.
      setPendingLength(5);
      setEnergyModalOpen(true);
      return;
    }
    stashCurrentRound();
    // Смена формата — это выход из Слова дня по определению: оно всегда на
    // 5 букв. Без этого в сейве оставалась связка «режим Слово дня + 4/6
    // букв», и назавтра игрок получал её обратно.
    // То же с загадками ночи: выбор длины — это выход из ивентового режима.
    if (gameMode !== 'normal') setGameMode('normal');
    startingRef.current = true;
    applyGameLength(length, saved);
    setTimeout(() => { startingRef.current = false; }, 0);
  }, [wordLength, solution, status, guesses.length, stats, gameMode, applyGameLength, stashCurrentRound]);

  // Leave daily mode → restore a stashed normal puzzle if present, else
  // spend 1 energy and start a fresh normal round. If energy is empty,
  // pop the modal and leave the board cleared so reset can take over.
  const exitDailyMode = useCallback(() => {
    if (gameMode !== 'daily' || startingRef.current) return;
    startingRef.current = true;
    setGameMode('normal');
    // Снимаем с полки сразу: недоигранную вернём, доигранную helper выбросит.
    const backup = takeNormalBackup();

    // The board is full of the daily result — play the flip-close animation
    // before swapping in the next puzzle, mirroring the "Новая игра" reset.
    const applyNext = () => {
      if (backup) {
        const restoreLen = (backup.wordLength === 4 || backup.wordLength === 6) ? backup.wordLength : 5;
        setWordLength(restoreLen);
        setSolution(backup.solution);
        setGuesses(backup.guesses || []);
        setEvaluations(backup.evaluations || []);
        setStatus(backup.status || GAME_STATUS.PLAYING);
        setHints(backup.hints || Array(restoreLen).fill(null));
        setCurrent('');
        setRevealRow(-1);
        // Утром отложенной могла оказаться загадка ночи — возвращаем её режим.
        setGameMode(restoredMode(backup));
        setRiddleShown(Boolean(backup.riddleShown));
        isLocked.current = false;
        gameStartRef.current = Date.now();
        return;
      }
      if (stats.consumeEnergy()) {
        gameStartRef.current = Date.now();
        setSolution(pickNextWord(wordLength, playerRef.current));
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
    };

    // Следующая партия — только после ролика (см. maybeInterstitial).
    maybeInterstitial().then(() => {
      setIsClearing(true);
      setTimeout(() => {
        applyNext();
        setIsClearing(false);
        startingRef.current = false;
      }, ANIM.CLEAR_TOTAL_MS);
    });
  }, [gameMode, stats, wordLength, maybeInterstitial]);

  // Осознанный выход из Слова дня на полпути (игрок полез в доп. режимы).
  // Помечаем день пропущенным и уходим обычным путём выхода.
  const leaveDailyMode = useCallback(() => {
    if (gameMode !== 'daily') return;
    storage.set(STORAGE_KEYS.DAILY_SKIPPED, getDailyKey());
    exitDailyMode();
  }, [gameMode, exitDailyMode]);

  // If the player signs into an account mid-session (userId change → server
  // reconcile) that has ALREADY completed today's daily word, don't leave them
  // parked on an unfinished daily board carried over from the previous (e.g.
  // anonymous) identity — drop out of daily mode so the UI matches reality.
  useEffect(() => {
    if (!stats.ready) return;
    if (gameMode !== 'daily' || status !== GAME_STATUS.PLAYING) return;
    if (stats.stats.daily?.lastPlayedKey === getDailyKey()) {
      exitDailyMode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.ready, stats.stats.daily?.lastPlayedKey, gameMode, status]);

  // Watch an ad → credit the just-won reward a second time. One-shot per
  // round; further presses are ignored until the next puzzle starts.
  const doubleLastReward = useCallback(async () => {
    if (status !== GAME_STATUS.WON) return 'wrong_state';
    // doublingAd — состояние, и два вызова в одном такте оба видели бы false:
    // один просмотр рекламы засчитался бы дважды. Ref закрывается сразу, а
    // снимается в finally, иначе ранний выход заклинил бы кнопку навсегда.
    if (adBusyRef.current) return 'busy';
    if (doubledLastWin || doublingAd) return 'busy';
    adBusyRef.current = true;
    try {
      if (!lastEarned || lastEarned <= 0) return 'nothing';
      // Soft daily cap on ad-doubling — protects the coin economy.
      if ((stats.adsDoubleLeft ?? 0) <= 0) {
        showToast('Лимит удвоений за рекламу на сегодня исчерпан');
        return 'limit';
      }
      setDoublingAd(true);
      const r = await showRewardedAd();
      setDoublingAd(false);
      if (r !== 'rewarded') {
        showToast(rewardedFailText(r), r === 'closed' ? 1600 : 4000);
        return r;
      }
      // Re-check + tally against the cap (guards against races / stale closure).
      if (!stats.recordAdDouble?.()) {
        showToast('Лимит удвоений за рекламу на сегодня исчерпан');
        return 'limit';
      }
      stats.addCoins(lastEarned);
      // Server re-credits the stored last-win reward + tallies the daily cap.
      // (The "Щедрая реклама" +N ad-coin boost applies to energy ads only, not
      // to reward-doubling — otherwise doubling pays twice.)
      stats.redeemAdDoubleServer?.();
      setDoubledLastWin(true);
      showToast(`+${lastEarned} ${pluralCoins(lastEarned)} за просмотр!`);
      return 'ok';
    } finally {
      adBusyRef.current = false;
    }
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
    stats.spendHintServer?.('random');
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
    stats.spendHintServer?.('pick');
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

  // Открыть загадку ночи — платная подсказка, один раз на слово.
  const revealRiddle = useCallback(() => {
    if (gameMode !== 'halloween' || riddleShown || status !== GAME_STATUS.PLAYING) return false;
    if (!stats.spendCoins(HINT_COST.RIDDLE)) { showToast('Недостаточно монет'); return false; }
    setRiddleShown(true);
    stats.recordHintUsed();
    return true;
  }, [gameMode, riddleShown, status, stats, showToast]);

  // Загадка над полем — по загаданному слову: слова колоды уникальны.
  const riddle = useMemo(
    () => (gameMode === 'halloween' && solution ? getRiddle(normalizeWord(solution)) : null),
    [gameMode, solution]
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
    lastEarnedDeco,
    boostedLastWin,
    doubledLastWin,
    doublingAd,
    doubleLastReward,
    adsDoubleLeft: stats.adsDoubleLeft,
    gameMode,
    exitDailyMode,
    leaveDailyMode,
    // Загадки ночи (ивент «Ночь тыкв»)
    riddle,
    riddleShown,
    revealRiddle,
    lastHw,
    startHalloween,
    nextHalloweenRiddle,
    exitHalloween,
    wordLength,
    setGameLength,
    hints,
    hintPickMode,
    isClearing,
    keyboardStatuses,
    stats: stats.stats,
    ready: stats.ready,
    adoptYandexAccount: stats.adoptYandexAccount,
    resetStats: stats.reset,
    pendingDailyReward: stats.pendingDailyReward,
    claimDailyReward: stats.claimDailyReward,
    buyItem: stats.buyItem,
    setActiveBackground: stats.setActiveBackground,
    setTheme: stats.setTheme,
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
    claimAchievement: stats.claimAchievement,
    // Pet
    hatchPet: stats.hatchPet,
    renamePet: stats.renamePet,
    recordPetXp: stats.recordPetXp,
    addCoins: stats.addCoins,
    setPref: stats.setPref,
    feedPet: stats.feedPet,
    petBond: stats.petBond,
    petBondMax: stats.petBondMax,
    petGiftReady: stats.petGiftReady,
    petGifts: stats.petGifts,
    claimPetGift: stats.claimPetGift,
    buyDecoration: stats.buyDecoration,
    equipDecoration: stats.equipDecoration,
    unequipDecorationSlot: stats.unequipDecorationSlot,
    recordMiniGamePlay: stats.recordMiniGamePlay,
    petHunger: stats.petHunger,
    lastEnergyTickAt: stats.lastEnergyTickAt,
    // Energy
    energy: stats.energy,
    energyMax: stats.energyMax,
    energyModalOpen,
    pendingLength,
    openEnergyModal: () => setEnergyModalOpen(true),
    closeEnergyModal,
    buyEnergy: stats.buyEnergy,
    grantAdEnergy: stats.grantAdEnergy,
    adsEnergyLeft: stats.adsEnergyLeft,
    recordAdWatched: stats.recordAdWatched,
    startAfterRefuel
  };
}

