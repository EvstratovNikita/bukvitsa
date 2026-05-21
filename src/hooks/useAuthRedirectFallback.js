import { useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const LINK_INTENT_KEY = 'auth:link-intent';

/**
 * Watches for OAuth callback errors carried in the URL and recovers.
 *
 * When a returning user tries to `linkIdentity({ provider })` while the
 * identity is already attached to their original account, Supabase redirects
 * back with `error_code=identity_already_exists`. This is by design — link
 * is "attach to current session", not "sign in". The fix is to detect the
 * error, clean the URL, and transparently fall back to `signInWithOAuth`
 * with the same provider so the user lands in their existing account.
 */
export function useAuthRedirectFallback() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const searchParams = new URLSearchParams(window.location.search);
    const errorCode =
      hashParams.get('error_code') || searchParams.get('error_code');

    if (!errorCode) return;

    // Always clean the URL so the error doesn't keep firing on reload.
    window.history.replaceState(null, '', window.location.pathname);

    // identity_already_exists  → this OAuth identity is linked to another user
    // email_exists              → the email returned by the provider is owned
    //                             by another user (different identity, same mail)
    // Both mean: the user already has a permanent account — just sign them in
    // to it instead of getting stuck on the error.
    if (errorCode === 'identity_already_exists' || errorCode === 'email_exists') {
      const provider = sessionStorage.getItem(LINK_INTENT_KEY);
      sessionStorage.removeItem(LINK_INTENT_KEY);
      if (provider) {
        supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: window.location.origin }
        });
      }
    }
  }, []);
}
