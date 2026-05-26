// Deterministic "слово дня" — the same word for every player on the same
// local calendar day. Index = (day number since epoch) mod (permuted word
// list length). The permutation is generated once at module load via a
// seeded LCG so the cycle order is fixed but not obviously sequential.
//
// Once the calendar exhausts WORDS.length days the cycle repeats. With
// ~220 curated answers that's a ~7-month rotation — plenty of room before
// we either expand WORDS or add a "version 2" reseed.

import { WORDS, normalizeWord } from './words.js';

const EPOCH_ISO = '2024-01-01'; // day 1 of the calendar

// Linear-congruential shuffle. Deterministic given the seed.
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

// Local-day key in YYYY-MM-DD so users in the same time zone share a key.
function isoDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDailyKey(date = new Date()) {
  return isoDateKey(date);
}

// 1-based day count from the epoch.
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

export function isSameDailyKey(a, b) {
  return Boolean(a && b && normalizeWord(a) === normalizeWord(b));
}
