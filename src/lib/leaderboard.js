// Таблица лидеров — один фасад на все площадки.
//
// Яндекс отдаёт общий рейтинг сам, через SDK. У VK общего рейтинга нет вовсе:
// нативное окно сравнивает игрока только с друзьями, которые тоже играют, —
// поэтому общая таблица для VK своя, на нашем сервере (lib/scores.js).
//
// Наружу обе площадки выглядят одинаково, в форме ответа Яндекса:
//   { entries: [{ rank, score, formattedScore, player: { publicName } }],
//     userRank: число или null }
// Модалка не знает, откуда пришли данные.

import { isYandexGames, isVk } from './platform.js';
import { submitScore as yandexSubmit, fetchLeaderboard as yandexFetch } from './yandex.js';
import { getPlayerInfo, launchParams, rawLaunchQuery, showLeaderboard as vkFriendsBoard } from './vk.js';
import { submitVkScore, fetchTop, isScoresConfigured } from './scores.js';

// Есть ли вообще что показывать на этой площадке.
export const hasLeaderboard = isYandexGames || (isVk && isScoresConfigured);

// Нативное окно «среди друзей» — только у VK, поверх общей таблицы.
export const hasFriendsBoard = isVk;
export const showFriendsBoard = vkFriendsBoard;

// Имя для таблицы: имя целиком и первая буква фамилии («Никита С.»). Полная
// фамилия в публичном списке — лишние персональные данные, а одного имени
// мало, чтобы отличить двух Никит. Спрашиваем один раз за сессию.
let _namePromise = null;
function vkPublicName() {
  if (!_namePromise) {
    _namePromise = getPlayerInfo()
      .then((info) => {
        if (!info?.name) return '';
        const [first = '', last = ''] = info.name.split(' ');
        return last ? `${first} ${last[0]}.` : first;
      })
      .catch(() => '');
  }
  return _namePromise;
}

// Отправка результата после победы. Ошибки не всплывают: таблица —
// украшение, а не часть игры.
export async function submitScore(score) {
  if (!Number.isFinite(score)) return;
  // Нулевой счёт не отправляем: эффект срабатывает и при запуске, а строка с
  // нулём в общей таблице — мусор. В таблицу игрок попадает первой победой.
  if (score <= 0) return;
  if (isYandexGames) return void yandexSubmit(score);
  if (isVk && isScoresConfigured) {
    const query = rawLaunchQuery();
    if (!query) return;
    await submitVkScore(query, score, await vkPublicName());
  }
}

// Чтение топа. null означает «не получилось» — модалка покажет прежние данные
// или сообщение о недоступности.
export async function fetchLeaderboard() {
  if (isYandexGames) return yandexFetch();
  if (isVk && isScoresConfigured) return fetchTop('vk', launchParams().vk_user_id || null);
  return null;
}
