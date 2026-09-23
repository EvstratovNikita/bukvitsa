// Метка в ссылке «Поделиться» и учёт приходов по ней (только VK).
//
// Ссылка: https://vk.com/app<id>#ref=<vk_user_id>. VK передаёт хеш ссылки в
// приложение как location.hash, поэтому игра, открытая по ней, видит, чья
// это была ссылка, и один раз сообщает серверу (supabase/vk_referrals.sql).
// Наград нет — правила VK (п. 2.6.2) запрещают поощрять социальные действия;
// это статистика для владельца игры.

import { isVk } from './platform.js';
import { launchParams, rawLaunchQuery } from './vk.js';
import { isScoresConfigured, recordVkReferral, recordVkShare } from './scores.js';
import { storage } from '../utils/storage.js';

const SENT_KEY = 'wordle-ru:ref-reported';

// Метка отправителя для ссылки. Пусто вне VK или без id игрока.
export function refTag() {
  if (!isVk) return '';
  const uid = launchParams().vk_user_id;
  return /^\d{1,20}$/.test(uid || '') ? `#ref=${uid}` : '';
}

// Чья ссылка привела игрока. Ищем «ref=» как отдельный параметр — в хеше и
// на всякий случай в строке запроса; vk_ref (источник запуска VK) не путаем
// благодаря границе перед «ref».
export function incomingRef() {
  if (typeof window === 'undefined') return null;
  const where = `${window.location.hash || ''}&${window.location.search || ''}`;
  const m = where.match(/(?:^|[#&?])ref=(\d{1,20})(?:$|[&#])/);
  return m ? m[1] : null;
}

// Сообщить серверу о приходе по ссылке — один раз на устройство (сервер и
// сам засчитывает игрока только однажды). Ошибку сети не запоминаем: при
// следующем запуске по той же ссылке попробуем снова.
export async function reportArrival() {
  if (!isVk || !isScoresConfigured) return;
  const inviter = incomingRef();
  if (!inviter || inviter === launchParams().vk_user_id) return;
  if (storage.get(SENT_KEY, null)) return;
  const r = await recordVkReferral(rawLaunchQuery(), inviter);
  if (r?.ok) storage.set(SENT_KEY, inviter);
}

// Игрок поделился ссылкой — отметить на сервере (для конверсии).
export function reportShare() {
  if (!isVk || !isScoresConfigured) return;
  recordVkShare(rawLaunchQuery());
}