import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Внутри площадок (Игры Яндекса, VK Mini Apps) Supabase выключен целиком, но
// статический импорт всё равно тянул его клиент в архив — 245 КБ мёртвого
// груза из 903. Подменяем заглушкой; на вебе остаётся настоящий клиент.
const EMBEDDED_MODES = ['yandex', 'vk'];

// В index.html стоит <script src="/sdk.js"> — так требует подключать SDK
// документация Игр Яндекса. На хостинге VK этого файла нет: запрос уйдёт в
// 404 без всякой пользы, поэтому в vk-сборке тег вырезаем.
const dropYandexSdk = () => ({
  name: 'drop-yandex-sdk',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.replace(/\s*<script src="\/sdk\.js"><\/script>/, '')
  }
});

export default defineConfig(({ mode }) => ({
  // Relative asset paths — Yandex Games serves the build from a sub-path inside
  // an iframe, where absolute "/assets/..." URLs 404. Relative paths also work
  // fine on Vercel (index.html at root), so one build serves both.
  base: './',
  plugins: [react(), ...(mode === 'vk' ? [dropYandexSdk()] : [])],
  resolve: {
    alias: EMBEDDED_MODES.includes(mode)
      ? { '@supabase/supabase-js': fileURLToPath(new URL('./src/lib/supabase-stub.js', import.meta.url)) }
      : {}
  },
  server: { port: 5173, open: true }
}));
