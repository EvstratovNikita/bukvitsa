// GameMonetize SDK (github.com/MonetizeGame/GameMonetize.com-SDK). Загрузчик и
// SDK_OPTIONS с gameId встраиваются в index.html сборкой --mode gamemonetize.
// В открытой документации SDK есть только межстраничная реклама (showBanner),
// ролика за награду нет — поэтому кнопок «посмотреть рекламу» в этой сборке нет.
// Сохранений у площадки нет: прогресс живёт в localStorage браузера игрока.
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
export const isGameMonetizeBuild = ENV.VITE_PLATFORM === 'gamemonetize';

const sdk = () => (typeof window !== 'undefined' ? window.sdk : null);

// Ждём конца показа по событиям из index.html: SDK_GAME_START (реклама
// закончилась). Страховка на случай, если событие не придёт.
export function gmShowInterstitial() {
  if (!isGameMonetizeBuild || !sdk()?.showBanner) return Promise.resolve(false);
  return new Promise((resolve) => {
    let paused = false;
    const cleanup = () => {
      window.removeEventListener('gm-ad-pause', onPause);
      window.removeEventListener('gm-ad-start', onStart);
      clearTimeout(noAd);
    };
    const onPause = () => { paused = true; clearTimeout(noAd); };
    const onStart = () => { cleanup(); resolve(paused); };
    const noAd = setTimeout(() => { cleanup(); resolve(false); }, 4000);
    window.addEventListener('gm-ad-pause', onPause);
    window.addEventListener('gm-ad-start', onStart);
    try { sdk().showBanner(); } catch { cleanup(); resolve(false); }
  });
}

// Сервера нет: читать нечего, но и потери нет — снимок лежит в localStorage
// (utils/storage.js), и синхронизация просто считает облако пустым.
export const localCloud = {
  load: async () => ({ ok: true, data: null }),
  save: async () => true,
  identity: async () => 'local:device',
  status: { platform: 'local', load: '—', identity: '—', readFrom: '—', save: '—' }
};
