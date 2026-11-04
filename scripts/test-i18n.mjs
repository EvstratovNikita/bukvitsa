// Проверка языковых пакетов: node scripts/test-i18n.mjs
// Главное: русское Слово дня не должно измениться из-за английской версии.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { loadPack, getPack } from '../src/data/pack.js';
import { getDailyWord, getDailyNumber, getDailyKey } from '../src/data/dailyWord.js';
import { isValidWord, poolForLength, isWordOfLang } from '../src/data/words.js';

// Эталон: перестановка того же порядка слов, что был до английской версии.
const lcgShuffle = (arr, seed) => {
  const out = [...arr];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const DAY = 86400000;

await loadPack('ru');
{
  // Список слов — ровно тот же, что в main до английской версии.
  const old = execFileSync('git', ['show', '1552234:src/data/words.js'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const oldWords = old.slice(old.indexOf('export const WORDS = ['), old.indexOf('];', old.indexOf('export const WORDS = ['))).match(/'[^']+'/g).map((w) => w.slice(1, -1));
  assert.deepEqual(getPack().dailyPool, oldWords, 'порядок русских слов изменился');
  const order = lcgShuffle(oldWords, 0xBE110A);
  const start = Date.UTC(2026, 4, 26);
  for (let i = 0; i < 1000; i++) {
    const d = new Date(start + i * DAY + 12 * 3600000);
    assert.equal(getDailyNumber(d), i + 1);
    assert.equal(getDailyWord(d), order[i % order.length], `день ${i}`);
  }
  assert.equal(getDailyKey(new Date('2026-11-04T21:30:00Z')), '2026-11-05', 'русский день — по Москве');
  assert.ok(isValidWord('точка', 5));
  assert.ok(!isValidWord('crane', 5));
  assert.equal(isWordOfLang('crane'), false);
}

await loadPack('en');
{
  const p = getPack();
  for (const len of [4, 5, 6]) {
    const pool = poolForLength(len);
    assert.ok(pool.length >= 1000, `мало слов ${len}: ${pool.length}`);
    assert.equal(new Set(pool).size, pool.length, 'повторы в пуле');
    for (const w of pool) {
      assert.equal(w.length, len, w);
      assert.ok(/^[a-z]+$/.test(w), w);
      assert.ok(isValidWord(w, len), `ответ не принимается как догадка: ${w}`);
    }
    const tiers = new Set(pool.map((w) => p.tier(w, len)));
    assert.deepEqual([...tiers].sort(), ['easy', 'hard', 'medium']);
  }
  assert.ok(isValidWord('crane', 5));
  assert.ok(isValidWord('tests', 5), 'формы слов принимаются как догадки');
  assert.ok(!isValidWord('zzzzz', 5));
  assert.ok(!isValidWord('точка', 5));
  assert.equal(isWordOfLang('точка'), false);
  assert.ok(!p.pool(5).includes('tests'), 'формы слов не загадываются');
  assert.ok(!p.pool(5).includes('hobbit') && !p.pool(6).includes('hobbit'), 'товарные знаки не загадываются');
  assert.equal(getDailyKey(new Date('2026-11-04T21:30:00Z')), '2026-11-04', 'английский день — по UTC');
  const days = new Set();
  for (let i = 0; i < 365; i++) days.add(getDailyWordFresh(i));
  assert.ok(days.size >= 360, 'Слово дня повторяется в течение года');
}
function getDailyWordFresh(i) {
  const order = lcgShuffle(getPack().dailyPool, 0xBE110A);
  return order[i % order.length];
}
console.log('OK — языковые пакеты');
