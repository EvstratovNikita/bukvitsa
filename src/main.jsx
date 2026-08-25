import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { isYandex, syncAdSafe } from './lib/yandex.js';
import './styles/index.css';

// Метка платформы в DOM — удобна для отладки и ручных проверок.
if (isYandex) document.documentElement.classList.add('is-yandex');

// Полоса под липкий баннер площадки включается только если баннер
// действительно показан. Пересматриваем при возврате во вкладку и на
// смене ориентации: баннер может появиться или исчезнуть по ходу сессии.
if (isYandex) {
  const sync = () => { syncAdSafe(); };
  sync();
  setTimeout(sync, 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.addEventListener('orientationchange', () => setTimeout(sync, 300));
}

// Yandex req 1.6.2.7 (desktop) & 1.6.1.8 (mobile): interacting with the game
// field must never open the context menu / long-press callout. CSS handles
// selection; this kills the menu itself. Real inputs keep their own menu.
document.addEventListener('contextmenu', (e) => {
  if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
