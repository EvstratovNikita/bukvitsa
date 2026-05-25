import { useEffect, useMemo, useState } from 'react';
import { GAME_STATUS } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { ShareButton } from '../Share/ShareButton.jsx';
import { CloseIcon, CoinIcon, CrownIcon, SadIcon } from '../icons/Icon.jsx';

const CONFETTI_PALETTE = ['#f7c948', '#ffd864', '#6c8cff', '#b388ff', '#e9ecf3'];

function Confetti({ count = 22 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)],
        duration: 1600 + Math.random() * 1400,
        delay: Math.random() * 500,
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 720 - 360
      })),
    [count]
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            animationDuration: `${p.duration}ms`,
            animationDelay: `${p.delay}ms`,
            ['--rot']: `${p.rotate}deg`
          }}
        />
      ))}
    </div>
  );
}

export function GameEnd() {
  const { status, solution, reset, lastEarned, stats } = useGameContext();
  const [closed, setClosed] = useState(false);

  // Re-open the celebration whenever a new game ends.
  useEffect(() => {
    if (status === GAME_STATUS.WON || status === GAME_STATUS.LOST) {
      setClosed(false);
    }
  }, [status]);

  if (status === GAME_STATUS.PLAYING) return null;
  if (closed) return null;
  const isWin = status === GAME_STATUS.WON;
  const letters = [...solution];

  return (
    <div className={`gameend gameend--${isWin ? 'win' : 'lose'}`} role="dialog" aria-live="polite">
      {isWin && <Confetti />}

      <div className="gameend__card">
        <button
          type="button"
          className="gameend__close"
          onClick={() => setClosed(true)}
          aria-label="Закрыть"
          title="Закрыть"
        >
          <CloseIcon />
        </button>

        <div className="gameend__badge">
          {isWin ? <CrownIcon /> : <SadIcon />}
        </div>

        <h2 className="gameend__title">
          {isWin ? 'Победа!' : 'Не угадал'}
        </h2>

        <div className="gameend__label">Слово</div>
        <div className="gameend__word">
          {letters.map((c, i) => (
            <span key={i} style={{ animationDelay: `${300 + i * 70}ms` }}>
              {c.toUpperCase()}
            </span>
          ))}
        </div>

        {isWin && lastEarned > 0 && (
          <div className="gameend__reward">
            <CoinIcon />
            <span>+{lastEarned}</span>
          </div>
        )}

        {isWin && stats.currentStreak >= 2 && (
          <div className="gameend__streak">
            Серия побед: <b>{stats.currentStreak}</b>
          </div>
        )}

        {!isWin && (
          <div className="gameend__streak">
            Серия прервана. Попробуй ещё.
          </div>
        )}

        <div className="gameend__cta-row">
          <button
            type="button"
            className="btn btn--primary gameend__cta"
            onClick={reset}
          >
            Новая игра
          </button>
          {isWin && <ShareButton kind="invite" label="Похвастаться" />}
        </div>
      </div>
    </div>
  );
}
