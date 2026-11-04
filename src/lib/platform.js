// Runtime platform detection — used by ads/auth/analytics adapters to pick
// the right implementation without separate builds. Safe to call on SSR
// (returns 'web' when window is missing).
//
// Add new platforms by extending the chain; never break the 'web' fallback.

import { isYandex as yandexEnv } from './yandex.js';
import { isVk as vkEnv } from './vk.js';
import { isEn } from './lang.js';

const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const PLATFORMS = {
  WEB: 'web',
  YANDEX: 'yandex',
  TELEGRAM: 'telegram',
  VK: 'vk',
  PLAYGAMA: 'playgama',
  GAMEMONETIZE: 'gamemonetize'
};

function detect() {
  if (typeof window === 'undefined') return PLATFORMS.WEB;
  // Эти площадки раздают архив: кто мы — решает сама сборка (--mode).
  if (ENV.VITE_PLATFORM === 'playgama') return PLATFORMS.PLAYGAMA;
  if (ENV.VITE_PLATFORM === 'gamemonetize') return PLATFORMS.GAMEMONETIZE;
  // Yandex is detected by the embedding (iframe + referrer/host), not by
  // window.YaGames — the SDK script is injected lazily and isn't on the page
  // yet at module-eval time.
  if (yandexEnv) return PLATFORMS.YANDEX;
  if (window.Telegram?.WebApp?.initData) return PLATFORMS.TELEGRAM;
  // VK — по launch-параметрам адреса, см. lib/vk.js. Проверять window.vkBridge
  // нельзя: мост подключён пакетом, глобала не существует.
  if (vkEnv) return PLATFORMS.VK;
  return PLATFORMS.WEB;
}

export const platform = detect();
export const isYandexGames = platform === PLATFORMS.YANDEX;
export const isTelegram = platform === PLATFORMS.TELEGRAM;
export const isVk = platform === PLATFORMS.VK;
export const isWeb = platform === PLATFORMS.WEB;
export const isPlaygama = platform === PLATFORMS.PLAYGAMA;
export const isGameMonetize = platform === PLATFORMS.GAMEMONETIZE;

// «Игра внутри площадки»: у неё своё облако для прогресса, своя реклама и
// свой аккаунт, а Supabase в сборку не попадает вовсе. Раньше в этих местах
// стояла проверка на Яндекс — но означала она именно это, а не сам Яндекс.
// Оставляйте isYandexGames только там, где речь про сам Яндекс (его вход,
// его таблица лидеров).
export const isEmbedded = isYandexGames || isVk || isTelegram || isPlaygama || isGameMonetize;

// Главный экран: требование VK (п. 4.2.10), и он же — лицо английской версии.
// На Яндексе остаётся боковое меню: в нём вход в аккаунт Яндекса, которого на
// главном экране нет. ?lang=en на обычном вебе — только для проверки вёрстки.
export const hasHomeMenu = isVk || isTelegram || isPlaygama || isGameMonetize || (isEn() && isWeb);
