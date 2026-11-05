import { isOk } from '../lib/vk.js';
import { pgStore } from '../lib/playgama.js';

// В Одноклассниках игра открывается с того же хостинга VK, что и во
// ВКонтакте, — а значит, с тем же localStorage. Без отдельного пространства
// ключей местный снимок из VK сливался бы с прогрессом ОК (и наоборот), а ОК
// требует вести прогресс в каждой соцсети отдельно.
const NS = isOk ? 'ok:' : '';

// Playgama запрещает браузерное хранилище (п. 3.2.1): там те же вызовы идут в
// память и уходят на площадку через Bridge. Флаг сборки убирает прямое обращение
// к localStorage из её кода совсем.
const backend = (typeof __PLAYGAMA__ !== 'undefined' && __PLAYGAMA__)
  ? pgStore
  : {
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => localStorage.setItem(k, v),
      removeItem: (k) => localStorage.removeItem(k)
    };

export const storage = {
  get(key, fallback) {
    try {
      const raw = backend.getItem(NS + key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      backend.setItem(NS + key, JSON.stringify(value));
    } catch {
      /* quota or disabled — ignore */
    }
  },
  remove(key) {
    try { backend.removeItem(NS + key); } catch { /* noop */ }
  }
};
