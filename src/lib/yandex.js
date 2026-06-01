// Yandex Games SDK bridge. Single source of truth for the ysdk instance and
// the handful of SDK features we use. Every export is a safe no-op off the
// Yandex platform, so the same build runs unchanged on the web (Vercel).
//
// The game is served from inside a Yandex iframe (app-*.games.s3.yandex.net,
// parent yandex.ru/games). We detect that and ONLY then inject the SDK script
// — loading it on the plain web would falsely flip the platform to "yandex"
// and break ads/auth.

function detectYandex() {
  if (typeof window === 'undefined') return false;
  try {
    const host = window.location.hostname || '';
    const ref = document.referrer || '';
    const anc = (window.location.ancestorOrigins && window.location.ancestorOrigins[0]) || '';
    const inIframe = window.self !== window.top;
    const yandexHost = /(^|\.)games\.s3\.yandex|games\.yandex|\.yandex\.net$/i.test(host) || host.startsWith('app-');
    const yandexParent = /yandex\./i.test(ref) || /yandex\./i.test(anc);
    return yandexHost || (inIframe && yandexParent);
  } catch {
    // Cross-origin access to window.top can throw inside the iframe — that
    // itself is a strong signal we're embedded somewhere (likely Yandex).
    return Boolean(document.referrer && /yandex\./i.test(document.referrer));
  }
}

export const isYandex = detectYandex();

let _ysdkPromise = null;

function loadSdkScript() {
  return new Promise((resolve, reject) => {
    if (window.YaGames) return resolve();
    const s = document.createElement('script');
    s.src = 'https://yandex.ru/games/sdk/v2';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('YaGames SDK failed to load'));
    document.head.appendChild(s);
  });
}

// Lazily loads the SDK script (once) and resolves the initialised ysdk. Rejects
// off-platform so callers can fall back. Cached.
export function getYsdk() {
  if (_ysdkPromise) return _ysdkPromise;
  if (!isYandex) {
    _ysdkPromise = Promise.reject(new Error('not Yandex Games'));
    return _ysdkPromise;
  }
  _ysdkPromise = loadSdkScript().then(() => window.YaGames.init());
  return _ysdkPromise;
}

// Tell Yandex the game is ready to play → hides their loading screen. Call once
// the first puzzle is decided. No-op + swallowed errors off-platform.
export async function loadingReady() {
  if (!isYandex) return;
  try {
    const ysdk = await getYsdk();
    ysdk.features?.LoadingAPI?.ready?.();
  } catch (e) {
    console.warn('[yandex] LoadingAPI.ready failed', e);
  }
}

// GameplayAPI start/stop — signals active play vs paused, so the platform can
// pause sound/ads correctly and track engagement.
export async function gameplayStart() {
  if (!isYandex) return;
  try { (await getYsdk()).features?.GameplayAPI?.start?.(); } catch { /* noop */ }
}
export async function gameplayStop() {
  if (!isYandex) return;
  try { (await getYsdk()).features?.GameplayAPI?.stop?.(); } catch { /* noop */ }
}

// Fullscreen (interstitial) advert. Resolves true if an ad was actually shown.
// Yandex enforces its own frequency cap (~60s) on top of our throttling.
export async function showFullscreenAdv() {
  if (!isYandex) return false;
  try {
    const ysdk = await getYsdk();
    return await new Promise((resolve) => {
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: (wasShown) => resolve(Boolean(wasShown)),
          onError: () => resolve(false)
        }
      });
    });
  } catch (e) {
    console.warn('[yandex] showFullscreenAdv failed', e);
    return false;
  }
}

// Sticky bottom banner (extra passive revenue). Yandex shows/places it; we
// just request it once after the game is ready. No-op off platform.
export async function showStickyBanner() {
  if (!isYandex) return;
  try { (await getYsdk()).adv?.showBannerAdv?.(); }
  catch (e) { console.warn('[yandex] banner failed', e); }
}

// Native rating prompt. Only fires if Yandex says the user can review now;
// returns true if they actually submitted feedback. Call at a positive moment.
export async function requestReview() {
  if (!isYandex) return false;
  try {
    const ysdk = await getYsdk();
    const can = await ysdk.feedback?.canReview?.();
    if (!can?.value) return false;
    const res = await ysdk.feedback.requestReview();
    return Boolean(res?.feedbackSent);
  } catch (e) {
    console.warn('[yandex] requestReview failed', e);
    return false;
  }
}

// Kick off SDK load as early as possible when we're on Yandex, so the first
// LoadingAPI.ready / ad call doesn't wait on a cold init.
if (isYandex) getYsdk().catch(() => { /* surfaced later by callers */ });
