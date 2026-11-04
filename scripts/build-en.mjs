// Сборка английских архивов: node scripts/build-en.mjs playgama|gamemonetize|telegram
//
// Яндекс собирается своим build-yandex.mjs: один архив на оба языка, язык
// выбирается по SDK. Здесь — площадки, где игра идёт отдельным архивом.
// Значения вроде номеров блоков рекламы лежат в .env.<режим>.local (не в git).
import { execFileSync } from 'node:child_process';
import { statSync, writeFileSync } from 'node:fs';
import { auditFiles, collectFiles, kb, writeZip } from './lib/zip.mjs';

const mode = process.argv[2];
if (!['playgama', 'gamemonetize', 'telegram'].includes(mode)) {
  console.error('укажите площадку: playgama | gamemonetize | telegram');
  process.exit(1);
}

const DIST = 'dist';
const OUT = `hootword-${mode}.zip`;

console.log(`› vite build --mode ${mode}`);
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', mode], { stdio: 'inherit' });

// Настройки Bridge: файл рядом с index.html (wiki.playgama.com, Setup).
if (mode === 'playgama') {
  // Содержимое в документации не описано: пустой конфиг, настройки по умолчанию.
  writeFileSync(`${DIST}/playgama-bridge-config.json`, '{}\n');
}

const files = collectFiles(DIST);
const problems = auditFiles(files, [
  [/fonts\.googleapis\.com|fonts\.gstatic\.com/, 'запрос к Google Fonts (шрифты должны быть в архиве)'],
  [/GoTrueClient|RealtimeClient/, 'клиент Supabase в архиве (потерян алиас на заглушку в vite.config.js)'],
  [/service_role|sb_secret_/, 'служебный ключ Supabase'],
  [/src="\/sdk\.js"/, 'тег SDK Яндекса в index.html', /^index\.html$/],
  // В Telegram архив на два языка, заставку переводит скрипт на лету.
  ...(mode === 'telegram' ? [] : [[/Буклица|Загрузка/, 'русский текст в index.html', /^index\.html$/]])
]);
if (mode === 'gamemonetize' && !process.env.VITE_GM_GAME_ID) {
  console.warn('⚠ без VITE_GM_GAME_ID реклама не заработает: номер игры выдаёт кабинет GameMonetize (.env.gamemonetize.local)');
}
if (problems.length) {
  console.error('\n✗ архив не собран:');
  for (const p of problems) console.error('  •', p);
  process.exit(1);
}

writeZip(files, OUT);
console.log(`\n✓ ${OUT} — ${kb(statSync(OUT).size)}`);
for (const f of files) console.log(`   ${f.name.padEnd(40)} ${kb(f.data.length)}`);
