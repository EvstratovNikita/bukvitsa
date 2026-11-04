// Русский пакет слов. Порядок WORDS задаёт Слово дня — не менять.
import { WORDS, WORDS_5_EXTRA } from './words5.js';
import { WORDS_4 } from './words4.js';
import { WORDS_6 } from './words6.js';
import { VALID_GUESSES_SET } from './validGuesses.js';
import { VALID_GUESSES_4_SET, VALID_GUESSES_6_SET } from './validGuesses46.js';
import { EXTRA_GUESSES } from './validGuessesExtra.js';
import { wordTier } from './wordTiers.js';

const norm = (w) => w.toLowerCase().replace(/ё/g, 'е').trim();
const WORDS_5_ALL = [...WORDS, ...WORDS_5_EXTRA];
const ANSWERS = {
  4: new Set(WORDS_4.map(norm)),
  5: new Set(WORDS_5_ALL.map(norm)),
  6: new Set(WORDS_6.map(norm))
};
const GUESSES = { 4: VALID_GUESSES_4_SET, 5: VALID_GUESSES_SET, 6: VALID_GUESSES_6_SET };
const POOLS = { 4: WORDS_4, 5: WORDS_5_ALL, 6: WORDS_6 };

export const PACK = {
  lang: 'ru',
  alphabet: /^[а-я]+$/,
  letter: /^[а-яё]$/i,
  pool: (len) => POOLS[len] || POOLS[5],
  dailyPool: WORDS,
  isGuess: (n, len) => Boolean(EXTRA_GUESSES[len]?.has(n) || GUESSES[len]?.has(n) || ANSWERS[len]?.has(n)),
  tier: wordTier,
  // Слово дня живёт по Москве: у всех игроков день меняется в один момент.
  dayOffsetMs: 3 * 60 * 60 * 1000,
  epoch: '2026-05-26',
  historySuffix: ''
};
