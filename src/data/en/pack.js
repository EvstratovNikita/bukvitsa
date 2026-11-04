// Английский пакет слов (scripts/gen-en-words.mjs). Правила те же, что у
// русского: уровни сложности, допустимые догадки, Слово дня из 5 букв.
import { ANSWERS, GUESSES } from './words.js';

const list = (s) => (s ? s.split(' ') : []);
const TIERS = {};
const POOLS = {};
const ANSWER_SETS = {};
const GUESS_SETS = {};
for (const len of [4, 5, 6]) {
  const a = ANSWERS[len];
  TIERS[len] = { easy: new Set(list(a.easy)), hard: new Set(list(a.hard)) };
  POOLS[len] = [...list(a.easy), ...list(a.medium), ...list(a.hard)];
  ANSWER_SETS[len] = new Set(POOLS[len]);
  GUESS_SETS[len] = new Set(list(GUESSES[len]));
}

export const PACK = {
  lang: 'en',
  alphabet: /^[a-z]+$/,
  letter: /^[a-z]$/i,
  pool: (len) => POOLS[len] || POOLS[5],
  // Слово дня — без редких слов: его играют все, и оно должно быть честным.
  dailyPool: [...list(ANSWERS[5].easy), ...list(ANSWERS[5].medium)],
  isGuess: (n, len) => Boolean(GUESS_SETS[len]?.has(n) || ANSWER_SETS[len]?.has(n)),
  tier: (word, len = word.length) => {
    const t = TIERS[len];
    if (!t) return 'medium';
    if (t.easy.has(word)) return 'easy';
    return t.hard.has(word) ? 'hard' : 'medium';
  },
  // Игроки по всему миру — день меняется по UTC.
  dayOffsetMs: 0,
  epoch: '2026-11-04',
  historySuffix: ':en'
};
