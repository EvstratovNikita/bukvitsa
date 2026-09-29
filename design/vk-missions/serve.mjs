// Превью картинок миссий: node serve.mjs → http://localhost:4180
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), 'out');
createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const body = await readFile(join(root, p));
    const type = p.endsWith('.png') ? 'image/png' : p.endsWith('.woff2') ? 'font/woff2' : 'text/html; charset=utf-8';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(4180, () => console.log('http://localhost:4180'));
