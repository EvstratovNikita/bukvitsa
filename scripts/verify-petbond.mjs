import assert from 'node:assert/strict';
import { reconcileBond, mergeGiftProgress, BOND_PER_GIFT, BOND_MINUTES_PER_POINT } from '../src/utils/petBond.js';

const t0 = new Date('2026-06-04T00:00:00.000Z').getTime();
const at = (min) => new Date(t0 + min * 60000).toISOString();

// 1. No anchor → stamps anchor, no gain.
let r = reconcileBond({ bond: 0, bondTickAt: null, hunger: 100, hungerTickAt: at(0), now: t0, hasGiftsLeft: true });
assert.equal(r.bond, 0);
assert.ok(r.bondTickAt);

// 2. Fully fed for 10 min → +2 points (10/5).
r = reconcileBond({ bond: 0, bondTickAt: at(0), hunger: 100, hungerTickAt: at(0), now: t0 + 10 * 60000, hasGiftsLeft: true });
assert.equal(r.bond, 2);

// 3. Starving (hunger 0) → no gain.
r = reconcileBond({ bond: 7, bondTickAt: at(0), hunger: 0, hungerTickAt: at(0), now: t0 + 60 * 60000, hasGiftsLeft: true });
assert.equal(r.bond, 7);

// 4. Hunger 100 lasts 200 min (decay 0.5/min) → after 300 min only 200 fed-min
//    count → +40 points, not +60.
r = reconcileBond({ bond: 0, bondTickAt: at(0), hunger: 100, hungerTickAt: at(0), now: t0 + 300 * 60000, hasGiftsLeft: true });
assert.equal(r.bond, 40);

// 5. Cap at BOND_PER_GIFT.
r = reconcileBond({ bond: BOND_PER_GIFT - 1, bondTickAt: at(0), hunger: 100, hungerTickAt: at(0), now: t0 + 1000 * 60000, hasGiftsLeft: true });
assert.equal(r.bond, BOND_PER_GIFT);

// 6. Frozen when no gifts left.
r = reconcileBond({ bond: 123, bondTickAt: at(0), hunger: 100, hungerTickAt: at(0), now: t0 + 60 * 60000, hasGiftsLeft: false });
assert.equal(r.bond, 123);

// 7. Merge: union gifts, max bond.
const m = mergeGiftProgress(['a'], 30, ['a', 'b'], 80);
assert.deepEqual([...m.petGifts].sort(), ['a', 'b']);
assert.equal(m.petBond, 80);

console.log('petBond OK', { BOND_PER_GIFT, BOND_MINUTES_PER_POINT });
