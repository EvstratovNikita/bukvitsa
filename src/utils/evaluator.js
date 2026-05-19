import { LETTER_STATUS } from '../constants/game.js';
import { normalizeWord } from '../data/words.js';

// Two-pass Wordle scoring with correct duplicate-letter handling.
// Pass 1: mark CORRECT and count remaining solution letters.
// Pass 2: mark PRESENT only while counts remain, else ABSENT.
export function evaluateGuess(guess, solution) {
  const g = normalizeWord(guess).split('');
  const s = normalizeWord(solution).split('');
  const result = new Array(g.length).fill(LETTER_STATUS.ABSENT);
  const counts = {};

  for (let i = 0; i < s.length; i++) {
    if (g[i] === s[i]) {
      result[i] = LETTER_STATUS.CORRECT;
    } else {
      counts[s[i]] = (counts[s[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < g.length; i++) {
    if (result[i] === LETTER_STATUS.CORRECT) continue;
    const ch = g[i];
    if (counts[ch] > 0) {
      result[i] = LETTER_STATUS.PRESENT;
      counts[ch] -= 1;
    }
  }

  return result;
}

// Merge per-letter statuses across guesses. CORRECT > PRESENT > ABSENT.
const RANK = {
  [LETTER_STATUS.CORRECT]: 3,
  [LETTER_STATUS.PRESENT]: 2,
  [LETTER_STATUS.ABSENT]: 1
};

export function mergeKeyboardStatuses(guesses, evaluations) {
  const map = {};
  for (let i = 0; i < guesses.length; i++) {
    const word = normalizeWord(guesses[i]);
    const evalRow = evaluations[i];
    if (!evalRow) continue;
    for (let j = 0; j < word.length; j++) {
      const ch = word[j];
      const next = evalRow[j];
      const prev = map[ch];
      if (!prev || RANK[next] > RANK[prev]) map[ch] = next;
    }
  }
  return map;
}
