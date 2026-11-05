// Звук игры — один регулятор. Звучит только там, где сборка это включила
// (__SOUND__, см. vite.config.js): на остальных площадках файлы даже не попадают
// в архив, а все вызовы здесь — пустые.
//
// Молчим, если верно хоть одно: игрок выключил звук; площадка выключила звук;
// площадка поставила паузу; идёт реклама; страница скрыта.
const SOUND_ON = typeof __SOUND__ !== 'undefined' && __SOUND__;

export const soundEnabledInBuild = SOUND_ON;

let engine = null;
let enginePromise = null;
const blocks = new Set();
let wanted = null; // какая музыка должна играть
const listeners = new Set();

const MUTE_KEY = 'hootword:muted';
let store = null;
let muted = false;

const silent = () => muted || blocks.size > 0;
const apply = () => engine?.setSilent(silent());
const notify = () => listeners.forEach((f) => f(muted));

export function initSound(storage) {
  if (!SOUND_ON) return;
  store = storage;
  muted = Boolean(store.get(MUTE_KEY, false));
  document.addEventListener('visibilitychange', () => blockSound('hidden', document.hidden));
  // Браузер разрешает звук только после жеста игрока.
  const unlock = () => {
    // Выключенный звук жест не включает: unlock возобновил бы и его.
    loadEngine().then((e) => { if (!silent()) e.unlock(); });
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  // Щелчок на любую кнопку интерфейса, кроме клавиш поля: у них свой звук.
  window.addEventListener('click', (ev) => {
    const b = ev.target?.closest?.('button');
    if (b && !b.classList.contains('key') && !b.disabled && !b.dataset.quiet) playSfx('click');
  }, { capture: true });
}

function loadEngine() {
  if (!SOUND_ON) return Promise.reject(new Error('no sound'));
  if (!enginePromise) {
    enginePromise = import('./soundEngine.js').then((m) => {
      engine = m.createEngine();
      apply();
      if (wanted) engine.playMusic(wanted);
      return engine;
    });
  }
  return enginePromise;
}

export function playSfx(name) {
  if (SOUND_ON && engine && !silent()) engine.playSfx(name);
}

export function playMusic(name) {
  if (!SOUND_ON) return;
  wanted = name;
  engine?.playMusic(name);
}

// reason: 'ad' | 'pause' | 'platform' | 'hidden'
export function blockSound(reason, on) {
  if (!SOUND_ON) return;
  if (on) blocks.add(reason); else blocks.delete(reason);
  apply();
}

export const isMuted = () => muted;

export function setMuted(v) {
  muted = Boolean(v);
  store?.set(MUTE_KEY, muted);
  apply();
  notify();
}

export function onMutedChange(f) {
  listeners.add(f);
  return () => listeners.delete(f);
}
