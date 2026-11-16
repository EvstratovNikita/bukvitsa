// Проверки общего движка сезонных ивентов: календарь, предпросмотр, прогресс,
// слияние, режим, ледяная гонка. Запуск: node scripts/test-events.mjs
// Как и test-halloween.mjs — без раннера, модули чистые (платформа в node — web).

import assert from 'node:assert/strict';
import {
  EVENTS, activeEvent, eventActive, eventDaysLeft, eventDaysLeftAt, eventWindowOpen, parsePreview
} from '../src/lib/events.js';
import { getEvent, trackMax } from '../src/data/events/index.js';
import { applyResult, merge, normalize, restoreEventItems } from '../src/lib/eventProgress.js';
import { mergeProgress } from '../src/utils/mergeProgress.js';
import { isValidWord } from '../src/data/words.js';
import { isLiveEventRound, restoredMode } from '../src/lib/eventRounds.js';

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed += 1; } catch (e) { console.error(`FAIL ${name}\n`, e.message); process.exitCode = 1; }
};
const t = (iso) => Date.parse(iso);

test('календарь зимы: границы по Москве', () => {
  assert.equal(eventWindowOpen('winter', t('2026-12-25T20:59:59Z')), false);
  assert.equal(eventWindowOpen('winter', t('2026-12-25T21:00:00Z')), true);
  assert.equal(eventWindowOpen('winter', t('2027-01-11T20:59:59Z')), true);
  assert.equal(eventWindowOpen('winter', t('2027-01-11T21:00:00Z')), false);
  assert.equal(eventWindowOpen('nope', t('2026-12-30T12:00:00Z')), false);
});

test('календарь зимы: дни до конца', () => {
  assert.equal(eventDaysLeftAt('winter', t('2026-12-26T09:00:00Z')), 17);
  assert.equal(eventDaysLeftAt('winter', t('2027-01-11T12:00:00Z')), 1);
  assert.equal(eventDaysLeft('winter', t('2026-12-01T12:00:00Z')), 17);
});

test('окна ивентов не пересекаются', () => {
  const s = [...EVENTS].sort((a, b) => a.start - b.start);
  for (let i = 1; i < s.length; i += 1) assert.ok(s[i - 1].end <= s[i].start, `${s[i - 1].id} / ${s[i].id}`);
});

test('вне площадок без предпросмотра ивентов нет', () => {
  assert.equal(eventActive('winter', t('2026-12-30T12:00:00Z')), false);
  assert.equal(activeEvent(t('2026-10-30T12:00:00Z')), null);
  assert.equal(activeEvent(t('2026-12-30T12:00:00Z')), null);
});

test('предпросмотр: метка, параметр, снятие, один ивент за раз', () => {
  assert.equal(parsePreview({ hash: '#winter', search: '' }, null), 'winter');
  assert.equal(parsePreview({ hash: '#winter', search: '' }, 'halloween'), 'winter');
  assert.equal(parsePreview({ hash: '', search: '?event=halloween' }, 'winter'), 'halloween');
  assert.equal(parsePreview({ hash: '', search: '' }, 'winter'), 'winter');
  assert.equal(parsePreview({ hash: '#winter-off', search: '' }, 'winter'), null);
  assert.equal(parsePreview({ hash: '', search: '?event=off' }, 'halloween'), null);
  assert.equal(parsePreview({ hash: '#profile', search: '' }, null), null);
  assert.equal(parsePreview({ hash: '', search: '' }, 'garbage'), null);
});

const W = getEvent('winter');
const D1 = '2026-12-27';
const wWin = (st, attempts, opts = {}) => applyResult(W, st, { won: true, attempts, word: W.riddles[0].word, today: D1, ...opts });

test('зима: описание и колода', () => {
  assert.equal(W.title, 'Новогодний переполох');
  assert.deepEqual(W.track.map((s) => s.need), [6, 14, 24, 35, 47, 60, 74, 90]);
  assert.equal(trackMax(W), 90);
  assert.equal(W.dailyCap, 12);
  assert.deepEqual(W.ice, { secondsPerRow: 30, thawPerGreen: 1 });
  for (const { word } of W.riddles) assert.ok(isValidWord(word, word.length), `нет в словаре: ${word}`);
});

test('зима: снежинки за попытки, в гонке вдвое', () => {
  assert.equal(wWin(undefined, 1).gained, 3);
  assert.equal(wWin(undefined, 3).gained, 2);
  assert.equal(wWin(undefined, 6).gained, 1);
  assert.equal(wWin(undefined, 1, { ice: true }).gained, 6);
  assert.equal(wWin(undefined, 5, { ice: true }).gained, 2);
});

test('зима: дневной лимит режет до остатка', () => {
  const st = { earned: 10, dayKey: D1, dayEarned: 10 };
  const r = wWin(st, 1, { ice: true });
  assert.equal(r.gained, 2);
  assert.equal(r.capped, true);
  assert.equal(r.next.dayEarned, 12);
});

test('зима: учёт гонки только при победе в гонке', () => {
  assert.equal(wWin(undefined, 2).next.iceWins, 0);
  const r = wWin(undefined, 2, { ice: true, iceLeft: 3 });
  assert.equal(r.next.iceWins, 1);
  assert.equal(r.next.iceBest, 3);
  const lost = applyResult(W, r.next, { won: false, attempts: 6, word: 'иней', today: D1, ice: true, iceLeft: 5 });
  assert.equal(lost.next.iceWins, 1);
  assert.equal(lost.next.iceBest, 3);
});

test('зима: умолчания, поле pumpkins только у Хэллоуина', () => {
  assert.deepEqual(normalize(W, undefined), {
    earned: 0, dayKey: null, dayEarned: 0, solved: 0, firstTry: 0, seen: [], steps: [], bought: [], iceWins: 0, iceBest: 0
  });
  assert.equal('pumpkins' in normalize(W, { pumpkins: 50 }), false);
  assert.equal(normalize(W, { pumpkins: 50 }).earned, 0);
  assert.equal(normalize(getEvent('halloween'), { pumpkins: 50 }).earned, 50);
});

test('зима: слияние — гонка по максимуму', () => {
  const m = merge(W, { iceWins: 2, iceBest: 1 }, { iceWins: 1, iceBest: 4 });
  assert.equal(m.iceWins, 2);
  assert.equal(m.iceBest, 4);
  assert.equal(merge(W, undefined, undefined), undefined);
});

test('зима: ступени выдаются один раз, предмет — в bought', () => {
  const r = applyResult(W, { earned: 5 }, { won: true, attempts: 1, word: 'иней', today: D1 });
  assert.deepEqual(r.newSteps.map((s) => s.id), ['w-s1']);
  assert.deepEqual(r.next.bought, ['w-mitten']);
  const again = applyResult(W, r.next, { won: true, attempts: 1, word: 'санки', today: D1 });
  assert.deepEqual(again.newSteps.map((s) => s.id), []);
});

test('слияние: Хэллоуин и зима в разных снимках не затирают друг друга', () => {
  const a = { pet: { ownedDecorations: [] }, halloween: { earned: 40, bought: ['hw-pumpkin'] } };
  const b = { pet: { ownedDecorations: [] }, winter: { earned: 10, iceWins: 1 } };
  const m = mergeProgress(a, b);
  assert.equal(m.halloween.earned, 40);
  assert.equal(m.winter.earned, 10);
  assert.equal(m.winter.iceWins, 1);
  assert.ok(m.pet.ownedDecorations.includes('hw-pumpkin'));
});

test('восстановление: зимний bought возвращает зимний наряд и фон', () => {
  const s = restoreEventItems({ pet: { ownedDecorations: [] }, inventory: [], winter: { bought: ['w-mitten', 'bg-w-morning'] } });
  assert.ok(s.pet.ownedDecorations.includes('w-mitten'));
  assert.ok(s.inventory.includes('bg-w-morning'));
});

test('старое сохранение с тропой Хэллоуина: выданное получено и после движка', () => {
  const m = mergeProgress({ pet: { ownedDecorations: [] }, halloween: { pumpkins: 9, rewards: ['hw-t1'] } }, {});
  assert.ok(m.halloween.bought.includes('hw-pumpkin'));
  assert.ok(m.pet.ownedDecorations.includes('hw-pumpkin'));
  assert.equal(m.halloween.earned, 9);
});

const windowId = (now) => EVENTS.find((e) => eventWindowOpen(e.id, now))?.id ?? null;
const hwRound = { gameMode: 'halloween', solution: getEvent('halloween').riddles[0].word };
const wRound = { gameMode: 'winter', solution: W.riddles[0].word.toUpperCase() };

test('партия ивента: хэллоуинская при открытой зиме — мертва', () => {
  assert.equal(isLiveEventRound(hwRound, windowId(t('2026-12-30T12:00:00Z'))), false);
});

test('партия ивента: зимняя после 12.01 — мертва, в окне — жива', () => {
  assert.equal(windowId(t('2027-01-12T09:00:00Z')), null);
  assert.equal(isLiveEventRound(wRound, windowId(t('2027-01-12T09:00:00Z'))), false);
  assert.equal(isLiveEventRound(wRound, windowId(t('2026-12-30T12:00:00Z'))), true);
});

test('партия ивента: слово не из колоды и обычная партия — мертвы', () => {
  assert.equal(isLiveEventRound({ gameMode: 'winter', solution: 'кошка' }, 'winter'), false);
  assert.equal(isLiveEventRound({ gameMode: 'normal', solution: W.riddles[0].word }, 'winter'), false);
  assert.equal(isLiveEventRound(null, 'winter'), false);
});

test('режим восстановления', () => {
  assert.equal(restoredMode(wRound), 'winter');
  assert.equal(restoredMode(hwRound), 'halloween');
  assert.equal(restoredMode({ gameMode: 'normal' }), 'normal');
  assert.equal(restoredMode(undefined), 'normal');
});

console.log(`${process.exitCode ? '✗' : '✓'} test-events: ${passed} passed`);
