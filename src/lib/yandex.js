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
// Synchronously-accessible resolved ysdk (set once init completes). Needed so
// auth can call openAuthDialog() WITHOUT an `await` in front — the dialog
// requires the user-activation from the click, which an `await` would consume.
let _ysdk = null;

// Wait for the SDK that index.html loads via the documented static
// <script src="/sdk.js"> tag (req 1.19.1). We don't inject the absolute
// yandex.ru URL anymore — that was the non-conforming load the moderation
// flagged. If the tag is somehow missing we inject /sdk.js as a defensive
// fallback (still the documented path).
function loadSdkScript() {
  return new Promise((resolve, reject) => {
    if (window.YaGames) return resolve();

    const existing = document.querySelector('script[src="/sdk.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('YaGames SDK failed to load')), { once: true });
    } else {
      const s = document.createElement('script');
      s.src = '/sdk.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('YaGames SDK failed to load'));
      document.head.appendChild(s);
    }

    // Safety poll: the tag's load event may have fired before we attached.
    let waited = 0;
    const iv = setInterval(() => {
      if (window.YaGames) { clearInterval(iv); resolve(); }
      else if ((waited += 100) >= 10000) { clearInterval(iv); reject(new Error('YaGames SDK timeout')); }
    }, 100);
  });
}

// Состояние моста с площадкой. Читается экраном настроек: когда игрок
// говорит «прогресс не сохраняется», по этим строчкам видно, на каком шаге
// всё встало, — иначе диагностика возможна только вслепую.
export const cloudStatus = {
  platform: isYandex,
  sdk: 'не запрашивался',
  mode: '—',
  load: 'не было',
  // Что именно лежало в облаке на момент загрузки — до слияния с местным
  // снимком. Отличает «данные не доехали» от «в аккаунте пусто».
  loaded: '—',
  // Кто мы для площадки сейчас и у кого читали данные. Если эти двое
  // разошлись — значит, игрок сменился посреди сессии.
  identity: '—',
  readFrom: '—',
  save: 'не было'
};

// Промис с потолком по времени. Без него подвисший вызов площадки вешает всю
// цепочку: getData никогда не отвечает → синк не считается завершённым →
// сохранения выключены навсегда, и каждый запуск выглядит как первый
// (снова ежедневная награда, снова обучение).
function withTimeout(p, ms, label) {
  let t;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise((_, reject) => { t = setTimeout(() => reject(new Error(label)), ms); })
  ]);
}

const SDK_TIMEOUT_MS = 12000;
const CALL_TIMEOUT_MS = 8000;

// Lazily loads the SDK script (once) and resolves the initialised ysdk. Rejects
// off-platform so callers can fall back. Cached.
export function getYsdk() {
  if (_ysdkPromise) return _ysdkPromise;
  if (!isYandex) {
    _ysdkPromise = Promise.reject(new Error('not Yandex Games'));
    return _ysdkPromise;
  }
  _ysdkPromise = withTimeout(
    loadSdkScript().then(() => window.YaGames.init()),
    SDK_TIMEOUT_MS,
    'YaGames init timeout'
  )
    .then((y) => { _ysdk = y; cloudStatus.sdk = 'ок'; return y; })
    .catch((e) => {
      cloudStatus.sdk = 'ошибка: ' + e.message;
      // Сбрасываем кэш: если SDK поднимется позже, следующий вызов
      // (например, сохранение через минуту) сможет попробовать снова.
      _ysdkPromise = null;
      throw e;
    });
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
  _playerPromise = withTimeout(
    getYsdk().then((y) => y.getPlayer({ scopes: false })),
    CALL_TIMEOUT_MS,
    'getPlayer timeout'
  ).catch((e) => { _playerPromise = null; throw e; });
  return _playerPromise;
}

export async function cloudLoad() {
  if (!isYandex) return null;
  try {
    const player = await getPlayer();
    cloudStatus.mode = player.getMode?.() === 'lite' ? 'гость' : 'аккаунт';
    const data = await withTimeout(player.getData(), CALL_TIMEOUT_MS, 'getData timeout');
    const ok = data && typeof data === 'object' && Object.keys(data).length > 0;
    cloudStatus.load = ok ? `ок, полей: ${Object.keys(data).length}` : 'пусто';
    cloudStatus.loaded = ok
      ? `партий ${data.played || 0}, побед ${data.won || 0}, монет ${data.coins || 0}`
      : 'пусто';
    return ok ? data : null;
  } catch (e) {
    cloudStatus.load = 'ошибка: ' + (e?.message || e);
    console.warn('[yandex] getData failed', e);
    return null;
  }
}

export async function cloudSave(obj) {
  if (!isYandex || !obj) return false;
  try {
    await withTimeout((await getPlayer()).setData(obj, true), CALL_TIMEOUT_MS, 'setData timeout');
    cloudStatus.save = 'ок, ' + new Date().toLocaleTimeString('ru-RU');
    return true;
  } catch (e) {
    cloudStatus.save = 'ошибка: ' + (e?.message || e);
    console.warn('[yandex] setData failed', e);
    return false;
  }
}

// Свежий игрок у площадки, минуя кэш, — и кэш сразу подменяется им, чтобы
// последующие чтение и запись шли ТОМУ ЖЕ игроку.
async function refreshPlayer() {
  const y = await getYsdk();
  const p = await withTimeout(y.getPlayer({ scopes: false }), CALL_TIMEOUT_MS, 'getPlayer timeout');
  _playerPromise = Promise.resolve(p);
  return p;
}

// Кто мы для площадки ПРЯМО СЕЙЧАС: «режим:uid».
//
// Игрок может смениться посреди сессии, и мы об этом не узнаём: вход мимо
// нашей кнопки (на странице игры до запуска, в соседней вкладке) переключает
// игрока, а у нас в кэше остаётся прежний. Дальше выходит худшее из
// возможного — читали у одного, пишем другому: гостевой снимок уезжает
// поверх аккаунта и стирает его. Поэтому личность спрашивается перед каждой
// записью и сравнивается с той, у которой читали.
export async function playerIdentity() {
  if (!isYandex) return null;
  try {
    const p = await refreshPlayer();
    const mode = p.getMode?.() === 'lite' ? 'lite' : 'account';
    let uid = '';
    try { uid = p.getUniqueID?.() || ''; } catch { /* у гостя идентификатора может не быть */ }
    cloudStatus.mode = mode === 'lite' ? 'гость' : 'аккаунт';
    cloudStatus.identity = mode + (uid ? ':' + uid.slice(0, 6) : '');
    return mode + ':' + uid;
  } catch {
    return null;
  }
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
  // Use the already-initialised ysdk synchronously when available so the
  // openAuthDialog() call happens inside the click's user-activation window.
  // Only fall back to awaiting init if the SDK isn't ready yet (rare — we
  // eager-init on load).
  const y = _ysdk || (await getYsdk());
  try {
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

// Запись счёта доступна только авторизованному игроку: у гостя (режим lite)
// вызов всегда падает, а зовём мы его после каждой победы — поэтому сначала
// спрашиваем режим, чтобы не сыпать ошибками в консоль всю сессию.
export async function submitScore(score, board = LEADERBOARD) {
  if (!isYandex || !Number.isFinite(score)) return;
  try {
    const info = await getPlayerInfo();
    if (!info?.authorized) return;
    (await getLb()).setLeaderboardScore(board, Math.max(0, Math.round(score)));
  } catch (e) { console.warn('[yandex] setLeaderboardScore failed', e); }
}

// Гость видит таблицу, просто без строки «я». includeUser требует
// авторизации, и раньше единственная попытка с ним роняла весь запрос — в
// модалке вместо топа было «Лидерборд пока недоступен». Теперь при неудаче
// перечитываем чистый топ.
export async function fetchLeaderboard(board = LEADERBOARD) {
  if (!isYandex) return null;
  let lb;
  try { lb = await getLb(); }
  catch (e) { console.warn('[yandex] getLeaderboards failed', e); return null; }

  try {
    return await lb.getLeaderboardEntries(board, { includeUser: true, quantityTop: 20, quantityAround: 5 });
  } catch (e) {
    try {
      return await lb.getLeaderboardEntries(board, { quantityTop: 20 });
    } catch (e2) {
      console.warn('[yandex] getLeaderboardEntries failed', e2);
      return null;
    }
  }
}

// Player language from the SDK. We're RU-only, so we don't switch UI — but the
// platform requires reading the language AT STARTUP for every game (req 2/14),
// which also flips the moderation indicator to "I18N is used".
export let yandexLang = 'ru';

// Kick off SDK load as early as possible when we're on Yandex, so the first
// LoadingAPI.ready / ad call doesn't wait on a cold init — and read i18n.lang
// right away to satisfy the startup language-detection requirement.
if (isYandex) {
  getYsdk()
    .then((y) => {
      try { yandexLang = y.environment?.i18n?.lang || 'ru'; }
      catch { /* noop */ }
    })
    .catch(() => { /* surfaced later by callers */ });
}
