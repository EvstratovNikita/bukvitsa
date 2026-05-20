export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

export const LETTER_STATUS = {
  EMPTY: 'empty',
  TBD: 'tbd',
  ABSENT: 'absent',
  PRESENT: 'present',
  CORRECT: 'correct'
};

export const GAME_STATUS = {
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost'
};

export const STORAGE_KEYS = {
  STATS: 'wordle-ru:stats',
  GAME_STATE: 'wordle-ru:game'
};

export const KEYBOARD_ROWS = [
  ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
  ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
  ['BACK', 'Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю', 'ENTER']
];

export const ANIM = {
  FLIP_MS: 500,
  FLIP_STAGGER_MS: 280,
  REVEAL_TOTAL_MS: 500 + 280 * (WORD_LENGTH - 1)
};

// Coin reward per attempts-used to win. Index 0 = 1st try.
export const COIN_REWARD = [8, 5, 4, 3, 2, 1];

export const rewardFor = (attemptsUsed) =>
  COIN_REWARD[attemptsUsed - 1] ?? 0;

export const HINT_COST = {
  RANDOM: 10,
  PICK: 15
};
