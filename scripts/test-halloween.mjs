// Проверки ивента «Ночь тыкв»: календарь, словарь, колода, тыквы с дневным
// лимитом, лента наград, слияние прогресса, восстановление полученного.
// Запуск: node scripts/test-halloween.mjs
// Отдельного тест-раннера в проекте нет; модули ивента чистые и грузятся в
// node как есть (платформа там определяется как web).

import assert from 'node:assert/strict';
import { HALLOWEEN, daysLeftAt, halloweenActive, halloweenWindowOpen } from '../src/lib/events.js';
import { HW_DAILY_CAP, HW_ITEMS, HW_RIDDLES, HW_TRACK, HW_TRACK_MAX } from '../src/data/halloween.js';
import {
  HW_DEFAULT, applyHalloweenResult, earnedToday, mergeHalloween, nextStep,
  nextRiddle, normalizeHalloween, pumpkinsFor, restoreEventItems
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
const D1 = '2026-10-25';
const D2 = '2026-10-26';
const win = (hw, attempts, word, today = D1) => applyHalloweenResult(hw, { won: true, attempts, word, today });

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

test('лента: все предметы существуют, ивентовые, без цены в монетах', () => {
  for (const e of HW_ITEMS) {
    const it = e.kind === 'deco' ? PET_DECORATIONS.find((x) => x.id === e.ref) : getItem(e.ref);
    assert.equal(it?.event, 'halloween', e.ref);
    assert.ok(!it.price, `${e.ref} не продаётся за монеты`);
  }
  // Каждый ивентовый наряд есть на ленте — иначе его не получить.
  const refs = new Set(HW_ITEMS.map((e) => e.ref));
  for (const d of PET_DECORATIONS.filter((x) => x.event)) assert.ok(refs.has(d.id), d.id);
  // Отметки строго растут, главная награда — последняя.
  HW_TRACK.forEach((st, i) => i && assert.ok(st.need > HW_TRACK[i - 1].need, st.id));
  assert.ok(HW_TRACK[HW_TRACK.length - 1].grand);
});

test('лента растянута: на максимуме — не меньше 6 дней из 11', () => {
  assert.ok(HW_TRACK_MAX / HW_DAILY_CAP >= 6, `конец ${HW_TRACK_MAX}, лимит ${HW_DAILY_CAP}`);
  assert.ok(HW_TRACK_MAX / HW_DAILY_CAP <= 8, `конец ${HW_TRACK_MAX} — не пройти за ивент через день`);
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

test('итог партии: тыквы на руки и в счётчик дня', () => {
  const { next, gained } = win(HW_DEFAULT, 2, 'тыква');
  assert.equal(gained, 3);
  assert.equal(next.pumpkins, 3);
  assert.equal(next.earned, 3);
  assert.equal(earnedToday(next, D1), 3);
  assert.equal(earnedToday(next, D2), 0);
  assert.equal(next.solved, 1);
});

test('дневной лимит: сверх лимита тыкв нет, назавтра снова', () => {
  let hw = HW_DEFAULT;
  let r;
  for (let i = 0; i < 4; i++) { r = win(hw, 1, 'луна'); hw = r.next; }
  assert.equal(hw.pumpkins, HW_DAILY_CAP);
  assert.equal(r.capped, true);
  r = win(hw, 1, 'луна');
  assert.equal(r.gained, 0);
  assert.equal(r.next.pumpkins, HW_DAILY_CAP);
  r = win(r.next, 1, 'луна', D2);
  assert.equal(r.gained, 3);
  assert.equal(earnedToday(r.next, D2), 3);
});

test('дневной лимит: последняя победа добирает до лимита, не больше', () => {
  const r = win({ ...HW_DEFAULT, dayKey: D1, dayEarned: HW_DAILY_CAP - 1 }, 1, 'луна');
  assert.equal(r.gained, 1);
  assert.equal(r.capped, true);
});

test('итог партии: поражение без тыкв, слово помечено', () => {
  const { next, gained } = applyHalloweenResult(HW_DEFAULT, { won: false, attempts: 6, word: 'паук', today: D1 });
  assert.equal(gained, 0);
  assert.equal(next.pumpkins, 0);
  assert.deepEqual(next.seen, ['паук']);
});

test('итог партии: конец круга сбрасывает колоду', () => {
  const all = HW_RIDDLES.map((r) => r.word);
  const { next } = win({ ...HW_DEFAULT, seen: all.slice(0, -1) }, 3, all[all.length - 1]);
  assert.deepEqual(next.seen, [all[all.length - 1]]);
});

test('лента: ступени открываются по заработанному, по одному разу', () => {
  let hw = HW_DEFAULT;
  let r = win(hw, 1, 'луна');                 // 3
  assert.deepEqual(r.newSteps, []);
  r = win(r.next, 1, 'луна');                 // 6 → брошь (5)
  assert.deepEqual(r.newSteps.map((x) => x.id), ['hw-s1']);
  assert.deepEqual(r.next.bought, ['hw-pumpkin']);
  assert.equal(nextStep(r.next).id, 'hw-s2');
  hw = r.next;
  r = win(hw, 6, 'паук');                     // 7 — ничего нового
  assert.deepEqual(r.newSteps, []);
  // Прыжок через несколько отметок (например, после слияния) выдаёт все.
  r = win({ ...HW_DEFAULT, earned: 45, steps: ['hw-s1'] }, 1, 'луна', D2);
  assert.deepEqual(r.newSteps.map((x) => x.id), ['hw-s2', 'hw-s3', 'hw-s4', 'hw-s5', 'hw-s6']);
  assert.ok(!r.next.bought.includes(undefined), 'монеты не попадают в предметы');
  // Пройденная лента.
  assert.equal(nextStep({ earned: HW_TRACK_MAX }), null);
});

test('версия с лавкой: потраченные тыквы не теряются', () => {
  const hw = normalizeHalloween({ pumpkins: 4, earned: 30, bought: ['hw-witchhat'] });
  assert.equal(hw.earned, 30);
  assert.equal(hw.pumpkins, 30);
  assert.deepEqual(hw.bought, ['hw-witchhat']);
});

test('слияние: максимум, день — по последнему, списки объединены, симметрично', () => {
  const a = { pumpkins: 10, earned: 30, dayKey: D2, dayEarned: 4, solved: 4, seen: ['тыква'], bought: ['hw-pumpkin'] };
  const b = { pumpkins: 7, earned: 25, dayKey: D1, dayEarned: 12, solved: 5, firstTry: 1, seen: ['паук'], bought: ['bg-hw-night'] };
  const ab = mergeHalloween(a, b);
  const ba = mergeHalloween(b, a);
  assert.equal(ab.earned, 30);
  assert.equal(ab.pumpkins, 30);
  assert.equal(ab.dayKey, D2);
  assert.equal(ab.dayEarned, 4);
  assert.equal(ab.solved, 5);
  assert.deepEqual([...ab.bought].sort(), ['bg-hw-night', 'hw-pumpkin']);
  assert.deepEqual({ ...ab, seen: 0, bought: 0 }, { ...ba, seen: 0, bought: 0 });
  assert.equal(mergeHalloween(undefined, undefined), undefined);
});

test('старые сохранения с тропой: выданное считается полученным', () => {
  const hw = normalizeHalloween({ pumpkins: 45, rewards: ['hw-t1', 'hw-t5', 'hw-t6'] });
  assert.deepEqual(hw.bought.sort(), ['hw-pumpkin', 'hw-witchhat']);
  assert.equal(hw.earned, 45);
});

test('полученное возвращается, если версия без ивента его выбросила', () => {
  const s = { halloween: { bought: ['hw-pumpkin', 'cells-hw-lights'] }, pet: { ownedDecorations: ['bow'] }, inventory: [] };
  const r = restoreEventItems(s);
  assert.deepEqual(r.pet.ownedDecorations, ['bow', 'hw-pumpkin']);
  assert.deepEqual(r.inventory, ['cells-hw-lights']);
  assert.equal(restoreEventItems(r), r, 'повторно ничего не меняет');
  const clean = { played: 1 };
  assert.equal(restoreEventItems(clean), clean);
});

test('mergeProgress переносит halloween и возвращает полученное', () => {
  const out = mergeProgress(
    { played: 1, halloween: { pumpkins: 5, bought: ['hw-witchhat'] }, pet: { xp: 5, ownedDecorations: [] } },
    { played: 2, pet: { xp: 1, ownedDecorations: [] } }
  );
  assert.equal(out.halloween.pumpkins, 5);
  assert.ok(out.pet.ownedDecorations.includes('hw-witchhat'));
  assert.equal(mergeProgress({ played: 1 }, { played: 2 }).halloween, undefined);
});

console.log(process.exitCode ? 'FAILED' : `OK — ${passed} проверок`);
