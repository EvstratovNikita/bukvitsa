import { WORDS } from './words.js';

// Day #1 — the day the feature ships. From there, day N = days since the
// epoch + 1, so the numbering is global, deterministic, and starts at 1.
const EPOCH_ISO = '2026-05-26';

// LCG-shuffle the dictionary once with a fixed seed so the visit order is
// stable across users + reproducible across reloads.
function lcgShuffle(arr, seed) {
  const out = [...arr];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const PERMUTED = lcgShuffle(WORDS, 0xBE110A);

function isoDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Local-calendar 'YYYY-MM-DD' for "have they played today?" comparisons.
export function getDailyKey(date = new Date()) {
  return isoDateKey(date);
}

// 1-based day number since EPOCH_ISO, clamped to ≥ 1.
export function getDailyNumber(date = new Date()) {
  const dayMs = 86400000;
  const start = new Date(EPOCH_ISO + 'T00:00:00');
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.floor((local - start) / dayMs) + 1);
}

export function getDailyWord(date = new Date()) {
  const n = getDailyNumber(date);
  return PERMUTED[(n - 1) % PERMUTED.length];
}
