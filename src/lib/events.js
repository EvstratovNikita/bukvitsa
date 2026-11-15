import { isEmbedded } from './platform.js';

// Календарь сезонных ивентов. Даты живут только здесь: остальной код
// спрашивает eventActive(id) / activeEvent() и дат не знает. Содержимое ивента
// (загадки, лента, тема) — в data/events/<id>.js.
//
// Границы — полночь по Москве: под это время VK ставит подборки, и игроку
// «до 3.11» значит до конца 3 ноября.
//
// Только на площадках (isEmbedded). На вебе экономику проверяет сервер, и
// новые предметы пришлось бы заводить ещё и в базе — ивентов там нет.
//
// Предпросмотр до старта — для нас и для редакции VK: в адрес добавляют
// #<id> (vk.com/app54762016#winter — VK передаёт хэш во фрейм) или
// ?event=<id>. Флаг живёт до конца сессии вкладки, одновременно — один ивент:
// новый флаг заменяет старый. #<id>-off или ?event=off снимают его.
// Предпросмотр работает и вне площадок — так ивент видно на локальной сборке.

export const HALLOWEEN = {
  id: 'halloween',
  start: Date.parse('2026-10-24T00:00:00+03:00'),
  end: Date.parse('2026-11-04T00:00:00+03:00'),
  // Последний день ивента — для плашек «до 3.11».
  endLabel: '3.11'
};

export const WINTER = {
  id: 'winter',
  start: Date.parse('2026-12-26T00:00:00+03:00'),
  end: Date.parse('2027-01-12T00:00:00+03:00'),
  endLabel: '11.01'
};

export const EVENTS = [HALLOWEEN, WINTER];
const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
export const eventDates = (id) => BY_ID.get(id) || null;

const PREVIEW_KEY = 'bukv:event-preview';

export function eventWindowOpen(id, now = Date.now()) {
  const e = BY_ID.get(id);
  return Boolean(e) && now >= e.start && now < e.end;
}

// Сколько суток осталось, считая текущие: в последний день — 1.
export function eventDaysLeftAt(id, now = Date.now()) {
  const e = BY_ID.get(id);
  return e ? Math.max(0, Math.ceil((e.end - now) / 86400000)) : 0;
}

// Флаг предпросмотра из адреса. Чистая функция (тестируется в node):
// location — { hash, search }, stored — что уже лежит в sessionStorage.
// Возвращает id ивента или null; undefined в поле store значит «не трогать».
export function parsePreview({ hash = '', search = '' } = {}, stored = null) {
  const param = new URLSearchParams(search).get('event');
  const tag = hash.startsWith('#') ? hash.slice(1) : '';
  if (param === 'off' || (tag.endsWith('-off') && BY_ID.has(tag.slice(0, -4)))) return null;
  if (BY_ID.has(param)) return param;
  if (BY_ID.has(tag)) return tag;
  return BY_ID.has(stored) ? stored : null;
}

// Читается один раз при загрузке модуля: хэш потом может смениться (VK
// меняет его при навигации), а ивент не должен то появляться, то пропадать.
function readPreviewFlag() {
  if (typeof window === 'undefined') return null;
  try {
    const id = parsePreview(window.location, window.sessionStorage.getItem(PREVIEW_KEY));
    if (id) window.sessionStorage.setItem(PREVIEW_KEY, id);
    else window.sessionStorage.removeItem(PREVIEW_KEY);
    return id;
  } catch {
    return null;
  }
}

// Сборка для dev-адреса VK (npm run deploy:vk:dev:<id>) показывает ивент
// всегда: на телефоне метку в адрес не поставить, а dev-версию видят только
// администраторы с «Режимом разработки». Боевая сборка флага не получает.
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const preview = BY_ID.has(ENV.VITE_EVENT_PREVIEW) ? ENV.VITE_EVENT_PREVIEW : readPreviewFlag();

export function eventActive(id, now = Date.now()) {
  if (preview) return preview === id;
  return isEmbedded && eventWindowOpen(id, now);
}

// Идущий ивент (или тот, что в предпросмотре). Окна не пересекаются.
export function activeEvent(now = Date.now()) {
  return EVENTS.find((e) => eventActive(e.id, now)) || null;
}

export function eventDaysLeft(id, now = Date.now()) {
  const e = BY_ID.get(id);
  if (!e) return 0;
  // В предпросмотре до старта показываем полную длину ивента, а не «47 дней».
  if (now < e.start) return Math.ceil((e.end - e.start) / 86400000);
  return eventDaysLeftAt(id, now);
}

// Прежние имена «Ночи тыкв» — для кода и тестов, написанных под один ивент.
export const halloweenWindowOpen = (now = Date.now()) => eventWindowOpen('halloween', now);
export const daysLeftAt = (now = Date.now()) => eventDaysLeftAt('halloween', now);
export const halloweenActive = (now = Date.now()) => eventActive('halloween', now);
export const halloweenDaysLeft = (now = Date.now()) => eventDaysLeft('halloween', now);
