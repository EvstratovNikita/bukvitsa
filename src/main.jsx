import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

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
