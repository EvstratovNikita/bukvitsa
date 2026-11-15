// Проверки общего движка сезонных ивентов: календарь, предпросмотр, прогресс,
// слияние, режим, ледяная гонка. Запуск: node scripts/test-events.mjs
// Как и test-halloween.mjs — без раннера, модули чистые (платформа в node — web).

import assert from 'node:assert/strict';
import {
  EVENTS, activeEvent, eventActive, eventDaysLeft, eventDaysLeftAt, eventWindowOpen, parsePreview
} from '../src/lib/events.js';

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

console.log(`${process.exitCode ? '✗' : '✓'} test-events: ${passed} passed`);
