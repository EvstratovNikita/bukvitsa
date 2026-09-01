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
import { showRewardedVk, showInterstitialVk } from './vk.js';

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
  },
  showInterstitial: showFullscreenAdv
};

// --- VK Mini Apps. Мост отвечает { result: true } только за успешный показ,
//     а закрытие и отсутствие рекламы приходят ошибкой — разбор в lib/vk.js.
//     Показы начнутся после того, как VK одобрит монетизацию приложения; до
//     этого вызов честно возвращает 'failed', и награда не начисляется.
const vkAdapter = {
  showRewarded: showRewardedVk,
  showInterstitial: showInterstitialVk
};

// --- Placeholder slot for Telegram (Adsgram). Пока падает в заглушку.
// const telegramAdapter = { async showRewarded() { /* Adsgram.init({blockId}).show() ... */ } };

function pickAdapter() {
  switch (platform) {
    case PLATFORMS.YANDEX:   return yandexAdapter;
    case PLATFORMS.VK:       return vkAdapter;
    // case PLATFORMS.TELEGRAM: return telegramAdapter;
    default:                 return stubAdapter;
  }
}

const adapter = pickAdapter();

export async function showRewardedAd() {
  return adapter.showRewarded();
}

// Fullscreen (interstitial) advert, shown at natural breaks (between games).
// Resolves true only if an ad was actually displayed; вне площадок — no-op.
export async function showInterstitial() {
  return adapter.showInterstitial ? adapter.showInterstitial() : false;
}

// Useful for UI copy ("Реклама ~3 сек" vs platform's real average).
export const isStubAds = adapter === stubAdapter;
