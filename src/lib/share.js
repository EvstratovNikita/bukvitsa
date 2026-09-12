// Unified share() across platforms.
//
// Returns one of:
//   'shared'    — native sheet / platform dialog completed
//   'copied'    — clipboard fallback succeeded (no native UI)
//   'cancelled' — user dismissed
//   'failed'    — no path worked
//
// Order of attempts:
//   Telegram Mini App  →  tg.openTelegramLink(t.me/share)
//   VK Mini App        →  VKWebAppShare
//   Web Share API      →  navigator.share()
//   Clipboard fallback →  copy "text\nurl" to clipboard

import { isTelegram, isVk } from './platform.js';
import { vkBridge, launchParams } from './vk.js';
import { copyText } from '../utils/clipboard.js';

// Канонический адрес, которым делимся.
//
// Внутри VK это ссылка на САМО мини-приложение, а не на наш сайт: правила
// размещения (п. 4.1.8) прямо запрещают уводить аудиторию с платформы
// ссылками внутри игры, а «поделиться» отправляло её именно на bukvitsa.
// Номер приложения приходит в launch-параметрах — отдельной настройки не
// нужно, и он же участвует в определении платформы, так что на VK он есть
// всегда. Вне VK остаётся прежний канонический адрес (удобно для метрик),
// переопределяется через VITE_SHARE_BASE_URL.
const WEB_SHARE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SHARE_BASE_URL) ||
  'https://bukvitsa.vercel.app';

function canonicalShareUrl() {
  if (!isVk) return WEB_SHARE_URL;
  const appId = launchParams().vk_app_id;
  // Без номера ссылку не строим вовсе: пустая строка означает «поделиться
  // без ссылки», и текст, и мост это переживают (см. buildWordleShareText).
  return appId ? `https://vk.com/app${appId}` : '';
}

export const SHARE_BASE_URL = canonicalShareUrl();

// Приглашения убраны (на Яндексе нет входа через Google/email, засчитать
// приглашение нечем), поэтому ссылка больше не несёт ?ref — делимся
// сеткой Слова дня на обычный канонический адрес.

// Cheeky variety pack — randomised per share so the same message doesn't
// flood feeds when many players share back to back.
const SLY_FACES = ['😉', '😏', '🤓', '😎', '🦉', '🤭', '🫣'];
function ordinal(n) {
  const last2 = n % 100;
  if (last2 >= 11 && last2 <= 14) return `${n}-й`;
  switch (n % 10) {
    case 1: return `${n}-й`;
    case 2:
    case 3:
    case 4: return `${n}-й`;
    default: return `${n}-й`;
  }
}

// Build the daily-share message. evaluations = row arrays of 'correct' |
// 'present' | 'absent'. attempts = rows used (0 if lost). max = total
// allowed. dayN = puzzle #. inviteUrl is embedded inline so the recipient
// sees: hook line → link → grid.
export function buildWordleShareText(evaluations, attempts, max, dayN, inviteUrl) {
  const EMOJI = { correct: '🟩', present: '🟨', absent: '⬜' };
  const grid = (evaluations || [])
    .map((row) => row.map((s) => EMOJI[s] || '⬜').join(''))
    .join('\n');
  const face = SLY_FACES[Math.floor(Math.random() * SLY_FACES.length)];
  const dayLabel = dayN != null ? ` #${dayN}` : '';
  const intro = attempts > 0 && attempts <= max
    ? `Смотри, слово дня${dayLabel} в Буклице отгадано с ${ordinal(attempts)} попытки! Попробуй так же ${face}`
    : `Слово дня${dayLabel} в Буклице меня обыграло… а ты сможешь? ${face}`;
  const linkLine = inviteUrl ? `\n${inviteUrl}` : '';
  return `${intro}${linkLine}\n\n${grid}`;
}

async function shareTelegram(text, url) {
  try {
    const tg = window.Telegram?.WebApp;
    const shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareLink);
    } else {
      window.open(shareLink, '_blank', 'noopener');
    }
    return 'shared';
  } catch {
    return 'failed';
  }
}

async function shareVk(text, url) {
  try {
    // Мост берём из пакета, а не из window.vkBridge: при сборке из npm такого
    // глобала не существует, и эта ветка не срабатывала бы никогда.
    if (isVk) {
      // Ссылки нет — делиться нечем, кроме текста: отдаём его в буфер, а не
      // зовём мост с пустым link (он ответит ошибкой).
      if (!url) return copyToClipboard(text);
      await vkBridge.send('VKWebAppShare', { link: url });
      return 'shared';
    }
    const u = `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
    window.open(u, '_blank', 'noopener');
    return 'shared';
  } catch (e) {
    if (e?.error_data?.error_reason === 'User denied') return 'cancelled';
    return 'failed';
  }
}

async function shareNative(title, text, url) {
  try {
    await navigator.share({ title, text, url });
    return 'shared';
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

async function copyToClipboard(text, url) {
  // Skip appending url when caller embedded it inline already (daily share).
  const payload = url && !text.includes(url) ? `${text}\n${url}` : text;
  return (await copyText(payload)) ? 'copied' : 'failed';
}

export async function share({ title = 'Буклица', text, url }) {
  if (isTelegram) return shareTelegram(text, url);
  if (isVk)       return shareVk(text, url);
  if (typeof navigator !== 'undefined' && navigator.share) {
    const r = await shareNative(title, text, url);
    if (r !== 'failed') return r;
  }
  return copyToClipboard(text, url);
}
