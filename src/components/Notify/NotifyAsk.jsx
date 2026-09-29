import { useEffect, useRef, useState } from 'react';
import { GAME_STATUS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { isVk } from '../../lib/platform.js';
import { notificationsEnabled, setNotifications } from '../../lib/vk.js';
import { storage } from '../../utils/storage.js';
import { BellIcon, CloseIcon } from '../icons/Icon.jsx';

// Просьба разрешить напоминания — только VK, только после победы.
//
// Рассылки из кабинета VK доходят лишь до тех, кто разрешил уведомления, а
// системное окно при первом запуске игроки часто закрывают не глядя. Поэтому
// переспрашиваем сами — в момент, когда игре есть что предложить: слово
// угадано, завтра будет новое. Наград за согласие нет и быть не должно
// (правила VK, п. 2.6.2).
//
// Не надоедать: не чаще раза в 3 дня и не больше 3 раз всего. Показ
// засчитывается сразу — даже если игрок просто начал новую партию, в
// следующей победе карточка не вернётся. Счётчик свой на площадку (ключи ОК
// в storage с префиксом), в облако не едет: разрешение живёт в VK, а не у нас.
const ASK_KEY = 'wordle-ru:notify-ask';
const ASK_GAP_MS = 3 * 24 * 60 * 60 * 1000;
const ASK_MAX = 3;
const SHOW_DELAY_MS = 1400;   // после анимации победы и всплывашки награды
const AUTO_HIDE_MS = 15000;

function mayAsk() {
  if (!isVk || notificationsEnabled()) return false;
  const s = storage.get(ASK_KEY, null) || { n: 0, at: 0 };
  return s.n < ASK_MAX && Date.now() - (s.at || 0) >= ASK_GAP_MS;
}

function noteAsked() {
  const s = storage.get(ASK_KEY, null) || { n: 0, at: 0 };
  storage.set(ASK_KEY, { n: (s.n || 0) + 1, at: Date.now() });
}

export function NotifyAsk() {
  const { status, solution, showToast } = useGameContext();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const shownFor = useRef(null);

  useEffect(() => {
    if (status !== GAME_STATUS.WON || shownFor.current === solution || !mayAsk()) return;
    shownFor.current = solution;
    const t = setTimeout(() => { noteAsked(); setOpen(true); }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [status, solution]);

  // Новая партия — карточка больше не к месту.
  useEffect(() => { if (status === GAME_STATUS.PLAYING) setOpen(false); }, [status]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const onAllow = async () => {
    setBusy(true);
    const r = await setNotifications(true);
    setBusy(false);
    setOpen(false);
    if (r === 'ok') showToast?.('Напоминания включены');
    else if (r === 'failed') showToast?.('Не получилось включить напоминания');
  };

  return (
    <div className="notify-ask" role="dialog" aria-label="Напоминания о слове дня">
      <span className="notify-ask__icon"><BellIcon /></span>
      <span className="notify-ask__text">
        <b>Напомнить о слове дня?</b>
        <span>Пришлём уведомление, если пропустишь день</span>
      </span>
      <button type="button" className="notify-ask__yes" onClick={onAllow} disabled={busy}
        onMouseDown={(e) => e.preventDefault()}>
        {busy ? '…' : 'Напомнить'}
      </button>
      <button type="button" className="notify-ask__close" aria-label="Не сейчас"
        onClick={() => setOpen(false)} onMouseDown={(e) => e.preventDefault()}>
        <CloseIcon />
      </button>
    </div>
  );
}
