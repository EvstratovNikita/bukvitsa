// Слова текущего языка. Сами списки — в data/ru и data/en.
import { getPack } from './pack.js';

export const normalizeWord = (w) =>
  (w || '').toLowerCase().replace(/ё/g, 'е').trim();

// Длина слова → проверка словарём. Раньше в режимах 4 и 6 принималась любая
// кириллица — игрок мог открыть поле словом «аааа».
export function isValidWord(w, length = 5) {
  const n = normalizeWord(w);
  if (n.length !== length) return false;
  return getPack().isGuess(n, length);
}

export const poolForLength = (length) => getPack().pool(length);

export const pickRandomWord = (rng = Math.random, length = 5) => {
  const pool = poolForLength(length);
  return pool[Math.floor(rng() * pool.length)];
};

// Слово этого языка? Доска из облака могла остаться от другого языка: игрок
// Яндекса сменил язык, и партию со словом «точка» на QWERTY не доиграть.
export const isWordOfLang = (w) => getPack().alphabet.test(normalizeWord(w));
