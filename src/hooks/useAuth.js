import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { isYandex } from '../lib/yandex.js';

// На Играх Яндекса Supabase не используется вообще: прогресс живёт в облаке
// игрока (useYandexSync), экономические RPC отключены в economy.js, синк — в
// App.jsx. Анонимный вход при этом раньше всё равно уходил на supabase.co:
// лишний внешний запрос на старте (модерация к таким придирается) и
// анонимный пользователь в базе на КАЖДОГО игрока площадки.
const useRemote = isSupabaseConfigured && !isYandex;

// Anonymous sign-in on first load; returns a stable user object across reloads.
// If Supabase isn't configured (missing env vars) — or we're on Yandex —
// returns null and the app falls back to its local/platform storage.
export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(useRemote);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!useRemote) return;

    let active = true;

    (async () => {
      try {
        const { data: { session: existing } } = await supabase.auth.getSession();
        if (!active) return;

        if (existing) {
          setSession(existing);
          setLoading(false);
          return;
        }

        // No session — sign in anonymously.
        const { data, error: signInErr } = await supabase.auth.signInAnonymously();
        if (!active) return;
        if (signInErr) {
          console.warn('[auth] signInAnonymously failed:', signInErr.message);
          setError(signInErr);
          setLoading(false);
          return;
        }
        setSession(data.session);
        setLoading(false);
      } catch (e) {
        if (active) {
          setError(e);
          setLoading(false);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (active) setSession(s);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    isAnonymous: session?.user?.is_anonymous ?? false,
    loading,
    error,
    configured: useRemote
  };
}
