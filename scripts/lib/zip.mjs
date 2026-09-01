// Минимальный писатель zip — общий для сборок под площадки.
//
// Пишем сами, а не зовём системный архиватор: `zip` в Windows нет, а
// Compress-Archive из PowerShell 5.1 кладёт в имена записей обратные слэши,
// и площадка такой архив не разбирает.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync } from 'node:zlib';

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

// Все файлы каталога рекурсивно, с путями от его корня и всегда через «/».
export function collectFiles(dir) {
  const walk = (d) => readdirSync(d).flatMap((name) => {
    const p = join(d, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  return walk(dir).map((p) => ({
    name: relative(dir, p).split(sep).join('/'),
    data: readFileSync(p)
  }));
}

export function writeZip(files, out) {
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

  writeFileSync(out, Buffer.concat([...locals, cd, eocd]));
}

// Проверки архива перед упаковкой: [регулярка, за что ругаем, где искать].
// Третий элемент необязателен и сужает проверку до нужных файлов — иначе,
// например, запрет на тег SDK в index.html срабатывает на коде загрузчика
// внутри бандла, где та же строка стоит по делу.
//
// Комментарии выкидываем — объяснение «почему тут НЕ должно быть CDN» само
// содержит адрес CDN, и проверка ловила бы собственный текст.
const stripComments = (t) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const TEXT = /\.(html|js|css|json|svg)$/i;

export function auditFiles(files, forbidden) {
  const problems = [];
  if (!files.some((f) => f.name === 'index.html')) problems.push('index.html не в корне архива');
  for (const f of files) {
    if (!TEXT.test(f.name)) continue;
    const text = stripComments(f.data.toString('utf8'));
    for (const [re, why, where] of forbidden) {
      if (where && !where.test(f.name)) continue;
      if (re.test(text)) problems.push(`${f.name}: ${why}`);
    }
  }
  return problems;
}

export const kb = (n) => `${(n / 1024).toFixed(1)} КБ`;
