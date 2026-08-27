import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../../lib/yandex.js';
import { Modal } from '../Modal/Modal.jsx';

// Последний удачный ответ площадки. Живёт вне компонента, поэтому второе и
// последующие открытия рисуют таблицу мгновенно, а свежие данные подменяют её
// молча. Раньше каждое открытие начиналось с пустого окна и «моргало», когда
// приходил ответ.
let cached = null;

// Yandex leaderboard viewer (top by total wins). Shown only on the Yandex
// platform. Authorized players appear with their name; guests are anonymous.
export function LeaderboardModal({ open, onClose }) {
  const [res, setRes] = useState(cached);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setFailed(false);
    fetchLeaderboard().then((r) => {
      if (!active) return;
      if (!r || !Array.isArray(r.entries)) {
        // Показать старую таблицу честнее, чем стереть её из-за одной
        // неудачной попытки: ошибку выводим, только если показывать нечего.
        setFailed(!cached);
        return;
      }
      cached = r;
      setRes(r);
    });
    return () => { active = false; };
  }, [open]);

  const entries = res?.entries || [];
  const userRank = typeof res?.userRank === 'number' ? res.userRank : null;
  const loading = !res && !failed;

  return (
    <Modal open={open} onClose={onClose} title="Лидерборд">
      <div className="lb">
        {loading && (
          <ol className="lb__list" aria-busy="true" aria-label="Загрузка таблицы">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="lb__row lb__row--skeleton" />
            ))}
          </ol>
        )}
        {failed && <div className="lb__msg">Лидерборд пока недоступен.</div>}
        {!loading && !failed && entries.length === 0 && (
          <div className="lb__msg">Пока нет результатов — стань первым!</div>
        )}
        {entries.length > 0 && (
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
          Рейтинг по числу побед.
          {/* Гостю объясняем, почему его нет в таблице; вошедшему это не нужно. */}
          {!failed && userRank == null && ' Войди в аккаунт, чтобы попасть в топ под своим именем.'}
        </p>
      </div>
    </Modal>
  );
}
