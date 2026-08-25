import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { isYandex } from './lib/yandex.js';
import './styles/index.css';

// The platform's sticky banner is painted OVER the game frame, so dvh keeps
// reporting the full height and centred overlays run under it (req 1.10.1).
// The class turns on --ad-safe, which reserves that strip.
if (isYandex) document.documentElement.classList.add('is-yandex');

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
