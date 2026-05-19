export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or disabled — ignore */
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }
};
