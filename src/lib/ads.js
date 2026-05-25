// Unified rewarded-ad interface across all distribution platforms.
//
// Call `showRewardedAd()` from UI code. It returns one of:
//   'rewarded' — user watched the full ad, grant the reward
//   'closed'   — user dismissed early, do NOT reward
//   'failed'   — SDK error / no fill / timeout, do NOT reward
//
// Adapters live in this file (keep it flat until we have 3+). When you publish
// to a new platform, add an adapter and extend `pickAdapter()`.

import { platform, PLATFORMS } from './platform.js';

// --- Stub adapter: used on plain web + dev. Fakes a 3s rewarded video so
//     the energy flow stays testable without a live SDK.
const stubAdapter = {
  async showRewarded() {
    await new Promise((r) => setTimeout(r, 3000));
    return 'rewarded';
  }
};

// --- Yandex Games adapter. Activated only when the YaGames SDK is on the
//     page (i.e. game is being served from yandex.ru/games inside their
//     iframe). Init is lazy + cached.
let _ysdkPromise = null;
const getYsdk = () => {
  if (_ysdkPromise) return _ysdkPromise;
  if (typeof window === 'undefined' || !window.YaGames) {
    _ysdkPromise = Promise.reject(new Error('YaGames SDK not loaded'));
  } else {
    _ysdkPromise = window.YaGames.init();
  }
  return _ysdkPromise;
};

const yandexAdapter = {
  async showRewarded() {
    try {
      const ysdk = await getYsdk();
      return await new Promise((resolve) => {
        let rewarded = false;
        ysdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => { rewarded = true; },
            onClose:   () => resolve(rewarded ? 'rewarded' : 'closed'),
            onError:   () => resolve('failed')
          }
        });
      });
    } catch (err) {
      console.warn('[ads] yandex showRewarded failed', err);
      return 'failed';
    }
  }
};

// --- Placeholder slots for future platforms. Kept here so the next time we
//     add Telegram (Adsgram) or VK Mini App ads, we just fill in showRewarded.
//     Currently they fall through to stub.
// const telegramAdapter = { async showRewarded() { /* Adsgram.init({blockId}).show() ... */ } };
// const vkAdapter       = { async showRewarded() { /* bridge.send('VKWebAppShowNativeAds', ...) */ } };

function pickAdapter() {
  switch (platform) {
    case PLATFORMS.YANDEX:   return yandexAdapter;
    // case PLATFORMS.TELEGRAM: return telegramAdapter;
    // case PLATFORMS.VK:       return vkAdapter;
    default:                 return stubAdapter;
  }
}

const adapter = pickAdapter();

export async function showRewardedAd() {
  return adapter.showRewarded();
}

// Useful for UI copy ("Реклама ~3 сек" vs platform's real average).
export const isStubAds = adapter === stubAdapter;
