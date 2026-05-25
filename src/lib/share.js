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

// When we publish to Yandex Games / TG / VK the share URL should keep
// pointing to a stable canonical landing — easier marketing tracking.
// Override via env if you ever need a different domain.
export const SHARE_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SHARE_BASE_URL) ||
  'https://bukvitsa.vercel.app';

// Append ?ref=<userId> to the base. Returns plain base when no userId
// available (e.g. Supabase not configured / not yet authenticated).
export function buildInviteUrl(userId) {
  if (!userId) return SHARE_BASE_URL;
  const u = new URL(SHARE_BASE_URL);
  u.searchParams.set('ref', userId);
  return u.toString();
}

export const DEFAULT_INVITE_TEXT =
  'Играю в Буквицу — угадай русское слово из 5 букв за 6 попыток. Попробуй!';

export function buildAchievementText(ach) {
  if (!ach) return DEFAULT_INVITE_TEXT;
  return `${ach.icon} Открыл достижение «${ach.title}» в Буквице! Сыграй и догони:`;
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
    const bridge = window.vkBridge;
    if (bridge?.send) {
      await bridge.send('VKWebAppShare', { link: url });
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
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function share({ title = 'Буквица', text, url }) {
  if (isTelegram) return shareTelegram(text, url);
  if (isVk)       return shareVk(text, url);
  if (typeof navigator !== 'undefined' && navigator.share) {
    const r = await shareNative(title, text, url);
    if (r !== 'failed') return r;
  }
  return copyToClipboard(text, url);
}
