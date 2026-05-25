import { useEffect, useRef } from 'react';
import { tryClaimReferral } from '../lib/referral.js';

// Watches auth + waits for the user to become non-anonymous, then attempts to
// consume any stashed referrer id. Idempotent — the server enforces
// one-time-per-invitee, but we also guard locally so we don't pound RPC.
//
// onClaim({ ok, invitee_bonus, referrer_bonus }) fires once on success so the
// UI can show a celebratory toast.
export function useReferralClaim({ userId, isAnonymous, onClaim }) {
  const attempted = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (isAnonymous) return;          // wait until linked / signed in
    if (attempted.current) return;
    attempted.current = true;
    (async () => {
      const result = await tryClaimReferral();
      if (result?.ok && onClaim) onClaim(result);
    })();
  }, [userId, isAnonymous, onClaim]);
}
