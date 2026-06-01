import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../../lib/yandex.js';
import { Modal } from '../Modal/Modal.jsx';

// Yandex leaderboard viewer (top by total wins). Shown only on the Yandex
// platform. Authorized players appear with their name; guests are anonymous.
export function LeaderboardModal({ open, onClose }) {
  const [state, setState] = useState('loading'); // loading | ok | empty | error
  const [entries, setEntries] = useState([]);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setState('loading');
    fetchLeaderboard().then((res) => {
      if (!active) return;
      if (!res || !Array.isArray(res.entries)) { setState('error'); return; }
      setEntries(res.entries);
      setUserRank(typeof res.userRank === 'number' ? res.userRank : null);
      setState(res.entries.length ? 'ok' : 'empty');
    });
    return () => { active = false; };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Лидерборд">
      <div className="lb">
        {state === 'loading' && <div className="lb__msg">Загрузка…</div>}
        {state === 'error' && <div className="lb__msg">Лидерборд пока недоступен.</div>}
        {state === 'empty' && <div className="lb__msg">Пока нет результатов — стань первым!</div>}
        {state === 'ok' && (
          <ol className="lb__list">
            {entries.map((e) => {
              const me = userRank != null && e.rank === userRank;
              const name = e.player?.publicName || 'Игрок';
              return (
                <li key={e.rank} className={`lb__row${me ? ' lb__row--me' : ''}`}>
                  <span className="lb__rank">{e.rank}</span>
                  <span className="lb__name" title={name}>{name}</span>
                  <span className="lb__score">{e.formattedScore ?? e.score}</span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="lb__hint">
          Рейтинг по числу побед. Войди через Яндекс, чтобы попасть в топ под своим именем.
        </p>
      </div>
    </Modal>
  );
}
