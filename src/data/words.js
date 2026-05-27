// Curated list of 5-letter Russian common nouns (no names, no cities, no proper nouns).
// ё normalized to е. All lowercase.
export const WORDS = [
  'точка', 'песня', 'школа', 'книга', 'кошка', 'ручка', 'парта', 'доска',
  'замок', 'домик', 'лента', 'ветка', 'время', 'голос', 'рамка', 'мышка',
  'сумка', 'чашка', 'ложка', 'вилка', 'молот', 'волна', 'трава', 'цветы',
  'слово', 'место', 'дождь', 'ветер', 'облик', 'образ', 'народ', 'город',
  'метро', 'театр', 'отель', 'музей', 'сквер', 'ручей', 'озеро', 'песок',
  'камни', 'туман', 'метла', 'венок', 'жираф', 'зебра', 'сокол', 'ворон',
  'чайка', 'петух', 'сахар', 'перец', 'булка', 'салат', 'укроп', 'тыква',
  'арбуз', 'лимон', 'слива', 'вишня', 'груша', 'ягода', 'шмель', 'пчела',
  'комар', 'мошка', 'крыса', 'сурок', 'бобер', 'норка', 'шкура', 'хвост',
  'бровь', 'палец', 'плечо', 'живот', 'спина', 'волос', 'шапка', 'брюки',
  'шорты', 'блуза', 'майка', 'сапог', 'носок', 'брошь', 'блюдо', 'бокал',
  'рюмка', 'фужер', 'лилия', 'астра', 'лотос', 'ольха', 'сосна', 'пихта',
  'крупа', 'пшено', 'манка', 'блины', 'сырок', 'кефир', 'масло', 'какао',
  'отвар', 'кость', 'жилет', 'вальс', 'танго', 'опера', 'фильм', 'актер',
  'певец', 'наука', 'фокус', 'шашки', 'пешка', 'ладья', 'ферзь', 'кубик',
  'санки', 'горка', 'каток', 'лесть', 'честь', 'право', 'закон', 'устав',
  'цифра', 'число', 'сумма', 'рубль', 'налог', 'касса', 'вклад', 'петля',
  'строй', 'битва', 'война', 'пушка', 'ружье', 'бомба', 'сабля', 'копье',
  'кубок', 'страх', 'тоска', 'шепот', 'танец', 'гамма', 'рояль', 'труба',
  'бубен', 'шатер', 'крыша', 'стена', 'крыло', 'бочка', 'кадка', 'ведро',
  'лейка', 'совок', 'веник', 'щетка', 'губка', 'влага', 'грязь', 'пепел',
  'огонь', 'искра', 'пламя', 'мираж', 'лопух', 'уксус', 'запах', 'форма',
  'линия', 'конус', 'ребро', 'грань', 'длина', 'объем', 'масса', 'центр',
  'перед', 'вывод', 'совет', 'ответ', 'фраза', 'абзац', 'текст', 'буква',
  'видео', 'сцена', 'сюжет', 'герой', 'финал', 'конец', 'сутки', 'месяц',
  'эпоха', 'сезон', 'весна', 'осень', 'вечер', 'закат', 'жарка', 'варка',
  'учеба', 'почет', 'слава'
];

import { VALID_GUESSES_SET } from './validGuesses.js';
import { WORDS_4 } from './words4.js';
import { WORDS_6 } from './words6.js';

export const normalizeWord = (w) =>
  (w || '').toLowerCase().replace(/ё/g, 'е').trim();

const ANSWERS_5 = new Set(WORDS.map(normalizeWord));
const ANSWERS_4 = new Set(WORDS_4.map(normalizeWord));
const ANSWERS_6 = new Set(WORDS_6.map(normalizeWord));

const CYRILLIC_ONLY = /^[а-я]+$/;

// Length-aware validation. For 5 we keep the full OpenCorpora dictionary
// + answers as a safety net. For 4 and 6 we don't ship a big dictionary
// (yet), so we accept any all-cyrillic string of the right length plus
// the answer pool — a lenient mode so players can actually probe.
export function isValidWord(w, length = 5) {
  const n = normalizeWord(w);
  if (n.length !== length) return false;
  if (length === 5) return VALID_GUESSES_SET.has(n) || ANSWERS_5.has(n);
  if (length === 4) return CYRILLIC_ONLY.test(n) || ANSWERS_4.has(n);
  if (length === 6) return CYRILLIC_ONLY.test(n) || ANSWERS_6.has(n);
  return false;
}

function poolForLength(length) {
  if (length === 4) return WORDS_4;
  if (length === 6) return WORDS_6;
  return WORDS;
}

export const pickRandomWord = (rng = Math.random, length = 5) => {
  const pool = poolForLength(length);
  return pool[Math.floor(rng() * pool.length)];
};
