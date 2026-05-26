import { useState } from 'react';
import { MAX_ATTEMPTS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { buildInviteUrl, buildWordleShareText, share } from '../../lib/share.js';

// Shown when the player taps the daily button after already playing.
// Displays today's result and offers a Wordle-style emoji-grid share.
export function DailyResultModal({ open, onClose }) {
  const { stats, auth } = useGameContext();
  const daily = stats.daily;
  const last = daily?.lastResult;
  const [shareStatus, setShareStatus] = useState(null);

  const onShare = async () => {
    if (!last) return;
    const text = buildWordleShareText(
      last.evaluations,
      last.won ? last.attempts : 0,
      MAX_ATTEMPTS,
      last.dayN
    );
    const url = buildInviteUrl(auth?.userId);
    const r = await share({ title: 'Буквица — Слово дня', text, url });
    setShareStatus(r);
    setTimeout(() => setShareStatus(null), 1600);
  };

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title={`Слово дня #${last?.dayN ?? ''}`}>
      <div className="daily-result">
        <div className="daily-result__head">
          <div className="daily-result__verdict">
            {last?.won
              ? `Угадано за ${last.attempts}/${MAX_ATTEMPTS}`
              : 'Не угадано'}
          </div>
          {daily?.streak > 1 && (
            <div className="daily-result__streak">
              🔥 Серия: <b>{daily.streak}</b>
            </div>
          )}
        </div>

        <div className="daily-result__grid">
          {(last?.evaluations || []).map((row, i) => (
            <div className="daily-result__row" key={i}>
              {row.map((s, j) => (
                <span
                  key={j}
                  className={`daily-result__cell daily-result__cell--${s}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn--primary daily-result__share"
          onClick={onShare}
          onMouseDown={(e) => e.preventDefault()}
        >
          {shareStatus === 'copied' ? 'Скопировано' :
           shareStatus === 'shared' ? 'Готово' :
           shareStatus === 'failed' ? 'Не удалось' :
           'Поделиться сеткой'}
        </button>

        <div className="daily-result__totals">
          Сыграно: <b>{daily?.gamesPlayed || 0}</b> ·
          Угадано: <b>{daily?.gamesWon || 0}</b> ·
          Рекорд серии: <b>{daily?.maxStreak || 0}</b>
        </div>

        <p className="daily-result__hint">
          Новое слово появится завтра в полночь.
        </p>
      </div>
    </Modal>
  );
}
