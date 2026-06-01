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
import { getYsdk, showFullscreenAdv } from './yandex.js';

// --- Stub adapter: used on plain web + dev. Fakes a 3s rewarded video so
//     the energy flow stays testable without a live SDK.
const stubAdapter = {
  async showRewarded() {
    await new Promise((r) => setTimeout(r, 3000));
    return 'rewarded';
  }
};

// --- Yandex Games adapter. The ysdk instance comes from lib/yandex.js (single
//     source of truth); init is lazy + cached there.
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

// Fullscreen (interstitial) advert, shown at natural breaks (between games).
// No-op off Yandex; resolves true only if an ad was actually displayed.
export async function showInterstitial() {
  return showFullscreenAdv();
}

// Useful for UI copy ("Реклама ~3 сек" vs platform's real average).
export const isStubAds = adapter === stubAdapter;
