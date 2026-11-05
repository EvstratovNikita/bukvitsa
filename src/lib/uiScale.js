// Большие экраны (Playgama, п. 1.6.1): вёрстка рассчитана на телефон и окно до
// ~1366×768, на мониторе она оставалась маленьким блоком посреди фона. Здесь весь
// интерфейс увеличивается целиком. Высота экрана идёт через --app-h (её читают
// .app, главное меню и модалки): dvh внутри zoom умножился бы и вылез за экран.
const DESIGN_W = 620;
const DESIGN_H = 800;
const MIN_ZOOM = 1.2; // меньше не стоит: чуть крупнее — та же вёрстка, только мыльнее
const MAX_ZOOM = 2.4;
const MIN_FRAME_H = 380; // ниже этого вёрстка уже не помещается (844×390 ещё в порядке)
const MIN_SHRINK = 0.4;

let zoom = 1;

// getBoundingClientRect отдаёт экранные пиксели, а стили внутри zoom умножаются:
// координаты из него перед записью в стиль надо делить на это число.
export const uiZoom = () => zoom;

export function initUiScale() {
  const root = document.getElementById('root');
  if (!root || !window.CSS?.supports?.('zoom', '2')) return;
  const apply = () => {
    const k = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
    if (k >= MIN_ZOOM) zoom = Math.min(Math.round(k * 100) / 100, MAX_ZOOM);
    // Совсем низкий фрейм площадки: всё уменьшается, а не наезжает друг на друга.
    else if (window.innerHeight < MIN_FRAME_H) zoom = Math.max(Math.round((window.innerHeight / MIN_FRAME_H) * 100) / 100, MIN_SHRINK);
    else zoom = 1;
    root.style.zoom = zoom === 1 ? '' : String(zoom);
    const style = document.documentElement.style;
    if (zoom === 1) style.removeProperty('--app-h');
    else style.setProperty('--app-h', `${window.innerHeight / zoom}px`);
  };
  apply();
  window.addEventListener('resize', apply);
}
