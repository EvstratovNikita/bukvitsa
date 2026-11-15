// Реестр описаний ивентов. Даты — в lib/events.js, здесь содержимое.
import { HALLOWEEN_EVENT } from './halloween.js';
import { WINTER_EVENT } from './winter.js';

export const EVENT_DEFS = [HALLOWEEN_EVENT, WINTER_EVENT];
const BY_ID = new Map(EVENT_DEFS.map((d) => [d.id, d]));

export const getEvent = (id) => BY_ID.get(id) || null;

// Конец ленты — число единиц на последней ступени.
export const trackMax = (def) => def.track[def.track.length - 1].need;

// Предметы ленты (без монет) и ступень по id предмета.
export const eventItems = (def) => def.track.filter((s) => s.ref);
export const stepFor = (def, ref) => def.track.find((s) => s.ref === ref) || null;

// Загадка по слову (null — слово не из колоды ивента).
const riddleMaps = new Map(EVENT_DEFS.map((d) => [d.id, new Map(d.riddles.map((r) => [r.word, r]))]));
export const riddleOf = (def, word) => riddleMaps.get(def?.id)?.get(word) || null;
