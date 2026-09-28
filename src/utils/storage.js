import { isOk } from '../lib/vk.js';

// В Одноклассниках игра открывается с того же хостинга VK, что и во
// ВКонтакте, — а значит, с тем же localStorage. Без отдельного пространства
// ключей местный снимок из VK сливался бы с прогрессом ОК (и наоборот), а ОК
// требует вести прогресс в каждой соцсети отдельно.
const NS = isOk ? 'ok:' : '';

export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(NS + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
    } catch {
      /* quota or disabled — ignore */
    }
  },
  remove(key) {
    try { localStorage.removeItem(NS + key); } catch { /* noop */ }
  }
};
