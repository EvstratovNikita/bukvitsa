// Язык игры. Решается ОДИН раз и ДО импорта приложения (см. main.jsx): данные
// на уровне модулей (магазин, достижения, клавиатура) вычисляются сразу при
// импорте, поэтому язык уже должен быть известен.
//
// Ключ перевода — сама русская фраза: tr('Новая игра'). В русской версии tr()
// просто возвращает её, в английской ищет в src/i18n/en.js. Подстановки:
// tr('Ещё {n} партий', { n }). Проверка полноты — scripts/i18n-check.mjs.
//
// Откуда берётся язык:
//   VITE_LANG (ru|en) — сборка на один язык: VK и ОК всегда ru;
//   ?lang=en          — ручная проверка на локальной сборке;
//   Telegram          — язык клиента игрока;
//   Яндекс            — язык игрока из SDK (требование площадки);
//   иначе             — ru (веб-версия bukvitsa).
import { loadPack } from '../data/pack.js';

const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};

// Языки, которые показываем по-русски: как и раньше на Яндексе.
const RU_FAMILY = new Set(['ru', 'be', 'kk', 'uk', 'uz', 'ky', 'tg', 'hy', 'az']);
export const toGameLang = (code) => (RU_FAMILY.has(String(code || '').toLowerCase().slice(0, 2)) ? 'ru' : 'en');

let lang = 'ru';
let dict = null;
let plurals = null;

export const getLang = () => lang;
export const isEn = () => lang === 'en';

async function detect() {
  if (ENV.VITE_LANG === 'en' || ENV.VITE_LANG === 'ru') return ENV.VITE_LANG;
  if (typeof window === 'undefined') return 'ru';
  const forced = new URLSearchParams(window.location.search).get('lang');
  if (forced === 'en' || forced === 'ru') return forced;
  const tgCode = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgCode) return toGameLang(tgCode);
  // Динамически: вне Яндекса его модуль здесь не нужен.
  const { isYandex, getYsdk } = await import('./yandex.js');
  if (isYandex) {
    try {
      const ysdk = await Promise.race([
        getYsdk(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
      ]);
      return toGameLang(ysdk?.environment?.i18n?.lang);
    } catch {
      // SDK молчит — заставка ждать не будет. Все, кто играл до английской
      // версии, русскоязычные: для них это безопасный вариант.
      return 'ru';
    }
  }
  return 'ru';
}

export async function initLang() {
  lang = await detect();
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  await loadPack(lang);
  if (lang === 'en') {
    const m = await import('../i18n/en.js');
    dict = m.EN;
    plurals = m.EN_PLURALS;
  }
  return lang;
}

const fill = (s, params) => (params
  ? s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m))
  : s);

export function tr(s, params) {
  const out = dict ? (dict[s] ?? s) : s;
  return fill(out, params);
}

// Английская форма для русской тройки: ключ — форма для единицы («монета»).
export function enPlural(n, oneRu) {
  const e = plurals?.[oneRu];
  if (!e) return oneRu;
  return Math.abs(n) === 1 ? e[0] : e[1];
}
