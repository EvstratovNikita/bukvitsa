// Playgama Bridge (wiki.playgama.com/playgama/bridge-sdk). Скрипт подключается
// тегом в index.html только в сборке --mode playgama; вне её модуль молчит.
// Сам Bridge разводит вызовы по партнёрским площадкам, а без площадки работает
// как заглушка — поэтому локально всё проверяемо.
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const isPlaygamaBuild = ENV.VITE_PLATFORM === 'playgama';

const b = () => (typeof window !== 'undefined' ? window.bridge : null);
const SAVE_KEY = 'hootword_save';

let inited = false;

export async function initPlaygama() {
  if (!isPlaygamaBuild || !b()) return false;
  try {
    await b().initialize();
    inited = true;
    // Правила Яндекса и VK у нас те же 30 секунд; у Bridge по умолчанию 60.
    b().advertisement?.setMinimumDelayBetweenInterstitial?.(30);
  } catch (e) {
    console.warn('[playgama] initialize failed', e);
  }
  return inited;
}

const send = (m) => {
  if (inited) { try { b().platform.sendMessage(m); } catch { /* площадка не поддерживает */ } }
};
export const pgReady = () => send('game_ready');
export const pgGameplayStart = () => send('gameplay_started');
export const pgGameplayStop = () => send('gameplay_stopped');

export const pgRewardedSupported = () => Boolean(inited && b().advertisement?.isRewardedSupported);

// Ролик за награду: награда — только по состоянию rewarded, а не по закрытию
// (требование документации Bridge). Ответ: 'rewarded' | 'closed' | 'failed'.
export function pgShowRewarded() {
  if (!inited) return Promise.resolve('failed');
  const ad = b().advertisement;
  return new Promise((resolve) => {
    let rewarded = false;
    const finish = (r) => {
      ad.off?.(b().EVENT_NAME.REWARDED_STATE_CHANGED, onState);
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

export function pgShowInterstitial() {
  if (!inited) return Promise.resolve(false);
  const ad = b().advertisement;
  return new Promise((resolve) => {
    let opened = false;
    const finish = (r) => {
      ad.off?.(b().EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
      resolve(r);
    };
    const onState = (state) => {
      if (state === 'opened') opened = true;
      else if (state === 'closed') finish(opened);
      else if (state === 'failed') finish(false);
    };
    ad.on(b().EVENT_NAME.INTERSTITIAL_STATE_CHANGED, onState);
    ad.showInterstitial();
  });
}

// Сохранения: один ключ со всем снимком. get отдаёт null, если ключа нет.
export const pgCloud = {
  async load() {
    if (!inited) return { ok: false, data: null };
    try {
      const [raw] = await b().storage.get([SAVE_KEY]);
      return { ok: true, data: raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null };
    } catch (e) {
      console.warn('[playgama] load failed', e);
      return { ok: false, data: null };
    }
  },
  async save(obj) {
    if (!inited) return false;
    try {
      await b().storage.set([SAVE_KEY], [JSON.stringify(obj)]);
      return true;
    } catch (e) {
      console.warn('[playgama] save failed', e);
      return false;
    }
  },
  async identity() {
    return `pg:${b()?.player?.id || 'guest'}`;
  },
  status: { platform: 'playgama', load: '—', identity: '—', readFrom: '—', save: '—' }
};
