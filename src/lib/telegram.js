// Telegram Mini App и реклама Adsgram (docs.adsgram.ai). Скрипты подключаются
// в index.html сборкой --mode telegram. Номера блоков Adsgram — переменные
// VITE_ADSGRAM_REWARD_BLOCK и VITE_ADSGRAM_INTER_BLOCK: заводятся в кабинете.
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};

const wa = () => (typeof window !== 'undefined' ? window.Telegram?.WebApp : null);
export const inTelegram = () => Boolean(wa()?.initData);

export function initTelegram() {
  if (!inTelegram()) return;
  const app = wa();
  try {
    app.ready();
    app.expand();
    // Свайп вниз закрывает приложение и мешает прокрутке окон (Bot API 7.7+).
    app.disableVerticalSwipes?.();
  } catch (e) {
    console.warn('[telegram] init', e);
  }
}

// Ссылка на игру для «Поделиться»: t.me/<бот>/<приложение>.
export const TG_APP_LINK = ENV.VITE_TG_APP_LINK || '';

// ---------- Реклама ----------
const adControllers = {};
function adController(blockId) {
  if (!blockId || !window.Adsgram) return null;
  adControllers[blockId] ||= window.Adsgram.init({ blockId });
  return adControllers[blockId];
}

export const tgRewardedSupported = () => Boolean(ENV.VITE_ADSGRAM_REWARD_BLOCK);

// then — досмотрел до конца; catch — ошибка или закрыл раньше (result.error).
export async function tgShowRewarded() {
  const ad = adController(ENV.VITE_ADSGRAM_REWARD_BLOCK);
  if (!ad) return 'failed';
  try {
    const r = await ad.show();
    return r?.done ? 'rewarded' : 'closed';
  } catch (r) {
    if (r?.error) return /no ?ad|no fill/i.test(String(r.description || '')) ? 'nofill' : 'failed';
    return 'closed';
  }
}

export async function tgShowInterstitial() {
  const ad = adController(ENV.VITE_ADSGRAM_INTER_BLOCK);
  if (!ad) return false;
  try { await ad.show(); return true; } catch { return false; }
}

// ---------- Облако ----------
// CloudStorage: значение до 4096 символов, поэтому режем как в VK: сначала
// части, потом meta — обрыв записи оставит прежний целый снимок.
const META = 'hw_meta';
const part = (i) => `hw_${i}`;
const CHUNK = 3800;
const MAX_PARTS = 40;
let lastParts = 0;

const call = (method, ...args) => new Promise((resolve, reject) => {
  wa().CloudStorage[method](...args, (err, value) => (err ? reject(new Error(String(err))) : resolve(value)));
});

export const tgCloud = {
  async load() {
    if (!inTelegram()) return { ok: false, data: null };
    try {
      const metaRaw = await call('getItem', META);
      if (!metaRaw) return { ok: true, data: null };
      const n = Number(metaRaw);
      lastParts = n;
      const keys = Array.from({ length: n }, (_, i) => part(i));
      const parts = await call('getItems', keys);
      const chunks = keys.map((k) => parts[k]);
      // Дырка в середине — данные битые: это «не прочитали», а не «пусто».
      if (chunks.some((c) => !c)) return { ok: false, data: null };
      return { ok: true, data: JSON.parse(chunks.join('')) };
    } catch (e) {
      console.warn('[telegram] load failed', e);
      return { ok: false, data: null };
    }
  },
  async save(obj) {
    if (!inTelegram()) return false;
    try {
      const raw = JSON.stringify(obj);
      const n = Math.ceil(raw.length / CHUNK) || 1;
      if (n > MAX_PARTS) return false;
      for (let i = 0; i < n; i++) await call('setItem', part(i), raw.slice(i * CHUNK, (i + 1) * CHUNK));
      await call('setItem', META, String(n));
      // Хвосты прежнего, более длинного снимка.
      if (lastParts > n) {
        await call('removeItems', Array.from({ length: lastParts - n }, (_, i) => part(n + i)));
      }
      lastParts = n;
      return true;
    } catch (e) {
      console.warn('[telegram] save failed', e);
      return false;
    }
  },
  async identity() {
    const id = wa()?.initDataUnsafe?.user?.id;
    return id ? `tg:${id}` : null;
  },
  status: { platform: 'telegram', load: '—', identity: '—', readFrom: '—', save: '—' }
};

export function tgShareLink(text, url) {
  const link = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  wa()?.openTelegramLink?.(link);
}
