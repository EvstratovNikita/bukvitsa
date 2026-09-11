// Проверка слияния оформления (mergeProgress): node scripts/check-merge-cosmetic.mjs
import assert from 'node:assert/strict';
import { mergeProgress } from '../src/utils/mergeProgress.js';

const fresh = { coins: 0, activeBackground: null, activeCellStyle: null, cosmeticAt: null,
  prefs: { theme: 'dark', enterOnLeft: false, bgByTheme: {} } };
const cloudOld = { coins: 30, activeBackground: 'bg-sky', activeCellStyle: 'cells-a',
  prefs: { theme: 'light', enterOnLeft: true, bgByTheme: { light: 'bg-sky' }, tourDone: true } };

// 1. Чистое устройство + старое облако без отметки → оформление из облака.
let m = mergeProgress(fresh, cloudOld);
assert.equal(m.prefs.theme, 'light');
assert.equal(m.prefs.enterOnLeft, true);
assert.equal(m.activeBackground, 'bg-sky');
assert.equal(m.activeCellStyle, 'cells-a');
assert.equal(m.coins, 30);
assert.equal(m.prefs.tourDone, true);

// 2. Игрок только что сменил тему на устройстве → местное главнее облака.
const localChanged = { ...fresh, cosmeticAt: '2026-09-11T10:00:00.000Z' };
m = mergeProgress(localChanged, cloudOld);
assert.equal(m.prefs.theme, 'dark');
assert.equal(m.activeBackground, null);
assert.equal(m.cosmeticAt, '2026-09-11T10:00:00.000Z');

// 3. Обе отметки: побеждает поздняя, в обе стороны.
const cloudNew = { ...cloudOld, cosmeticAt: '2026-09-11T12:00:00.000Z' };
assert.equal(mergeProgress(localChanged, cloudNew).prefs.theme, 'light');
assert.equal(mergeProgress(cloudNew, localChanged).prefs.theme, 'light');

// 4. Симметрия оформления при отметках.
const x = mergeProgress(localChanged, cloudNew), y = mergeProgress(cloudNew, localChanged);
assert.deepEqual([x.activeBackground, x.prefs.bgByTheme], [y.activeBackground, y.prefs.bgByTheme]);

console.log('ok: 4 сценария слияния оформления');
