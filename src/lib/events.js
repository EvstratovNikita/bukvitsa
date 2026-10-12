import { isEmbedded } from './platform.js';

// Сезонные ивенты. Сейчас один — «Ночь тыкв» к Хэллоуину 2026.
//
// Ивент включается и выключается только здесь: всё остальное спрашивает
// halloweenActive() и дат не знает. Границы — полночь по Москве: под это
// время VK ставит подборки, и игроку «до 3.11» значит до конца 3 ноября.
//
// Только на площадках (isEmbedded). На вебе экономику проверяет сервер, и
// новые предметы пришлось бы заводить ещё и в базе — ивента там нет.
//
// Предпросмотр до старта — для нас и для редакции VK: в адрес добавляют
// #halloween (vk.com/app54762016#halloween — VK передаёт хэш во фрейм) или
// ?event=halloween. Флаг живёт до конца сессии вкладки; #halloween-off снимает.
// Предпросмотр работает и вне площадок — так ивент видно на локальной сборке.

export const HALLOWEEN = {
  id: 'halloween',
  start: Date.parse('2026-10-24T00:00:00+03:00'),
  end: Date.parse('2026-11-04T00:00:00+03:00'),
  // Последний день ивента — для плашек «до 3.11».
  endLabel: '3.11'
};

const PREVIEW_KEY = 'bukv:event-preview';

export const halloweenWindowOpen = (now = Date.now()) =>
  now >= HALLOWEEN.start && now < HALLOWEEN.end;

// Сколько суток осталось, считая текущие: в последний день — 1.
export const daysLeftAt = (now = Date.now()) =>
  Math.max(0, Math.ceil((HALLOWEEN.end - now) / 86400000));

// Читается один раз при загрузке модуля: хэш потом может смениться (VK
// меняет его при навигации), а ивент не должен то появляться, то пропадать.
function readPreviewFlag() {
  if (typeof window === 'undefined') return false;
  try {
    const { hash, search } = window.location;
    const params = new URLSearchParams(search);
    if (hash === '#halloween-off' || params.get('event') === 'off') {
      window.sessionStorage.removeItem(PREVIEW_KEY);
      return false;
    }
    if (hash === '#halloween' || params.get('event') === 'halloween') {
      window.sessionStorage.setItem(PREVIEW_KEY, 'halloween');
      return true;
    }
    return window.sessionStorage.getItem(PREVIEW_KEY) === 'halloween';
  } catch {
    return false;
  }
}

// Сборка для dev-адреса VK (npm run deploy:vk:dev:halloween) показывает ивент
// всегда: на телефоне метку в адрес не поставить, а dev-версию видят только
// администраторы с «Режимом разработки». Боевая сборка флага не получает.
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const preview = ENV.VITE_EVENT_PREVIEW === 'halloween' || readPreviewFlag();

export function halloweenActive(now = Date.now()) {
  return preview || (isEmbedded && halloweenWindowOpen(now));
}

export function halloweenDaysLeft(now = Date.now()) {
  // В предпросмотре до старта показываем полную длину ивента, а не «47 дней».
  if (now < HALLOWEEN.start) return Math.ceil((HALLOWEEN.end - HALLOWEEN.start) / 86400000);
  return daysLeftAt(now);
}
