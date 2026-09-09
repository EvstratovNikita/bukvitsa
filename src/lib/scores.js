// Общая таблица лидеров на нашем сервере.
//
// Зачем не через @supabase/supabase-js: в сборках площадок клиент Supabase
// подменён заглушкой (см. vite.config.js) — 245 КБ ради двух вызовов в архив
// не тянем. Здесь два POST-запроса к PostgREST голым fetch.
//
// Сервер — supabase/vk_leaderboard.sql: таблица закрыта RLS, наружу выданы
// только две SECURITY DEFINER функции, и submit_vk_score сам проверяет
// подпись launch-параметров. Публикуемый ключ проекта поэтому именно
// публикуемый: ничего, кроме вызова этих двух функций, он не открывает.

const RAW_URL = import.meta.env?.VITE_SCORES_URL || '';
const KEY = import.meta.env?.VITE_SCORES_KEY || '';
const BASE = RAW_URL.replace(/\/+$/, '');

export const isScoresConfigured = Boolean(BASE && KEY);

const TIMEOUT_MS = 8000;

async function rpc(fn, args) {
  if (!isScoresConfigured) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: KEY,
        authorization: `Bearer ${KEY}`
      },
      body: JSON.stringify(args || {}),
      signal: ctl.signal
    });
    if (!res.ok) {
      console.warn(`[scores] ${fn} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    // Сеть отвалилась или сервер молчит — таблица не критична для игры,
    // молча возвращаем null, вызывающий покажет «Таблица недоступна».
    console.warn(`[scores] ${fn} failed`, e?.message || e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Отправить счёт. p_query — сырая строка запуска VK: по ней сервер проверяет
// подпись и достаёт id игрока, поэтому подделать чужой результат нельзя.
export async function submitVkScore(query, score, name) {
  if (!query || !Number.isFinite(score)) return null;
  return rpc('submit_vk_score', {
    p_query: query,
    p_score: Math.max(0, Math.round(score)),
    p_name: name || ''
  });
}

// Топ-20 и место игрока — в форме ответа лидерборда Яндекса.
export async function fetchTop(platform, playerId) {
  const r = await rpc('leaderboard_top', {
    p_platform: platform,
    p_player_id: playerId || null
  });
  return r && Array.isArray(r.entries) ? r : null;
}
