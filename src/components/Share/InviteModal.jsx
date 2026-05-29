import { useState } from 'react';
import { useGameContext } from '../../context/GameContext.jsx';
import { buildInviteUrl } from '../../lib/share.js';
import { Modal } from '../Modal/Modal.jsx';
import { CoinIcon, UserIcon } from '../icons/Icon.jsx';
import { ShareButton } from './ShareButton.jsx';

// Friend-invite screen accessible from the side menu. Surfaces:
//   - explanation of the reward (+50 to friend, +50 to you on verified join)
//   - the personal invite link (copy button)
//   - the platform-native share trigger
//   - running tally of how many friends already joined
export function InviteModal({ open, onClose }) {
  const { stats, auth } = useGameContext();
  const url = buildInviteUrl(auth?.userId);
  const [copyMsg, setCopyMsg] = useState(null);
  const count = stats.referralsCount || 0;
  const earned = count * 50;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMsg('Скопировано');
    } catch {
      setCopyMsg('Не удалось скопировать');
    }
    setTimeout(() => setCopyMsg(null), 1400);
  };

  return (
    <Modal open={open} onClose={onClose} title="Пригласить друга">
      <div className="invite">
        <div className="invite__hero">
          <div className="invite__icon"><UserIcon /></div>
          <div className="invite__lead">
            Друг получит <b>+50 монет</b> на старте,
            <br />
            ты — <b>+50 монет</b>, когда он войдёт через Google или почту.
          </div>
        </div>

        <div className="invite__stats">
          <div className="invite__stat">
            <div className="invite__stat-value">{count}</div>
            <div className="invite__stat-label">друзей пришло</div>
          </div>
          <div className="invite__stat">
            <div className="invite__stat-value">
              <CoinIcon />
              <span>{earned}</span>
            </div>
            <div className="invite__stat-label">монет заработано</div>
          </div>
        </div>

        <div className="invite__url-row">
          <input
            className="invite__url"
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="btn btn--ghost invite__copy"
            onClick={onCopy}
            onMouseDown={(e) => e.preventDefault()}
          >
            {copyMsg || 'Копировать'}
          </button>
        </div>

        <ShareButton kind="invite" variant="primary" label="Поделиться ссылкой" />

        <p className="invite__hint">
          Засчитываем только тех, кто привязал аккаунт через Google или email.
          Анонимные заходы не учитываются, чтобы исключить накрутку.
        </p>
      </div>
    </Modal>
  );
}
