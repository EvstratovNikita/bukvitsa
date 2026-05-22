import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars are missing, expose a no-op client so the app still runs
// offline-only (localStorage). This keeps dev/CI from breaking before
// the user wires up credentials.
const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        // PKCE flow — tokens are never carried in the URL fragment. The
        // callback URL contains only a short-lived `?code=...` that the
        // client exchanges for a session via POST; the code is useless
        // without the locally-stored code_verifier. Mitigates token leaks
        // via browser history, extensions, and accidentally shared URLs.
        flowType: 'pkce',
        // Persist session in localStorage; refresh tokens automatically.
        persistSession: true,
        autoRefreshToken: true,
        // Anonymous users need this so the session survives reloads.
        storageKey: 'wordle-ru:auth'
      }
    })
  : null;

export const isSupabaseConfigured = isConfigured;
