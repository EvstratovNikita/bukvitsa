// Runtime platform detection — used by ads/auth/analytics adapters to pick
// the right implementation without separate builds. Safe to call on SSR
// (returns 'web' when window is missing).
//
// Add new platforms by extending the chain; never break the 'web' fallback.

export const PLATFORMS = {
  WEB: 'web',
  YANDEX: 'yandex',
  TELEGRAM: 'telegram',
  VK: 'vk'
};

function detect() {
  if (typeof window === 'undefined') return PLATFORMS.WEB;
  if (window.YaGames) return PLATFORMS.YANDEX;
  if (window.Telegram?.WebApp?.initData) return PLATFORMS.TELEGRAM;
  if (window.vkBridge) return PLATFORMS.VK;
  return PLATFORMS.WEB;
}

export const platform = detect();
export const isYandexGames = platform === PLATFORMS.YANDEX;
export const isTelegram = platform === PLATFORMS.TELEGRAM;
export const isVk = platform === PLATFORMS.VK;
export const isWeb = platform === PLATFORMS.WEB;
