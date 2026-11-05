import React from 'react';
import ReactDOM from 'react-dom/client';
import { initLang } from './lib/lang.js';
import { initPlatformSdk } from './lib/lifecycle.js';
import { initUiScale } from './lib/uiScale.js';
// Шрифты — до index.css, чтобы @font-face объявились раньше правил, которые
// на них ссылаются. Лежат в архиве, а не на Google Fonts (см. fonts.css).
import './styles/fonts.css';
import './styles/index.css';
// Ивент «Ночь тыкв» — отдельным файлом после основных стилей.
import './styles/halloween.css';

// Метка платформы в DOM — удобна для отладки и ручных проверок.
// Место под липкий баннер резервировать не нужно: площадка сама ужимает
// кадр игры, и dvh уже отдаёт высоту без его полосы.
// Язык — до импорта приложения: от него зависят данные на уровне модулей.
async function start() {
  await initPlatformSdk();
  await initLang();
  const [{ default: App }, { isYandex }] = await Promise.all([
    import('./App.jsx'),
    import('./lib/yandex.js')
  ]);
  if (isYandex) document.documentElement.classList.add('is-yandex');
  if (typeof __PLAYGAMA__ !== 'undefined' && __PLAYGAMA__) initUiScale();
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Yandex req 1.6.2.7 (desktop) & 1.6.1.8 (mobile): interacting with the game
// field must never open the context menu / long-press callout. CSS handles
// selection; this kills the menu itself. Real inputs keep their own menu.
document.addEventListener('contextmenu', (e) => {
  if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
  e.preventDefault();
});

start();
