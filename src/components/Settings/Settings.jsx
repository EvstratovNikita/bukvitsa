import { useGameContext } from '../../context/GameContext.jsx';
import { cloudStatus, isYandex } from '../../lib/yandex.js';
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
        {isYandex && <CloudDiagnostics prefs={prefs} stats={stats} />}
      </div>
    </Modal>
  );
}

// Состояние синхронизации с площадкой. Нужно, когда игрок сообщает «прогресс
// не сохраняется»: по строчкам видно, на каком шаге всё встало — SDK, игрок,
// чтение или запись, — и не приходится гадать по симптомам.
function CloudDiagnostics({ prefs, stats }) {
  const rows = [
    ['SDK', cloudStatus.sdk],
    ['Игрок', cloudStatus.mode],
    ['Чтение облака', cloudStatus.load],
    ['Запись в облако', cloudStatus.save],
    ['Обучение пройдено', prefs.tourDone ? 'да' : 'нет'],
    ['Последний вход', stats.lastVisitDate || '—']
  ];
  return (
    <div className="diag">
      <p className="diag__title">Синхронизация</p>
      <dl className="diag__list">
        {rows.map(([k, v]) => (
          <div className="diag__row" key={k}>
            <dt className="diag__key">{k}</dt>
            <dd className="diag__val">{String(v)}</dd>
          </div>
        ))}
      </dl>
      <p className="diag__hint">Эти строки нужны для разбора проблем с сохранением.</p>
    </div>
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
