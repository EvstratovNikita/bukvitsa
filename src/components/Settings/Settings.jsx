import { useEffect, useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';
import { isVk } from '../../lib/platform.js';
import { notificationsEnabled, setNotifications } from '../../lib/vk.js';
import { Modal } from '../Modal/Modal.jsx';

// Время сборки по Москве (vite.config.js → define).
const BUILD_LABEL = typeof __BUILD_TIME__ === 'string'
  ? new Date(__BUILD_TIME__).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : 'dev';

// In-game settings. Preferences live under stats.prefs (jsonb-synced
// through useRemoteSync), so toggles persist across devices.
export function SettingsModal({ open, onClose }) {
  const { stats, setPref, showToast } = useGameContext();
  const prefs = stats.prefs || { theme: 'dark', enterOnLeft: false };
  // Разрешение на уведомления живёт в VK, а не в prefs: переключатель
  // показывает и меняет его через мост. Выключить можно так же легко, как
  // включить, — требование к играм с уведомлениями.
  // Разрешить могли и из карточки после победы — сверяемся при каждом открытии.
  const [notify, setNotify] = useState(notificationsEnabled);
  useEffect(() => { if (open) setNotify(notificationsEnabled()); }, [open]);
  const onNotify = async (on) => {
    const r = await setNotifications(on);
    if (r === 'ok') setNotify(on);
    else if (r === 'failed') showToast?.(on ? 'Не получилось включить напоминания' : 'Не получилось выключить напоминания');
  };

  return (
    <Modal open={open} onClose={onClose} title="Настройки">
      <div className="settings">
        <Setting
          label="Тёмная тема"
          desc="Выключи — игра станет светлой"
          value={prefs.theme === 'dark'}
          onChange={(v) => setPref('theme', v ? 'dark' : 'light')}
        />
        <Setting
          label="Ввод слева"
          desc="Поменять местами «Ввод» и «Удалить» в нижнем ряду клавиатуры"
          value={Boolean(prefs.enterOnLeft)}
          onChange={(v) => setPref('enterOnLeft', v)}
        />
        {isVk && (
          <Setting
            label="Напоминания"
            desc="Напомним о слове дня, если пропустишь день"
            value={notify}
            onChange={onNotify}
          />
        )}
      </div>
      <p className="settings__build">сборка {BUILD_LABEL}</p>
    </Modal>
  );
}

function Setting({ label, desc, value, onChange }) {
  return (
    <label className="setting">
      <span className="setting__meta">
        <span className="setting__label">{label}</span>
        <span className="setting__desc">{desc}</span>
      </span>
      <span className={`setting__switch${value ? ' setting__switch--on' : ''}`}>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="setting__knob" />
      </span>
    </label>
  );
}

