import { activeEvent } from './events.js';
import { getEvent, riddleOf } from '../data/events/index.js';
import { normalizeWord } from '../data/words.js';

// Партии сезонных ивентов: какие из сохранённых ещё живы. Чистые функции —
// их проверяет scripts/test-events.mjs, useGame только вызывает.

// gameMode партии ивента — id ивента ('halloween', 'winter').
export const isEventMode = (mode) => Boolean(getEvent(mode));

// Партия ивента жива, только пока идёт именно этот ивент и слово есть в его
// колоде: после конца ивента (или в чужой ивент) отложенная загадка не должна
// вернуть игрока в пропавший режим. activeId — id идущего ивента (null — нет).
export function isLiveEventRound(round, activeId = activeEvent()?.id ?? null) {
  const id = round?.gameMode;
  if (!isEventMode(id) || id !== activeId) return false;
  return Boolean(riddleOf(getEvent(id), normalizeWord(round.solution || '')));
}

// Режим, в который возвращает сохранённая партия (кроме Слова дня).
export const restoredMode = (round) => (isEventMode(round?.gameMode) ? round.gameMode : 'normal');
