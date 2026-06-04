// Pure helpers for the pet "привязанность" (bond) mechanic. No React, no
// side effects — trivially unit-testable. Bond accrues at a FLAT rate of
// +1 per BOND_MINUTES_PER_POINT minutes while the pet is fed (hunger > 0),
// independent of how full the hunger bar is.
import { HUNGER_DECAY_PER_HOUR } from '../constants/game.js';

export const BOND_PER_GIFT = 500;          // points needed for one gift
export const BOND_MINUTES_PER_POINT = 5;   // +1 point per 5 fed-minutes

const DECAY_PER_MIN = HUNGER_DECAY_PER_HOUR / 60; // 0.5 hunger/min

// Advance bond from its anchor (bondTickAt) to `now`, counting only the
// minutes the pet stayed fed (hunger > 0). Hunger at the anchor is projected
// from the stored hunger sample (hunger as of hungerTickAt) via linear decay,
// so feeding (a hunger jump) must checkpoint bond — see useStats.feedPet.
// Returns { bond, bondTickAt:ISO }. Frozen (no gain) when no gifts remain.
export function reconcileBond({ bond, bondTickAt, hunger, hungerTickAt, now, hasGiftsLeft }) {
  const startBond = Number.isFinite(bond) ? Math.max(0, bond) : 0;
  const nowMs = Number.isFinite(now) ? now : Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // No anchor yet → just stamp one; nothing accrues this call.
  if (!bondTickAt) return { bond: startBond, bondTickAt: nowIso };
  // Collection exhausted or already full → freeze, keep value, refresh anchor.
  if (!hasGiftsLeft || startBond >= BOND_PER_GIFT) {
    return { bond: Math.min(startBond, BOND_PER_GIFT), bondTickAt: nowIso };
  }

  const bondTickMs = new Date(bondTickAt).getTime();
  const hungerTickMs = hungerTickAt ? new Date(hungerTickAt).getTime() : bondTickMs;
  // Project the stored hunger sample forward to the bond anchor.
  const minsHungerToBond = Math.max(0, (bondTickMs - hungerTickMs) / 60000);
  const hungerAtAnchor = Math.max(0, (Number.isFinite(hunger) ? hunger : 0) - DECAY_PER_MIN * minsHungerToBond);

  const elapsedMin = Math.max(0, (nowMs - bondTickMs) / 60000);
  const fedMin = Math.min(elapsedMin, DECAY_PER_MIN > 0 ? hungerAtAnchor / DECAY_PER_MIN : 0);
  const nextBond = Math.min(BOND_PER_GIFT, startBond + fedMin / BOND_MINUTES_PER_POINT);
  return { bond: nextBond, bondTickAt: nowIso };
}

// Merge gift progress from two snapshots (local vs server/cloud) without loss:
// claimed gifts are unioned, in-progress bond takes the max. Used on sync
// reconcile so a fresh device / cleared storage never wipes the collection.
export function mergeGiftProgress(localGifts, localBond, serverGifts, serverBond) {
  const set = new Set([
    ...(Array.isArray(localGifts) ? localGifts : []),
    ...(Array.isArray(serverGifts) ? serverGifts : [])
  ]);
  const bond = Math.max(
    Number.isFinite(localBond) ? localBond : 0,
    Number.isFinite(serverBond) ? serverBond : 0
  );
  return { petGifts: [...set], petBond: bond };
}
