// Проверка перевода: node scripts/i18n-check.mjs [--dump файл]
//
// Находит все вызовы tr('…') и сверяет с src/i18n/en.js:
//   • нет перевода — ошибка (в игре показался бы русский текст);
//   • в переводе остались русские буквы — ошибка;
//   • подстановки {n} в переводе не совпадают с оригиналом — ошибка;
//   • лишние ключи — предупреждение.
// --dump пишет все фразы с файлами: это список для переводчика.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(path.resolve('package.json'));
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const CYR = /[А-Яа-яЁё]/;
const keys = new Map();
const dynamic = [];

(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.jsx?$/.test(f)) continue;
    const file = p.split(path.sep).join('/');
    const src = fs.readFileSync(p, 'utf8');
    if (!src.includes('tr(')) continue;
    const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, {
      CallExpression(q) {
        if (!q.get('callee').isIdentifier({ name: 'tr' })) return;
        const a = q.node.arguments[0];
        if (a?.type === 'StringLiteral') {
          if (!keys.has(a.value)) keys.set(a.value, new Set());
          keys.get(a.value).add(file.replace('src/', ''));
        } else {
          dynamic.push(`${file}:${q.node.loc.start.line}`);
        }
      }
    });
  }
})('src');

const dumpAt = process.argv.indexOf('--dump');
if (dumpAt > 0) {
  const lines = [...keys].map(([k, fs_]) => `${JSON.stringify(k)}  // ${[...fs_].join(', ')}`);
  fs.writeFileSync(process.argv[dumpAt + 1], lines.join('\n'));
  console.log('фраз:', keys.size, 'выгружено');
}

let EN = {};
try {
  ({ EN } = await import(pathToFileURL(path.resolve('src/i18n/en.js')).href));
} catch (e) {
  console.error('нет src/i18n/en.js:', e.message);
}

const params = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const problems = [];
for (const k of keys.keys()) {
  const v = EN[k];
  if (v === undefined) { problems.push(`НЕТ ПЕРЕВОДА: ${JSON.stringify(k)} (${[...keys.get(k)][0]})`); continue; }
  if (CYR.test(v)) problems.push(`РУССКИЕ БУКВЫ: ${JSON.stringify(k)} → ${v}`);
  if (params(k) !== params(v)) problems.push(`ПОДСТАНОВКИ: ${JSON.stringify(k)} → ${v}`);
}
const extra = Object.keys(EN).filter((k) => !keys.has(k));

console.log(`фраз ${keys.size}, переведено ${keys.size - problems.filter((p) => p.startsWith('НЕТ')).length}`);
if (dynamic.length) console.log('не строка в tr():', dynamic.join(' '));
if (extra.length) console.log(`лишних ключей ${extra.length}:\n  ${extra.join('\n  ')}`);
if (problems.length) {
  console.error(problems.slice(0, 40).join('\n'));
  if (problems.length > 40) console.error(`… и ещё ${problems.length - 40}`);
  process.exit(1);
}
console.log('✓ перевод полный');
