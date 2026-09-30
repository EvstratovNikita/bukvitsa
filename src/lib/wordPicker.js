// Выбор слова для обычной партии (и режимов 4/6).
//
// Раньше слово бралось случайно из пула с возвратом: в пуле ~220 слов, так
// что повтор через 15–20 партий был почти неизбежен, а изредка слово
// выпадало дважды подряд. Теперь:
//   • без повторов — помним последние ~3/4 доигранных слов этой длины
//     (rememberWord) и из них не берём;
//     Слово дня тоже не загадываем в обычной партии;
//   • по сложности — слова размечены (data/wordTiers.js), уровень для
//     следующей партии зависит от игрока: новичку лёгкие, после проигрыша —
//     передышка, на серии побед — чаще сложные, два сложных подряд не бывает.
//
// История — в localStorage этого устройства (по длине слова). Она не едет
// в облако: на другом устройстве повтор возможен, но не подряд.

import { normalizeWord, poolForLength } from '../data/words.js';
import { wordTier } from '../data/wordTiers.js';
import { getDailyWord } from '../data/dailyWord.js';
import { storage } from '../utils/storage.js';

const HISTORY_KEY = 'wordle-ru:word-history';
// Сколько последних слов не повторять — доля пула.
const NO_REPEAT_SHARE = 0.75;
// Столько первых партий — только лёгкие слова.
const NEWBIE_GAMES = 5;

function chooseTier(player, lastTier, rng) {
  const played = player?.played || 0;
  if (played < NEWBIE_GAMES) return 'easy';
  const streak = player?.currentStreak || 0;
  let w;
  if (streak === 0) w = { easy: 0.55, medium: 0.45, hard: 0 };       // только что проиграл
  else if (streak >= 3) w = { easy: 0.2, medium: 0.45, hard: 0.35 }; // в ударе
  else w = { easy: 0.3, medium: 0.5, hard: 0.2 };
  if (lastTier === 'hard') w = { ...w, hard: 0 };
  const total = w.easy + w.medium + w.hard;
  let r = rng() * total;
  for (const t of ['easy', 'medium', 'hard']) {
    r -= w[t];
    if (r < 0) return t;
  }
  return 'medium';
}

// Результаты режима — свои у каждой длины: общие played/currentStreak в
// статистике считают победы на 4, 5 и 6 буквах вместе, и серия в одном
// режиме утяжеляла слова в другом. Счётчики живут в истории слов. Пока их
// нет (игрок с прошлой версии), для 5 букв берём общую статистику — иначе
// опытному игроку снова пошли бы «новичковые» лёгкие слова; для 4 и 6
// режим с нуля, первые партии в нём — лёгкие.
function modeResults(entry, length, player) {
  if (typeof entry.played === 'number') return { played: entry.played, currentStreak: entry.streak || 0 };
  if (length === 5 && player) return { played: player.played || 0, currentStreak: player.currentStreak || 0 };
  return { played: 0, currentStreak: 0 };
}

// player — общая статистика игрока (played, currentStreak), запасной
// источник для 5 букв, см. modeResults. rng — для тестов.
export function pickNextWord(length = 5, player = null, rng = Math.random) {
  const pool = poolForLength(length);
  const all = storage.get(HISTORY_KEY, {}) || {};
  const entry = all[length] || {};
  const recent = Array.isArray(entry.words) ? entry.words : [];

  const blocked = new Set(recent);
  if (length === 5) blocked.add(normalizeWord(getDailyWord()));
  const fresh = pool.filter((w) => !blocked.has(normalizeWord(w)));

  const tier = chooseTier(modeResults(entry, length, player), entry.lastTier, rng);
  const ofTier = (t) => fresh.filter((w) => wordTier(normalizeWord(w), length) === t);
  // Нужный уровень весь недавно был — берём соседний (для лёгкого и
  // сложного это средний), потом любой, кроме сложного после сложного;
  // и уж совсем на крайний случай (не бывает при доле < 1) — весь пул.
  const noHard = (list) => (entry.lastTier === 'hard' ? list.filter((w) => wordTier(normalizeWord(w), length) !== 'hard') : list);
  const candidates = [ofTier(tier), ofTier('medium'), noHard(fresh), fresh, pool].find((l) => l.length);
  return candidates[Math.floor(rng() * candidates.length)];
}

// Слово попадает в историю, когда партию доиграли, а не когда его выбрали:
// при запуске слово выбирается, а кнопка «Играть» в меню может тут же
// поставить партию заново — первое слово игрок так и не увидел, и незачем
// ему сгорать на ~400 партий. Заодно считаем результаты режима.
// won — партия выиграна; player — общая статистика (см. modeResults).
export function rememberWord(word, won = false, player = null) {
  const w = normalizeWord(word);
  if (!w) return;
  const length = w.length;
  const pool = poolForLength(length);
  const all = storage.get(HISTORY_KEY, {}) || {};
  const entry = all[length] || {};
  const recent = Array.isArray(entry.words) ? entry.words : [];
  // Уже записано: доигранная партия восстановилась после перезагрузки —
  // второй раз её не считаем.
  if (recent[recent.length - 1] === w) return;
  const keep = Math.max(1, Math.floor(pool.length * NO_REPEAT_SHARE));
  const words = [...recent.filter((x) => x !== w), w].slice(-keep);
  // Первая запись для 5 букв у игрока с прошлой версии — переносим общую
  // статистику как есть: к этому моменту она уже учла эту партию
  // (recordWin/recordLoss срабатывают раньше), прибавлять ещё раз не нужно.
  const seeded = typeof entry.played !== 'number' && length === 5 && player;
  const prev = modeResults(entry, length, player);
  const played = seeded ? Math.max(1, prev.played) : prev.played + 1;
  const streak = !won ? 0 : seeded ? Math.max(1, prev.currentStreak) : prev.currentStreak + 1;
  storage.set(HISTORY_KEY, {
    ...all,
    [length]: { words, lastTier: wordTier(w, length), played, streak }
  });
}
