import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';

// In-game settings. Preferences live under stats.prefs (jsonb-synced
// through useRemoteSync), so toggles persist across devices.
export function SettingsModal({ open, onClose }) {
  const { stats, setPref } = useGameContext();
  const prefs = stats.prefs || { theme: 'dark', enterOnLeft: false };

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
      </div>
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
