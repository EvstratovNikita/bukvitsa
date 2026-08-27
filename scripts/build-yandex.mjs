// Сборка архива для Игр Яндекса: npm run build:yandex
//
// Отличия от обычной сборки (--mode yandex, см. .env.yandex):
//   • Supabase-переменные пустые → isSupabaseConfigured=false, и ни URL, ни
//     ключ проекта в архив не попадают. На площадке прогресс всё равно живёт
//     в облаке игрока (player.setData), а экономические RPC отключены.
//   • На выходе — zip с index.html в КОРНЕ (требование площадки), пути внутри
//     через «/», без служебных папок.
//
// В конце скрипт сам проверяет архив на то, за что ловили модерацию и что
// молча ломает игру на площадке: внешние запросы и утёкшие ключи.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const DIST = 'dist';
const OUT = 'buklitsa-yandex.zip';

// ---------- сборка ----------
console.log('› vite build --mode yandex');
// Зовём бинарник vite напрямую тем же node: npx.cmd Node 24 запускать отказывается.
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'yandex'], { stdio: 'inherit' });

// ---------- сбор файлов ----------
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(DIST).map((p) => ({
  // Внутри архива — пути от корня dist и всегда через «/».
  name: relative(DIST, p).split(sep).join('/'),
  data: readFileSync(p)
}));

// ---------- проверки перед упаковкой ----------
const problems = [];
if (!files.some((f) => f.name === 'index.html')) problems.push('index.html не в корне архива');

const TEXT = /\.(html|js|css|json|svg)$/i;
const FORBIDDEN = [
  [/fonts\.googleapis\.com|fonts\.gstatic\.com/, 'запрос к Google Fonts (шрифты должны быть в архиве)'],
  [/[a-z0-9]+\.supabase\.co/, 'адрес Supabase (на площадке он не нужен, ключи в архив не кладём)'],
  // Клиент Supabase на площадке не используется и подменён заглушкой
  // (алиас в vite.config.js). Если его классы снова оказались в архиве —
  // алиас потеряли, и в сборку вернулись лишние 245 КБ.
  [/GoTrueClient|RealtimeClient/, 'клиент Supabase в архиве (потерян алиас на заглушку в vite.config.js)'],
  [/https:\/\/yandex\.ru\/games\/sdk/, 'SDK по абсолютному URL вместо /sdk.js (req 1.19.1)']
];
// Комментарии выкидываем: объяснение «почему тут НЕ должно быть CDN» само
// содержит адрес CDN, и проверка ловила бы собственный текст.
const stripComments = (t) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
for (const f of files) {
  if (!TEXT.test(f.name)) continue;
  const text = stripComments(f.data.toString('utf8'));
  for (const [re, why] of FORBIDDEN) if (re.test(text)) problems.push(`${f.name}: ${why}`);
}

if (problems.length) {
  console.error('\n✗ архив не собран:');
  for (const p of problems) console.error('  •', p);
  process.exit(1);
}

// ---------- zip ----------
// Пишем сами: `zip` в системе нет, а Compress-Archive из PowerShell 5.1
// кладёт в имена записей обратные слэши.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const locals = [];
const central = [];
let offset = 0;
for (const f of files) {
  const name = Buffer.from(f.name, 'utf8');
  const comp = deflateRawSync(f.data, { level: 9 });
  const crc = crc32(f.data);

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0);
  lh.writeUInt16LE(20, 4);          // version needed
  lh.writeUInt16LE(0x0800, 6);      // flags: имена в UTF-8
  lh.writeUInt16LE(8, 8);           // метод: deflate
  lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(comp.length, 18);
  lh.writeUInt32LE(f.data.length, 22);
  lh.writeUInt16LE(name.length, 26);
  locals.push(lh, name, comp);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0);
  ch.writeUInt16LE(20, 4);
  ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(0x0800, 8);
  ch.writeUInt16LE(8, 10);
  ch.writeUInt32LE(crc, 16);
  ch.writeUInt32LE(comp.length, 20);
  ch.writeUInt32LE(f.data.length, 24);
  ch.writeUInt16LE(name.length, 28);
  ch.writeUInt32LE(offset, 42);
  central.push(ch, name);

  offset += lh.length + name.length + comp.length;
}

const cd = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(cd.length, 12);
eocd.writeUInt32LE(offset, 16);

writeFileSync(OUT, Buffer.concat([...locals, cd, eocd]));

const kb = (n) => `${(n / 1024).toFixed(1)} КБ`;
console.log(`\n✓ ${OUT} — ${kb(statSync(OUT).size)}`);
for (const f of files) console.log(`   ${f.name.padEnd(34)} ${kb(f.data.length)}`);
console.log('\n   проверено: index.html в корне, нет Google Fonts, нет ключей Supabase, SDK через /sdk.js');
