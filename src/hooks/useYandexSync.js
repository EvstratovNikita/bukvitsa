import { useEffect, useRef, useState } from 'react';
import { cloudLoad, cloudSave } from '../lib/yandex.js';
import { mergeGiftProgress } from '../utils/petBond.js';

const DEBOUNCE_MS = 900;

// Persists the stats blob to the Yandex player's cloud (getData/setData).
// Mirrors useRemoteSync's shape ({ synced }) so useStats can swap it in on the
// Yandex platform. The full stats object is JSON-serialisable, so we save it
// wholesale and merge cloud → local on load.
export function useYandexSync({ stats, setStats, enabled }) {
  const [synced, setSynced] = useState(!enabled);
  const syncedRef = useRef(false);
  const debounceRef = useRef(null);

  // Initial load: pull the cloud snapshot once.
  useEffect(() => {
    if (!enabled) { setSynced(true); return; }
    let active = true;
    (async () => {
      const data = await cloudLoad();
      if (!active) return;
      if (data && Object.keys(data).length > 0) {
        setStats((s) => {
          const next = { ...s, ...data };
          const lp = s.prefs || {};
          const cp = data.prefs || {};
          const merged = mergeGiftProgress(lp.petGifts, lp.petBond, cp.petGifts, cp.petBond);
          next.prefs = { ...(cp || {}), ...(next.prefs || {}), petGifts: merged.petGifts, petBond: merged.petBond };
          return next;
        });
      }
      syncedRef.current = true;
      setSynced(true);
    })();
    return () => { active = false; };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save on every local change after the initial load.
  useEffect(() => {
    if (!enabled || !syncedRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { cloudSave(stats); }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [stats, enabled]);

  return { synced };
}
