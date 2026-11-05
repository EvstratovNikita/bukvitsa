// Playgama Bridge (wiki.playgama.com/playgama/bridge-sdk). Скрипт подключается
// тегом в index.html только в сборке --mode playgama; вне её модуль молчит.
// Сам Bridge разводит вызовы по партнёрским площадкам, а без площадки работает
// как заглушка — поэтому локально всё проверяемо.
//
// Требования, которые здесь выполняются (game-requirements):
//   шаг 2 — initialize до всего остального (lifecycle.js → main.jsx);
//   шаг 4 — сохранения только через bridge.storage: при старте один get,
//           запись пачкой и не чаще раза в десятки секунд;
//   шаг 5 — пауза и звук платформы;
//   шаг 7 — своих счётчиков рекламы нет, частоту решает Bridge.
import { blockSound } from './sound.js';
import { setClockPaused } from './gameClock.js';

const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const isPlaygamaBuild = ENV.VITE_PLATFORM === 'playgama';

const b = () => (typeof window !== 'undefined' ? window.bridge : null);
const SAVE_KEY = 'hootword_save';
const SAVE_VERSION = 1;
const FLUSH_MS = 20000;

let inited = false;
let values = {};
let dirty = false;
let timer = null;

async function hydrate() {
  try {
    const [raw] = await b().storage.get([SAVE_KEY]);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    // Нечитаемое сохранение — новый игрок, а не ошибка, мешающая играть.
    values = parsed && typeof parsed.data === 'object' && parsed.data ? parsed.data : {};
  } catch (e) {
    console.warn('[playgama] load failed', e);
    values = {};
  }
}

export async function flushSave() {
  if (!inited || !dirty) return;
  dirty = false;
  clearTimeout(timer);
  timer = null;
  try {
    await b().storage.set([SAVE_KEY], [JSON.stringify({ version: SAVE_VERSION, data: values })]);
  } catch (e) {
    dirty = true;
    console.warn('[playgama] save failed', e);
  }
}

// То же, что localStorage, но в памяти: чтение и запись синхронны, на площадку
// изменения уходят пачкой (utils/storage.js).
export const pgStore = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(values, k) ? values[k] : null),
  setItem: (k, v) => {
    if (values[k] === v) return;
    values[k] = v;
    dirty = true;
    if (!timer) timer = setTimeout(flushSave, FLUSH_MS);
  },
  removeItem: (k) => {
    if (!(k in values)) return;
    delete values[k];
    dirty = true;
    if (!timer) timer = setTimeout(flushSave, FLUSH_MS);
  }
};

export async function initPlaygama() {
  if (!isPlaygamaBuild || !b()) return false;
  try {
    await b().initialize();
    inited = true;
    await hydrate();
    const { EVENT_NAME, platform } = b();
    // Шаг 3: язык берём у площадки. В заявке и в архиве только английский, а он же
    // запасной язык (п. 3.4.1), поэтому любой ответ сейчас ведёт к нему.
    console.info('[playgama] platform language:', platform.language);
    blockSound('platform', platform.isAudioEnabled === false);
    platform.on?.(EVENT_NAME.AUDIO_STATE_CHANGED, (on) => blockSound('platform', !on));
    platform.on?.(EVENT_NAME.PAUSE_STATE_CHANGED, (paused) => {
      blockSound('pause', paused);
      setClockPaused(paused);
      if (paused) flushSave();
    });
    // Сохраниться, пока страницу не закрыли.
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
  } catch (e) {
    console.warn('[playgama] initialize failed', e);
  }
  return inited;
}

const send = (m) => {
  if (inited) { try { b().platform.sendMessage(m); } catch { /* площадка не поддерживает */ } }
};
// Сначала game_ready, потом состояние партии: первое поле игра показывает ещё под
// заставкой, и без этой очереди gameplay_started уходил раньше готовности.
let ready = false;
let playing = false;
export const pgReady = () => {
  ready = true;
  send('game_ready');
  if (playing) send('gameplay_started');
};
export const pgGameplayStart = () => {
  if (playing) return;
  playing = true;
  if (ready) send('gameplay_started');
};
export const pgGameplayStop = () => {
  if (!playing) return;
  playing = false;
  if (ready) send('gameplay_stopped');
};

export const pgRewardedSupported = () => Boolean(inited && b().advertisement?.isRewardedSupported);

const adOn = () => { blockSound('ad', true); setClockPaused(true); flushSave(); };
const adOff = () => { blockSound('ad', false); setClockPaused(false); };

// Ролик за награду: награда — только по состоянию rewarded, а не по закрытию
// (требование 2.2.5). Ответ: 'rewarded' | 'closed' | 'failed'.
export function pgShowRewarded() {
  if (!inited) return Promise.resolve('failed');
  const ad = b().advertisement;
  return new Promise((resolve) => {
    let rewarded = false;
    adOn();
    const finish = (r) => {
      ad.off?.(b().EVENT_NAME.REWARDED_STATE_CHANGED, onState);
      adOff();
      resolve(r);
    };
    const onState = (state) => {
      if (state === 'rewarded') rewarded = true;
      else if (state === 'closed') finish(rewarded ? 'rewarded' : 'closed');
      else if (state === 'failed') finish('failed');
    };
    ad.on(b().EVENT_NAME.REWARDED_STATE_CHANGED, onState);
    ad.showRewarded();
  });
}

// Игра только отмечает естественную паузу. Bridge может промолчать, если время
// ещё не пришло: тогда партия не должна ждать ролик.
export function pgShowInterstitial() {
  if (!inited) return Promise.resolve(false);
  const ad = b().advertisement;
  return new Promise((resolve) => {
    let opened = false;
    let started = false;
    const finish = (r) => {
      clearTimeout(idle);
      ad.off?.(b().EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
      if (started) adOff();
      resolve(r);
    };
    const onState = (state) => {
      if ((state === 'loading' || state === 'opened') && !started) { started = true; adOn(); clearTimeout(idle); }
      if (state === 'opened') opened = true;
      else if (state === 'closed') finish(opened);
      else if (state === 'failed') finish(false);
    };
    const idle = setTimeout(() => finish(false), 1200);
    ad.on(b().EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
    ad.showInterstitial();
  });
}
