import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // Relative asset paths — Yandex Games serves the build from a sub-path inside
  // an iframe, where absolute "/assets/..." URLs 404. Relative paths also work
  // fine on Vercel (index.html at root), so one build serves both.
  base: './',
  plugins: [react()],
  resolve: {
    // На площадке Supabase выключен целиком, но статический импорт всё равно
    // тянул его клиент в архив — 245 КБ мёртвого груза из 903. Подменяем
    // заглушкой; в остальных режимах остаётся настоящий клиент.
    alias: mode === 'yandex'
      ? { '@supabase/supabase-js': fileURLToPath(new URL('./src/lib/supabase-stub.js', import.meta.url)) }
      : {}
  },
  server: { port: 5173, open: true }
}));
