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
  try {
    const ysdk = await getYsdk();
    // Diagnostic: reason tells us WHY a banner won't show (e.g. no RTB block
    // connected, or banners only serve on a published/moderated game).
    try {
      const status = await ysdk.adv?.getBannerAdvStatus?.();
      console.info('[yandex] banner status', status);
    } catch { /* status optional */ }
    ysdk.adv?.showBannerAdv?.();
  } catch (e) {
    console.warn('[yandex] banner failed', e);
  }
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

// ---------- Player + cloud save ----------
// On Yandex we store the whole stats blob in the player's own cloud (works in
// "lite"/guest mode too; migrates to the account on login → multidevice).

let _playerPromise = null;
export async function getPlayer() {
  if (!isYandex) return null;
  if (_playerPromise) return _playerPromise;
  _playerPromise = getYsdk()
    .then((y) => y.getPlayer({ scopes: false }))
    .catch((e) => { _playerPromise = null; throw e; });
  return _playerPromise;
}

export async function cloudLoad() {
  if (!isYandex) return null;
  try {
    const data = await (await getPlayer()).getData();
    return data && typeof data === 'object' ? data : null;
  } catch (e) {
    console.warn('[yandex] getData failed', e);
    return null;
  }
}

export async function cloudSave(obj) {
  if (!isYandex || !obj) return;
  try { await (await getPlayer()).setData(obj, true); }
  catch (e) { console.warn('[yandex] setData failed', e); }
}

export async function getPlayerInfo() {
  if (!isYandex) return null;
  try {
    const p = await getPlayer();
    const mode = p.getMode?.();
    return { authorized: mode !== 'lite', name: p.getName?.() || '' };
  } catch { return null; }
}

// Opens the Yandex auth dialog (the ONLY permitted login on the platform).
// Resolves true on success; refetches the player so data attaches to the
// now-authorized account.
export async function openAuth() {
  if (!isYandex) return false;
  try {
    const y = await getYsdk();
    await y.auth.openAuthDialog();
    _playerPromise = null;
    await getPlayer();
    return true;
  } catch (e) {
    console.warn('[yandex] openAuthDialog failed/declined', e);
    return false;
  }
}

// ---------- Leaderboards ----------
// Create a leaderboard with this technical name in the Yandex console.
export const LEADERBOARD = 'wins';

let _lbPromise = null;
function getLb() {
  if (!_lbPromise) _lbPromise = getYsdk().then((y) => y.getLeaderboards());
  return _lbPromise;
}

export async function submitScore(score, board = LEADERBOARD) {
  if (!isYandex || !Number.isFinite(score)) return;
  try { (await getLb()).setLeaderboardScore(board, Math.max(0, Math.round(score))); }
  catch (e) { console.warn('[yandex] setLeaderboardScore failed', e); }
}

export async function fetchLeaderboard(board = LEADERBOARD) {
  if (!isYandex) return null;
  try {
    const lb = await getLb();
    return await lb.getLeaderboardEntries(board, { includeUser: true, quantityTop: 20, quantityAround: 5 });
  } catch (e) {
    console.warn('[yandex] getLeaderboardEntries failed', e);
    return null;
  }
}

// Kick off SDK load as early as possible when we're on Yandex, so the first
// LoadingAPI.ready / ad call doesn't wait on a cold init.
if (isYandex) getYsdk().catch(() => { /* surfaced later by callers */ });
