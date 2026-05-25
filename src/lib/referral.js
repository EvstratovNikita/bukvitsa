// Referral capture + claim.
//
// Flow:
//  1) Inviter shares URL with ?ref=<their-user-id>
//  2) Invitee opens it → stash referrer id in localStorage (don't credit yet)
//  3) Invitee plays anonymously; nothing happens
//  4) When invitee upgrades to a verified account (Google / email link),
//     useReferralClaim posts RPC claim_referral. Server-side gate enforces
//     non-anonymous + one-time + not-self.
//  5) On success: clear pending id, refresh stats (sync pulls new coins +
//     referrals_count for both parties).

import { supabase } from './supabase.js';

const PENDING_KEY = 'wordle-ru:pending-referrer';
const REF_PARAM = 'ref';

// Read ?ref=<id> from current URL and stash it. Then strip the query param so
// the user doesn't keep re-stashing on every reload. Safe to call multiple
// times — only the first value sticks for a given browser.
export function captureReferralFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get(REF_PARAM);
    if (!ref) return null;
    const existing = localStorage.getItem(PENDING_KEY);
    if (!existing) localStorage.setItem(PENDING_KEY, ref);
    params.delete(REF_PARAM);
    const search = params.toString();
    const next = window.location.pathname + (search ? `?${search}` : '') + window.location.hash;
    window.history.replaceState(null, '', next);
    return ref;
  } catch {
    return null;
  }
}

export const getPendingReferrer = () => {
  try { return localStorage.getItem(PENDING_KEY); }
  catch { return null; }
};

export const clearPendingReferrer = () => {
  try { localStorage.removeItem(PENDING_KEY); }
  catch { /* noop */ }
};

// Attempts to consume the stash via RPC. Returns one of:
//   { ok: true, invitee_bonus, referrer_bonus }
//   { ok: false, reason }
//   null  — nothing to claim
export async function tryClaimReferral() {
  const ref = getPendingReferrer();
  if (!ref) return null;
  const { data, error } = await supabase.rpc('claim_referral', { p_referrer_id: ref });
  if (error) {
    console.warn('[referral] claim_referral failed', error.message);
    return { ok: false, reason: 'rpc_error' };
  }
  // Terminal failures should clear the stash so we don't keep retrying every
  // mount. Transient failures (network) we leave alone.
  if (data && !data.ok && ['anonymous'].includes(data.reason) === false) {
    clearPendingReferrer();
  }
  if (data?.ok) clearPendingReferrer();
  return data;
}
