import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Внутри площадок (Игры Яндекса, VK Mini Apps) Supabase выключен целиком, но
// статический импорт всё равно тянул его клиент в архив — 245 КБ мёртвого
// груза из 903. Подменяем заглушкой; на вебе остаётся настоящий клиент.
const EMBEDDED_MODES = ['yandex', 'vk', 'playgama', 'gamemonetize', 'telegram'];

// В index.html стоит <script src="/sdk.js"> — так требует подключать SDK
// документация Игр Яндекса. На хостинге VK этого файла нет: запрос уйдёт в
// 404 без всякой пользы, поэтому в vk-сборке тег вырезаем.
const dropYandexSdk = () => ({
  name: 'drop-yandex-sdk',
  transformIndexHtml: {
    order: 'pre',
    // Заодно вырезаем HTML-комментарии: в них речь о SDK Яндекса и ссылка на
    // его документацию — игроку не видны, но модерация VK смотрит исходник.
    handler: (html) => html
      .replace(/\s*<script src="\/sdk\.js"><\/script>/, '')
      .replace(/<!--[\s\S]*?-->/g, '')
  }
});

// Заставка рисуется до JS. Английским сборкам она сразу на английском; там, где
// язык известен только площадке (Яндекс, Telegram), — маленький скрипт угадывает
// его заранее, а ошибка видна лишь долю секунды.
const SPLASH_CELLS = /<div class="splash__cells">[\s\S]*?<\/div>/;
const EN_CELLS = `<div class="splash__cells">${[...'HOOTWORD'].map((c, i) => `<span class="splash__cell" style="--i:${i}">${c}</span>`).join('')}</div>`;
const toEnglishHtml = (html) => html
  .replace('<html lang="ru">', '<html lang="en">')
  .replace('<title>Буклица</title>', '<title>Hootword</title>')
  .replace(SPLASH_CELLS, EN_CELLS)
  .replace('Загрузка', 'Loading');
const SPLASH_GUESS = `try {
          var tg = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
          var code = String((tg && tg.language_code) || new URLSearchParams(location.search).get('lang') || navigator.language || 'ru').slice(0, 2).toLowerCase();
          if (!/^(ru|be|kk|uk|uz|ky|tg|hy|az)$/.test(code)) {
            var word = 'HOOTWORD', box = document.querySelector('.splash__cells');
            box.innerHTML = word.split('').map(function (c, i) { return '<span class="splash__cell" style="--i:' + i + '">' + c + '</span>'; }).join('');
            document.querySelector('.splash__tagline').firstChild.textContent = 'Loading ';
            document.title = 'Hootword';
          }
        } catch (e) {}`;

// Скрипты и заставка каждой площадки. Комментарии вырезаем там, где в них речь о
// другой площадке: модерация смотрит исходник.
const platformHtml = (mode, env) => ({
  name: 'platform-html',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => {
      let out = html;
      const scripts = [];
      if (mode === 'playgama') scripts.push('<script src="https://bridge.playgama.com/v2/stable/playgama-bridge.js"></script>');
      if (mode === 'telegram') {
        scripts.push('<script src="https://telegram.org/js/telegram-web-app.js"></script>');
        scripts.push('<script src="https://sad.adsgram.ai/js/sad.min.js"></script>');
      }
      if (mode === 'gamemonetize') {
        scripts.push(`<script>
      window.SDK_OPTIONS = {
        gameId: ${JSON.stringify(env.VITE_GM_GAME_ID || '')},
        onEvent: function (a) {
          if (a.name === 'SDK_GAME_PAUSE') window.dispatchEvent(new Event('gm-ad-pause'));
          if (a.name === 'SDK_GAME_START') window.dispatchEvent(new Event('gm-ad-start'));
        }
      };
      (function (d, s, id) {
        var f = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        var e = d.createElement(s);
        e.id = id;
        e.src = 'https://api.gamemonetize.com/sdk.js';
        f.parentNode.insertBefore(e, f);
      })(document, 'script', 'gamemonetize-sdk');
    </script>`);
      }
      if (mode !== 'yandex' && mode !== 'development' && mode !== 'production') {
        out = out.replace(/\s*<script src="\/sdk\.js"><\/script>/, '').replace(/<!--[\s\S]*?-->/g, '');
      }
      if (scripts.length) out = out.replace('</head>', `  ${scripts.join('\n    ')}\n  </head>`);
      if (mode === 'playgama' || mode === 'gamemonetize') out = toEnglishHtml(out);
      const guess = mode === 'yandex' || mode === 'telegram' ? SPLASH_GUESS : '';
      return out.replace('/*SPLASH_LANG*/', guess);
    }
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
  // Relative asset paths — Yandex Games serves the build from a sub-path inside
  // an iframe, where absolute "/assets/..." URLs 404. Relative paths also work
  // fine on Vercel (index.html at root), so one build serves both.
  base: './',
  // Время сборки — мелкой строкой в настройках: по телефону видно, какая
  // версия реально открылась (площадки любят отдавать старую из кэша).
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  plugins: [react(), platformHtml(mode, env), ...(mode === 'vk' ? [dropYandexSdk()] : [])],
  resolve: {
    alias: EMBEDDED_MODES.includes(mode)
      ? { '@supabase/supabase-js': fileURLToPath(new URL('./src/lib/supabase-stub.js', import.meta.url)) }
      : {}
  },
  server: { port: 5173, open: true }
  };
});
