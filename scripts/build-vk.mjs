// Сборка для VK Mini Apps: npm run build:vk
//
// Отличия от обычной сборки (--mode vk, см. .env.vk):
//   • Supabase-переменные пустые → isSupabaseConfigured=false; клиент к тому
//     же подменён заглушкой алиасом в vite.config.js, так что ни его кода, ни
//     адреса проекта в сборке нет. Прогресс живёт в облаке VK, экономика
//     считается локально (isEmbedded, см. lib/economy.js).
//   • Из index.html вырезан <script src="/sdk.js"> — это SDK Игр Яндекса, на
//     хостинге VK такого файла нет и запрос уходил бы в 404.
//
// На выходе — папка dist для `npm run deploy:vk` (vk-miniapps-deploy заливает
// её на хостинг VK) и zip на случай ручной загрузки через веб-интерфейс.
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { auditFiles, collectFiles, kb, writeZip } from './lib/zip.mjs';

const DIST = 'dist';
const OUT = 'buklitsa-vk.zip';

console.log('› vite build --mode vk');
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'vk'], { stdio: 'inherit' });

const files = collectFiles(DIST);

const problems = auditFiles(files, [
  [/fonts\.googleapis\.com|fonts\.gstatic\.com/, 'запрос к Google Fonts (шрифты должны быть в сборке)'],
  [/[a-z0-9]+\.supabase\.co/, 'адрес Supabase (в VK-сборке его быть не должно)'],
  [/GoTrueClient|RealtimeClient/, 'клиент Supabase в сборке (потерян алиас на заглушку в vite.config.js)'],
  // Тег вырезает плагин drop-yandex-sdk. Если он остался — значит плагин
  // отвалился, и на хостинге VK каждый запуск начинается с 404. Ищем только
  // в index.html: в бандле та же строка стоит по делу — это запасной
  // загрузчик SDK, который вне Яндекса всё равно не вызывается.
  [/src="\/sdk\.js"/, 'тег SDK Яндекса в index.html (на хостинге VK это 404)', /^index\.html$/]
]);

if (problems.length) {
  console.error('\n✗ сборка не принята:');
  for (const p of problems) console.error('  •', p);
  process.exit(1);
}

writeZip(files, OUT);

console.log(`\n✓ dist/ готова к deploy:vk, ${OUT} — ${kb(statSync(OUT).size)}`);
for (const f of files) console.log(`   ${f.name.padEnd(34)} ${kb(f.data.length)}`);
console.log('\n   проверено: index.html в корне, нет Google Fonts, нет Supabase, нет SDK Яндекса');
