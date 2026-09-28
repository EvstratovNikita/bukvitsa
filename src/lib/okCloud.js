// Облако для Одноклассников — наш сервер вместо VK Storage.
//
// Почему не VK Storage, хотя в ОК он работает: хранилище привязано к VK ID, а
// у игрока со связанными аккаунтами он в ОК тот же, что и в VK. Прогресс
// оказался бы общим, а правила размещения в ОК требуют вести его для каждой
// соцсети отдельно и хранить на бэкенде игры. Поэтому ключ — vk_ok_user_id,
// а запись и чтение проверяют подпись строки запуска (supabase/ok_progress.sql).
//
// Контракт тот же, что у остальных адаптеров (см. lib/cloud.js); диагностика
// пишется в общий объект VK — он же window.__buklitsaCloud.
import { isOk, launchParams, rawLaunchQuery, cloudStatus } from './vk.js';
import { loadOkProgress, saveOkProgress } from './scores.js';

export async function okLoad() {
  if (!isOk) return { ok: false, data: null };
  const r = await loadOkProgress(rawLaunchQuery());
  // Нет ответа или отказ сервера — «прочитать не смогли». Это важно отличать
  // от пустого профиля: после неудачного чтения синхронизация не пишет.
  if (!r || r.ok !== true) {
    cloudStatus.load = 'ошибка: ' + (r?.error || 'нет ответа сервера');
    return { ok: false, data: null };
  }
  const data = r.data && typeof r.data === 'object' && Object.keys(r.data).length > 0 ? r.data : null;
  cloudStatus.load = data ? 'ок, сервер' : 'ок, пусто';
  cloudStatus.loaded = data
    ? `партий ${data.played || 0}, побед ${data.won || 0}, монет ${data.coins || 0}`
    : 'пусто';
  return { ok: true, data };
}

export async function okSave(obj) {
  if (!isOk || !obj) return false;
  const r = await saveOkProgress(rawLaunchQuery(), obj);
  const ok = r?.ok === true;
  cloudStatus.save = ok
    ? 'ок, сервер, ' + new Date().toLocaleTimeString('ru-RU')
    : 'ошибка: ' + (r?.error || 'нет ответа сервера');
  return ok;
}

export async function okIdentity() {
  if (!isOk) return null;
  const uid = launchParams().vk_ok_user_id || '';
  if (!uid) return null;
  cloudStatus.identity = 'ok:' + uid;
  return 'ok:' + uid;
}
