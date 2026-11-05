import { useEffect, useState } from 'react';
import { isMuted, onMutedChange, setMuted, soundEnabledInBuild } from '../../lib/sound.js';
import { tr } from '../../lib/lang.js';
import { SoundOffIcon, SoundOnIcon } from '../icons/Icon.jsx';

// Кнопка звука: на главном экране и в шапке партии. Показывается только там, где
// в сборке есть звук. Выбор игрока сохраняется (lib/sound.js).
export function SoundButton({ variant }) {
  const [muted, setState] = useState(isMuted());
  useEffect(() => onMutedChange(setState), []);
  if (!soundEnabledInBuild) return null;
  const label = muted ? tr('Включить звук') : tr('Выключить звук');
  const Icon = muted ? SoundOffIcon : SoundOnIcon;
  if (variant === 'home') {
    return (
      <button
        type="button"
        className={`home-pill home-pill--tint home-pill--sound home-pill--icon${muted ? ' home-pill--muted' : ''}`}
        onClick={() => setMuted(!muted)}
        aria-label={label}
        title={label}
        data-quiet="1"
      >
        <Icon />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="iconbtn iconbtn--sound"
      onClick={() => setMuted(!muted)}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
      title={label}
      data-quiet="1"
    >
      <Icon />
    </button>
  );
}
