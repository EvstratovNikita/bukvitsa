// Controls the boot splash defined inline in index.html. The element paints
// before this bundle even loads; here we only fade it out once the game is
// ready, after a small minimum so the animation is actually seen.

const MIN_VISIBLE_MS = 900;   // don't flash-and-vanish on instant loads
const FADE_MS = 480;          // must match the #splash opacity transition
const SAFETY_MS = 12000;      // never trap the user if "ready" never fires

let done = false;

export function hideSplash() {
  if (done || typeof document === 'undefined') return;
  const el = document.getElementById('splash');
  if (!el) { done = true; return; }
  done = true;

  const start = window.__splashStart || Date.now();
  const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - start));

  setTimeout(() => {
    el.classList.add('splash--hide');
    setTimeout(() => { el.remove(); }, FADE_MS);
  }, wait);
}

// Belt-and-suspenders: force the splash away after a hard cap even if the app
// somehow never signals readiness.
if (typeof window !== 'undefined') {
  setTimeout(hideSplash, SAFETY_MS);
}
