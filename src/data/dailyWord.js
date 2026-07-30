import { WORDS } from './words.js';

// Day #1 — the day the feature ships. From there, day N = days since the
// epoch + 1, so the numbering is global, deterministic, and starts at 1.
const EPOCH_ISO = '2026-05-26';

// The daily word MUST be identical for every player worldwide. Anchoring the
// "day" to each device's LOCAL calendar breaks that: Russia alone spans 11
// time zones, so at most UTC instants Kaliningrad and Kamchatka sit on
// different calendar dates and would see different words. We anchor to a
// single fixed zone — Moscow (UTC+3, no DST since 2014) — so the day (and the
// "played today?" key) flips at the same instant for everyone.
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

// Moscow calendar parts for an instant: shift the UTC epoch by +3h and read
// the UTC fields (avoids relying on the host's Intl timezone data).
function moscowParts(date = new Date()) {
  const shifted = new Date(date.getTime() + MSK_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

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

// Moscow-calendar 'YYYY-MM-DD' for "have they played today?" comparisons.
// Same value for every player at any given instant.
export function getDailyKey(date = new Date()) {
  const { y, m, d } = moscowParts(date);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 1-based day number since EPOCH_ISO (both measured in Moscow days), clamped
// to ≥ 1. Global and identical for all players.
export function getDailyNumber(date = new Date()) {
  const dayMs = 86400000;
  const [ey, em, ed] = EPOCH_ISO.split('-').map(Number);
  const start = Date.UTC(ey, em - 1, ed);
  const { y, m, d } = moscowParts(date);
  const today = Date.UTC(y, m, d);
  return Math.max(1, Math.floor((today - start) / dayMs) + 1);
}

export function getDailyWord(date = new Date()) {
  const n = getDailyNumber(date);
  return PERMUTED[(n - 1) % PERMUTED.length];
}
