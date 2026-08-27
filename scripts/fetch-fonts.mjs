// Перекачивает шрифты «Буквицы» из Google Fonts в src/assets/fonts и
// переписывает src/styles/fonts.css.
//
// Зачем локально: Игры Яндекса запускают игру из архива, и запрос к
// fonts.googleapis.com оттуда — и повод для придирки модерации, и реальный
// риск (у части игроков CDN не отвечает → игра стартует системным шрифтом).
//
// Обе гарнитуры вариативные: Google отдаёт ОДИН файл на все начертания
// подмножества, поэтому качаем по хешу и объявляем диапазон весов.
//
// Запуск: node scripts/fetch-fonts.mjs
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap';
// Подмножества, которые игре нужны. cyrillic-ext / greek / vietnamese — нет.
const KEEP = new Set(['cyrillic', 'latin']);
// Диапазон весов на семейство — ровно тот, что использует index.css.
const WEIGHTS = { 'Manrope': '400 800', 'Cormorant Garamond': '500 700' };

const FONT_DIR = 'src/assets/fonts';
const curl = (url, out) => execFileSync('curl', out ? ['-sfA', UA, url, '-o', out] : ['-sfA', UA, url], { encoding: out ? 'buffer' : 'utf8', maxBuffer: 32 * 1024 * 1024 });

mkdirSync(FONT_DIR, { recursive: true });
const css = curl(CSS_URL);

const faces = [];
const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g;
for (let m; (m = re.exec(css));) {
  const subset = m[1];
  if (!KEEP.has(subset)) continue;
  const body = m[2];
  faces.push({
    subset,
    family: /font-family:\s*'([^']+)'/.exec(body)[1],
    url: /url\((https:[^)]+\.woff2)\)/.exec(body)[1],
    range: /unicode-range:\s*([^;]+);/.exec(body)[1].trim()
  });
}

// Дедупликация: у вариативного шрифта все веса одного подмножества — один файл.
const seen = new Map();
const unique = [];
for (const f of faces) {
  const key = `${f.family}|${f.subset}`;
  if (seen.has(key)) continue;
  const slug = f.family.toLowerCase().replace(/\s+/g, '-');
  const file = `${slug}-${f.subset}.woff2`;
  curl(f.url, `${FONT_DIR}/${file}`);
  const hash = createHash('md5').update(readFileSync(`${FONT_DIR}/${file}`)).digest('hex').slice(0, 8);
  seen.set(key, file);
  unique.push({ ...f, file, hash });
}

const rules = unique.map((f) => `/* ${f.subset} */
@font-face {
  font-family: '${f.family}';
  font-style: normal;
  font-weight: ${WEIGHTS[f.family]};
  font-display: swap;
  src: url('../assets/fonts/${f.file}') format('woff2');
  unicode-range: ${f.range};
}`).join('\n\n');

writeFileSync('src/styles/fonts.css', `/* Сгенерировано scripts/fetch-fonts.mjs — руками не править.
 *
 * Шрифты лежат в архиве игры, а не на fonts.googleapis.com: внешний CDN в
 * сборке для Игр Яндекса — и повод для придирки модерации, и риск старта с
 * системным шрифтом. Обе гарнитуры вариативные, поэтому одно объявление на
 * подмножество с диапазоном весов.
 */

${rules}
`);

console.log(unique.map((f) => `${f.file} (${f.hash})`).join('\n'));
