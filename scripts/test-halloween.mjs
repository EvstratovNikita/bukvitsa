// Проверки ивента «Ночь тыкв»: календарь, словарь, колода, тыквы, тропа,
// слияние прогресса. Запуск: node scripts/test-halloween.mjs
// Отдельного тест-раннера в проекте нет; модули ивента чистые и грузятся в
// node как есть (платформа там определяется как web).

import assert from 'node:assert/strict';
import { HALLOWEEN, daysLeftAt, halloweenActive, halloweenWindowOpen } from '../src/lib/events.js';
import { HW_RIDDLES, HW_TRACK, HW_TRACK_MAX } from '../src/data/halloween.js';
import {
  HW_DEFAULT, applyHalloweenResult, mergeHalloween, nextRiddle, nextStep, pumpkinsFor
} from '../src/lib/halloweenProgress.js';
import { isValidWord } from '../src/data/words.js';
import { mergeProgress } from '../src/utils/mergeProgress.js';
import { PET_DECORATIONS } from '../src/data/petDecorations.js';
import { getItem } from '../src/data/shopItems.js';

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed += 1; } catch (e) { console.error(`FAIL ${name}\n`, e.message); process.exitCode = 1; }
};
const t = (iso) => Date.parse(iso);

test('календарь: границы по Москве', () => {
  assert.equal(halloweenWindowOpen(t('2026-10-23T20:59:59Z')), false);
  assert.equal(halloweenWindowOpen(t('2026-10-23T21:00:00Z')), true);
  assert.equal(halloweenWindowOpen(t('2026-11-03T20:59:59Z')), true);
  assert.equal(halloweenWindowOpen(t('2026-11-03T21:00:00Z')), false);
  assert.equal(HALLOWEEN.endLabel, '3.11');
});

test('календарь: дни до конца', () => {
  assert.equal(daysLeftAt(t('2026-11-03T12:00:00Z')), 1);
  assert.equal(daysLeftAt(t('2026-10-24T09:00:00Z')), 11);
  assert.equal(daysLeftAt(t('2026-11-05T00:00:00Z')), 0);
});

test('календарь: вне площадок без предпросмотра ивента нет', () => {
  assert.equal(halloweenActive(t('2026-10-30T12:00:00Z')), false);
});

test('загадки: формат и словарь', () => {
  const words = new Set();
  for (const { word, riddle } of HW_RIDDLES) {
    assert.match(word, /^[а-я]{4,6}$/, `слово ${word}`);
    assert.ok(!words.has(word), `повтор ${word}`);
    words.add(word);
    assert.ok(isValidWord(word, word.length), `нет в словаре: ${word}`);
    assert.ok(riddle.length > 10 && riddle.length <= 80, `загадка ${word}: ${riddle.length}`);
    assert.ok(!riddle.toLowerCase().replace(/ё/g, 'е').includes(word), `загадка выдаёт ответ: ${word}`);
  }
  assert.ok(HW_RIDDLES.length >= 45);
});

test('тропа: пороги растут, ссылки на предметы живые', () => {
  for (let i = 1; i < HW_TRACK.length; i++) assert.ok(HW_TRACK[i].need > HW_TRACK[i - 1].need);
  assert.equal(HW_TRACK_MAX, 45);
  for (const s of HW_TRACK) {
    if (s.kind === 'deco') assert.ok(PET_DECORATIONS.some((d) => d.id === s.ref && d.source === 'track'), s.ref);
    if (s.kind === 'cells') assert.equal(getItem(s.ref)?.source, 'track', s.ref);
    if (s.kind === 'coins') assert.ok(s.amount > 0);
  }
});

test('тыквы за попытки', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(pumpkinsFor), [3, 3, 2, 2, 1, 1]);
});

test('колода: без повторов, круг заново', () => {
  const seen = [];
  for (let i = 0; i < HW_RIDDLES.length; i++) {
    const { entry, seenReset } = nextRiddle(seen);
    assert.equal(seenReset, false);
    assert.ok(!seen.includes(entry.word));
    seen.push(entry.word);
  }
  const last = seen[seen.length - 1];
  const r = nextRiddle(seen, last);
  assert.equal(r.seenReset, true);
  assert.notEqual(r.entry.word, last);
  assert.equal(nextRiddle([]).entry.word, 'тыква');
});

test('итог партии: тыквы, ступень, без дублей', () => {
  let { next, gained, newSteps } = applyHalloweenResult(HW_DEFAULT, { won: true, attempts: 2, word: 'тыква' });
  assert.equal(gained, 3);
  assert.equal(next.pumpkins, 3);
  assert.deepEqual(newSteps.map((s) => s.id), ['hw-t1']);
  assert.deepEqual(next.rewards, ['hw-t1']);
  ({ next, newSteps } = applyHalloweenResult(next, { won: true, attempts: 6, word: 'ведьма' }));
  assert.equal(next.pumpkins, 4);
  assert.deepEqual(newSteps, []);
  assert.deepEqual(next.rewards, ['hw-t1']);
  assert.equal(next.solved, 2);
});

test('итог партии: поражение без тыкв, слово помечено', () => {
  const { next, gained } = applyHalloweenResult(HW_DEFAULT, { won: false, attempts: 6, word: 'паук' });
  assert.equal(gained, 0);
  assert.equal(next.pumpkins, 0);
  assert.deepEqual(next.seen, ['паук']);
  assert.equal(next.solved, 0);
});

test('итог партии: первая попытка', () => {
  const { next } = applyHalloweenResult(HW_DEFAULT, { won: true, attempts: 1, word: 'луна' });
  assert.equal(next.firstTry, 1);
});

test('итог партии: прыжок через несколько ступеней', () => {
  const { newSteps, next } = applyHalloweenResult({ ...HW_DEFAULT, pumpkins: 12 }, { won: true, attempts: 1, word: 'луна' });
  assert.deepEqual(newSteps.map((s) => s.id), ['hw-t1', 'hw-t2', 'hw-t3']);
  assert.equal(nextStep(next).id, 'hw-t4');
});

test('итог партии: конец круга сбрасывает колоду', () => {
  const all = HW_RIDDLES.map((r) => r.word);
  const { next } = applyHalloweenResult({ ...HW_DEFAULT, seen: all.slice(0, -1) }, { won: true, attempts: 3, word: all[all.length - 1] });
  assert.deepEqual(next.seen, [all[all.length - 1]]);
});

test('слияние: максимум и объединение, симметрично', () => {
  const a = { pumpkins: 10, solved: 4, firstTry: 0, seen: ['тыква'], rewards: ['hw-t1', 'hw-t2'] };
  const b = { pumpkins: 7, solved: 5, firstTry: 1, seen: ['паук'], rewards: ['hw-t1'] };
  const ab = mergeHalloween(a, b);
  const ba = mergeHalloween(b, a);
  assert.equal(ab.pumpkins, 10);
  assert.equal(ab.solved, 5);
  assert.equal(ab.firstTry, 1);
  assert.deepEqual([...ab.seen].sort(), ['паук', 'тыква']);
  assert.deepEqual([...ab.rewards].sort(), [...ba.rewards].sort());
  assert.equal(mergeHalloween(undefined, undefined), undefined);
});

test('mergeProgress переносит halloween', () => {
  const out = mergeProgress({ played: 1, halloween: { pumpkins: 5, rewards: ['hw-t1'] } }, { played: 2 });
  assert.equal(out.halloween.pumpkins, 5);
  const out2 = mergeProgress({ played: 1 }, { played: 2, halloween: { pumpkins: 9 } });
  assert.equal(out2.halloween.pumpkins, 9);
  const out3 = mergeProgress({ played: 1 }, { played: 2 });
  assert.equal(out3.halloween, undefined);
});

console.log(process.exitCode ? 'FAILED' : `OK — ${passed} проверок`);
