import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths — Yandex Games serves the build from a sub-path inside
  // an iframe, where absolute "/assets/..." URLs 404. Relative paths also work
  // fine on Vercel (index.html at root), so one build serves both.
  base: './',
  plugins: [react()],
  server: { port: 5173, open: true }
});
