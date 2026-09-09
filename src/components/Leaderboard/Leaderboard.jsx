import { useEffect, useState } from 'react';
import { fetchLeaderboard, hasFriendsBoard, showFriendsBoard } from '../../lib/leaderboard.js';
import { isYandexGames } from '../../lib/platform.js';
import { TrophyIcon } from '../icons/Icon.jsx';
import { Modal } from '../Modal/Modal.jsx';

// Последний удачный ответ площадки. Живёт вне компонента, поэтому второе и
// последующие открытия рисуют таблицу мгновенно, а свежие данные подменяют её
// молча. Раньше каждое открытие начиналось с пустого окна и «моргало», когда
// приходил ответ.
let cached = null;


// Таблица лучших игроков (топ по числу отгаданных слов). Данные приходят от
// площадки (Яндекс) или с нашего сервера (VK) — см. lib/leaderboard.js.
// У Яндекса имя видно только у вошедших, гости идут анонимно; в VK игрок
// всегда под своим аккаунтом.
export function LeaderboardModal({ open, onClose, score = 0, showToast }) {
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
    <Modal open={open} onClose={onClose} title="Лучшие игроки">
      <div className="lb">
        {/* Подписи колонок: без них числа справа — просто числа. Словами, а
            не «#», и обычным текстом, а не мелкими блёклыми капслоком. */}
        {(loading || entries.length > 0) && (
          <div className="lb__head">
            <span className="lb__hcell lb__hcell--rank">Место</span>
            <span className="lb__hcell">Игрок</span>
            <span className="lb__hcell lb__hcell--num">Слов</span>
          </div>
        )}

        {loading && (
          <ol className="lb__list" aria-busy="true" aria-label="Загрузка таблицы">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="lb__row lb__row--skeleton" />
            ))}
          </ol>
        )}

        {failed && (
          <div className="lb__empty">
            <span className="lb__empty-icon"><TrophyIcon /></span>
            <p className="lb__empty-title">Таблица недоступна</p>
            <p className="lb__empty-text">Попробуй заглянуть чуть позже.</p>
          </div>
        )}

        {!loading && !failed && entries.length === 0 && (
          <div className="lb__empty">
            <span className="lb__empty-icon"><TrophyIcon /></span>
            <p className="lb__empty-title">Здесь пока пусто</p>
            <p className="lb__empty-text">Отгадай слово — и займёшь первое место.</p>
          </div>
        )}

        {entries.length > 0 && (
          <ol className="lb__list">
            {entries.map((e) => {
              const me = userRank != null && e.rank === userRank;
              const name = e.player?.publicName || 'Игрок';
              // Тройке призёров — свои цвета медалей, остальным обычный номер.
              const medal = e.rank <= 3 ? ` lb__row--medal lb__row--medal${e.rank}` : '';
              return (
                <li key={e.rank} className={`lb__row${me ? ' lb__row--me' : ''}${medal}`}>
                  <span className="lb__rank">{e.rank}</span>
                  <span className="lb__name" title={name}>
                    {name}
                    {me && <span className="lb__you">вы</span>}
                  </span>
                  <span className="lb__score">{e.formattedScore ?? e.score}</span>
                </li>
              );
            })}
          </ol>
        )}

        <p className="lb__hint">
          Место — по числу отгаданных слов.
          {/* У Яндекса гостю объясняем, почему его нет в таблице; вошедшему это
              не нужно. В VK вход не при чём: строки нет, пока нет побед. */}
          {!failed && userRank == null && isYandexGames && ' Войди в аккаунт, чтобы попасть в таблицу под своим именем.'}
          {!failed && userRank == null && !isYandexGames && ' Отгадай слово — и появишься в списке.'}
        </p>

        {/* В VK поверх общей таблицы есть нативное окно: там площадка
            показывает только друзей игрока, которые тоже играют. Полезно, но
            это другой список, поэтому отдельной кнопкой, а не вместо. */}
        {hasFriendsBoard && (
          <button
            type="button"
            className="lb__friends"
            onClick={async () => {
              const r = await showFriendsBoard(score);
              if (r === 'failed') showToast?.('Список друзей сейчас недоступен');
            }}
          >
            Среди друзей
          </button>
        )}
      </div>
    </Modal>
  );
}



