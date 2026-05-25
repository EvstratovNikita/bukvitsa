import { useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';
import { buildAchievementText, buildInviteUrl, DEFAULT_INVITE_TEXT, share } from '../../lib/share.js';
import { ShareIcon } from '../icons/Icon.jsx';

// Universal share trigger. Two kinds:
//   <ShareButton kind="invite" />
//   <ShareButton kind="achievement" achievement={ach} />
// Visual chrome controlled by `variant`: 'ghost' | 'primary' | 'icon'.
export function ShareButton({
  kind = 'invite',
  achievement,
  label = 'Поделиться',
  variant = 'ghost',
  className = ''
}) {
  const { auth } = useGameContext();
  const [status, setStatus] = useState(null); // 'shared' | 'copied' | 'failed' | 'cancelled'

  const onClick = async () => {
    const url = buildInviteUrl(auth?.userId);
    const text = kind === 'achievement'
      ? buildAchievementText(achievement)
      : DEFAULT_INVITE_TEXT;
    const r = await share({ title: 'Буквица', text, url });
    setStatus(r);
    setTimeout(() => setStatus(null), 1600);
  };

  const base =
    variant === 'icon'    ? 'share-btn share-btn--icon' :
    variant === 'primary' ? 'btn btn--primary share-btn' :
                            'btn btn--ghost share-btn';

  const feedback =
    status === 'copied' ? 'Ссылка скопирована' :
    status === 'shared' ? 'Готово' :
    status === 'failed' ? 'Не удалось поделиться' : null;

  return (
    <button
      type="button"
      className={`${base} ${className}`.trim()}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
      title={label}
    >
      <ShareIcon />
      {variant !== 'icon' && <span>{feedback || label}</span>}
    </button>
  );
}
