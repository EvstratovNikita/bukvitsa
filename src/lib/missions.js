// Миссии VK: достижение открыто → миссия засчитана, друзья видят сообщение в
// ленте активности, игроку идут баллы миссий (таблица результатов VK).
//
// Миссии и их ID — dev.vk.com → Соц. механики → Миссии (одобрены 01.10.2026).
// Тексты, баллы и порядок — tasks/vk-publish.md. Засчитывает сервер
// (supabase/vk_missions.sql): метод VK требует сервисный ключ.
//
// Отправка идёт по всем открытым достижениям, а не по «только что открытым»:
// так миссии дойдут и тем, кто открыл достижения до их появления, и тем, у
// кого прошлая попытка упала по сети. Отправленное помним на устройстве;
// сервер и сам не засчитывает миссию дважды.
//
// Только VK: в Одноклассниках миссий нет.

import { isVk } from './platform.js';
import { isOk, launchParams, rawLaunchQuery } from './vk.js';
import { isScoresConfigured, completeVkMission } from './scores.js';
import { storage } from '../utils/storage.js';

export const VK_MISSIONS = {
  first_win: 3,     // Добиться первого успеха — 10
  streak_3: 4,      // Собрать тройку побед — 15
  won_10: 5,        // Разгадать десятку слов — 20
  pet_lvl_5: 6,     // Вырастить птенца — 20
  first_try: 7,     // Угадать с первого раза — 30
  daily_6: 8,       // Пройти неделю постоянства — 30
  fast_30: 9,       // Стать спринтером — 35
  won_50: 10,       // Заслужить звание знатока — 40
  streak_10: 11,    // Разжечь огонь побед — 50
  first_try_5: 12,  // Стать снайпером — 60
  all_attempts: 13, // Стать универсалом — 50
  pet_lvl_10: 14,   // Вырастить учёную сову — 70
  won_200: 15       // Получить звание мастера — 100
};

// Версия в ключе: поднять — и все устройства перешлют миссии заново (сервер
// повторит в VK только те, что VK тогда не принял).
const sentKey = (uid) => `wordle-ru:vk-missions:v1:${uid}`;
let inFlight = false;

// Миссии, которые пора отправить: достижение открыто, а отправки ещё не было.
export function pendingMissions(unlocked, sent) {
  const done = new Set(sent || []);
  return (unlocked || [])
    .map((id) => VK_MISSIONS[id])
    .filter((m) => m && !done.has(m));
}

export async function reportMissions(unlocked) {
  if (!isVk || isOk || !isScoresConfigured || inFlight) return;
  const uid = launchParams().vk_user_id;
  if (!/^\d{1,20}$/.test(uid || '')) return;
  const sent = storage.get(sentKey(uid), []);
  const todo = pendingMissions(unlocked, sent);
  if (!todo.length) return;

  inFlight = true;
  try {
    const query = rawLaunchQuery();
    const done = new Set(sent);
    for (const m of todo) {
      const r = await completeVkMission(query, m);
      // ok — засчитано сейчас или раньше. Ошибку (сеть, нет ключа на
      // сервере) не запоминаем: попробуем при следующем изменении.
      if (!r?.ok) break;
      done.add(m);
      storage.set(sentKey(uid), [...done]);
    }
  } finally {
    inFlight = false;
  }
}
