import { useCallback, useEffect, useRef, useState } from 'react';
import { cloudLoad, cloudSave, refreshPlayerMode } from '../lib/yandex.js';
import { mergeProgress } from '../utils/mergeProgress.js';

const DEBOUNCE_MS = 900;

// Persists the stats blob to the Yandex player's cloud (getData/setData).
// Mirrors useRemoteSync's shape ({ synced }) so useStats can swap it in on the
// Yandex platform. The full stats object is JSON-serialisable, so we save it
// wholesale and merge cloud → local on load.
export function useYandexSync({ stats, setStats, enabled }) {
  const [synced, setSynced] = useState(!enabled);
  const syncedRef = useRef(false);
  const debounceRef = useRef(null);
  // Свежий снимок для adoptAccount: колбэк живёт до следующего рендера, а
  // читать состояние внутри setStats нельзя — StrictMode гоняет апдейтер
  // дважды, и побочный эффект выполнился бы два раза.
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // Initial load: pull the cloud snapshot once.
  useEffect(() => {
    if (!enabled) { setSynced(true); return; }
    let active = true;
    // Страховка ТОЛЬКО для интерфейса: если площадка молчит дольше 14 секунд,
    // разблокируем игру, но сохранения не включаем — иначе снимок с дефолтами
    // уехал бы поверх облачного прогресса. Сохранения включает лишь реально
    // завершившаяся загрузка (syncedRef ниже).
    const uiUnblock = setTimeout(() => { if (active) setSynced(true); }, 14000);
    (async () => {
      const data = await cloudLoad();
      if (!active) return;
      clearTimeout(uiUnblock);
      if (data && Object.keys(data).length > 0) {
        // Раньше облако выигрывало по всем полям («…s, …data»), и партии,
        // сыгранные до того, как площадка отдала игрока, просто исчезали.
        // mergeProgress не теряет ни одну из сторон и ничего не задваивает.
        setStats((s) => mergeProgress(s, data));
      }
      modeRef.current = await refreshPlayerMode();
      syncedRef.current = true;
      setSynced(true);
    })();
    return () => { active = false; clearTimeout(uiUnblock); };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save on every local change after the initial load.
  useEffect(() => {
    if (!enabled || !syncedRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { cloudSave(stats); }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [stats, enabled]);

  // Кто мы для площадки на момент загрузки: гость или аккаунт.
  const modeRef = useRef(null);

  // Вызывается сразу после входа в аккаунт Яндекса. У гостя (режим lite)
  // своё хранилище, у аккаунта — своё; до этого мы просто заливали в аккаунт
  // текущий снимок, и весь прогресс на аккаунте стирался начисто. Теперь
  // читаем данные аккаунта, сливаем с тем, что наиграно здесь, и сохраняем
  // объединённое — обе стороны остаются целы.
  const adoptAccount = useCallback(async () => {
    const cloud = await cloudLoad();
    const merged = mergeProgress(statsRef.current, cloud);
    if (!merged) return null;
    setStats(merged);
    await cloudSave(merged);
    return merged;
  }, [setStats]);

  // Вход мимо нашей кнопки. Игрок может войти на странице игры (кнопка над
  // «Играть») или в соседней вкладке — SDK к этому моменту уже отдал нам
  // lite-игрока, и мы продолжали читать и писать ЕГО хранилище: аккаунт
  // выглядел пустым, а прогресс гостя оставался в стороне. Поэтому
  // переспрашиваем режим, когда вкладка снова становится активной, и на
  // переходе гость → аккаунт сливаем оба хранилища.
  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const check = async () => {
      if (!active || !syncedRef.current || document.hidden) return;
      const mode = await refreshPlayerMode();
      if (!active || !mode) return;
      const was = modeRef.current;
      modeRef.current = mode;
      if (was === 'lite' && mode === 'account') await adoptAccount();
    };

    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    // Одна отложенная проверка на случай, когда площадка отдаёт аккаунт не
    // сразу после старта, а через секунду-другую.
    const t = setTimeout(check, 5000);

    return () => {
      active = false;
      clearTimeout(t);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [enabled, adoptAccount]);

  return { synced, adoptAccount };
}
