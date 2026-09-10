// Сборка для VK Mini Apps: npm run build:vk
//
// Отличия от обычной сборки (--mode vk, см. .env.vk):
//   • Supabase-переменные пустые → isSupabaseConfigured=false, а сам клиент
//     подменён заглушкой алиасом в vite.config.js: ни входа по почте, ни его
//     кода в архиве нет. Прогресс живёт в облаке VK, экономика считается
//     локально (isEmbedded, см. lib/economy.js). Исключение одно — общая
//     таблица лидеров: она ходит на PostgREST голым fetch (lib/scores.js),
//     поэтому адрес проекта и ПУБЛИКУЕМЫЙ ключ в сборке есть по делу.
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
  // Адрес проекта в сборке теперь по делу: общая таблица лидеров ходит на
  // PostgREST голым fetch (VITE_SCORES_URL, см. lib/scores.js). Стеречь надо
  // не адрес, а клиент Supabase и служебные ключи — их в архиве быть не может.
  [/GoTrueClient|RealtimeClient/, 'клиент Supabase в сборке (потерян алиас на заглушку в vite.config.js)'],
  [/service_role|sb_secret_/, 'служебный ключ Supabase (в сборку попадает только публикуемый)'],
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
console.log('\n   проверено: index.html в корне, нет Google Fonts, нет клиента Supabase,');
console.log('   нет служебных ключей, нет SDK Яндекса');
