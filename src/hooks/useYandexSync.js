import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../constants/game.js';
import { cloudLoad, cloudSave, cloudStatus, playerIdentity } from '../lib/yandex.js';
import { mergeProgress } from '../utils/mergeProgress.js';
import { storage } from '../utils/storage.js';

const DEBOUNCE_MS = 900;

// Начатая партия ездит в облако вместе со статистикой, отдельным ключом.
// Внутри площадки localStorage переживает не каждый запуск, и без этого игрок
// каждый раз получал пустое поле — а новая партия списывает энергию, поэтому
// «просто так» уходило по единице за заход.
const withBoard = (stats) => {
  const board = storage.get(STORAGE_KEYS.GAME_STATE, null);
  return board ? { ...stats, __board: board } : stats;
};

// Доска в снимке НЕ должна попадать в состояние игры: иначе она осядет в
// localStorage внутри статистики и на следующем запуске победит свежую.
const takeBoard = (data) => {
  if (!data || !data.__board) return { board: null, stats: data };
  const { __board, ...stats } = data;
  return { board: __board, stats };
};

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
  // Личность игрока, У КОТОРОГО читали данные. Запись разрешена только ему:
  // если площадка успела подменить игрока, снимок сначала сливается с его
  // данными, а не заливается поверх.
  const identityRef = useRef(null);

  // Читаем данные текущего игрока, сливаем с местным снимком и сохраняем
  // объединённое. Вызывается после входа в аккаунт — своей кнопкой или мимо
  // неё. У гостя (режим lite) своё хранилище, у аккаунта своё; раньше мы
  // просто заливали в аккаунт текущий снимок, и его прогресс стирался.
  const adoptAccount = useCallback(async () => {
    const { ok, data } = await cloudLoad();
    // Не прочитали — не пишем: снимок уехал бы поверх чужих данных.
    if (!ok) return null;
    const merged = mergeProgress(statsRef.current, data);
    if (!merged) return null;
    setStats(merged);
    await cloudSave(withBoard(merged));
    // Теперь читали и писали одному и тому же игроку — фиксируем его.
    identityRef.current = await playerIdentity();
    cloudStatus.readFrom = cloudStatus.identity;
    return merged;
  }, [setStats]);

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
      // Пробуем прочитать несколько раз: площадка иногда отвечает не с
      // первого раза, а неудачное чтение НЕ должно включать сохранения —
      // иначе снимок с дефолтами затрёт аккаунт (диагностика ловила это как
      // «Чтение облака: ошибка», «Запись: ок» через секунду).
      let res = { ok: false, data: null };
      for (let attempt = 0; attempt < 3 && active; attempt++) {
        res = await cloudLoad();
        if (res.ok) break;
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!active) return;
      clearTimeout(uiUnblock);

      if (!res.ok) {
        // Читать не смогли — играем на местном снимке, но в облако НИЧЕГО не
        // пишем: снимок из дефолтов затёр бы аккаунт. Прогресс жив в
        // localStorage, а проверка ниже продолжит стучаться в облако — как
        // только чтение пройдёт, данные сольются и запись включится.
        cloudStatus.save = 'ждём успешного чтения';
        setSynced(true);
        return;
      }

      if (res.data) {
        const { board, stats: cloudStats } = takeBoard(res.data);
        // Начатая партия из облака — только когда своей нет: местная свежее.
        if (board && !storage.get(STORAGE_KEYS.GAME_STATE, null)) {
          storage.set(STORAGE_KEYS.GAME_STATE, board);
        }
        // Раньше облако выигрывало по всем полям («…s, …data»), и партии,
        // сыгранные до того, как площадка отдала игрока, просто исчезали.
        // mergeProgress не теряет ни одну из сторон и ничего не задваивает.
        setStats((s) => mergeProgress(s, cloudStats));
      }
      identityRef.current = await playerIdentity();
      cloudStatus.readFrom = cloudStatus.identity;
      syncedRef.current = true;
      setSynced(true);
    })();
    return () => { active = false; clearTimeout(uiUnblock); };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save on every local change after the initial load.
  //
  // Перед записью спрашиваем у площадки, кто мы сейчас. Если игрок сменился
  // с того момента, как мы читали (вход мимо нашей кнопки — на странице игры
  // до запуска или в соседней вкладке), запись поверх стёрла бы его данные
  // нашим снимком. В этом случае сначала читаем данные нового игрока и
  // сливаем — и только потом сохраняем.
  useEffect(() => {
    if (!enabled || !syncedRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const id = await playerIdentity();
      if (id && identityRef.current && id !== identityRef.current) {
        await adoptAccount();
        return;
      }
      if (id) identityRef.current = id;
      cloudSave(withBoard(statsRef.current));
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [stats, enabled, adoptAccount]);

  // Та же проверка, но не дожидаясь ближайшего сохранения: вкладка снова
  // активна (вернулись из окна входа) или прошло пять секунд после старта —
  // площадка могла отдать аккаунт не сразу.
  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const check = async () => {
      if (!active || document.hidden) return;

      // Чтение на старте не прошло — сохранения выключены. Пробуем снова:
      // площадка часто отвечает со второго раза, и как только данные пришли,
      // они сливаются с местными, а запись включается.
      if (!syncedRef.current) {
        const res = await cloudLoad();
        if (!active || !res.ok) return;
        const { board, stats: cloudStats } = takeBoard(res.data);
        if (board && !storage.get(STORAGE_KEYS.GAME_STATE, null)) {
          storage.set(STORAGE_KEYS.GAME_STATE, board);
        }
        if (cloudStats) setStats((s) => mergeProgress(s, cloudStats));
        identityRef.current = await playerIdentity();
        cloudStatus.readFrom = cloudStatus.identity;
        syncedRef.current = true;
        cloudStatus.save = 'включена после повторного чтения';
        return;
      }

      const id = await playerIdentity();
      if (!active || !id) return;
      if (identityRef.current && id !== identityRef.current) await adoptAccount();
      else identityRef.current = id;
    };

    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    const t = setTimeout(check, 5000);
    // Пока чтение не удалось, продолжаем стучаться — раз в 20 секунд.
    const iv = setInterval(() => { if (!syncedRef.current) check(); }, 20000);

    return () => {
      active = false;
      clearTimeout(t);
      clearInterval(iv);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [enabled, adoptAccount]);

  return { synced, adoptAccount };
}



