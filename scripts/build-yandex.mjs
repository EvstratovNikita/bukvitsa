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
import { statSync } from 'node:fs';
import { auditFiles, collectFiles, kb, writeZip } from './lib/zip.mjs';

const DIST = 'dist';
const OUT = 'buklitsa-yandex.zip';

console.log('› vite build --mode yandex');
// Зовём бинарник vite напрямую тем же node: npx.cmd Node 24 запускать отказывается.
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'yandex'], { stdio: 'inherit' });

const files = collectFiles(DIST);

const problems = auditFiles(files, [
  [/fonts\.googleapis\.com|fonts\.gstatic\.com/, 'запрос к Google Fonts (шрифты должны быть в архиве)'],
  [/[a-z0-9]+\.supabase\.co/, 'адрес Supabase (на площадке он не нужен, ключи в архив не кладём)'],
  // Клиент Supabase на площадке не используется и подменён заглушкой
  // (алиас в vite.config.js). Если его классы снова оказались в архиве —
  // алиас потеряли, и в сборку вернулись лишние 245 КБ.
  [/GoTrueClient|RealtimeClient/, 'клиент Supabase в архиве (потерян алиас на заглушку в vite.config.js)'],
  [/https:\/\/yandex\.ru\/games\/sdk/, 'SDK по абсолютному URL вместо /sdk.js (req 1.19.1)']
]);

if (problems.length) {
  console.error('\n✗ архив не собран:');
  for (const p of problems) console.error('  •', p);
  process.exit(1);
}

writeZip(files, OUT);

console.log(`\n✓ ${OUT} — ${kb(statSync(OUT).size)}`);
for (const f of files) console.log(`   ${f.name.padEnd(34)} ${kb(f.data.length)}`);
console.log('\n   проверено: index.html в корне, нет Google Fonts, нет ключей Supabase, SDK через /sdk.js');
