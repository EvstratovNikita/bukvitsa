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

// player — stats игрока (played, currentStreak). rng — для тестов.
export function pickNextWord(length = 5, player = null, rng = Math.random) {
  const pool = poolForLength(length);
  const all = storage.get(HISTORY_KEY, {}) || {};
  const entry = all[length] || {};
  const recent = Array.isArray(entry.words) ? entry.words : [];

  const blocked = new Set(recent);
  if (length === 5) blocked.add(normalizeWord(getDailyWord()));
  const fresh = pool.filter((w) => !blocked.has(normalizeWord(w)));

  const tier = chooseTier(player, entry.lastTier, rng);
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
// ему сгорать на ~400 партий.
export function rememberWord(word, length = normalizeWord(word).length) {
  const w = normalizeWord(word);
  if (!w) return;
  const pool = poolForLength(length);
  const all = storage.get(HISTORY_KEY, {}) || {};
  const recent = Array.isArray(all[length]?.words) ? all[length].words : [];
  const keep = Math.max(1, Math.floor(pool.length * NO_REPEAT_SHARE));
  const words = [...recent.filter((x) => x !== w), w].slice(-keep);
  storage.set(HISTORY_KEY, { ...all, [length]: { words, lastTier: wordTier(w, length) } });
}
