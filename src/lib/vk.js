// Мост с VK Mini Apps. Единственное место, где мы разговариваем с vk-bridge;
// каждый экспорт — безопасная заглушка вне площадки, поэтому один и тот же
// код работает и на вебе, и в Играх Яндекса.
//
// Bridge подключён пакетом, а не скриптом с CDN: игра раздаётся с хостинга VK
// архивом, и внешний запрос там — лишняя точка отказа (ровно по этой причине
// в сборку зашиты и шрифты).
import bridge from '@vkontakte/vk-bridge';

// Площадка определяется по launch-параметрам в адресе, а НЕ по window.vkBridge:
// при сборке из пакета такого глобала не существует, и проверка на него не
// сработала бы никогда. VK всегда добавляет vk_app_id и подпись — по ним и
// узнаём (тот же принцип, что у Яндекса: смотрим на встраивание, а не на SDK).
function detectVk() {
  if (typeof window === 'undefined') return false;
  try {
    const qs = new URLSearchParams(window.location.search + window.location.hash.replace('#', '&'));
    return Boolean(qs.get('vk_app_id') && (qs.get('sign') || qs.get('vk_user_id')));
  } catch {
    return false;
  }
}

export const isVk = detectVk();

export function launchParams() {
  if (typeof window === 'undefined') return {};
  const out = {};
  try {
    const qs = new URLSearchParams(window.location.search + window.location.hash.replace('#', '&'));
    for (const [k, v] of qs.entries()) if (k.startsWith('vk_') || k === 'sign') out[k] = v;
  } catch { /* адрес без параметров — вернём пустой объект */ }
  return out;
}

// Диагностика моста — той же формы, что у Яндекса (см. lib/yandex.js).
// Читается из консоли как window.__buklitsaCloud, отдельная сборка не нужна.
export const cloudStatus = {
  platform: isVk,
  sdk: 'не запрашивался',
  mode: isVk ? 'аккаунт VK' : '—',
  load: 'не было',
  loaded: '—',
  identity: '—',
  readFrom: '—',
  save: 'не было'
};

if (typeof window !== 'undefined' && isVk) window.__buklitsaCloud = cloudStatus;

const CALL_TIMEOUT_MS = 8000;

function withTimeout(p, ms, label) {
  let t;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise((_, reject) => { t = setTimeout(() => reject(new Error(label)), ms); })
  ]);
}

const send = (method, params) =>
  withTimeout(bridge.send(method, params), CALL_TIMEOUT_MS, method + ' timeout');

// VKWebAppInit обязателен: без него площадка считает, что приложение не
// запустилось, и не снимает свой лоадер.
let _initPromise = null;
export function vkInit() {
  if (!isVk) return Promise.resolve(false);
  if (_initPromise) return _initPromise;
  _initPromise = send('VKWebAppInit', {})
    .then(() => { cloudStatus.sdk = 'ок'; return true; })
    .catch((e) => {
      cloudStatus.sdk = 'ошибка: ' + (e?.error_data?.error_reason || e?.message || e);
      _initPromise = null;
      return false;
    });
  return _initPromise;
}

// ---------- Хранилище ----------
//
// VK Storage режет значение ключа примерно на 4 КБ, а для сериализованного
// JSON эффективная граница ещё ниже (~2,2 КБ). Наш снимок вместе с доской
// уже 2,4 КБ, поэтому кладём его не одним куском: JSON режется на части по
// CHUNK символов, части лежат в bkv_0…bkv_N, а bkv_meta хранит их число.
// Схема самих данных при этом не меняется — наверх уезжает тот же объект.
const KEY_META = 'bkv_meta';
const KEY_PART = (i) => `bkv_${i}`;
const CHUNK = 1500;
const MAX_CHUNKS = 12;   // 18 000 символов — с многократным запасом

// Сколько частей лежало в прошлый раз: если снимок похудел, лишние хвосты
// надо затереть, иначе следующее чтение склеит новую голову со старым хвостом.
let _savedChunks = null;

export async function cloudLoad() {
  if (!isVk) return { ok: false, data: null };
  try {
    await vkInit();
    // Просим meta и все возможные части одним вызовом: отсутствующие ключи
    // площадка вернёт пустыми строками, лишнего запроса это не стоит.
    const keys = [KEY_META, ...Array.from({ length: MAX_CHUNKS }, (_, i) => KEY_PART(i))];
    const res = await send('VKWebAppStorageGet', { keys });
    const map = new Map((res?.keys || []).map((k) => [k.key, k.value]));

    const count = parseInt(map.get(KEY_META) || '', 10);
    if (!Number.isFinite(count) || count <= 0) {
      cloudStatus.load = 'ок, пусто';
      cloudStatus.loaded = 'пусто';
      _savedChunks = 0;
      return { ok: true, data: null };
    }

    let raw = '';
    for (let i = 0; i < count; i++) {
      const part = map.get(KEY_PART(i));
      // Дырка в середине — данные битые. Лучше честно сказать «не прочитали»,
      // чем отдать наверх обрезанный снимок: он уедет в облако поверх целого.
      if (part == null || part === '') throw new Error(`пропала часть ${i} из ${count}`);
      raw += part;
    }

    const data = JSON.parse(raw);
    const has = data && typeof data === 'object' && Object.keys(data).length > 0;
    cloudStatus.load = has ? `ок, частей: ${count}` : 'ок, пусто';
    cloudStatus.loaded = has
      ? `партий ${data.played || 0}, побед ${data.won || 0}, монет ${data.coins || 0}`
      : 'пусто';
    _savedChunks = count;
    return { ok: true, data: has ? data : null };
  } catch (e) {
    cloudStatus.load = 'ошибка: ' + (e?.error_data?.error_reason || e?.message || e);
    console.warn('[vk] StorageGet failed', e);
    return { ok: false, data: null };
  }
}

export async function cloudSave(obj) {
  if (!isVk || !obj) return false;
  try {
    await vkInit();
    const raw = JSON.stringify(obj);
    const parts = [];
    for (let i = 0; i < raw.length; i += CHUNK) parts.push(raw.slice(i, i + CHUNK));
    if (parts.length > MAX_CHUNKS) throw new Error(`снимок не помещается: ${parts.length} частей`);

    // Сначала части, потом meta: если запись оборвётся посередине, meta ещё
    // указывает на прежний целый снимок, и чтение отдаст его, а не мешанину.
    for (let i = 0; i < parts.length; i++) {
      await send('VKWebAppStorageSet', { key: KEY_PART(i), value: parts[i] });
    }
    await send('VKWebAppStorageSet', { key: KEY_META, value: String(parts.length) });

    // Хвосты от прежнего, более длинного снимка.
    if (_savedChunks != null) {
      for (let i = parts.length; i < _savedChunks; i++) {
        await send('VKWebAppStorageSet', { key: KEY_PART(i), value: '' });
      }
    }
    _savedChunks = parts.length;

    cloudStatus.save = `ок, частей ${parts.length}, ` + new Date().toLocaleTimeString('ru-RU');
    return true;
  } catch (e) {
    cloudStatus.save = 'ошибка: ' + (e?.error_data?.error_reason || e?.message || e);
    console.warn('[vk] StorageSet failed', e);
    return false;
  }
}

// Кто мы для площадки. В VK игрок не меняется посреди сессии (приложение
// открыто от имени конкретного пользователя, id приходит в launch-параметрах),
// но общая логика синхронизации всё равно сверяет личность перед записью —
// отдаём её в том же формате, что и Яндекс.
export async function playerIdentity() {
  if (!isVk) return null;
  const uid = launchParams().vk_user_id || '';
  if (!uid) return null;
  cloudStatus.identity = 'vk:' + uid;
  return 'vk:' + uid;
}

// Имя и аватар для строки аккаунта в меню.
export async function getPlayerInfo() {
  if (!isVk) return null;
  try {
    await vkInit();
    const u = await send('VKWebAppGetUserInfo', {});
    if (!u) return null;
    return {
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Игрок',
      avatar: u.photo_100 || u.photo_200 || null,
      id: String(u.id || '')
    };
  } catch (e) {
    console.warn('[vk] GetUserInfo failed', e);
    return null;
  }
}

// ---------- Реклама ----------
//
// Показ разрешён только после того, как VK одобрит монетизацию приложения;
// до этого вызовы отвечают отказом, и мы просто не рисуем кнопку.
export async function checkNativeAds(format = 'reward') {
  if (!isVk) return false;
  try {
    const r = await send('VKWebAppCheckNativeAds', { ad_format: format });
    return Boolean(r?.result);
  } catch {
    return false;
  }
}

// 'rewarded' — досмотрел, 'closed' — закрыл раньше, 'failed' — не показалась.
// Площадка отвечает { result: true } только за успешный показ, а на закрытие
// и на отсутствие рекламы — ошибкой; различаем их по причине.
export async function showRewardedVk() {
  if (!isVk) return 'failed';
  try {
    await vkInit();
    const r = await send('VKWebAppShowNativeAds', { ad_format: 'reward' });
    return r?.result ? 'rewarded' : 'closed';
  } catch (e) {
    const reason = String(e?.error_data?.error_reason || e?.error_data?.error_msg || e?.message || '');
    if (/close|dismiss|cancel/i.test(reason)) return 'closed';
    console.warn('[vk] ShowNativeAds failed', e);
    return 'failed';
  }
}

export async function showInterstitialVk() {
  if (!isVk) return false;
  try {
    await vkInit();
    const r = await send('VKWebAppShowNativeAds', { ad_format: 'interstitial' });
    return Boolean(r?.result);
  } catch {
    return false;
  }
}

export { bridge as vkBridge };
