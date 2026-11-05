// Обложки Playgama точно по размерам консоли: node scripts/render-covers.mjs <папка>
// Нужен запущенный сервер hootword-pg (5177) и Chrome. Картинки в git не кладём,
// рецепт — design/cover.html.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const OUT = resolve(process.argv[2] || 'design/covers');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(OUT, { recursive: true });
const SIZES = { square: [800, 800], portrait: [1080, 1920], landscape: [1920, 1080] };
for (const [name, [w, h]] of Object.entries(SIZES)) {
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cover-'))}`,
    `--window-size=${w},${h}`, '--virtual-time-budget=6000',
    `--screenshot=${join(OUT, `${name}.png`)}`,
    `http://localhost:5177/design/cover.html?s=${name}`
  ], { stdio: 'ignore', timeout: 90000 });
  console.log(name, `${w}x${h}`);
}
